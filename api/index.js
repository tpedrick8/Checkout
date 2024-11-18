const axios = require('axios');
const homerooms = require('../homerooms'); // Adjust the path if needed

const destinyApiUrl = "https://lmc.isb.cn/api/v1/rest/context/destiny";
let accessToken = null;
let tokenExpiration = null;

async function fetchAccessToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);

    const response = await axios.post(`${destinyApiUrl}/auth/accessToken`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    accessToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000);
}

async function ensureAccessToken() {
    if (!accessToken || Date.now() >= tokenExpiration) {
        await fetchAccessToken();
    }
}

module.exports = async (req, res) => {
    if (req.url === '/homerooms') {
        try {
            await ensureAccessToken();
            res.status(200).json(Object.keys(homerooms));
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch homerooms' });
        }
    } else if (req.url.startsWith('/homerooms/')) {
        const homeroom = req.url.split('/')[2];
        const districtIds = homerooms[homeroom];
        if (!districtIds) {
            return res.status(404).json({ error: 'Homeroom not found' });
        }

        try {
            await ensureAccessToken();
            const students = await Promise.all(
                districtIds.map(async (districtId) => {
                    const studentData = await axios.get(
                        `${destinyApiUrl}/circulation/patrons/${districtId}/status`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                    return studentData.data;
                })
            );
            res.status(200).json(students);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch students' });
        }
    } else {
        res.status(404).json({ error: 'Route not found' });
    }
};
