const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const FEATURE_TOGGLE_URL = isLocalhost ? 'http://localhost:3002/feature-toggles' : 'https://api.ndrew.sk/feature-toggles';
const BREAKING_NEWS_URL = isLocalhost ? 'http://localhost:3002/breaking-news' : 'https://api.ndrew.sk/breaking-news';

const CACHE_KEY_FEATURES = 'featureToggles';
const CACHE_KEY_NEWS = 'breakingNews';
const CACHE_KEY_NSFW_QUOTES = 'nsfwQuotes';

const CACHE_TIME = 1 * 60 * 1000; // 1 Minute

async function getFeatureToggles() {
  const cached = localStorage.getItem(CACHE_KEY_FEATURES);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TIME) {
      return data;
    }
  }

  const response = await fetch(FEATURE_TOGGLE_URL);
  if (!response.ok) throw new Error('Failed to fetch feature toggles');
  const data = await response.json();

  localStorage.setItem(CACHE_KEY_FEATURES, JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
}

async function getBreakingNews() {
  const cached = localStorage.getItem(CACHE_KEY_NEWS);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TIME) {
      return data;
    }
  }

  const response = await fetch(BREAKING_NEWS_URL);
  if (!response.ok) throw new Error('Failed to fetch breaking news');
  const data = await response.json();

  localStorage.setItem(CACHE_KEY_NEWS, JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
}

function renderBreakingNews() {
  const container = document.getElementById('featureContainer');

  const html = `
    <div class="window">
      <div class="topbar">
        <div class="nametag">
          <h1>Breaking News</h1>
        </div>
        <img src="https://cdn.ndrew.sk/icons/ndrew.sk/exit.png" alt="imagegoezhere" class="exiticon">
      </div>
      <div class="widowContent" id="qotd">
        <marquee id="news" direction="left"></marquee>
        <a href="https://ndrew.sk/minute-by-minute" class="href">Minute by Minute</a>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
}

function renderNsfwQuotes() {
  const container = document.getElementById('featureContainer');

  const html = `
    <div class="window">
      <div class="topbar">
        <div class="nametag">
          <h1>NSFW Quotes</h1>
        </div>
        <img src="https://cdn.ndrew.sk/icons/ndrew.sk/exit.png" alt="imagegoezhere" class="exiticon">
      </div>
      <div class="widowContent" id="nsfwQuoteContent">
        <p id="nsfwQuote"></p>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
}

async function loadBreakingNews() {
  const newsData = await getBreakingNews();

  const marquee = document.getElementById('news');
  if (marquee) {
    marquee.innerHTML = ''; // clear existing content
    newsData.forEach(item => {
      marquee.innerHTML += item.news_text + ' ';
    });
  }
}

async function loadNsfwQuotes() {
  const quoteElement = document.getElementById('nsfwQuote');
  if (quoteElement && window.getQuote) {
    const nsfwQuote = window.getQuote(true); // Pass true for NSFW quotes
    quoteElement.textContent = nsfwQuote;
  }
}

async function initFeatures() {
  try {
    const toggles = await getFeatureToggles();

    const breakingNews = toggles.find(f => f.name === 'breakingNews' && f.value === 1);
    if (breakingNews) {
      renderBreakingNews();
      loadBreakingNews();
    }

    const nsfwQuotes = toggles.find(f => f.name === 'nsfwQuotes' && f.value === 1);
    if (nsfwQuotes) {
      renderNsfwQuotes();
      loadNsfwQuotes();
    }

    // You can check here for more features :3

  } catch (err) {
    console.error('Feature load error:', err);
  }
}

window.onload = initFeatures;
