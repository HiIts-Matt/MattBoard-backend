import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { IdHandler, minutes } from '../utils/utils.js';
import sharp from 'sharp';

const router = Router();

const BASE_URL = 'https://p23-sharedstreams.icloud.com';
const CONFIG_FILE = './storage/config.json';

// Per-token album cache: token -> { photos, time, lastGuid }
const albumCache = new Map();
const CACHE_TTL = minutes(30);

const {
    receive,
    resolve,
    error
} = IdHandler();

// Resolve the album token. Precedence: explicit ?token= (used to preview an
// album before it's saved) → saved config's background.apple.albumToken → env.
function resolveToken(req) {
    const fromQuery = req.query.token?.trim();
    if (fromQuery) return fromQuery;

    const fromConfig = activeBackground()?.apple?.albumToken;
    if (fromConfig) return fromConfig;

    return process.env.APPLE_ALBUM_TOKEN || null;
}

function activeBackground() {
    try {
        if (!existsSync(CONFIG_FILE)) return null;
        const content = readFileSync(CONFIG_FILE, 'utf-8').trim();
        if (!content) return null;
        const data = JSON.parse(content);
        return data.configs?.find(c => c.id === data.active)?.background ?? null;
    } catch {
        return null;
    }
}

router.get('/random', async (req, res) => {
    const reqId = receive(req);
    const token = resolveToken(req);
    if (!token) {
        return res.status(404).json({ error: 'No album configured. Set an Apple album token in your background settings.' });
    }

    try {
        const photos = await getPhotoList(token);
        if (photos.length === 0) {
            return res.status(404).json({ error: 'No photos found' });
        }
        resolve(req, reqId);
        res.json(getRandomPhoto(token, photos));
    } catch (err) {
        error(req, reqId);
        res.status(502).json({ error: 'Failed to fetch album from iCloud' });
    }
});

router.get('/list', async (req, res) => {
    const reqId = receive(req);
    const token = resolveToken(req);
    if (!token) {
        return res.status(404).json({ error: 'No album configured. Set an Apple album token in your background settings.' });
    }

    try {
        const photos = await getPhotoList(token);
        resolve(req, reqId);
        res.json({ items: photos });
    } catch (err) {
        error(req, reqId);
        res.status(502).json({ error: 'Failed to fetch album from iCloud' });
    }
});

const getRandomPhoto = (token, photos) => {
    if (photos.length <= 1) return photos[0] || null;

    const cache = albumCache.get(token);
    let photo;
    do {
        photo = photos[Math.floor(Math.random() * photos.length)];
    } while (photo.guid === cache?.lastGuid);

    if (cache) cache.lastGuid = photo.guid;
    return photo;
};

async function getPhotoList(token) {
    const cached = albumCache.get(token);
    if (cached?.photos && Date.now() - cached.time < CACHE_TTL) {
        return cached.photos;
    }

    let apiBase = `${BASE_URL}/${token}/sharedstreams`;
    let streamData = await postJson(`${apiBase}/webstream`, { streamCtag: null });

    const host = streamData['X-Apple-MMe-Host'];
    if (host) {
        apiBase = `https://${host}/${token}/sharedstreams`;
        streamData = await postJson(`${apiBase}/webstream`, { streamCtag: null });
    }

    const photos = streamData?.photos || [];

    if (photos.length === 0) return [];

    const photoGuids = photos.map((p) => p.photoGuid);

    const assetData = await postJson(`${apiBase}/webasseturls`, { photoGuids });
    const locations = assetData.items || {};

    const photoList = buildPhotoList(photos, locations);

    albumCache.set(token, { photos: photoList, time: Date.now(), lastGuid: cached?.lastGuid ?? null });
    return photoList;
}

const postJson = async (url, body) => {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data) throw new Error(`Empty response from ${url}`);
    return data;
};

const buildPhotoList = (photos, locations) => {
    const results = [];

    for (const photo of photos) {
        const derivatives = Object.values(photo.derivatives || {});
        if (derivatives.length === 0) continue;

        const best = derivatives.reduce((a, b) =>
            (a.width * a.height) >= (b.width * b.height) ? a : b
        );

        const location = locations[best.checksum];
        if (!location) continue;

        results.push({
            guid: photo.photoGuid,
            url: `https://${location.url_location}${location.url_path}`,
            width: best.width,
            height: best.height,
            caption: photo.caption || '',
        });
    }

    return results;
};



// In-memory cache for blurred images: key = `${url}:${amount}`
const blurCache = new Map();
const BLUR_CACHE_TTL = minutes(30);

router.get('/blur', async (req, res) => {
    const { url, amount } = req.query;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const sigma = Math.max(0.3, Math.min(100, Number(amount) || 5));
    const cacheKey = `${url}:${sigma}`;

    const cached = blurCache.get(cacheKey);
    if (cached && Date.now() - cached.time < BLUR_CACHE_TTL) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=1800');
        return res.send(cached.buffer);
    }

    try {
        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error(`Upstream ${imgRes.status}`);
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

        const blurred = await sharp(imgBuffer)
            .blur(sigma)
            .jpeg({ quality: 85 })
            .toBuffer();

        blurCache.set(cacheKey, { buffer: blurred, time: Date.now() });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=1800');
        res.send(blurred);
    } catch (err) {
        console.error('[blur] Failed to blur image:', err.message);
        res.status(502).json({ error: 'Failed to blur image' });
    }
});

export default router;
