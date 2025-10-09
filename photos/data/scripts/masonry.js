class MasonryLayout {
    constructor(containerSelector, options = {}) {
        // Handle both string selectors and DOM elements
        this.container = typeof containerSelector === 'string' 
            ? document.querySelector(containerSelector) 
            : containerSelector;
        this.items = [];
        this.columns = [];
        this.options = {
            minColumnWidth: options.minColumnWidth || 280,
            maxColumnWidth: options.maxColumnWidth || 400,
            gap: options.gap || 15,
            responsive: options.responsive !== false,
            ...options
        };
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.setupContainer();
        this.loadImages();
        
        if (this.options.responsive) {
            window.addEventListener('resize', this.debounce(() => this.layout(), 250));
        }
    }
    
    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.padding = `${this.options.gap}px`;
    }
    
    loadImages() {
        const images = this.container.querySelectorAll('img');
        let loadedCount = 0;
        const totalImages = images.length;
        
        if (totalImages === 0) {
            this.layout();
            return;
        }
        
        images.forEach((img, index) => {
            // Create wrapper for each image
            const wrapper = document.createElement('div');
            wrapper.className = 'masonry-item';
            wrapper.style.position = 'absolute';
            wrapper.style.transition = 'all 0.3s ease';
            wrapper.style.cursor = 'pointer';
            
            // Insert wrapper before image and move image into wrapper
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
            
            // Style the image
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.borderRadius = '4px';
            
            // Add hover effect and click functionality
            wrapper.addEventListener('mouseenter', () => {
                wrapper.style.transform = 'scale(1.02)';
                wrapper.style.zIndex = '10';
                wrapper.style.boxShadow = '0 8px 25px rgba(124, 176, 255, 0.3)';
            });
            
            wrapper.addEventListener('mouseleave', () => {
                wrapper.style.transform = 'scale(1)';
                wrapper.style.zIndex = '1';
                wrapper.style.boxShadow = 'none';
            });
            
            // Add click functionality for lightbox
            wrapper.addEventListener('click', () => {
                this.openLightbox(img.src);
            });
            
            if (img.complete) {
                this.handleImageLoad(wrapper, img, ++loadedCount, totalImages);
            } else {
                img.addEventListener('load', () => {
                    this.handleImageLoad(wrapper, img, ++loadedCount, totalImages);
                });
                img.addEventListener('error', () => {
                    console.warn('Failed to load image:', img.src);
                    this.handleImageLoad(wrapper, img, ++loadedCount, totalImages);
                });
            }
        });
    }
    
    handleImageLoad(wrapper, img, loadedCount, totalImages) {
        // Calculate aspect ratio and determine item type
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        // Store item data
        wrapper.itemData = {
            element: wrapper,
            img: img,
            aspectRatio: aspectRatio,
            isLandscape: aspectRatio > 1.4, // 3:2 is ~1.5, so anything > 1.4 is considered landscape
            isPortrait: aspectRatio < 0.8,  // 2:3 is ~0.67, so anything < 0.8 is considered portrait
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
        };
        
        this.items.push(wrapper.itemData);
        
        // Layout when all images are loaded
        if (loadedCount === totalImages) {
            this.layout();
        }
    }
    
    calculateColumns() {
        const containerWidth = this.container.clientWidth - (this.options.gap * 2);
        const minWidth = this.options.minColumnWidth;
        const maxWidth = this.options.maxColumnWidth;
        
        // Calculate optimal number of columns
        let columns = Math.floor(containerWidth / minWidth);
        columns = Math.max(1, Math.min(columns, Math.floor(containerWidth / 200))); // Minimum 200px per column
        
        // Calculate actual column width
        const totalGaps = this.options.gap * (columns - 1);
        const availableWidth = containerWidth - totalGaps;
        let columnWidth = availableWidth / columns;
        
        // Adjust for landscape images - they need more width
        const landscapeCount = this.items.filter(item => item.isLandscape).length;
        const portraitCount = this.items.filter(item => item.isPortrait).length;
        
        // If we have many landscape images, prefer fewer columns with more width
        if (landscapeCount > portraitCount && columnWidth < maxWidth * 0.8) {
            columns = Math.max(1, columns - 1);
            columnWidth = (availableWidth + this.options.gap) / columns - this.options.gap;
        }
        
        return { columns, columnWidth };
    }
    
    layout() {
        if (this.items.length === 0) return;
        
        const { columns, columnWidth } = this.calculateColumns();
        
        // Initialize column heights
        this.columns = Array(columns).fill(0);
        
        // Sort items to optimize layout - mix portrait and landscape
        const sortedItems = this.optimizeItemOrder([...this.items]);
        
        sortedItems.forEach((item) => {
            this.positionItem(item, columnWidth, columns);
        });
        
        // Set container height
        const maxHeight = Math.max(...this.columns);
        this.container.style.height = `${maxHeight + this.options.gap}px`;
    }
    
    optimizeItemOrder(items) {
        // Separate items by type
        const landscape = items.filter(item => item.isLandscape);
        const portrait = items.filter(item => item.isPortrait);
        const square = items.filter(item => !item.isLandscape && !item.isPortrait);
        
        // Create an optimized order that alternates types when possible
        const result = [];
        let landscapeIndex = 0, portraitIndex = 0, squareIndex = 0;
        
        while (landscapeIndex < landscape.length || portraitIndex < portrait.length || squareIndex < square.length) {
            // Add landscape if available
            if (landscapeIndex < landscape.length) {
                result.push(landscape[landscapeIndex++]);
            }
            
            // Add portrait if available
            if (portraitIndex < portrait.length) {
                result.push(portrait[portraitIndex++]);
            }
            
            // Add square if available
            if (squareIndex < square.length) {
                result.push(square[squareIndex++]);
            }
        }
        
        return result;
    }
    
    positionItem(item, columnWidth, totalColumns) {
        // Find the shortest column
        let shortestColumn = 0;
        let minHeight = this.columns[0];
        
        for (let i = 1; i < this.columns.length; i++) {
            if (this.columns[i] < minHeight) {
                minHeight = this.columns[i];
                shortestColumn = i;
            }
        }
        
        // Calculate item dimensions
        let itemWidth = columnWidth;
        
        // For landscape images, try to use wider width if there's space
        if (item.isLandscape && totalColumns > 1) {
            // Check if we can span multiple columns
            const canSpan = shortestColumn < totalColumns - 1 && 
                           Math.abs(this.columns[shortestColumn] - this.columns[shortestColumn + 1]) < 50;
            
            if (canSpan) {
                itemWidth = (columnWidth * 2) + this.options.gap;
            }
        }
        
        const itemHeight = itemWidth / item.aspectRatio;
        
        // Calculate position
        const x = shortestColumn * (columnWidth + this.options.gap);
        const y = this.columns[shortestColumn];
        
        // Apply position and size
        item.element.style.left = `${x}px`;
        item.element.style.top = `${y}px`;
        item.element.style.width = `${itemWidth}px`;
        item.element.style.height = `${itemHeight}px`;
        
        // Update column heights
        if (item.isLandscape && itemWidth > columnWidth * 1.5) {
            // Update both columns for spanning items
            this.columns[shortestColumn] += itemHeight + this.options.gap;
            if (shortestColumn < totalColumns - 1) {
                this.columns[shortestColumn + 1] += itemHeight + this.options.gap;
            }
        } else {
            this.columns[shortestColumn] += itemHeight + this.options.gap;
        }
    }
    
    // Utility function for debouncing resize events
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public method to refresh layout
    refresh() {
        this.layout();
    }
    
    // Public method to add new images
    addItems(newImages) {
        // Implementation for dynamically adding images
        this.loadImages();
    }
    
    // Lightbox functionality
    openLightbox(imageSrc) {
        // Create lightbox if it doesn't exist
        if (!document.getElementById('photo-lightbox')) {
            this.createLightbox();
        }
        
        const lightbox = document.getElementById('photo-lightbox');
        const lightboxImg = document.getElementById('lightbox-image');
        
        lightboxImg.src = imageSrc;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Animate in
        setTimeout(() => {
            lightbox.style.opacity = '1';
            lightboxImg.style.transform = 'scale(1)';
        }, 10);
    }
    
    createLightbox() {
        const lightbox = document.createElement('div');
        lightbox.id = 'photo-lightbox';
        lightbox.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.id = 'lightbox-image';
        img.style.cssText = `
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            transform: scale(0.8);
            transition: transform 0.3s ease;
        `;
        
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 40px;
            color: #7CB0FF;
            cursor: pointer;
            z-index: 1001;
            font-family: 'Monocraft', sans-serif;
            user-select: none;
            transition: color 0.3s ease;
        `;
        
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.color = '#ffffff';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.color = '#7CB0FF';
        });
        
        const closeLightbox = () => {
            lightbox.style.opacity = '0';
            img.style.transform = 'scale(0.8)';
            document.body.style.overflow = '';
            setTimeout(() => {
                lightbox.style.display = 'none';
            }, 300);
        };
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
        
        closeBtn.addEventListener('click', closeLightbox);
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.style.display === 'flex') {
                closeLightbox();
            }
        });
        
        lightbox.appendChild(img);
        lightbox.appendChild(closeBtn);
        document.body.appendChild(lightbox);
    }
}

// Initialize masonry when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize masonry for the photo gallery
    window.photoMasonry = new MasonryLayout('.windowContent', {
        minColumnWidth: 250,
        maxColumnWidth: 380,
        gap: 12,
        responsive: true
    });
});
