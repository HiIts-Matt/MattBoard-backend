import { readFileSync, writeFileSync, existsSync } from 'fs';

const TODOS_FILE = './storage/todos.json';

export default function handler(req, res) {
    console.log('/todos  - PUT');

    if (!existsSync(TODOS_FILE)) {
        const err = new Error('Todo storage not found')
        console.log(err);
        return res.status(404).json({ error: 'Todo storage not found' });
    }

    const { id, item } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'id is required for updates' });
    }

    const data = JSON.parse(readFileSync(TODOS_FILE, 'utf-8'));

    const todo = data.todos.find((t) => String(t.id) === String(id));
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    Object.assign(todo, item);
    writeFileSync(TODOS_FILE, JSON.stringify(data));
    res.json(todo);
}