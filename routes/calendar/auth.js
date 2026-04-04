import { createOAuthClient, saveToken } from '../../utils/googleAuth.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function authRedirect(req, res) {
    const client = createOAuthClient();
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
    });
    res.redirect(url);
}

export async function authCallback(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    saveToken(tokens);
    res.send('Authentication successful! You can close this tab.');
}
