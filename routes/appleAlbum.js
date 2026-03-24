import { Router } from 'express';

const router = Router();

const BASE_URL = 'https://p000-sharedstreams.icloud.com';
const ALBUM_TOKEN = process.env.APPLE_ALBUM_TOKEN;

async function fetchAlbumPhotos() {
    const response = await fetch(`${BASE_URL}/`)
}