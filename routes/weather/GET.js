import https from 'node:https';
import { IdHandler } from '../../utils/utils.js';

const httpsGet = (url) => new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'MattBoard/1.0' } }, (r) => {
        let raw = '';
        r.on('data', chunk => raw += chunk);
        r.on('end', () => res({ ok: r.statusCode < 400, status: r.statusCode, json: () => JSON.parse(raw) }));
    }).on('error', rej);
});

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes
const cache = new Map();

const {
    receive,
    resolve,
    error
} = IdHandler();

export default async function handler(req, res) {

    const reqId = receive(req)

    const { lat, lon, units = 'celsius' } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: 'lat and lon are required' });
    }

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,weather_code,wind_speed_10m,is_day',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        temperature_unit: units,
        timezone: 'auto',
        forecast_days: 7,
        hourly: 'temperature_2m,weather_code,precipitation_probability',
    })

    try {
        const cacheKey = `${lat},${lon},${units}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            resolve(req, reqId);
            return res.json(cached.data);
        }

        const response = await httpsGet(`${BASE_URL}?${params}`);
        if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);
        const raw = await response.json();
        const data = {
            current_weather: raw.current,
            daily: raw.daily,
            hourly: getHourlyForTimePeriod(raw, 24),
        };
        cache.set(cacheKey, { data, ts: Date.now() });
        resolve(req, reqId);
        res.json(data);
    } catch (err) {
        console.error(err)
        error(req, reqId)
        res.status(502).json({ error: 'Failed to fetch weather data' });
    }
};

const getHourlyForTimePeriod = (data, hours) => {
    const currentTime = data.current.time.slice(0, 13) + ':00';
    const currentIdx = data.hourly.time.indexOf(currentTime);
    const hourly = currentIdx === -1
        ? null
        : {
            time: data.hourly.time.slice(currentIdx, currentIdx + hours),
            temperature_2m: data.hourly.temperature_2m.slice(currentIdx, currentIdx + 24),
            weather_code: data.hourly.weather_code.slice(currentIdx, currentIdx + 24),
            precipitation_probability: data.hourly.precipitation_probability.slice(currentIdx, currentIdx + 24),
        }

    return hourly
}