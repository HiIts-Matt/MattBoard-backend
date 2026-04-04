import { google } from 'googleapis';
import { getAuthenticatedClient } from '../../utils/googleAuth.js';
import { IdHandler } from '../../utils/utils.js';

const { receive, resolve, error } = IdHandler();

export default async function handler(req, res) {
    const reqId = receive(req);

    const auth = getAuthenticatedClient();
    if (!auth) {
        error(req, reqId);
        return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { id } = req.params;
    const { calendarId = 'primary', title, start, end, allDay, description, location } = req.body;

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
        summary: title,
        description,
        location,
        start: allDay ? { date: start } : { dateTime: start },
        end: allDay ? { date: end ?? start } : { dateTime: end ?? start },
    };

    try {
        const response = await calendar.events.patch({ calendarId, eventId: id, requestBody: event });
        const e = response.data;

        resolve(req, reqId);
        res.json({
            id: e.id,
            title: e.summary,
            start: e.start?.dateTime ?? e.start?.date,
            end: e.end?.dateTime ?? e.end?.date,
            allDay: !e.start?.dateTime,
            description: e.description ?? '',
            location: e.location ?? '',
        });
    } catch (err) {
        error(req, reqId);
        res.status(502).json({ error: 'Failed to update event' });
    }
}
