import { Router } from 'express';

const router = Router();

const BASE_URL = 'https://p000-sharedstreams.icloud.com';
const ALBUM_TOKEN = process.env.APPLE_ALBUM_TOKEN;

let cachedPhotos = null;
let cacheTime = 0;
const CACHE_TTL = 1000 * 60 * 30;
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
    while (photo.guid === lastGuid) {
        photo = photos[Math.floor(Math.random() * photos.length)]
    }
    lastGuid = photo.guid;
    return photo;
};

async function getPhotoList() {
    if (cachedPhotos && Date.now() - cacheTime < CACHE_TTL) {
        return cachedPhotos;
    }

    const url = `${BASE_URL}/${ALBUM_TOKEN}/sharedstreams/webstream`
    const photoResponse = await fetchPhotos(url);

    const photoData = await photoResponse.json();
    const photos = photoData?.photos || [];

    if (photos.length === 0) return [];

    const photoGuids = photos.map((p) => p.photoGuid);

    const assetResponse = await fetchAssets(photoGuids);
    const assetData = await assetResponse.json();
    const locations = assetData.items || {};

    const photoList = buildPhotoList(photos, locations);

    updateCache(photoList)
    return photoList;
}

const updateCache = (photoList) => {
    cachedPhotos = photoList;
    cacheTime = Date.now();
}

const fetchPhotos = async (url) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ streamCtag: null }),
    })

    return response;
}

const fetchAssets = async (photoIds) => {
    const response = await fetch(
        `${BASE_URL}/${ALBUM_TOKEN}/sharedstreams/webasseturls`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ photoGuids: photoIds }),
        }
    );

    return response;
}

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