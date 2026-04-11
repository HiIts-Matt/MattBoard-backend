import { readFileSync, writeFileSync, existsSync } from 'fs';
import { IdHandler } from '../../utils/utils.js';

const TODOS_FILE = './storage/todos.json';

const {
    receive,
    resolve
} = IdHandler();

export default function handler(req, res) {

    const reqId = receive(req);

    if (!existsSync(TODOS_FILE)) {
        return res.status(404).json({ error: 'Todo storage not found' });
    }

    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'id is required' });
    }

    const data = JSON.parse(readFileSync(TODOS_FILE, 'utf-8'));

    let found = false;
    for (const [listName, todos] of Object.entries(data)) {
        const index = todos.findIndex(t => String(t.id) === String(id));
        if (index !== -1) {
            data[listName].splice(index, 1);
            if (data[listName].length === 0) {
                delete data[listName];
            }
            found = true;
            break;
        }
    }

    if (!found) {
        return res.status(404).json({ error: 'Todo not found' });
    }

    writeFileSync(TODOS_FILE, JSON.stringify(data));

    resolve(req, reqId);
    res.json({ success: true });
}
