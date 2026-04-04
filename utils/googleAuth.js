import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const TOKEN_FILE = './storage/google_token.json';

export function createOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

export function loadToken() {
    if (!existsSync(TOKEN_FILE)) return null;
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
}

export function saveToken(token) {
    writeFileSync(TOKEN_FILE, JSON.stringify(token));
}

export function getAuthenticatedClient() {
    const client = createOAuthClient();
    const token = loadToken();
    if (!token) return null;
    client.setCredentials(token);

    // Auto-save refreshed tokens
    client.on('tokens', (newTokens) => {
        const current = loadToken() ?? {};
        saveToken({ ...current, ...newTokens });
    });

    return client;
}
