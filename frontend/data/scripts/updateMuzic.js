// Function to update the music status
function updateMusicStatus(data) {
    document.getElementById('songTitle').textContent = data.name;
    document.getElementById('songArtist').textContent = data.artist;
    document.getElementById('muzicstatus').textContent = data.status;
    document.getElementById('songCover').src = data.albumArt; // Update the song cover image
    
    // Show/hide the spinning disk based on playing status
    const spinImage = document.getElementById('spin-image');
    if (data.status === 'Currently playing') {
        spinImage.style.display = 'block';
    } else {
        spinImage.style.display = 'none';
    }
}

// Function to fetch data from the new endpoint
async function fetchMusicData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Main function to handle the logic
async function handleMusicUpdate() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const musicUrl = isLocalhost ? 'http://localhost:3002/music' : 'https://api.ndrew.sk/music';

    const data = await fetchMusicData(musicUrl);

    if (data && data.name && data.artist && data.albumArt) {
        // Update with currently playing or last played info
        updateMusicStatus({
            name: data.name,
            artist: data.artist,
            albumArt: data.albumArt,
            status: data.playedAt ? `Last played ${data.playedAt}` : 'Currently playing'
        });
    } else {
        // Handle case where the endpoint provides incomplete data
        console.error('Endpoint returned incomplete data.');
    }
}

handleMusicUpdate();