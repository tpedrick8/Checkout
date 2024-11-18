require('dotenv').config();
const axios = require('axios');

const destinyAuthUrl = "https://lmc.isb.cn/api/v1/rest/context/destiny/auth/accessToken";
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

async function fetchAccessToken() {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);

        const response = await axios.post(destinyAuthUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        console.log("Access Token:", response.data.access_token);
        console.log("Expires In:", response.data.expires_in);
    } catch (error) {
        console.error("Error fetching access token:", error.response ? error.response.data : error.message);
    }
}

fetchAccessToken();
