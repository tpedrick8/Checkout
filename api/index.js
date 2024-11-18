const axios = require('axios');
const homerooms = require('../homerooms'); // Import homerooms data

const destinyApiUrl = "https://lmc.isb.cn/api/v1/rest/context/destiny";
let accessToken = null;
let tokenExpiration = null;

// Fetch a new access token
async function fetchAccessToken() {
    console.log("Fetching new access token...");
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);

    const response = await axios.post(`${destinyApiUrl}/auth/accessToken`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    accessToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000);
    console.log("New access token retrieved successfully:", accessToken);
}

// Ensure a valid access token
async function ensureAccessToken() {
    if (!accessToken || Date.now() >= tokenExpiration) {
        await fetchAccessToken();
    }
}

// Main handler for API requests
module.exports = async (req, res) => {
    console.log("Request received:", req.url);

    if (req.url === '/homerooms') {
        // Handle `/api/homerooms`
        console.log("Fetching homerooms...");
        try {
            await ensureAccessToken();
            res.status(200).json(Object.keys(homerooms)); // Send homeroom names to the client
        } catch (error) {
            console.error("Error fetching homerooms:", error.message);
            res.status(500).json({ error: 'Failed to fetch homerooms' });
        }
    } else if (req.url.startsWith('/homerooms/')) {
        // Handle `/api/homerooms/:homeroom/students`
        const homeroom = req.url.split('/')[2];
        const districtIds = homerooms[homeroom];

        if (!districtIds) {
            console.error(`Error: Homeroom "${homeroom}" not found.`);
            return res.status(404).json({ error: 'Homeroom not found' });
        }

        console.log(`Fetching data for Homeroom: ${homeroom}, District IDs: ${JSON.stringify(districtIds)}`);

        try {
            await ensureAccessToken();
            const students = await Promise.all(
                districtIds.map(async (districtId) => {
                    try {
                        const response = await axios.get(
                            `${destinyApiUrl}/circulation/patrons/${districtId}/status`,
                            { headers: { Authorization: `Bearer ${accessToken}` } }
                        );

                        const patron = response.data;
                        const booksCheckedOut = patron.itemsOut ? patron.itemsOut.length : 0;

                        const today = new Date();
                        const overdueBooks = patron.itemsOut
                            ? patron.itemsOut.filter(item => new Date(item.dateDue) < today).length
                            : 0;

                        const startingBooks = homeroom.startsWith("3") || homeroom.startsWith("4") || homeroom.startsWith("5") ? 5 : 3;
                        let finalAllowance = startingBooks - booksCheckedOut;

                        if (finalAllowance < 1 || overdueBooks > 0) {
                            finalAllowance = 1;
                        }

                        return {
                            name: `${patron.firstName || 'Unknown'} ${patron.lastName || ''}`.trim(),
                            nickname: patron.nickName || 'No Nickname',
                            booksCheckedOut,
                            overdueBooks,
                            finalAllowance,
                        };
                    } catch (error) {
                        console.error(`Error fetching data for District ID ${districtId}:`, error.message);
                        return {
                            name: "Unknown",
                            nickname: "No Nickname",
                            booksCheckedOut: 0,
                            overdueBooks: 0,
                            finalAllowance: 1,
                        };
                    }
                })
            );

            res.status(200).json(students);
        } catch (error) {
            console.error(`Error fetching student data:`, error.message);
            res.status(500).json({ error: 'Failed to fetch students' });
        }
    } else {
        console.error(`Route not found: ${req.url}`);
        res.status(404).json({ error: 'Route not found' });
    }
};
