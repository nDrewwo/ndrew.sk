document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = "https://api.ndrew.sk/minute-by-minute";

    // Function to format the timestamp (optional, you can adjust this)
    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        // Format as YYYY-MM-DD HH:MM
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hr = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${hr}:${min}`;
    }

    // Fetch data and update DOM
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("minute-by-minute");
            container.innerHTML = ""; // Clear existing content

            data.forEach(item => {
                const row = document.createElement("div");
                row.className = "rowNews";

                const timeSpan = document.createElement("span");
                timeSpan.className = "timeStamp";
                timeSpan.textContent = formatTimestamp(item.created_at) + ":";

                const newsSpan = document.createElement("span");
                newsSpan.className = "newsText";
                newsSpan.textContent = item.news_text;

                row.appendChild(timeSpan);
                row.appendChild(newsSpan);
                container.appendChild(row);
            });
        })
        .catch(err => {
            console.error("Failed to load news:", err);
        });
});
