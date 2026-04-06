import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import appleAlbumRouter from './routes/appleAlbum.js';
import healthRouter from './routes/health.js'

import toDoGet from './routes/toDo/GET.js';
import toDoPost from './routes/toDo/POST.js';
import toDoPut from './routes/toDo/PUT.js';

import weatherGet from './routes/weather/GET.js';
import newsGet from './routes/news/GET.js';

import configGet from './routes/config/GET.js';
import configPut from './routes/config/PUT.js';

import { authRedirect, authCallback, authStatus, authDisconnect } from './routes/calendar/auth.js';
import calendarGet from './routes/calendar/GET.js';
import calendarPost from './routes/calendar/POST.js';
import calendarPut from './routes/calendar/PUT.js';
import calendarDelete from './routes/calendar/DELETE.js';

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/apple-album', appleAlbumRouter);
app.get('/weather', weatherGet);
app.get('/news', newsGet);

app.get('/config', configGet);
app.put('/config', configPut);

app.get('/todo', toDoGet);
app.post('/todo', toDoPost);
app.put('/todo', toDoPut);

app.get('/calendar/auth', authRedirect);
app.get('/calendar/auth/callback', authCallback);
app.get('/calendar/auth/status', authStatus);
app.delete('/calendar/auth', authDisconnect);
app.get('/calendar/events', calendarGet);
app.post('/calendar/events', calendarPost);
app.put('/calendar/events/:id', calendarPut);
app.delete('/calendar/events/:id', calendarDelete);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});