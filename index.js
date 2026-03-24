import express from 'express';
import 'dotenv/config';
import appleAlbumRouter from './routes/appleAlbum.js';
import healthRouter from './routes/health.js'

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.use('/health', healthRouter);
app.use('/apple-album', appleAlbumRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});