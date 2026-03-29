import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

const TODOS_FILE = './storage/todos.json';

export default function handler(req, res) {
    if (!existsSync(TODOS_FILE)) {
        return res.json({ todos: [] });
    }
    const content = readFileSync(TODOS_FILE, 'utf-8').trim();
    const data = content ? JSON.parse(content) : { todos: [] };

    // One-time migration for legacy todos created before ids were added.
    let hasChanges = false;
    for (const todo of data.todos) {
        if (!todo.id) {
            todo.id = randomUUID();
            hasChanges = true;
        }
    }

    if (hasChanges) {
        writeFileSync(TODOS_FILE, JSON.stringify(data));
    }

    res.json(data);
}