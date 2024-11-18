document.getElementById('fetchReport').addEventListener('click', async () => {
    try {
        const response = await fetch('http://localhost:3000/api/report');
        const reportData = await response.json();
        document.getElementById('reportData').textContent = JSON.stringify(reportData, null, 2);
    } catch (error) {
        console.error('Error fetching report:', error);
    }
});
