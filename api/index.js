const axios = require('axios');
const homerooms = require('../homerooms'); // Adjust path if necessary

const destinyApiUrl = "https://lmc.isb.cn/api/v1/rest/context/destiny";
let accessToken = null;
let tokenExpiration = null;

// Fetch a new access token
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

// Ensure a valid access token
async function ensureAccessToken() {
    if (!accessToken || Date.now() >= tokenExpiration) {
        await fetchAccessToken();
    }
}

// Main handler for API requests
module.exports = async (req, res) => {
    console.log("Request received:", req.url); // Log the requested URL

    if (req.url === '/homerooms') {
        // Handle `/api/homerooms`
        console.log("Fetching homerooms...");
        try {
            await ensureAccessToken(); // Ensure token is valid (optional if not required here)
            console.log("Homerooms fetched successfully.");
            res.status(200).json(Object.keys(homerooms));
        } catch (error) {
            console.error("Error fetching homerooms:", error.message);
            res.status(500).json({ error: 'Failed to fetch homerooms' });
        }
    } else if (req.url.startsWith('/homerooms/')) {
        // Handle `/api/homerooms/:homeroom`
        const homeroom = req.url.split('/')[2];
        console.log(`Fetching data for homeroom: ${homeroom}`);
        const districtIds = homerooms[homeroom];

        if (!districtIds) {
            console.error(`Homeroom "${homeroom}" not found.`);
            return res.status(404).json({ error: 'Homeroom not found' });
        }

        try {
            await ensureAccessToken(); // Ensure token is valid
            const students = await Promise.all(
                districtIds.map(async (districtId) => {
                    try {
                        const response = await axios.get(
                            `${destinyApiUrl}/circulation/patrons/${districtId}/status`,
                            { headers: { Authorization: `Bearer ${accessToken}` } }
                        );
                        return response.data; // Return student data
                    } catch (error) {
                        console.error(`Error fetching data for District ID ${districtId}:`, error.message);
                        return { error: `Failed to fetch data for District ID ${districtId}` };
                    }
                })
            );
            console.log("Students fetched successfully.");
            res.status(200).json(students);
        } catch (error) {
            console.error("Error fetching students:", error.message);
            res.status(500).json({ error: 'Failed to fetch students' });
        }
    } else {
        // Handle unrecognized routes
        console.error(`Route not found: ${req.url}`);
        res.status(404).json({ error: 'Route not found' });
    }
};
