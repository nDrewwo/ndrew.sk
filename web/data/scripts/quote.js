document.addEventListener('DOMContentLoaded', () => {
    const endpoint = 'https://api-quotes.ndrew.sk/random-mquote';

    fetch(endpoint)
        .then(response => response.json())
        .then(data => {
            const quoteText = `"${data.quote}" - ${data.author}`;
            document.getElementById('quotemarquee').textContent = quoteText;
        })
        .catch(error => console.error('Error fetching the quote:', error));
});