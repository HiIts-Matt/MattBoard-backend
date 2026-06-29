import { Router } from 'express';
import { minutes } from '../utils/utils.js';

const router = Router();

// NASA Image & Video Library — public, keyless, searchable, returns preview
// thumbnails per result. https://images-api.nasa.gov/
const SEARCH_URL = 'https://images-api.nasa.gov/search';
const CACHE_TTL = minutes(30);
const searchCache = new Map(); // `${q}:${page}` -> { items, time }

// The library hosts a fixed set of renditions per asset; the preview link is
// the ~thumb variant, and ~orig is the full-resolution original.
function toFull(thumb) {
    if (!thumb) return thumb;
    return thumb.replace(/~thumb\.(jpg|png)/i, '~orig.$1');
}

async function fetchSearch(q, page) {
    const key = `${q}:${page}`;
    const cached = searchCache.get(key);
    if (cached && Date.now() - cached.time < CACHE_TTL) return cached.items;

    const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&media_type=image&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NASA ${res.status}`);
    const data = await res.json();
    const rawItems = data?.collection?.items ?? [];

    const items = rawItems.map((it) => {
        const meta = it.data?.[0] ?? {};
        const preview = (it.links ?? []).find((l) => l.rel === 'preview');
        const thumb = preview?.href;
        if (!thumb || !meta.nasa_id) return null;
        return {
            id: meta.nasa_id,
            title: meta.title || 'Untitled',
            thumb,
            full: toFull(thumb),
            width: null,
            height: null,
        };
    }).filter(Boolean);

    searchCache.set(key, { items, time: Date.now() });
    return items;
}

router.get('/search', async (req, res) => {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    if (!q) return res.status(400).json({ error: 'q is required' });

    try {
        const items = await fetchSearch(q, page);
        res.json({ items, page });
    } catch (err) {
        res.status(502).json({ error: 'Failed to search NASA library' });
    }
});

router.get('/random', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });

    try {
        const items = await fetchSearch(q, 1);
        if (items.length === 0) return res.status(404).json({ error: 'No images found' });
        const pick = items[Math.floor(Math.random() * items.length)];
        res.json({ url: pick.full, width: null, height: null, title: pick.title });
    } catch (err) {
        res.status(502).json({ error: 'Failed to fetch NASA image' });
    }
});

export default router;
