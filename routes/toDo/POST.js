import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

const TODOS_FILE = './storage/todos.json';

export default function handler(req, res) {
    const data = existsSync(TODOS_FILE)
        ? JSON.parse(readFileSync(TODOS_FILE, 'utf-8'))
        : { todos: [] }

    const todo = {
        id: req.body.id ?? randomUUID(),
        ...req.body,
    };

    data.todos.push(todo);
    writeFileSync(TODOS_FILE, JSON.stringify(data));
    res.json(todo);
}