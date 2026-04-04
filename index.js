import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import appleAlbumRouter from './routes/appleAlbum.js';
import healthRouter from './routes/health.js'

import toDoGet from './routes/toDo/GET.js';
import toDoPost from './routes/toDo/POST.js';
import toDoPut from './routes/toDo/PUT.js';

import weatherGet from './routes/weather/GET.js';
import newsGet from './routes/news/GET.js'

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/apple-album', appleAlbumRouter);
app.get('/weather', weatherGet);
app.get('/news', newsGet);

app.get('/todo', toDoGet);
app.post('/todo', toDoPost);
app.put('/todo', toDoPut);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});