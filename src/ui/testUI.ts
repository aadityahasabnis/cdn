/**
 * Professional Test UI for Media Service
 * 
 * Features:
 * - Modern gallery view with image thumbnails
 * - Drag-and-drop file upload
 * - Filter by type and folder
 * - Pagination controls
 * - Copy URL to clipboard
 * - Delete confirmation
 * - Responsive design
 */

export const testUIHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Media Service - Admin Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #667eea;
            --primary-dark: #764ba2;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --bg-light: #f8fafc;
            --bg-card: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border: #e2e8f0;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg-light);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 2rem 0;
            box-shadow: var(--shadow-lg);
        }
        
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        
        .header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            opacity: 0.95;
            font-size: 1rem;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .config-bar {
            background: var(--bg-card);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }
        
        .config-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1rem;
            align-items: end;
        }
        
        .form-group {
            margin-bottom: 0;
        }
        
        .form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid var(--border);
            border-radius: 0.5rem;
            font-size: 0.9375rem;
            transition: all 0.2s;
            background: white;
        }
        
        .form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        /* Upload Section */
        .upload-section {
            background: var(--bg-card);
            border-radius: 0.75rem;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }
        
        .section-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 1rem;
        }
        
        .upload-area {
            border: 2px dashed var(--border);
            border-radius: 0.75rem;
            padding: 3rem 2rem;
            text-align: center;
            background: var(--bg-light);
            transition: all 0.3s;
            cursor: pointer;
            position: relative;
            margin-bottom: 1.5rem;
        }
        
        .upload-area:hover, .upload-area.drag-over {
            border-color: var(--primary);
            background: rgba(102, 126, 234, 0.05);
        }
        
        .upload-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .upload-text {
            font-size: 1rem;
            color: var(--text-secondary);
        }
        
        .upload-text strong {
            color: var(--primary);
        }
        
        .file-input {
            display: none;
        }
        
        .selected-file {
            background: var(--bg-light);
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            display: none;
        }
        
        .selected-file.active {
            display: block;
        }
        
        .upload-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        /* Gallery Section */
        .gallery-section {
            background: var(--bg-card);
            border-radius: 0.75rem;
            padding: 2rem;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }
        
        .gallery-controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }
        
        .gallery-controls .form-group {
            flex: 1;
            min-width: 200px;
        }
        
        .gallery-stats {
            display: flex;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: var(--bg-light);
            border-radius: 0.5rem;
        }
        
        .stat-item {
            flex: 1;
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary);
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-top: 0.25rem;
        }
        
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .media-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            overflow: hidden;
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .media-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }
        
        .media-thumbnail {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            font-size: 3rem;
        }
        
        .media-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .media-info {
            padding: 1rem;
        }
        
        .media-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .media-meta {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
            flex-wrap: wrap;
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-image { background: #dbeafe; color: #1e40af; }
        .badge-video { background: #fce7f3; color: #be185d; }
        .badge-file { background: #e0e7ff; color: #4338ca; }
        
        .media-size {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        .media-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: var(--bg-light);
            color: var(--text-primary);
            border: 1px solid var(--border);
        }
        
        .btn-secondary:hover {
            background: var(--border);
        }
        
        .btn-small {
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
            flex: 1;
        }
        
        .btn-danger {
            background: var(--error);
            color: white;
        }
        
        .btn-danger:hover {
            background: #dc2626;
        }
        
        .btn-success {
            background: var(--success);
            color: white;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: var(--bg-light);
            border-radius: 0.5rem;
        }
        
        .pagination button {
            padding: 0.5rem 1rem;
        }
        
        .page-info {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-secondary);
        }
        
        .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: white;
            border-radius: 0.75rem;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: var(--shadow-lg);
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-title {
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0;
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.25rem;
        }
        
        .modal-close:hover {
            background: var(--bg-light);
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .modal-image {
            width: 100%;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .detail-grid {
            display: grid;
            gap: 0.75rem;
        }
        
        .detail-item {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 1rem;
        }
        
        .detail-label {
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        
        .detail-value {
            font-size: 0.875rem;
            color: var(--text-primary);
            word-break: break-all;
        }
        
        .url-copy {
            display: flex;
            gap: 0.5rem;
        }
        
        .url-copy input {
            flex: 1;
        }
        
        .toast {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: var(--success);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: var(--shadow-lg);
            display: none;
            animation: slideIn 0.3s ease;
        }
        
        .toast.active {
            display: block;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @media (max-width: 768px) {
            .config-grid {
                grid-template-columns: 1fr;
            }
            
            .upload-options {
                grid-template-columns: 1fr;
            }
            
            .gallery-controls {
                flex-direction: column;
            }
            
            .media-grid {
                grid-template-columns: 1fr;
            }
            
            .detail-item {
                grid-template-columns: 1fr;
                gap: 0.25rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>Media Service Admin Panel</h1>
            <p>Professional media management for your blogging platform</p>
        </div>
    </div>
    
    <div class="container">
        <!-- Configuration -->
        <div class="config-bar">
            <div class="config-grid">
                <div class="form-group">
                    <label class="form-label">API Base URL</label>
                    <input type="text" id="apiBaseUrl" class="form-input" value="">
                </div>
                <div class="form-group">
                    <label class="form-label">API Key</label>
                    <input type="text" id="apiKey" class="form-input" value="test-key-123">
                </div>
            </div>
        </div>
        
        <!-- Upload Section -->
        <div class="upload-section">
            <h2 class="section-title">Upload Media</h2>
            
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">📤</div>
                <div class="upload-text">
                    <strong>Click to upload</strong> or drag and drop<br>
                    <small>Images, videos, and files supported</small>
                </div>
                <input type="file" id="fileInput" class="file-input" accept="image/*,video/*,application/*">
            </div>
            
            <div id="selectedFile" class="selected-file"></div>
            
            <div class="upload-options">
                <div class="form-group">
                    <label class="form-label">Folder</label>
                    <input type="text" id="uploadFolder" class="form-input" placeholder="blog, gallery, etc.">
                </div>
                <div class="form-group">
                    <label class="form-label">Type</label>
                    <select id="uploadType" class="form-input">
                        <option value="">Auto-detect</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="file">File</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Tags</label>
                    <input type="text" id="uploadTags" class="form-input" placeholder="comma, separated">
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="uploadFile()">
                <span>⬆️</span> Upload File
            </button>
        </div>
        
        <!-- Gallery Section -->
        <div class="gallery-section">
            <h2 class="section-title">Media Gallery</h2>
            
            <div class="gallery-stats" id="galleryStats">
                <div class="stat-item">
                    <div class="stat-value" id="statTotal">0</div>
                    <div class="stat-label">Total Files</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="statImages">0</div>
                    <div class="stat-label">Images</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="statVideos">0</div>
                    <div class="stat-label">Videos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="statSize">0 MB</div>
                    <div class="stat-label">Total Size</div>
                </div>
            </div>
            
            <div class="gallery-controls">
                <div class="form-group">
                    <label class="form-label">Filter by Type</label>
                    <select id="filterType" class="form-input" onchange="loadGallery()">
                        <option value="">All Types</option>
                        <option value="image">Images</option>
                        <option value="video">Videos</option>
                        <option value="file">Files</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Filter by Folder</label>
                    <input type="text" id="filterFolder" class="form-input" placeholder="All folders" onchange="loadGallery()">
                </div>
                <div class="form-group">
                    <label class="form-label">Items per page</label>
                    <select id="itemsPerPage" class="form-input" onchange="loadGallery()">
                        <option value="12">12</option>
                        <option value="24">24</option>
                        <option value="48">48</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>
            
            <div id="mediaGrid" class="media-grid"></div>
            
            <div class="pagination" id="pagination" style="display: none;">
                <button class="btn btn-secondary" onclick="previousPage()">← Previous</button>
                <span class="page-info" id="pageInfo">Page 1 of 1</span>
                <button class="btn btn-secondary" onclick="nextPage()">Next →</button>
            </div>
        </div>
    </div>
    
    <!-- Modal -->
    <div class="modal" id="mediaModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalTitle">Media Details</h3>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modalBody"></div>
        </div>
    </div>
    
    <!-- Toast -->
    <div class="toast" id="toast"></div>
    
    <script>
        let currentPage = 1;
        let totalPages = 1;
        let selectedFile = null;
        let currentStats = null;
        
        // API Helpers
        function getBaseUrl() { return document.getElementById('apiBaseUrl').value; }
        function getApiKey() { return document.getElementById('apiKey').value; }
        
        // Toast notifications
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 3000);
        }
        
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
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
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelect();
            }
        });
        
        fileInput.addEventListener('change', handleFileSelect);
        
        function handleFileSelect() {
            selectedFile = fileInput.files[0];
            if (selectedFile) {
                const selectedFileDiv = document.getElementById('selectedFile');
                selectedFileDiv.innerHTML = \`
                    <strong>Selected:</strong> \${selectedFile.name} (\${formatBytes(selectedFile.size)})
                \`;
                selectedFileDiv.classList.add('active');
            }
        }
        
        async function uploadFile() {
            if (!selectedFile) {
                alert('Please select a file first');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            const folder = document.getElementById('uploadFolder').value;
            const type = document.getElementById('uploadType').value;
            const tags = document.getElementById('uploadTags').value;
            
            if (folder) formData.append('folder', folder);
            if (type) formData.append('type', type);
            if (tags) formData.append('tags', tags);
            
            try {
                const response = await fetch(\`\${getBaseUrl()}/api/media/upload\`, {
                    method: 'POST',
                    headers: { 'x-api-key': getApiKey() },
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showToast('File uploaded successfully!');
                    fileInput.value = '';
                    selectedFile = null;
                    document.getElementById('selectedFile').classList.remove('active');
                    document.getElementById('uploadFolder').value = '';
                    document.getElementById('uploadTags').value = '';
                    loadGallery();
                } else {
                    alert('Upload failed: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                alert('Upload error: ' + error.message);
            }
        }
        
        // Gallery
        async function loadGallery(page = 1) {
            currentPage = page;
            
            const params = new URLSearchParams();
            const type = document.getElementById('filterType').value;
            const folder = document.getElementById('filterFolder').value;
            const limit = document.getElementById('itemsPerPage').value;
            
            if (type) params.append('type', type);
            if (folder) params.append('folder', folder);
            params.append('page', page);
            params.append('limit', limit);
            
            try {
                const response = await fetch(\`\${getBaseUrl()}/api/media/list?\${params}\`);
                const data = await response.json();
                
                if (response.ok) {
                    renderGallery(data.files);
                    updatePagination(data.page, data.pages);
                }
            } catch (error) {
                console.error('Failed to load gallery:', error);
            }
            
            loadStats();
        }
        
        function renderGallery(files) {
            const grid = document.getElementById('mediaGrid');
            
            if (!files || files.length === 0) {
                grid.innerHTML = \`
                    <div class="empty-state">
                        <div class="empty-icon">📁</div>
                        <h3>No files found</h3>
                        <p>Upload some files to get started!</p>
                    </div>
                \`;
                return;
            }
            
            grid.innerHTML = files.map(file => \`
                <div class="media-card" onclick='showMediaDetails(\${JSON.stringify(file).replace(/'/g, "&apos;")})'>
                    <div class="media-thumbnail">
                        \${file.file_type === 'image' ? 
                            \`<img src="\${file.public_url}" alt="\${file.file_key}" loading="lazy">\` :
                            file.file_type === 'video' ? '🎥' : '📄'
                        }
                    </div>
                    <div class="media-info">
                        <div class="media-title" title="\${file.file_key}">\${file.file_key.split('/').pop()}</div>
                        <div class="media-meta">
                            <span class="badge badge-\${file.file_type}">\${file.file_type}</span>
                            <span class="media-size">\${formatBytes(file.size)}</span>
                        </div>
                        <div class="media-actions">
                            <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); copyUrl('\${file.public_url}')">
                                📋 Copy URL
                            </button>
                            <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteFile('\${file.file_key}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            \`).join('');
        }
        
        function updatePagination(page, pages) {
            currentPage = page;
            totalPages = pages;
            
            const pagination = document.getElementById('pagination');
            const pageInfo = document.getElementById('pageInfo');
            
            if (pages > 1) {
                pagination.style.display = 'flex';
                pageInfo.textContent = \`Page \${page} of \${pages}\`;
            } else {
                pagination.style.display = 'none';
            }
        }
        
        function previousPage() {
            if (currentPage > 1) {
                loadGallery(currentPage - 1);
            }
        }
        
        function nextPage() {
            if (currentPage < totalPages) {
                loadGallery(currentPage + 1);
            }
        }
        
        async function loadStats() {
            try {
                const response = await fetch(\`\${getBaseUrl()}/api/media/stats\`);
                const data = await response.json();
                
                if (response.ok && data.stats) {
                    currentStats = data.stats;
                    document.getElementById('statTotal').textContent = data.stats.total_files || 0;
                    document.getElementById('statImages').textContent = data.stats.by_type?.image || 0;
                    document.getElementById('statVideos').textContent = data.stats.by_type?.video || 0;
                    const totalMB = ((data.stats.total_size || 0) / 1024 / 1024).toFixed(1);
                    document.getElementById('statSize').textContent = totalMB + ' MB';
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }
        
        // Modal
        function showMediaDetails(file) {
            const modal = document.getElementById('mediaModal');
            const modalBody = document.getElementById('modalBody');
            const modalTitle = document.getElementById('modalTitle');
            
            modalTitle.textContent = file.file_key.split('/').pop();
            
            modalBody.innerHTML = \`
                \${file.file_type === 'image' ? \`<img src="\${file.public_url}" class="modal-image">\` : ''}
                
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Type</div>
                        <div class="detail-value"><span class="badge badge-\${file.file_type}">\${file.file_type}</span></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Folder</div>
                        <div class="detail-value">\${file.folder}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Size</div>
                        <div class="detail-value">\${formatBytes(file.size)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">MIME Type</div>
                        <div class="detail-value">\${file.mime_type}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">File Key</div>
                        <div class="detail-value">\${file.file_key}</div>
                    </div>
                    \${file.tags ? \`
                        <div class="detail-item">
                            <div class="detail-label">Tags</div>
                            <div class="detail-value">\${file.tags}</div>
                        </div>
                    \` : ''}
                    <div class="detail-item">
                        <div class="detail-label">Uploaded</div>
                        <div class="detail-value">\${new Date(file.created_at).toLocaleString()}</div>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <div class="detail-label">Public URL</div>
                        <div class="url-copy">
                            <input type="text" class="form-input" value="\${file.public_url}" readonly>
                            <button class="btn btn-secondary" onclick="copyUrl('\${file.public_url}')">📋 Copy</button>
                        </div>
                    </div>
                </div>
            \`;
            
            modal.classList.add('active');
        }
        
        function closeModal() {
            document.getElementById('mediaModal').classList.remove('active');
        }
        
        // Utilities
        function copyUrl(url) {
            navigator.clipboard.writeText(url).then(() => {
                showToast('URL copied to clipboard!');
            });
        }
        
        async function deleteFile(fileKey) {
            if (!confirm(\`Are you sure you want to delete this file?\\n\\n\${fileKey}\`)) {
                return;
            }
            
            try {
                const response = await fetch(\`\${getBaseUrl()}/api/media/delete\`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': getApiKey()
                    },
                    body: JSON.stringify({ file_key: fileKey })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showToast('File deleted successfully!');
                    loadGallery(currentPage);
                    closeModal();
                } else {
                    alert('Delete failed: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                alert('Delete error: ' + error.message);
            }
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        // Initialize
        window.addEventListener('load', () => {
            document.getElementById('apiBaseUrl').value = window.location.origin;
            loadGallery();
        });
        
        // Close modal on outside click
        document.getElementById('mediaModal').addEventListener('click', (e) => {
            if (e.target.id === 'mediaModal') {
                closeModal();
            }
        });
    </script>
</body>
</html>`;
