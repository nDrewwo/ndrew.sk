document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayData('/anime', 'anime');
    fetchAndDisplayData('/manga', 'manga');
    fetchAndDisplayData('/movies', 'movies');
});

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

async function fetchAndDisplayData(endpoint, containerId) {
    try {
        const baseUrl = isLocalhost ? 'http://localhost:3002' : 'https://api.ndrew.sk';
        const response = await fetch(`${baseUrl}${endpoint}`);
        const data = await response.json();
        const container = document.getElementById(containerId);

        data.forEach(item => {
            const nContainer = document.createElement('div');
            nContainer.classList.add('nContainer');

            const img = document.createElement('img');
            img.src = item.cover_image;
            img.alt = item.title;

            const nInfo = document.createElement('div');
            nInfo.classList.add('nInfo');

            const title = document.createElement('h1');
            title.classList.add('title');
            title.textContent = item.title;

            const author = document.createElement('h2');
            author.classList.add('author');
            author.textContent = `By ${item.author}`;

            const status = document.createElement('h2');
            status.classList.add('status');
            status.textContent = item.status;

            const rating = document.createElement('h2');
            rating.classList.add('rating');
            rating.textContent = `${item.rating}/10`;

            nInfo.appendChild(title);
            nInfo.appendChild(author);
            nInfo.appendChild(status);
            nInfo.appendChild(rating);
            nContainer.appendChild(img);
            nContainer.appendChild(nInfo);
            container.appendChild(nContainer);
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}