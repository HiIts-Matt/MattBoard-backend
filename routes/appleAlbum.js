import { Router } from 'express';
import { IdHandler, minutes } from '../utils/utils.js';
import sharp from 'sharp';

const router = Router();

const BASE_URL = 'https://p23-sharedstreams.icloud.com';
const ALBUM_TOKEN = process.env.APPLE_ALBUM_TOKEN;

let cachedPhotos = null;
let cacheTime = 0;
const CACHE_TTL = minutes(30);
// refresh cache time ^ (30 mins)
let lastGuid = null;

const {
    receive,
    resolve,
    error
} = IdHandler();

router.get('/random', async (req, res) => {
    const reqId = receive(req)

    try {
        const photos = await getPhotoList();
        if (photos.length === 0) {
            return res.status(404).json({ error: 'No photos found' });
        }
        resolve(req, reqId);
        res.json(getRandomPhoto(photos));
    } catch (err) {
        error(req, reqId)
        res.status(502).json({ error: 'Failed to fetch album from iCloud' });
    }
});

const getRandomPhoto = (photos) => {
    if (photos.length <= 1) return photos[0] || null;

    let photo;
    do {
        photo = photos[Math.floor(Math.random() * photos.length)]
    } while (photo.guid === lastGuid)

    lastGuid = photo.guid;
    return photo;
};

async function getPhotoList() {
    if (cachedPhotos && Date.now() - cacheTime < CACHE_TTL) {
        return cachedPhotos;
    }

    let apiBase = `${BASE_URL}/${ALBUM_TOKEN}/sharedstreams`;
    let streamData = await postJson(`${apiBase}/webstream`, { streamCtag: null });

    const host = streamData['X-Apple-MMe-Host'];
    if (host) {
        apiBase = `https://${host}/${ALBUM_TOKEN}/sharedstreams`;
        streamData = await postJson(`${apiBase}/webstream`, { streamCtag: null });
    }

    const photos = streamData?.photos || [];

    if (photos.length === 0) return [];

    const photoGuids = photos.map((p) => p.photoGuid);

    const assetData = await postJson(`${apiBase}/webasseturls`, { photoGuids });
    const locations = assetData.items || {};

    const photoList = buildPhotoList(photos, locations);

    updateCache(photoList);
    return photoList;
}

const updateCache = (photoList) => {
    cachedPhotos = photoList;
    cacheTime = Date.now();
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