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
        : { todos: [] }

    const todo = {
        id: req.body.id ?? randomUUID(),
        ...req.body,
    };

    data.todos.push(todo);
    writeFileSync(TODOS_FILE, JSON.stringify(data));
    resolve(req, reqId)
    res.json(todo);
}