class PhotoGalleries {
    constructor() {
        this.isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.apiBase = this.isLocalhost ? 'http://localhost:3002' : 'https://api.ndrew.sk';
        this.cdnBase = this.isLocalhost ? 'http://localhost:3000' : 'https://cdn.ndrew.sk';
        this.init();
    }

    async init() {
        try {
            const response = await fetch(`${this.apiBase}/cdn/photo-galleries`);
            if (!response.ok) throw new Error('Failed to fetch galleries');
            
            const galleries = await response.json();
            this.renderGalleries(galleries);
        } catch (error) {
            console.error('Error loading galleries:', error);
        }
    }

    renderGalleries(galleries) {
        const container = document.body;
        
        galleries.forEach(gallery => {
            if (gallery.images.length === 0) return; // Skip empty galleries
            
            const windowElement = document.createElement('div');
            windowElement.className = 'window';
            
            windowElement.innerHTML = `
                <div class="topbar">
                    <div class="nametag">
                        <h1>${gallery.name}</h1>
                    </div>
                    <img src="https://cdn.ndrew.sk/icons/ndrew.sk/exit.png" alt="imagegoezhere" class="exiticon">
                </div>
                <div class="windowContent">
                    ${gallery.images.map(imagePath => `
                        <img src="${this.cdnBase}/${imagePath}?quality=medium" 
                            alt="${imagePath}" 
                            data-full-res="${this.cdnBase}/${imagePath}"
                            class="gallery-image">
                    `).join('')}
                </div>
            `;
            
            container.appendChild(windowElement);
        });
        
        // Initialize masonry first, then override click handlers
        this.initializeMasonry();
        // Wait a bit for masonry to process, then attach our handlers
        setTimeout(() => {
            this.attachImageClickHandlers();
        }, 100);
    }

    initializeMasonry() {
        // Re-initialize masonry for all .windowContent elements
        document.querySelectorAll('.windowContent').forEach(container => {
            if (!container.masonryInitialized) {
                new MasonryLayout(container, {
                    minColumnWidth: 250,
                    maxColumnWidth: 380,
                    gap: 12,
                    responsive: true
                });
                container.masonryInitialized = true;
            }
        });
    }

    attachImageClickHandlers() {
        document.querySelectorAll('.gallery-image').forEach(img => {
            // Remove any existing click handlers from masonry
            const wrapper = img.parentElement;
            if (wrapper && wrapper.classList.contains('masonry-item')) {
                // Create a new wrapper without the masonry click handler
                const newWrapper = wrapper.cloneNode(false);
                wrapper.parentNode.replaceChild(newWrapper, wrapper);
                newWrapper.appendChild(img);
                
                // Add our custom click handler
                newWrapper.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fullResUrl = img.dataset.fullRes;
                    this.openLightbox(fullResUrl);
                });

                // Add hover effects back
                newWrapper.addEventListener('mouseenter', () => {
                    newWrapper.style.transform = 'scale(1.02)';
                    newWrapper.style.zIndex = '10';
                    newWrapper.style.boxShadow = '0 8px 25px rgba(124, 176, 255, 0.3)';
                });
                
                newWrapper.addEventListener('mouseleave', () => {
                    newWrapper.style.transform = 'scale(1)';
                    newWrapper.style.zIndex = '1';
                    newWrapper.style.boxShadow = 'none';
                });
            } else {
                // If not wrapped by masonry yet, add click handler directly
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fullResUrl = e.target.dataset.fullRes;
                    this.openLightbox(fullResUrl);
                });
            }
        });
    }

    openLightbox(imageSrc) {
        // Use existing lightbox functionality from masonry.js
        if (window.photoMasonry && window.photoMasonry.openLightbox) {
            window.photoMasonry.openLightbox(imageSrc);
        } else {
            // Fallback: open in new tab
            window.open(imageSrc, '_blank');
        }
    }
}

// Initialize galleries when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.photoGalleries = new PhotoGalleries();
});