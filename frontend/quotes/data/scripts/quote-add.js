document.getElementById('quoteForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const quoteInput = document.getElementById('quote');
    const authorInput = document.getElementById('author');
    const submitButton = document.querySelector('button[type="submit"]');

    if (submitButton.disabled) return; // Prevent multiple clicks

    submitButton.disabled = true; // Disable button

    const author = authorInput.value.trim();
    const quote = quoteInput.value.trim();

    // Validate inputs
    if (!author || !quote) {
        console.error('Both quote and author are required');
        submitButton.disabled = false;
        return;
    }

    fetch('https://api.ndrew.sk/add-quote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            author: author,
            quote: quote,
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // Clear form
        quoteInput.value = '';
        authorInput.value = '';
        // Redirect to quotes page
        window.location.href = "https://quotes.ndrew.sk";
    })
    .catch((error) => {
        console.error('Error:', error);
        submitButton.disabled = false; // Re-enable button on failure
    });
});
