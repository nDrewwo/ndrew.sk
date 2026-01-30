document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.querySelector('input[name="search"]');

  // Get search parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search');
  if (searchParam) {
    searchInput.value = searchParam;
  }
  
  // Apply filter after quotes are loaded
  document.addEventListener('quotesLoaded', function() {
    if (searchParam) {
      filterQuotes(searchParam.toLowerCase());
    }
  });

  // Add search functionality
  searchInput.addEventListener('input', function () {
    const searchTerm = searchInput.value.toLowerCase();
    filterQuotes(searchTerm);
    updateURLParameter('search', searchInput.value);
  });

  function filterQuotes(searchTerm) {
    const quoteContainers = document.querySelectorAll('.quoteContainer');
    
    quoteContainers.forEach(container => {
      const quoteText = container.querySelector('.quote').textContent.toLowerCase();
      const authorText = container.querySelector('.author').textContent.toLowerCase();
      
      if (quoteText.includes(searchTerm) || authorText.includes(searchTerm)) {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  }

  function updateURLParameter(param, value) {
    const url = new URL(window.location);
    if (value && value.trim() !== '') {
      url.searchParams.set(param, value);
    } else {
      url.searchParams.delete(param);
    }
    window.history.replaceState({}, '', url);
  }
});
