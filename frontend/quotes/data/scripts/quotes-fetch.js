document.addEventListener('DOMContentLoaded', function () {
  const windowContent = document.querySelector('.windowContent');

  // Fetch and display quotes
  fetch('https://api.ndrew.sk/quotes')
    .then(response => response.json())
    .then(data => {
      // Shuffle the quotes
      const shuffledQuotes = shuffleArray(data);
      
      // Create and display quote elements
      createQuoteElements(shuffledQuotes);
    })
    .catch(error => console.error('Error fetching quotes:', error));

  function createQuoteElements(quotes) {
    // Remove placeholder quotes (any existing quoteContainers)
    const existingContainers = document.querySelectorAll('.quoteContainer');
    existingContainers.forEach(container => container.remove());

    quotes.forEach(quoteData => {
      const quoteContainer = document.createElement('div');
      quoteContainer.classList.add('quoteContainer');

      const quoteText = document.createElement('p');
      quoteText.classList.add('quote');
      quoteText.textContent = `"${quoteData.quote}"`;

      const authorAndCopy = document.createElement('div');
      authorAndCopy.classList.add('author-and-copy');

      const author = document.createElement('p');
      author.classList.add('author');
      author.textContent = `- ${quoteData.author}`;

      const copy = document.createElement('p');
      copy.classList.add('copy');
      copy.textContent = 'Copy';

      authorAndCopy.appendChild(author);
      authorAndCopy.appendChild(copy);

      quoteContainer.appendChild(quoteText);
      quoteContainer.appendChild(authorAndCopy);

      windowContent.appendChild(quoteContainer);
    });
    
    // Dispatch event after quotes are loaded
    document.dispatchEvent(new CustomEvent('quotesLoaded'));
  }

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
});
