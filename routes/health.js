import { Router } from 'express';
import { IdHandler } from '../utils/utils.js';

const router = Router();
const PORT = process.env.PORT || 3000;
const endpoints = [
    { name: 'apple-album/random', url: `http://localhost:${PORT}/apple-album/random` },
];

const {
    receive,
    resolve,
    error
} = IdHandler();

router.get('/', async (req, res) => {

    const reqId = receive(req)
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
    resolve(req, reqId);
    res.status(allHealthy ? 200 : 503).json(results);
});

export default router;