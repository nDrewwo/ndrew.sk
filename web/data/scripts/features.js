// const FEATURE_TOGGLE_URL = 'http://localhost:3000/feature-toggles';
// const BREAKING_NEWS_URL = 'http://localhost:3000/breaking-news';
const FEATURE_TOGGLE_URL = 'https://api.ndrew.sk/feature-toggles';
const BREAKING_NEWS_URL = 'https://api.ndrew.sk/breaking-news';

const CACHE_KEY_FEATURES = 'featureToggles';
const CACHE_KEY_NEWS = 'breakingNews';

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
          <img src="data/assets/crown.png" alt="imagegoezhere">
        </div>
        <img src="data/assets/exit.png" alt="imagegoezhere" class="exiticon">
      </div>
      <div class="widowContent" id="qotd">
        <marquee id="news" direction="left"></marquee>
        <a href="https://ndrew.sk/minute-by-minute" class="href">Minute by Minute</a>
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

async function initFeatures() {
  try {
    const toggles = await getFeatureToggles();

    const breakingNews = toggles.find(f => f.name === 'breakingNews' && f.value === 1);
    if (breakingNews) {
      renderBreakingNews();
      loadBreakingNews();
    }

    // You can check here for more features :3

  } catch (err) {
    console.error('Feature load error:', err);
  }
}

window.onload = initFeatures;
