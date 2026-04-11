import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { IdHandler } from '../../utils/utils.js';

const TODOS_FILE = './storage/todos.json';

const {
    receive,
    resolve
} = IdHandler();

export default function handler(req, res) {

    const reqId = receive(req)

    const data = existsSync(TODOS_FILE)
        ? JSON.parse(readFileSync(TODOS_FILE, 'utf-8'))
        : {}

    const { listName, ...todoBody } = req.body;

    const todo = {
        id: todoBody.id ?? randomUUID(),
        ...todoBody,
    };

    if (!data[listName]) {
        data[listName] = [];
    }

    data[listName].push(todo);
    writeFileSync(TODOS_FILE, JSON.stringify(data));
    resolve(req, reqId)
    res.json(todo);
}