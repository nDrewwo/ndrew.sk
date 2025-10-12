class MasonryLayout {
    constructor(containerSelector, options = {}) {
        // Handle both string selectors and DOM elements
        this.container = typeof containerSelector === 'string' 
            ? document.querySelector(containerSelector) 
            : containerSelector;
        this.items = [];
        this.columns = [];
        this.isLoading = true;
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
        
        // Check if container has proper dimensions
        if (this.container.clientWidth === 0) {
            // If container isn't ready, wait and try again
            setTimeout(() => {
                if (this.container.clientWidth > 0) {
                    this.init();
                }
            }, 100);
            return;
        }
        
        this.setupContainer();
        this.showLoadingState();
        this.preloadAllImages();
        
        if (this.options.responsive) {
            window.addEventListener('resize', this.debounce(() => {
                if (!this.isLoading) this.layout();
            }, 250));
        }
    }
    
    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.padding = `${this.options.gap}px`;
    }

    showLoadingState() {
        // Create loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'masonry-loading';
        loadingDiv.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: #7CB0FF;
                font-family: 'Monocraft', sans-serif;
                font-size: 16px;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid #555;
                    border-top: 3px solid #7CB0FF;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 15px;
                "></div>
                Loading images...
            </div>
        `;
        
        // Add CSS for loading animation if not already present
        if (!document.querySelector('#masonry-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'masonry-loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.container.appendChild(loadingDiv);
    }

    hideLoadingState() {
        const loadingDiv = this.container.querySelector('.masonry-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    preloadAllImages() {
        const images = this.container.querySelectorAll('img:not(.masonry-processed)');
        const totalImages = images.length;
        
        if (totalImages === 0) {
            this.hideLoadingState();
            this.isLoading = false;
            this.layout();
            return;
        }

        // Mark images as being processed to avoid double-processing
        images.forEach(img => {
            img.classList.add('masonry-processed');
            img.style.visibility = 'hidden';
        });

        let loadedCount = 0;
        const imagePromises = [];

        images.forEach((img, index) => {
            const promise = new Promise((resolve, reject) => {
                // Skip if already wrapped
                if (img.parentElement && img.parentElement.classList.contains('masonry-item')) {
                    resolve();
                    return;
                }
                
                // Create wrapper for each image
                const wrapper = document.createElement('div');
                wrapper.className = 'masonry-item';
                wrapper.style.position = 'absolute';
                wrapper.style.transition = 'all 0.3s ease';
                wrapper.style.cursor = 'pointer';
                wrapper.style.visibility = 'hidden'; // Hide wrapper initially too
                
                // Insert wrapper before image and move image into wrapper
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
                
                // Style the image
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.borderRadius = '4px';
                img.style.visibility = 'visible'; // Make image visible within hidden wrapper
                
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
                
                if (img.complete && img.naturalHeight !== 0) {
                    this.handleImageLoad(wrapper, img);
                    resolve();
                } else {
                    img.addEventListener('load', () => {
                        this.handleImageLoad(wrapper, img);
                        resolve();
                    });
                    img.addEventListener('error', () => {
                        console.warn('Failed to load image:', img.src);
                        // Still resolve to not block the loading process
                        resolve();
                    });
                }
            });
            
            imagePromises.push(promise);
        });

        // Wait for all images to load before starting layout
        Promise.all(imagePromises).then(() => {
            this.hideLoadingState();
            this.isLoading = false;
            
            // Show all wrappers
            this.container.querySelectorAll('.masonry-item').forEach(wrapper => {
                wrapper.style.visibility = 'visible';
            });
            
            this.layout();
        });
    }
    
    handleImageLoad(wrapper, img) {
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
        if (this.items.length === 0 || this.isLoading) return;
        
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
        if (!this.isLoading) this.layout();
    }
    
    // Public method to completely reset and reinitialize
    reset() {
        this.items = [];
        this.columns = [];
        this.isLoading = true;
        
        // Clear any existing wrappers and reset processed state
        this.container.querySelectorAll('.masonry-item').forEach(wrapper => {
            const img = wrapper.querySelector('img');
            if (img) {
                img.classList.remove('masonry-processed');
                img.style.visibility = '';
                wrapper.parentNode.insertBefore(img, wrapper);
                wrapper.remove();
            }
        });
        
        // Also remove processed class from any standalone images
        this.container.querySelectorAll('img.masonry-processed').forEach(img => {
            img.classList.remove('masonry-processed');
            img.style.visibility = '';
        });
        
        // Restart the process
        this.showLoadingState();
        this.preloadAllImages();
    }
    
    // Public method to add new images
    addItems(newImages) {
        // Implementation for dynamically adding images
        this.preloadAllImages();
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
