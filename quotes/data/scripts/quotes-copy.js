document.addEventListener('DOMContentLoaded', function () {
  // Attach copy listeners after a small delay to ensure DOM is ready
  setTimeout(() => {
    attachCopyListeners();
  }, 100);

  // Also listen for dynamically added quotes (e.g., after search)
  const observer = new MutationObserver(() => {
    attachCopyListeners();
  });

  observer.observe(document.querySelector('.windowContent'), {
    childList: true,
    subtree: true,
  });

  function attachCopyListeners() {
    const copyElements = document.querySelectorAll('.copy:not([data-listener])');
    copyElements.forEach(copyElement => {
      copyElement.setAttribute('data-listener', 'true');
      copyElement.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const quoteContainer = copyElement.closest('.quoteContainer');
        const quoteText = quoteContainer.querySelector('.quote').textContent;
        const authorText = quoteContainer.querySelector('.author').textContent;
        copyToClipboard(quoteText, authorText);
      });
    });
  }

  function copyToClipboard(quoteText, authorText) {
    // Remove the quotes from the quote text if present
    const cleanQuote = quoteText.replace(/^[""]|[""]$/g, '');
    // Format: "quote"\n- author
    const formattedQuote = `"${cleanQuote}"\n${authorText}`;
    
    // Use the modern Clipboard API if available, otherwise fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(formattedQuote).catch(err => {
        console.error('Failed to copy: ', err);
        fallbackCopy(formattedQuote);
      });
    } else {
      fallbackCopy(formattedQuote);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
});
