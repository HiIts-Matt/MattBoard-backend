import { Router } from 'express';
import { minutes } from '../utils/utils.js';

const router = Router();

const BASE_URL = 'https://p23-sharedstreams.icloud.com';
const ALBUM_TOKEN = process.env.APPLE_ALBUM_TOKEN;

let cachedPhotos = null;
let cacheTime = 0;
const CACHE_TTL = minutes(30);
// refresh cache time ^ (30 mins)
let lastGuid = null;

router.get('/random', async (req, res) => {
    try {
        const photos = await getPhotoList();
        if (photos.length === 0) {
            return res.status(404).json({ error: 'No photos found' });
        }
        res.json(getRandomPhoto(photos));
    } catch (err) {
        console.error('Failed to fetch album:', err);
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



export default router;