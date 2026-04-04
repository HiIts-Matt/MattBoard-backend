import { google } from 'googleapis';
import { getAuthenticatedClient } from '../../utils/googleAuth.js';
import { IdHandler } from '../../utils/utils.js';

const { receive, resolve, error } = IdHandler();

export default async function handler(req, res) {
    const reqId = receive(req);

    const auth = getAuthenticatedClient();
    if (!auth) {
        error(req, reqId);
        return res.status(401).json({ error: 'Not authenticated. Visit /calendar/auth to connect Google Calendar.' });
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const { calendarId = 'primary', timeMin, timeMax } = req.query;

    try {
        const response = await calendar.events.list({
            calendarId,
            timeMin: timeMin ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            timeMax: timeMax ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 250,
        });

        const events = (response.data.items ?? []).map(e => ({
            id: e.id,
            title: e.summary ?? '(No title)',
            start: e.start?.dateTime ?? e.start?.date,
            end: e.end?.dateTime ?? e.end?.date,
            allDay: !e.start?.dateTime,
            description: e.description ?? '',
            location: e.location ?? '',
            color: e.colorId ?? null,
        }));

        resolve(req, reqId);
        res.json({ events });
    } catch (err) {
        error(req, reqId);
        res.status(502).json({ error: 'Failed to fetch calendar events' });
    }
}
