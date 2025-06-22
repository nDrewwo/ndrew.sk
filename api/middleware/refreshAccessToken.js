const fetch = require('node-fetch');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const refresh_token = process.env.REFRESH_TOKEN;

const refreshAccessToken = () => {
const authOptions = {
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
    }),
};

return fetch('https://accounts.spotify.com/api/token', authOptions)
    .then((response) => response.json())
    .then((data) => {
        if (!data.access_token) {
            throw new Error('Failed to refresh access token');
        }
        return data.access_token;
    });
};

module.exports = refreshAccessToken;
