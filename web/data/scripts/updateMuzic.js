// Function to update the music status
function updateMusicStatus(data) {
    document.getElementById('songTitle').textContent = data.name;
    document.getElementById('songArtist').textContent = data.artist;
    document.getElementById('muzicstatus').textContent = data.status;
    document.getElementById('songCover').src = data.albumArt; // Update the song cover image
}

const api = 'http://localhost:3000'; // Replace with your API URL

// Function to fetch data from the given endpoint
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
    const currentlyPlayingUrl = api + '/currently-playing'; // Replace with your API URL
    const lastPlayedUrl = api + '/last-played'; // Replace with your API URL

    let data = await fetchMusicData(currentlyPlayingUrl);

    if (data && data.name && data.artist && data.albumArt) {
        // Update with currently playing info
        updateMusicStatus({
            name: data.name,
            artist: data.artist,
            albumArt: data.albumArt,
            status: 'Currently playing'
        });
    } else {
        // Fetch last played info if the currently playing info is incomplete
        data = await fetchMusicData(lastPlayedUrl);
        if (data && data.name && data.artist && data.albumArt && data.playedAt) {
            // Update with last played info
            updateMusicStatus({
                name: data.name,
                artist: data.artist,
                albumArt: data.albumArt,
                status: `Last played ${data.playedAt}`
            });
        } else {
            // Handle case where both endpoints fail or provide incomplete data
            console.error('Both endpoints returned incomplete data.');
        }
    }
}

fetchMusicData(api + '/refresh-token');
handleMusicUpdate();