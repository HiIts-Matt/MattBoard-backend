import { google } from 'googleapis';
import { getAuthenticatedClient } from '../../utils/googleAuth.js';

export default async function handler(req, res) {
    const auth = getAuthenticatedClient();
    if (!auth) return res.status(401).json({ error: 'Not authenticated' });

    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const response = await calendar.calendarList.list({ minAccessRole: 'writer' });
        const calendars = (response.data.items ?? []).map(c => ({
            id: c.id,
            name: c.summary,
            primary: c.primary ?? false,
        }));
        res.json({ calendars });
    } catch {
        res.status(502).json({ error: 'Failed to fetch calendar list' });
    }
}
