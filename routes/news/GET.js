import { IdHandler } from "../../utils/utils.js";
import Parser from 'rss-parser';
import Sentiment from 'sentiment';

const { receive, resolve, error } = IdHandler();
const parser = new Parser();
const sentiment = new Sentiment();

// Map sentiment comparative score (-inf..+inf) to 0..1 via tanh
// comparative ~0 → 0.5, strongly negative → 0, strongly positive → 1
const scoreToSentiment = (comparative) => (Math.tanh(comparative) + 1) / 2;

export default async function handler(req, res) {
    const reqId = receive(req);

    const { url } = req.query;

    if (!url) {
        error(req, reqId);
        return res.status(400).json({ error: 'url query param is required' });
    }

    try {
        const feed = await parser.parseURL(url);

        const articles = feed.items.map(item => {
            const result = sentiment.analyze(item.title ?? '');
            // console.log(item);
            return {
                ...item, 
                title: item.title ?? null,
                link: item.link ?? null,
                pubDate: item.pubDate ?? item.isoDate ?? null,
                sentiment: scoreToSentiment(result.comparative),
            };
        });

        resolve(req, reqId);
        res.json({ articles });
    } catch (err) {
        error(req, reqId);
        res.status(502).json({ error: 'Failed to fetch or parse feed' });
    }
}
