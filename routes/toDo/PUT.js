import { readFileSync, writeFileSync, existsSync } from 'fs';
import { IdHandler } from '../../utils/utils.js';

const TODOS_FILE = './storage/todos.json';

const {
    receive,
    resolve
} = IdHandler();

export default function handler(req, res) {

    const reqId = receive(req)

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

    let currentListName = null;
    let todoIndex = -1;
    for (const [listName, todos] of Object.entries(data)) {
        const index = todos.findIndex(t => String(t.id) === String(id));
        if (index !== -1) {
            currentListName = listName;
            todoIndex = index;
            break;
        }
    }
    if (todoIndex === -1) return res.status(404).json({ error: 'Todo not found' });

    const { listName: newListName, ...updateItem } = item;
    const todo = data[currentListName][todoIndex];
    Object.assign(todo, updateItem);

    if (newListName && newListName !== currentListName) {
        data[currentListName].splice(todoIndex, 1);
        if (!data[newListName]) data[newListName] = [];
        data[newListName].push(todo);
    }

    writeFileSync(TODOS_FILE, JSON.stringify(data));

    resolve(req, reqId);
    res.json(todo);
}