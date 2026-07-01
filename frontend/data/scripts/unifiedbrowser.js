// Unified CDN and Photos Browser functionality
class UnifiedBrowser {
    constructor(containerId, mode = 'cdn') {
        this.containerId = containerId;
        this.mode = mode; // 'cdn' or 'photos'
        this.currentPath = mode === 'photos' ? 'photos' : '';
        this.basePath = mode === 'photos' ? 'photos' : '';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'; 
        this.apiBase = isLocalhost ? 'http://localhost:3002' : 'https://api.ndrew.sk';
        this.init();
    }

    init() {
        this.loadDirectory(this.mode === 'photos' ? this.basePath : '');
    }

    async loadDirectory(path) {
        const browserContainer = document.getElementById(this.containerId);
        if (!browserContainer) return;

        // For photos mode, ensure path starts with photos/
        if (this.mode === 'photos' && !path.startsWith('photos')) {
            path = 'photos';
        }

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
        const browserContainer = document.getElementById(this.containerId);
        
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
        let breadcrumbItems;
        
        if (this.mode === 'photos') {
            breadcrumbItems = [
                `<span class="breadcrumb-item" data-path="photos">Photos</span>`
            ];
            let currentPath = 'photos';
            // Skip the first 'photos' part since we already added it
            pathParts.slice(1).forEach(part => {
                currentPath += '/' + part;
                breadcrumbItems.push(`<span class="breadcrumb-separator">/</span>`);
                breadcrumbItems.push(`<span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`);
            });
        } else {
            breadcrumbItems = [
                `<span class="breadcrumb-item" data-path="">CDN</span>`
            ];
            let currentPath = '';
            pathParts.forEach(part => {
                currentPath += (currentPath ? '/' : '') + part;
                breadcrumbItems.push(`<span class="breadcrumb-separator">/</span>`);
                breadcrumbItems.push(`<span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`);
            });
        }

        const instanceId = this.containerId.replace('-', '');
        
        return `
            <div class="breadcrumb-container">
                <div class="breadcrumb">${breadcrumbItems.join('')}</div>
                <div class="breadcrumb-actions">
                    <button class="action-btn create-folder-btn" onclick="window.${instanceId}.showCreateFolderDialog()">+ Folder</button>
                    <button class="action-btn upload-file-btn" onclick="window.${instanceId}.showUploadDialog()">+ Upload</button>
                </div>
            </div>
        `;
    }

    renderFileItem(item) {
        const isDirectory = item.type === 'directory';
        const instanceId = this.containerId.replace('-', '');

        return `
            <li class="file-item" data-path="${item.path}" data-type="${item.type}">
                <div class="file-info">
                    <div class="file-name">${item.name}</div>
                </div>
                <div class="file-actions">
                    ${!isDirectory ? `<button class="action-btn" onclick="window.${instanceId}.copyUrl('${item.path}')">Copy URL</button>` : ''}
                    <button class="action-btn delete-btn" onclick="window.${instanceId}.deleteItem('${item.path}', '${item.type}')">Delete</button>
                </div>
            </li>
        `;
    }

    attachEventListeners() {
        // Breadcrumb navigation
        document.querySelectorAll(`#${this.containerId} .breadcrumb-item`).forEach(item => {
            item.addEventListener('click', (e) => {
                const path = e.target.dataset.path;
                // For photos mode, ensure we never navigate outside photos folder
                if (this.mode === 'photos' && path && path.startsWith('photos')) {
                    this.loadDirectory(path);
                } else if (this.mode === 'cdn') {
                    this.loadDirectory(path);
                }
            });
        });

        // File/directory click - improved for mobile
        document.querySelectorAll(`#${this.containerId} .file-item`).forEach(item => {
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
            
            const titleText = this.mode === 'photos' ? 'Create New Folder in Photos' : 'Create New Folder';
            
            dialog.innerHTML = `
                <div class="confirm-header">
                    <h3 class="confirm-title">${titleText}</h3>
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
            this.showToast(`Folder "${result.folderName}" created successfully!`, '#7CB0FF');
            
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
            
            const titleText = this.mode === 'photos' ? 'Upload Photos' : 'Upload File';
            const selectText = this.mode === 'photos' ? 'Click to select photos or drag and drop' : 'Click to select files or drag and drop';
            const renameText = this.mode === 'photos' ? '<div class="upload-subtext">Files will be renamed automatically to avoid conflicts</div>' : '';
            
            dialog.innerHTML = `
                <div class="confirm-header">
                    <h3 class="confirm-title">${titleText}</h3>
                </div>
                <div class="confirm-message">
                    <div class="upload-area" id="upload-area">
                        <div class="upload-text">
                            <div>${selectText}</div>
                            ${renameText}
                            <div class="upload-subtext">Maximum file size: 700MB</div>
                            <div class="upload-subtext" style="color: #7CB0FF; margin-top: 5px;">Files over 1MB will show upload progress</div>
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
                const headerText = this.mode === 'photos' ? 'Selected files (will be renamed):' : 'Selected files:';
                fileListDiv.innerHTML = `
                    <div class="selected-files-header">${headerText}</div>
                    ${selectedFiles.map(file => {
                        const isLarge = file.size > 1024 * 1024; // Over 1MB
                        const uploadMethod = isLarge ? '<span style="color: #7CB0FF; font-size: 11px;">(chunked upload)</span>' : '<span style="color: #888; font-size: 11px;">(direct upload)</span>';
                        return `
                        <div class="selected-file">
                            <span>${file.name}</span>
                            <span class="file-size">(${this.formatFileSize(file.size)}) ${uploadMethod}</span>
                        </div>
                    `;
                    }).join('')}
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

    // Generate a random string for file renaming (photos mode only)
    generateRandomFileName(originalName) {
        const extension = originalName.split('.').pop();
        const randomString = Math.random().toString(36).replace(/[^a-z0-9]/g, '').substring(0, 8);
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        return `${timestamp}${randomString}.${extension}`;
    }

    async uploadFiles(files) {
        if (files.length === 0) return;
        
        const totalFiles = files.length;
        let completedFiles = 0;
        
        const locationText = this.mode === 'photos' ? 'to photos' : '';
        this.showToast(`Uploading ${totalFiles} file(s) ${locationText}...`, '#7CB0FF');
        
        for (const file of files) {
            try {
                // Check file size before upload (700MB limit)
                if (file.size > 700 * 1024 * 1024) {
                    this.showToast(`File ${file.name} is too large (max 700MB)`, '#f44336');
                    continue;
                }
                
                let fileToUpload = file;
                
                // For photos mode, rename the file
                if (this.mode === 'photos') {
                    const newFileName = this.generateRandomFileName(file.name);
                    fileToUpload = new File([file], newFileName, { type: file.type });
                }
                
                // Use chunked upload for files over 1MB
                if (file.size > 1024 * 1024) {
                    await this.uploadFileChunked(fileToUpload);
                } else {
                    await this.uploadFileRegular(fileToUpload);
                }

                completedFiles++;
                
            } catch (error) {
                console.error(`Upload error for ${file.name}:`, error);
                this.showToast(`Error uploading ${file.name}: ${error.message}`, '#f44336');
            }
        }
        
        if (completedFiles > 0) {
            const successLocationText = this.mode === 'photos' ? ' to photos' : '';
            this.showToast(`Successfully uploaded ${completedFiles} of ${totalFiles} file(s)${successLocationText}!`, '#4CAF50');
            // Refresh current directory
            this.loadDirectory(this.currentPath);
        }
    }

    async uploadFileRegular(file) {
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
    }

    async uploadFileChunked(file) {
        const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const MAX_RETRIES = 3;
        
        // Create abort controller for cancellation
        const abortController = new AbortController();
        
        // Initialize upload session
        const initResponse = await fetch(`${this.apiBase}/cdn/upload-init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                fileName: file.name,
                fileSize: file.size,
                totalChunks: totalChunks,
                path: this.currentPath
            }),
            signal: abortController.signal
        });

        if (!initResponse.ok) {
            const errorData = await initResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to initialize chunked upload');
        }

        const { uploadId } = await initResponse.json();
        
        // Create progress indicator
        const progressContainer = this.createProgressIndicator(file.name, () => {
            abortController.abort();
        });
        
        try {
            // Upload chunks with retry logic
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                // Check if upload was cancelled
                if (abortController.signal.aborted) {
                    throw new Error('Upload cancelled by user');
                }
                
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
                
                let retryCount = 0;
                let chunkUploaded = false;
                
                while (!chunkUploaded && retryCount < MAX_RETRIES && !abortController.signal.aborted) {
                    try {
                        const chunkFormData = new FormData();
                        chunkFormData.append('chunk', chunk);
                        chunkFormData.append('uploadId', uploadId);
                        chunkFormData.append('chunkIndex', chunkIndex.toString());
                        
                        const chunkResponse = await fetch(`${this.apiBase}/cdn/upload-chunk`, {
                            method: 'POST',
                            credentials: 'include',
                            body: chunkFormData,
                            signal: abortController.signal
                        });

                        if (!chunkResponse.ok) {
                            const errorData = await chunkResponse.json().catch(() => ({ error: 'Unknown error' }));
                            throw new Error(errorData.error || `Failed to upload chunk ${chunkIndex + 1}`);
                        }

                        chunkUploaded = true;
                        
                        // Update progress
                        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                        this.updateProgress(progressContainer, progress);
                        
                    } catch (error) {
                        if (error.name === 'AbortError' || abortController.signal.aborted) {
                            throw new Error('Upload cancelled by user');
                        }
                        
                        retryCount++;
                        if (retryCount >= MAX_RETRIES) {
                            throw new Error(`Failed to upload chunk ${chunkIndex + 1} after ${MAX_RETRIES} attempts: ${error.message}`);
                        }
                        
                        // Show retry status
                        this.updateProgress(progressContainer, Math.round(((chunkIndex) / totalChunks) * 100), `Retrying chunk ${chunkIndex + 1} (${retryCount}/${MAX_RETRIES})`);
                        
                        // Wait before retry with exponential backoff
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(resolve, Math.pow(2, retryCount) * 1000);
                            abortController.signal.addEventListener('abort', () => {
                                clearTimeout(timeout);
                                reject(new Error('Upload cancelled by user'));
                            });
                        });
                    }
                }
            }

            // Check if upload was cancelled before finalizing
            if (abortController.signal.aborted) {
                throw new Error('Upload cancelled by user');
            }

            // Finalize upload
            this.updateProgress(progressContainer, 99, 'Finalizing...');
            
            const finalizeResponse = await fetch(`${this.apiBase}/cdn/upload-finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ uploadId }),
                signal: abortController.signal
            });

            if (!finalizeResponse.ok) {
                const errorData = await finalizeResponse.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to finalize upload');
            }

            this.updateProgress(progressContainer, 100, 'Complete!');
            
        } catch (error) {
            if (error.message === 'Upload cancelled by user') {
                this.updateProgress(progressContainer, 0, 'Cancelled');
            } else {
                this.updateProgress(progressContainer, 0, 'Failed');
            }
            throw error;
        } finally {
            // Remove progress indicator after 3 seconds
            setTimeout(() => {
                if (progressContainer.parentNode) {
                    progressContainer.parentNode.removeChild(progressContainer);
                }
            }, 3000);
        }
    }

    createProgressIndicator(fileName, onCancel = null) {
        // Create unique ID for this upload
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        // Calculate position based on existing progress indicators
        const existingIndicators = document.querySelectorAll('.upload-progress-indicator');
        const topOffset = 70 + (existingIndicators.length * 80); // Stack them vertically
        
        const container = document.createElement('div');
        container.className = 'upload-progress-indicator';
        container.id = uploadId;
        container.style.cssText = `
            position: fixed;
            top: ${topOffset}px;
            right: 20px;
            background: #333;
            color: #fff;
            padding: 15px;
            border-radius: 5px;
            z-index: 10001;
            font-family: Monocraft;
            font-size: 12px;
            max-width: 300px;
            border: 1px solid #555;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            cursor: ${onCancel ? 'pointer' : 'default'};
        `;
        
        // Truncate long filenames
        const displayName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
        const cancelText = onCancel ? '<div style="font-size: 10px; color: #ccc; margin-top: 3px;">Click to cancel</div>' : '';
        
        container.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; word-break: break-all;">${displayName}</div>
            <div style="background: #555; height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 5px;">
                <div class="progress-bar" style="background: #7CB0FF; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <div class="progress-text" style="text-align: center; font-size: 11px;">0%</div>
            ${cancelText}
        `;
        
        // Add cancel functionality
        if (onCancel) {
            container.addEventListener('click', () => {
                if (confirm(`Cancel upload of ${fileName}?`)) {
                    onCancel();
                }
            });
            
            // Add visual feedback for clickable state
            container.addEventListener('mouseenter', () => {
                container.style.borderColor = '#f44336';
            });
            
            container.addEventListener('mouseleave', () => {
                container.style.borderColor = '#555';
            });
        }
        
        document.body.appendChild(container);
        return container;
    }

    updateProgress(container, percentage, status = null) {
        const progressBar = container.querySelector('.progress-bar');
        const progressText = container.querySelector('.progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            if (status) {
                progressText.textContent = status;
            } else {
                progressText.textContent = `${percentage}%`;
            }
        }
        
        if (percentage === 100 && !status) {
            progressText.textContent = 'Complete!';
            progressBar.style.background = '#4CAF50';
            container.style.borderColor = '#4CAF50';
        }
        
        if (status === 'Failed') {
            progressBar.style.background = '#f44336';
            container.style.borderColor = '#f44336';
            progressText.textContent = 'Failed';
        }
        
        if (status === 'Cancelled') {
            progressBar.style.background = '#ff9800';
            container.style.borderColor = '#ff9800';
            progressText.textContent = 'Cancelled';
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
            this.showToast(`${typeText.charAt(0).toUpperCase() + typeText.slice(1)} "${itemName}" deleted successfully!`, '#7CB0FF');
            
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
            const locationText = this.mode === 'photos' ? ' from photos' : '';
            
            dialog.innerHTML = `
                <div class="confirm-header">
                    <h3 class="confirm-title">Delete ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}</h3>
                </div>
                <div class="confirm-message">
                    Are you sure you want to delete the ${typeText} "<strong>${itemName}</strong>"${locationText}?
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

// Initialize browsers when page loads
window.addEventListener('load', () => {
    // Initialize CDN browser
    if (document.getElementById('cdn-browser')) {
        window.cdnbrowser = new UnifiedBrowser('cdn-browser', 'cdn');
    }
    
    // Initialize Photos browser
    if (document.getElementById('photos-browser')) {
        window.photosbrowser = new UnifiedBrowser('photos-browser', 'photos');
    }
});