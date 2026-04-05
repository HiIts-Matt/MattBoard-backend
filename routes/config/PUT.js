import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { IdHandler } from '../../utils/utils.js';

const CONFIG_FILE = './storage/config.json';

const { receive, resolve } = IdHandler();

export default function handler(req, res) {
    const reqId = receive(req);

    const incoming = req.body;

    const existing = existsSync(CONFIG_FILE)
        ? JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
        : { active: null, configs: [] };

    if (incoming.id) {
        const idx = existing.configs.findIndex((c) => c.id === incoming.id);
        if (idx !== -1) {
            existing.configs[idx] = incoming;
        } else {
            existing.configs.push(incoming);
        }
        existing.active = incoming.id;
    } else {
        const newConfig = { id: randomUUID(), ...incoming };
        existing.configs.push(newConfig);
        existing.active = newConfig.id;
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(existing));

    resolve(req, reqId);
    res.json(existing);
}
