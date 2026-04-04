import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { IdHandler } from '../../utils/utils.js';

const TODOS_FILE = './storage/todos.json';

const {
    receive,
    resolve
} = IdHandler();

export default function handler(req, res) {
    const reqId = receive(req);

    if (!existsSync(TODOS_FILE)) {
        return res.json({ todos: [] });
    }
    const content = readFileSync(TODOS_FILE, 'utf-8').trim();
    const data = content ? JSON.parse(content) : { todos: [] };

    resolve(req, reqId);
    res.json(data);
}