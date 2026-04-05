import { readFileSync, existsSync } from 'fs';
import { IdHandler } from '../../utils/utils.js';

const CONFIG_FILE = './storage/config.json';

const { receive, resolve } = IdHandler();

export default function handler(req, res) {
    const reqId = receive(req);

    if (!existsSync(CONFIG_FILE)) {
        resolve(req, reqId);
        return res.json({ active: null, configs: [] });
    }

    const content = readFileSync(CONFIG_FILE, 'utf-8').trim();
    const data = content ? JSON.parse(content) : { active: null, configs: [] };

    resolve(req, reqId);
    res.json(data);
}
