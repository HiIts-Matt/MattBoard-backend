import { createOAuthClient, saveToken, loadToken, deleteToken } from '../../utils/googleAuth.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function authRedirect(_req, res) {
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

    res.send(`<!DOCTYPE html><html><body>
<p style="font-family:sans-serif;text-align:center;margin-top:40px">Connected to Google Calendar. Closing...</p>
<script>
  window.close();
  setTimeout(() => {
    const url = ${JSON.stringify(process.env.FRONTEND_URL ?? '')};
    if (url) window.location.href = url;
  }, 1500);
</script>
</body></html>`);
}

export function authStatus(_req, res) {
    const token = loadToken();
    res.json({ connected: token !== null });
}

export async function authDisconnect(_req, res) {
    deleteToken();
    res.json({ success: true });
}
