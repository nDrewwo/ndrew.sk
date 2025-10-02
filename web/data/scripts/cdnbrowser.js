// CDN File Browser functionality
class CDNBrowser {
    constructor() {
        this.currentPath = '';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'; 
        this.apiBase = isLocalhost ? 'http://localhost:3002' : 'https://api.ndrew.sk';
        this.init();
    }

    init() {
        this.loadDirectory('');
    }

    async loadDirectory(path) {
        const browserContainer = document.getElementById('cdn-browser');
        if (!browserContainer) return;

        browserContainer.innerHTML = '<div class="loading">Loading...</div>';

        try {
            const response = await fetch(`${this.apiBase}/cdn/browse?path=${encodeURIComponent(path)}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to load directory');
            
            const data = await response.json();
            this.currentPath = data.currentPath;
            this.renderBrowser(data);
        } catch (error) {
            browserContainer.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
        }
    }

    renderBrowser(data) {
        const browserContainer = document.getElementById('cdn-browser');
        
        const html = `
            ${this.renderBreadcrumb()}
            <ul class="file-list">
                ${data.items ? data.items.map(item => this.renderFileItem(item)).join('') : ''}
            </ul>
        `;
        
        browserContainer.innerHTML = html;
        this.attachEventListeners();
    }

    renderBreadcrumb() {
        const pathParts = this.currentPath ? this.currentPath.split('/').filter(p => p) : [];
        const breadcrumbItems = [
            `<span class="breadcrumb-item" data-path="">CDN</span>`
        ];

        let currentPath = '';
        pathParts.forEach(part => {
            currentPath += (currentPath ? '/' : '') + part;
            breadcrumbItems.push(`<span class="breadcrumb-separator">/</span>`);
            breadcrumbItems.push(`<span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`);
        });

        return `
            <div class="breadcrumb-container">
                <div class="breadcrumb">${breadcrumbItems.join('')}</div>
                <div class="breadcrumb-actions">
                    <button class="action-btn create-folder-btn" onclick="cdnBrowser.showCreateFolderDialog()">+ Folder</button>
                    <button class="action-btn upload-file-btn" onclick="cdnBrowser.showUploadDialog()">+ Upload</button>
                </div>
            </div>
        `;
    }

    renderFileItem(item) {
        const isDirectory = item.type === 'directory';

        return `
            <li class="file-item" data-path="${item.path}" data-type="${item.type}">
                <div class="file-info">
                    <div class="file-name">${item.name}</div>
                </div>
                <div class="file-actions">
                    ${!isDirectory ? `<button class="action-btn" onclick="cdnBrowser.copyUrl('${item.path}')">Copy URL</button>` : ''}
                    <button class="action-btn delete-btn" onclick="cdnBrowser.deleteItem('${item.path}', '${item.type}')">Delete</button>
                </div>
            </li>
        `;
    }

    attachEventListeners() {
        // Breadcrumb navigation
        document.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const path = e.target.dataset.path;
                this.loadDirectory(path);
            });
        });

        // File/directory click - improved for mobile
        document.querySelectorAll('.file-item').forEach(item => {
            const path = item.dataset.path;
            const type = item.dataset.type;
            
            // Check if device is likely mobile
            const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
            
            if (isMobile) {
                // Single tap navigation for mobile
                item.addEventListener('click', (e) => {
                    // Don't trigger if clicking on action button
                    if (e.target.classList.contains('action-btn')) {
                        return;
                    }
                    
                    if (type === 'directory') {
                        this.loadDirectory(path);
                    } else {
                        this.copyUrl(path);
                    }
                });
            } else {
                // Double click for desktop
                item.addEventListener('dblclick', (e) => {
                    if (type === 'directory') {
                        this.loadDirectory(path);
                    } else {
                        this.copyUrl(path);
                    }
                });
            }
        });
    }

    showCreateFolderDialog() {
        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            
            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            
            dialog.innerHTML = `
                <div class="confirm-header">
                    <h3 class="confirm-title">Create New Folder</h3>
                </div>
                <div class="confirm-message">
                    <input type="text" id="folder-name-input" placeholder="Folder name" class="folder-name-input" maxlength="100">
                </div>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-btn-cancel">Cancel</button>
                    <button class="confirm-btn confirm-btn-create">Create Folder</button>
                </div>
            `;
            
            // Add event listeners
            const cancelBtn = dialog.querySelector('.confirm-btn-cancel');
            const createBtn = dialog.querySelector('.confirm-btn-create');
            const input = dialog.querySelector('#folder-name-input');
            
            const cleanup = () => {
                document.body.removeChild(overlay);
                document.body.style.overflow = '';
            };
            
            const handleCreate = async () => {
                const folderName = input.value.trim();
                if (!folderName) {
                    this.showToast('Please enter a folder name', '#f44336');
                    return;
                }
                
                cleanup();
                await this.createFolder(folderName);
                resolve(true);
            };
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            createBtn.addEventListener('click', handleCreate);
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleCreate();
                }
            });
            
            // Click outside to cancel
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
            
            // ESC key to cancel
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    cleanup();
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEsc);
            
            // Append to DOM
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            
            // Focus on input for accessibility
            setTimeout(() => input.focus(), 100);
        });
    }

    async createFolder(folderName) {
        try {
            const response = await fetch(`${this.apiBase}/cdn/create-folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    path: this.currentPath, 
                    folderName: folderName 
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to create folder');
            }

            const result = await response.json();
            this.showToast(`Folder "${result.folderName}" created successfully!`, '#4CAF50');
            
            // Refresh current directory
            this.loadDirectory(this.currentPath);
            
        } catch (error) {
            this.showToast(`Error: ${error.message}`, '#f44336');
        }
    }

    showUploadDialog() {
        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            
            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog upload-dialog';
            
            dialog.innerHTML = `
                <div class="confirm-header">
                    <h3 class="confirm-title">Upload File</h3>
                </div>
                <div class="confirm-message">
                    <div class="upload-area" id="upload-area">
                        <div class="upload-text">
                            <div>Click to select files or drag and drop</div>
                            <div class="upload-subtext">Maximum file size: 700MB</div>
                        </div>
                        <input type="file" id="file-input" multiple style="display: none;">
                    </div>
                    <div id="file-list" class="file-list-preview"></div>
                </div>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-btn-cancel">Cancel</button>
                    <button class="confirm-btn confirm-btn-upload" disabled>Upload Files</button>
                </div>
            `;
            
            // Add event listeners
            const cancelBtn = dialog.querySelector('.confirm-btn-cancel');
            const uploadBtn = dialog.querySelector('.confirm-btn-upload');
            const fileInput = dialog.querySelector('#file-input');
            const uploadArea = dialog.querySelector('#upload-area');
            const fileListDiv = dialog.querySelector('#file-list');
            
            let selectedFiles = [];
            
            const cleanup = () => {
                document.body.removeChild(overlay);
                document.body.style.overflow = '';
            };
            
            const updateFileList = () => {
                if (selectedFiles.length === 0) {
                    fileListDiv.innerHTML = '';
                    uploadBtn.disabled = true;
                    return;
                }
                
                uploadBtn.disabled = false;
                fileListDiv.innerHTML = `
                    <div class="selected-files-header">Selected files:</div>
                    ${selectedFiles.map(file => `
                        <div class="selected-file">
                            <span>${file.name}</span>
                            <span class="file-size">(${this.formatFileSize(file.size)})</span>
                        </div>
                    `).join('')}
                `;
            };
            
            const handleFiles = (files) => {
                selectedFiles = Array.from(files);
                updateFileList();
            };
            
            // File input change
            fileInput.addEventListener('change', (e) => {
                handleFiles(e.target.files);
            });
            
            // Upload area click
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                handleFiles(e.dataTransfer.files);
            });
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            uploadBtn.addEventListener('click', async () => {
                cleanup();
                await this.uploadFiles(selectedFiles);
                resolve(true);
            });
            
            // Click outside to cancel
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
            
            // ESC key to cancel
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    cleanup();
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEsc);
            
            // Append to DOM
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
        });
    }

    async uploadFiles(files) {
        if (files.length === 0) return;
        
        const totalFiles = files.length;
        let completedFiles = 0;
        
        this.showToast(`Uploading ${totalFiles} file(s)...`, '#2196F3');
        
        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('path', this.currentPath);
                
                const response = await fetch(`${this.apiBase}/cdn/upload`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errorData.error || `Failed to upload ${file.name}`);
                }

                completedFiles++;
                
            } catch (error) {
                this.showToast(`Error uploading ${file.name}: ${error.message}`, '#f44336');
            }
        }
        
        if (completedFiles > 0) {
            this.showToast(`Successfully uploaded ${completedFiles} of ${totalFiles} file(s)!`, '#4CAF50');
            // Refresh current directory
            this.loadDirectory(this.currentPath);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    copyUrl(filePath) {
        const cdnUrl = `https://cdn.ndrew.sk/${filePath}`;
        navigator.clipboard.writeText(cdnUrl).then(() => {
            this.showToast('URL copied to clipboard!');
        });
    }

    async deleteItem(itemPath, itemType) {
        const itemName = itemPath.split('/').pop() || 'this item';
        const typeText = itemType === 'directory' ? 'folder' : 'file';
        
        const confirmed = await this.showConfirmDialog(itemName, itemType, typeText);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/cdn/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ path: itemPath, type: itemType })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Failed to delete ${typeText}`);
            }

            // Show success message
            this.showToast(`${typeText.charAt(0).toUpperCase() + typeText.slice(1)} "${itemName}" deleted successfully!`, '#4CAF50');
            
            // Refresh current directory
            this.loadDirectory(this.currentPath);
            
        } catch (error) {
            this.showToast(`Error: ${error.message}`, '#f44336');
        }
    }

    showConfirmDialog(itemName, itemType, typeText) {
        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            
            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            
            const isDirectory = itemType === 'directory';
            
            dialog.innerHTML = `
                <div class="confirm-header">
                    <h3 class="confirm-title">Delete ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}</h3>
                </div>
                <div class="confirm-message">
                    Are you sure you want to delete the ${typeText} "<strong>${itemName}</strong>"?
                </div>
                ${isDirectory ? `
                    <div class="confirm-warning">
                        <strong>Warning:</strong> This will permanently delete the folder and all of its contents. This action cannot be undone.
                    </div>
                ` : ''}
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-btn-cancel">Cancel</button>
                    <button class="confirm-btn confirm-btn-delete">Delete ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}</button>
                </div>
            `;
            
            // Add event listeners
            const cancelBtn = dialog.querySelector('.confirm-btn-cancel');
            const deleteBtn = dialog.querySelector('.confirm-btn-delete');
            
            const cleanup = () => {
                document.body.removeChild(overlay);
                document.body.style.overflow = '';
            };
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            deleteBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
            
            // Click outside to cancel
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
            
            // ESC key to cancel
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    cleanup();
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEsc);
            
            // Append to DOM
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            
            // Focus on cancel button for accessibility
            setTimeout(() => cancelBtn.focus(), 100);
        });
    }

    showToast(message, backgroundColor = '#333') {
        const Toast = document.createElement('div');
        const isMobile = window.innerWidth <= 768;
        
        Toast.style.cssText = `
            position: fixed; 
            top: ${isMobile ? '10px' : '20px'}; 
            right: ${isMobile ? '10px' : '20px'}; 
            left: ${isMobile ? '10px' : 'auto'};
            background: ${backgroundColor}; 
            color: ${backgroundColor === '#7CB0FF' ? '#000' : '#fff'}; 
            padding: ${isMobile ? '15px 20px' : '10px 20px'}; 
            border-radius: 5px; 
            z-index: 10000; font-family: Monocraft;
            font-size: ${isMobile ? '16px' : '14px'};
            text-align: center;
            max-width: ${isMobile ? 'none' : '300px'};
        `;
        Toast.textContent = message;
        document.body.appendChild(Toast);
        setTimeout(() => document.body.removeChild(Toast), 3000);
    }
}

// Initialize CDN browser when page loads
window.addEventListener('load', () => {
    window.cdnBrowser = new CDNBrowser();
});