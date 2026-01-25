// Fetches the status data from /ping endpoint and updates the corresponding h2 elements
async function fetchStatus() {
    try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const pingUrl = isLocalhost ? 'http://localhost:3002/ping' : 'https://api.ndrew.sk/ping';
        const response = await fetch(pingUrl); // Make the API request
        const data = await response.json(); // Parse the JSON response
        // Mapping of URLs to their corresponding h2 element 
        const statusMap = {
            "https://ndrew.sk": "ndrewSkStatus",
            "https://adinomart.ndrew.sk": "adinoMartStatus",
            "https://quotes.ndrew.sk": "quotesStatus",
            "https://labak.ndrew.sk": "labakStatus"

        };
        // Iterate over the response and update the corresponding elements
        data.forEach(item => {
            const elementId = statusMap[item.url]; // Get the corresponding element ID
            const statusElement = document.getElementById(elementId);
            if (statusElement) {
                statusElement.textContent = item.status; // Simply set the text content
            }
        });
    } catch (error) {
        console.error('Error fetching status:', error);
    }
}

// Call the function when the page loads
window.onload = fetchStatus();