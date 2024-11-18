const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    console.log("Request received:", req.url);

    if (req.url === '/homerooms') {
        // Serve static homerooms.json
        const filePath = path.join(__dirname, '../public/homerooms.json');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading homerooms.json:", err);
                return res.status(500).json({ error: 'Failed to load homerooms' });
            }

            try {
                const homerooms = JSON.parse(data);
                res.status(200).json(Object.keys(homerooms));
            } catch (parseError) {
                console.error("Error parsing homerooms.json:", parseError);
                res.status(500).json({ error: 'Invalid JSON format' });
            }
        });
    } else if (req.url.startsWith('/homerooms/')) {
        const homeroom = req.url.split('/')[2];
        const filePath = path.join(__dirname, '../public/homerooms.json');

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading homerooms.json:", err);
                return res.status(500).json({ error: 'Failed to load homerooms' });
            }

            try {
                const homerooms = JSON.parse(data);
                const districtIds = homerooms[homeroom];
                if (!districtIds) {
                    console.error(`Homeroom "${homeroom}" not found.`);
                    return res.status(404).json({ error: 'Homeroom not found' });
                }

                ensureAccessToken()
                    .then(() => {
                        Promise.all(
                            districtIds.map(async (districtId) => {
                                try {
                                    const response = await axios.get(
                                        `${destinyApiUrl}/circulation/patrons/${districtId}/status`,
                                        { headers: { Authorization: `Bearer ${accessToken}` } }
                                    );
                                    return response.data;
                                } catch (error) {
                                    console.error(`Error fetching data for District ID ${districtId}:`, error.message);
                                    return { error: `Failed to fetch data for District ID ${districtId}` };
                                }
                            })
                        )
                            .then((students) => res.status(200).json(students))
                            .catch((error) => {
                                console.error("Error fetching students:", error.message);
                                res.status(500).json({ error: 'Failed to fetch students' });
                            });
                    })
                    .catch((error) => {
                        console.error("Error ensuring access token:", error.message);
                        res.status(500).json({ error: 'Failed to ensure access token' });
                    });
            } catch (parseError) {
                console.error("Error parsing homerooms.json:", parseError);
                res.status(500).json({ error: 'Invalid JSON format' });
            }
        });
    } else {
        res.status(404).json({ error: 'Route not found' });
    }
};
