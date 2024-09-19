// Define the API URL as a constant
const API = 'http://localhost:3000';
//const API = 'https://api.ndrew.sk';

// Fetches the status data from /ping endpoint and updates the corresponding h2 elements
async function fetchStatus() {
    try {
        const response = await fetch(API + '/ping'); // Make the API request
        const data = await response.json(); // Parse the JSON response
        // Mapping of URLs to their corresponding h2 element IDs
        const statusMap = {
            "https://ndrew.sk": "ndrewSkStatus",
            "https://obedik.ndrew.sk": "obedikStatus",
            "https://quotes.ndrew.sk": "quotesStatus"
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
window.onload = fetchStatus;