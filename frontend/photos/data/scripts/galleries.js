const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const apiBase = isLocalhost ? 'http://localhost:3002' : 'https://api.ndrew.sk';
const cdnBase = isLocalhost ? 'http://localhost:3000' : 'https://cdn.ndrew.sk';

function createLightbox() {
  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.innerHTML = '<img id="lb-img"><span id="lb-close">×</span>';
  document.body.appendChild(lb);

  const close = () => {
    lb.style.display = 'none';
    document.getElementById('lb-img').src = '';
    document.body.style.overflow = '';
  };

  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.getElementById('lb-close').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lb.style.display === 'flex') close();
  });
}

function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lb-img').src = src;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function renderGallery(gallery) {
  if (!gallery.images.length) return;

  const win = document.createElement('div');
  win.className = 'window';
  win.innerHTML = `
    <div class="topbar">
      <div class="nametag"><h1>${gallery.name}</h1></div>
      <img src="https://cdn.ndrew.sk/icons/ndrew.sk/exit.png" alt="" class="exiticon">
    </div>
    <div class="windowContent"></div>
  `;

  win.querySelector('.exiticon').addEventListener('click', () => win.remove());

  const content = win.querySelector('.windowContent');

  gallery.images.forEach(image => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    if (image.width && image.height) {
      item.style.aspectRatio = `${image.width} / ${image.height}`;
    }

    const img = document.createElement('img');
    img.src = `${cdnBase}/${image.path}?quality=medium`;
    img.alt = image.filename;
    if (image.width) img.width = image.width;
    if (image.height) img.height = image.height;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', () => { item.style.background = 'none'; item.style.animation = 'none'; });

    item.addEventListener('click', () => openLightbox(`${cdnBase}/${image.path}`));
    item.appendChild(img);
    content.appendChild(item);
  });

  document.body.appendChild(win);
}

async function init() {
  createLightbox();
  try {
    const res = await fetch(`${apiBase}/cdn/photo-galleries`);
    if (!res.ok) throw new Error(res.statusText);
    const galleries = await res.json();
    galleries.forEach(renderGallery);
  } catch (err) {
    console.error('Failed to load galleries:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
