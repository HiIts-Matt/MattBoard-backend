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
    const { calendarId = 'primary' } = req.query;
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        await calendar.events.delete({ calendarId, eventId: id });
        resolve(req, reqId);
        res.json({ success: true });
    } catch (err) {
        error(req, reqId);
        res.status(502).json({ error: 'Failed to delete event' });
    }
}
