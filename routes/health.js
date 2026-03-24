import { Router } from 'express';

const router = Router();
const PORT = process.env.PORT || 3000;
const endpoints = [
    { name: 'apple-album/random', url: `http://localhost:${PORT}/apple-album/random` },
];

router.get('/', async (req, res) => {
    const results = {};

    await Promise.all(
        endpoints.map(async ({ name, url }) => {
            try {
                const response = await fetch(url);
                results[name] = response.ok;
            } catch {
                results[name] = false;
            }
        })
    );

    const allHealthy = Object.values(results).every(Boolean);
    res.status(allHealthy ? 200 : 503).json(results);
});

export default router;