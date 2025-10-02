async function fetchPoem() {
    try {
        const poemUrl =  'https://api-quotes.ndrew.sk/randompoem';
        const response = await fetch(poemUrl);
        const data = await response.json();

        // Get the poem text
        let poem = data.poem;

        // Append the author on a new line
        poem += `<br/>- ${data.author}`;

        // Insert the final poem into the DOM
        document.getElementById('poem-container').innerHTML = poem;
    } catch (error) {
        console.error('Error fetching the poem:', error);
    }
}

// Call the function to fetch and display the poem
fetchPoem();