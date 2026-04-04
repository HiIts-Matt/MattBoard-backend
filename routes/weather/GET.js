import { IdHandler } from '../../utils/utils.js';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

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
        current_weather: true,
        daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        temperature_unit: units,
        timezone: 'auto',
        forecast_days: 7,
        hourly: 'temperature_2m,weathercode,precipitation_probability',
    });

    try {
        const response = await fetch(`${BASE_URL}?${params}`);
        if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);
        const data = await response.json();
        resolve(req, reqId);
        res.json({
            current_weather: data.current_weather,
            daily: data.daily,
            hourly: getHourlyForTimePeriod(data, 24),
        });
    } catch (err) {
        error(req, reqId)
        res.status(502).json({ error: 'Failed to fetch weather data' });
    }
};

const getHourlyForTimePeriod = (data, hours) => {
    const currentTime = data.current_weather.time.slice(0, 13) + ':00';
    const currentIdx = data.hourly.time.indexOf(currentTime);
    const hourly = currentIdx === -1
        ? null
        : {
            time: data.hourly.time.slice(currentIdx, currentIdx + hours),
            temperature_2m: data.hourly.temperature_2m.slice(currentIdx, currentIdx + 24),
            weathercode: data.hourly.weathercode.slice(currentIdx, currentIdx + 24),
            precipitation_probability: data.hourly.precipitation_probability.slice(currentIdx, currentIdx + 24),
        }

    return hourly
}