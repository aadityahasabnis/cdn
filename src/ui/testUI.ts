export const renderTestUIHTML = (uiAccessPassword: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aaditya's CDN</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%234f46e5'/%3E%3Cpath d='M16 24h32v24H16z' fill='%23fff' fill-opacity='.96'/%3E%3Cpath d='M20 20h24v8H20z' fill='%23c7d2fe'/%3E%3Ccircle cx='24' cy='32' r='3' fill='%234f46e5'/%3E%3Cpath d='M21 44l8-9 6 6 5-4 4 7z' fill='%234f46e5'/%3E%3C/svg%3E">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --primary: #4f46e5;
            --primary-dark: #4338ca;
            --success: #059669;
            --error: #dc2626;
            --bg-light: #f1f5f9;
            --bg-card: #ffffff;
            --bg-dark: #0f172a;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --border-strong: #cbd5e1;
            --shadow: 0 10px 25px -12px rgba(2, 6, 23, 0.28);
            --shadow-lg: 0 25px 45px -20px rgba(2, 6, 23, 0.45);
        }

        body {
            font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg-light);
            color: var(--text-primary);
            line-height: 1.5;
        }

        .hidden { display: none !important; }

        .access-gate {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: radial-gradient(circle at top right, rgba(79, 70, 229, 0.2), transparent 45%), var(--bg-dark);
        }

        .gate-card {
            width: 100%;
            max-width: 460px;
            background: rgba(255, 255, 255, 0.97);
            border: 1px solid rgba(148, 163, 184, 0.35);
            border-radius: 1rem;
            box-shadow: var(--shadow-lg);
            padding: 2rem;
        }

        .gate-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.4rem;
        }

        .gate-subtitle {
            color: var(--text-secondary);
            margin-bottom: 1.25rem;
        }

        .gate-help {
            margin-top: 0.75rem;
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        .gate-error {
            margin-top: 0.75rem;
            color: var(--error);
            font-size: 0.88rem;
            font-weight: 600;
            min-height: 1.2rem;
        }

        .container {
            max-width: 1320px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: #fff;
            padding: 1.25rem 0;
            box-shadow: var(--shadow-lg);
        }

        .header-row {
            max-width: 1320px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }

        .header-block {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            min-width: 0;
        }

        .header-block h1 {
            font-size: 1.85rem;
            font-weight: 700;
            margin-bottom: 0;
            line-height: 1.1;
        }

        .header-title-row {
            display: inline-flex;
            align-items: center;
            gap: 0;
        }

        .header-controls {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex: 0 0 auto;
            min-width: 0;
        }

        .top-url {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.16);
            color: #eef2ff;
            border: 1px solid rgba(199, 210, 254, 0.65);
            padding: 0.5rem;
            border-radius: 0.6rem;
            width: 2.15rem;
            height: 2.15rem;
            position: relative;
            flex-shrink: 0;
        }

        .top-url .icon {
            font-size: 1rem;
            line-height: 1;
        }

        .top-url .tooltip {
            position: absolute;
            top: calc(100% + 0.45rem);
            left: 0;
            background: #1e293b;
            color: #f8fafc;
            border: 1px solid #334155;
            border-radius: 0.45rem;
            padding: 0.45rem 0.55rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            white-space: nowrap;
            font-size: 0.78rem;
            opacity: 0;
            transform: translateY(-4px);
            pointer-events: none;
            transition: opacity 0.16s ease, transform 0.16s ease;
            z-index: 30;
        }

        .top-url:hover .tooltip,
        .top-url:focus-within .tooltip {
            opacity: 1;
            transform: translateY(0);
        }

        .header-api-key .form-label {
            color: #e0e7ff;
            margin-bottom: 0;
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
        }

        .header-api-key .form-input {
            background: rgba(255, 255, 255, 0.96);
            border-color: rgba(199, 210, 254, 0.8);
            color: #1e293b;
        }

        .header-api-key .form-input:focus {
            border-color: #a5b4fc;
            box-shadow: 0 0 0 3px rgba(199, 210, 254, 0.28);
        }

        .header-api-key {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            min-width: 0;
        }

        .header-api-key .form-input {
            padding: 0.56rem 0.75rem;
            max-width: 190px;
            width: 190px;
        }

        .container {
            padding-top: 1.5rem;
            padding-bottom: 2rem;
        }

        .section {
            background: var(--bg-card);
            border-radius: 0.85rem;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            padding: 1.75rem;
            margin-bottom: 1.5rem;
        }

        .section-title {
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }

        .section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.8rem;
            margin-bottom: 1rem;
        }

        .section-head .section-title {
            margin-bottom: 0;
        }

        .form-group { margin-bottom: 0; }

        .form-label {
            display: block;
            font-size: 0.84rem;
            color: var(--text-primary);
            font-weight: 600;
            margin-bottom: 0.45rem;
        }

        .form-help {
            margin-top: 0.4rem;
            font-size: 0.78rem;
            color: var(--text-muted);
        }

        .form-input {
            width: 100%;
            border: 1px solid var(--border-strong);
            background: #fff;
            border-radius: 0.55rem;
            padding: 0.72rem 0.9rem;
            font-size: 0.92rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
        }

        select.form-input {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            padding-right: 2.3rem;
            background-image:
                linear-gradient(45deg, transparent 50%, #64748b 50%),
                linear-gradient(135deg, #64748b 50%, transparent 50%),
                linear-gradient(to right, transparent, transparent);
            background-position:
                calc(100% - 18px) calc(50% - 3px),
                calc(100% - 12px) calc(50% - 3px),
                100% 0;
            background-size: 6px 6px, 6px 6px, 2.5rem 100%;
            background-repeat: no-repeat;
            cursor: pointer;
        }

        select.form-input:hover {
            border-color: #a5b4fc;
        }

        .upload-area {
            border: 2px dashed var(--border);
            border-radius: 0.75rem;
            background: #f8fafc;
            text-align: center;
            padding: 2.8rem 2rem;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 1.2rem;
        }

        .upload-area:hover,
        .upload-area.drag-over {
            border-color: var(--primary);
            background: rgba(79, 70, 229, 0.06);
        }

        .upload-icon {
            font-size: 2.4rem;
            margin-bottom: 0.8rem;
        }

        .upload-text {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        .upload-text strong { color: var(--primary); }

        .file-input { display: none; }

        .selected-file {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 0.55rem;
            padding: 0.7rem 0.85rem;
            color: var(--text-secondary);
            display: none;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }

        .selected-file.active { display: block; }

        .upload-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .gallery-stats {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.9rem;
            margin-bottom: 1rem;
        }

        .stat-item {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 0.65rem;
            padding: 0.85rem 0.7rem;
            text-align: center;
        }

        .stat-value {
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--primary);
        }

        .stat-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-top: 0.2rem;
        }

        .gallery-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8rem;
            margin-bottom: 1rem;
        }

        .gallery-controls .form-group {
            flex: 1;
            min-width: 180px;
        }

        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .media-card {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }

        .media-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow);
        }

        .media-thumbnail {
            width: 100%;
            height: 180px;
            background: linear-gradient(135deg, #e2e8f0, #f8fafc);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: 2.6rem;
        }

        .media-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .media-info { padding: 0.85rem; }

        .media-title {
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .media-meta {
            display: flex;
            gap: 0.45rem;
            flex-wrap: wrap;
            margin-bottom: 0.7rem;
        }

        .badge {
            font-size: 0.72rem;
            font-weight: 700;
            border-radius: 999px;
            padding: 0.2rem 0.52rem;
            text-transform: uppercase;
        }

        .badge-image { background: #dbeafe; color: #1d4ed8; }
        .badge-video { background: #fce7f3; color: #be185d; }
        .badge-file { background: #e2e8f0; color: #334155; }

        .media-size { font-size: 0.74rem; color: var(--text-secondary); }

        .media-actions { display: flex; gap: 0.5rem; }

        .btn {
            border: none;
            border-radius: 0.55rem;
            padding: 0.67rem 1rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.42rem;
        }

        .btn-primary {
            color: #fff;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        }

        .btn-primary:hover { filter: brightness(1.05); }

        .upload-btn {
            width: 100%;
            margin-top: 0.25rem;
        }

        .btn-secondary {
            background: #fff;
            color: var(--text-primary);
            border: 1px solid var(--border);
        }

        .btn-secondary:hover { background: #f8fafc; }

        .btn-refresh {
            white-space: nowrap;
            min-width: 118px;
        }

        .btn-danger { background: var(--error); color: #fff; }
        .btn-danger:hover { filter: brightness(1.05); }

        .btn-small {
            padding: 0.5rem 0.65rem;
            font-size: 0.8rem;
            flex: 1;
        }

        .pagination {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 0.6rem;
            display: none;
            align-items: center;
            justify-content: center;
            gap: 0.8rem;
            padding: 0.75rem;
        }

        .page-info { color: var(--text-secondary); font-size: 0.86rem; }

        .empty-state {
            grid-column: 1 / -1;
            text-align: center;
            border: 1px dashed var(--border-strong);
            border-radius: 0.75rem;
            padding: 2.8rem 1rem;
            color: var(--text-secondary);
            background: #f8fafc;
        }

        .empty-icon {
            font-size: 2.8rem;
            margin-bottom: 0.7rem;
            opacity: 0.75;
        }

        .modal {
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
            background: rgba(15, 23, 42, 0.55);
            z-index: 50;
        }

        .modal.active { display: flex; }

        .modal-content {
            width: 100%;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 0.8rem;
            box-shadow: var(--shadow-lg);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding: 1rem 1.2rem;
        }

        .modal-title { font-size: 1.1rem; font-weight: 700; }

        .modal-close {
            border: none;
            background: transparent;
            color: var(--text-secondary);
            font-size: 1.5rem;
            cursor: pointer;
            width: 2rem;
            height: 2rem;
            border-radius: 0.45rem;
        }

        .modal-close:hover { background: #f1f5f9; }

        .modal-body { padding: 1.2rem; }

        .modal-image {
            width: 100%;
            border-radius: 0.6rem;
            margin-bottom: 0.9rem;
        }

        .detail-grid { display: grid; gap: 0.7rem; }

        .detail-item {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 0.8rem;
            align-items: start;
        }

        .detail-label {
            color: var(--text-muted);
            font-size: 0.82rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        .detail-value {
            color: var(--text-primary);
            font-size: 0.9rem;
            word-break: break-all;
        }

        .url-copy {
            display: flex;
            gap: 0.45rem;
        }

        .url-copy input { flex: 1; }

        .toast {
            position: fixed;
            right: 1.5rem;
            bottom: 1.5rem;
            background: var(--success);
            color: #fff;
            border-radius: 0.55rem;
            padding: 0.8rem 1rem;
            box-shadow: var(--shadow);
            display: none;
            z-index: 60;
        }

        .toast.active { display: block; }

        @media (max-width: 860px) {
            .header-row {
                padding: 0 1rem;
                align-items: center;
                flex-wrap: wrap;
                row-gap: 0.6rem;
            }

            .header-controls {
                width: 100%;
                justify-content: center;
            }

            .header-api-key {
                width: auto;
                justify-content: center;
            }

            .top-url {
                align-self: center;
            }

            .header-block {
                width: 100%;
                justify-content: center;
            }

            .header-title-row {
                justify-content: center;
            }

            .header-block h1 {
                text-align: center;
                font-size: 1.5rem;
            }

            .header-api-key .form-input {
                width: 170px;
                max-width: 170px;
            }
        }

        @media (max-width: 520px) {
            .header-row {
                flex-direction: column;
                align-items: stretch;
            }

            .header-block {
                justify-content: flex-start;
            }

            .header-title-row {
                justify-content: flex-start;
            }

            .header-controls {
                justify-content: flex-start;
            }

            .header-api-key {
                width: 100%;
                justify-content: flex-start;
            }

            .header-api-key .form-label {
                font-size: 0.74rem;
            }

            .header-api-key .form-input {
                width: min(210px, 62vw);
                max-width: min(210px, 62vw);
            }

            .upload-options { grid-template-columns: 1fr; }
            .gallery-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .media-grid { grid-template-columns: 1fr; }
            .detail-item { grid-template-columns: 1fr; gap: 0.3rem; }
            .container { padding: 0 1rem; }
            .container { padding-top: 1rem; padding-bottom: 1rem; }

            .section-head {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body>
    <div id="accessGate" class="access-gate">
        <div class="gate-card">
            <h2 class="gate-title">Admin Access Required</h2>
            <p class="gate-subtitle">Enter your UI access password to open the Media Service Admin Panel.</p>
            <div class="form-group">
                <label class="form-label" for="uiPassword">Password</label>
                <input id="uiPassword" type="password" class="form-input" autocomplete="current-password" placeholder="Enter access password" onkeydown="if(event.key==='Enter'){unlockUI();}">
                <div class="gate-help">This gate is configured from environment variables and is required before the UI is displayed.</div>
                <div id="gateError" class="gate-error"></div>
            </div>
            <button id="unlockBtn" class="btn btn-primary" style="margin-top: 1rem; width: 100%;" onclick="unlockUI()">Unlock Admin Panel</button>
        </div>
    </div>

    <div id="appShell" class="hidden">
        <div class="header">
            <div class="header-row">
                <div class="header-block">
                    <div class="top-url" tabindex="0" aria-label="Service URL">
                        <span class="icon">🔗</span>
                        <span class="tooltip" id="apiBaseUrlTooltip"></span>
                    </div>
                    <div class="header-title-row">
                        <h1>Aaditya's CDN Admin Panel</h1>
                    </div>
                </div>
                <div class="header-controls">
                    <div class="header-api-key">
                        <label class="form-label" for="apiKey">Admin API Key</label>
                        <input type="password" id="apiKey" class="form-input" value="" placeholder="Enter ADMIN_API_KEY">
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="section">
                <h2 class="section-title">Upload Media</h2>

                <div class="upload-area" id="uploadArea">
                    <div class="upload-icon">📤</div>
                    <div class="upload-text">
                        <strong>Click to upload</strong> or drag and drop<br>
                        <small>Images, videos, and files are supported</small>
                    </div>
                    <input type="file" id="fileInput" class="file-input" accept="image/*,video/*,application/*">
                </div>

                <div id="selectedFile" class="selected-file"></div>

                <div class="upload-options">
                    <div class="form-group">
                        <label class="form-label">Folder</label>
                        <input type="text" id="uploadFolder" class="form-input" placeholder="blog, gallery, announcements">
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

                <button class="btn btn-primary upload-btn" onclick="uploadFile()">
                    <span>⬆️</span> Upload File
                </button>
            </div>

            <div class="section">
                <div class="section-head">
                    <h2 class="section-title">Media Gallery</h2>
                    <button id="refreshGalleryBtn" class="btn btn-secondary btn-refresh" onclick="refreshGallery()">
                        ↻ Refresh
                    </button>
                </div>

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

                <div class="pagination" id="pagination">
                    <button class="btn btn-secondary" onclick="previousPage()">← Previous</button>
                    <span class="page-info" id="pageInfo">Page 1 of 1</span>
                    <button class="btn btn-secondary" onclick="nextPage()">Next →</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal" id="mediaModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalTitle">Media Details</h3>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modalBody"></div>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const UI_ACCESS_PASSWORD = ${JSON.stringify(uiAccessPassword)};
        const BASE_URL = window.location.origin;
        const UI_UNLOCK_KEY = 'media_ui_unlocked_v1';

        let currentPage = 1;
        let totalPages = 1;
        let selectedFile = null;

        function getBaseUrl() { return BASE_URL; }

        function getApiKey() {
            const key = document.getElementById('apiKey').value;
            if (key) localStorage.setItem('media_api_key', key);
            return key;
        }

        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 3000);
        }

        function unlockUI() {
            const input = document.getElementById('uiPassword');
            const error = document.getElementById('gateError');
            const value = (input.value || '').trim();
            const expected = (UI_ACCESS_PASSWORD || '').trim();

            if (!value) {
                error.textContent = 'Please enter the access password.';
                return;
            }

            if (value !== expected) {
                error.textContent = 'Incorrect password. Please try again.';
                input.value = '';
                input.focus();
                return;
            }

            sessionStorage.setItem(UI_UNLOCK_KEY, 'true');
            document.getElementById('accessGate').classList.add('hidden');
            document.getElementById('appShell').classList.remove('hidden');
            error.textContent = '';
            loadGallery();
        }

        function handleMediaCardClick(element) {
            const encoded = element.getAttribute('data-file') || '';
            if (!encoded) return;
            try {
                const parsed = JSON.parse(decodeURIComponent(encoded));
                showMediaDetails(parsed);
            } catch (error) {
                console.error('Failed to open media details:', error);
            }
        }

        function handleCopyClick(event, element) {
            event.stopPropagation();
            const encoded = element.getAttribute('data-url') || '';
            if (!encoded) return;
            copyUrl(decodeURIComponent(encoded));
        }

        function handleDeleteClick(event, element) {
            event.stopPropagation();
            const encoded = element.getAttribute('data-file-key') || '';
            if (!encoded) return;
            deleteFile(decodeURIComponent(encoded));
        }

        function renderGallery(files) {
            const grid = document.getElementById('mediaGrid');

            if (!files || files.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📁</div><h3>No files found</h3><p>Upload media to get started.</p></div>';
                return;
            }

            grid.innerHTML = files.map(file => {
                const isImage = file.file_type === 'image';
                const isVideo = file.file_type === 'video';
                const thumb = isImage
                    ? '<img src="' + file.public_url + '" alt="' + file.file_key + '" loading="lazy">'
                    : (isVideo ? '🎥' : '📄');

                const payload = encodeURIComponent(JSON.stringify(file));
                const encodedUrl = encodeURIComponent(file.public_url || '');
                const encodedFileKey = encodeURIComponent(file.file_key || '');
                const name = (file.file_key || '').split('/').pop() || file.file_key;

                return '<div class="media-card" data-file="' + payload + '" onclick="handleMediaCardClick(this)">' +
                    '<div class="media-thumbnail">' + thumb + '</div>' +
                    '<div class="media-info">' +
                        '<div class="media-title" title="' + file.file_key + '">' + name + '</div>' +
                        '<div class="media-meta">' +
                            '<span class="badge badge-' + file.file_type + '">' + file.file_type + '</span>' +
                            '<span class="media-size">' + formatBytes(file.size) + '</span>' +
                        '</div>' +
                        '<div class="media-actions">' +
                            '<button class="btn btn-secondary btn-small" data-url="' + encodedUrl + '" onclick="handleCopyClick(event, this)">📋 Copy URL</button>' +
                            '<button class="btn btn-danger btn-small" data-file-key="' + encodedFileKey + '" onclick="handleDeleteClick(event, this)">🗑️ Delete</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        function updatePagination(page, pages) {
            currentPage = page;
            totalPages = pages;

            const pagination = document.getElementById('pagination');
            const pageInfo = document.getElementById('pageInfo');

            if (pages > 1) {
                pagination.style.display = 'flex';
                pageInfo.textContent = 'Page ' + page + ' of ' + pages;
            } else {
                pagination.style.display = 'none';
            }
        }

        function previousPage() {
            if (currentPage > 1) loadGallery(currentPage - 1);
        }

        function nextPage() {
            if (currentPage < totalPages) loadGallery(currentPage + 1);
        }

        async function refreshGallery() {
            const btn = document.getElementById('refreshGalleryBtn');
            const original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '↻ Refreshing...';
            try {
                await loadGallery(currentPage);
                showToast('Gallery refreshed.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }

        async function loadStats() {
            try {
                const response = await fetch(getBaseUrl() + '/api/media/stats');
                const data = await response.json();

                if (response.ok && data.success) {
                    document.getElementById('statTotal').textContent = data.total || 0;
                    document.getElementById('statImages').textContent = data.images || 0;
                    document.getElementById('statVideos').textContent = data.videos || 0;
                    document.getElementById('statSize').textContent = (((data.totalSize || 0) / 1024 / 1024).toFixed(1)) + ' MB';
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

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
                const response = await fetch(getBaseUrl() + '/api/media/list?' + params.toString());
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

        function handleFileSelect() {
            const fileInput = document.getElementById('fileInput');
            selectedFile = fileInput.files[0];
            if (selectedFile) {
                const selectedFileDiv = document.getElementById('selectedFile');
                selectedFileDiv.innerHTML = '<strong>Selected:</strong> ' + selectedFile.name + ' (' + formatBytes(selectedFile.size) + ')';
                selectedFileDiv.classList.add('active');
            }
        }

        async function uploadFile() {
            if (!selectedFile) {
                alert('Please select a file first.');
                return;
            }

            const apiKey = getApiKey();
            if (!apiKey) {
                alert('Please add your Admin API Key in the header.');
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
                const response = await fetch(getBaseUrl() + '/api/media/upload', {
                    method: 'POST',
                    headers: { 'x-api-key': apiKey },
                    body: formData
                });

                const data = await response.json();
                if (response.ok) {
                    showToast('File uploaded successfully.');
                    document.getElementById('fileInput').value = '';
                    selectedFile = null;
                    document.getElementById('selectedFile').classList.remove('active');
                    document.getElementById('uploadFolder').value = '';
                    document.getElementById('uploadTags').value = '';
                    loadGallery();
                } else {
                    alert('Upload failed: ' + (data.error || 'Unknown error') + '\\nStatus: ' + response.status);
                }
            } catch (error) {
                alert('Upload error: ' + error.message);
            }
        }

        function showMediaDetails(file) {
            const modal = document.getElementById('mediaModal');
            const modalBody = document.getElementById('modalBody');
            const modalTitle = document.getElementById('modalTitle');

            modalTitle.textContent = (file.file_key || '').split('/').pop() || file.file_key;

            modalBody.innerHTML = '' +
                (file.file_type === 'image' ? '<img src="' + file.public_url + '" class="modal-image">' : '') +
                '<div class="detail-grid">' +
                    '<div class="detail-item"><div class="detail-label">Type</div><div class="detail-value"><span class="badge badge-' + file.file_type + '">' + file.file_type + '</span></div></div>' +
                    '<div class="detail-item"><div class="detail-label">Folder</div><div class="detail-value">' + file.folder + '</div></div>' +
                    '<div class="detail-item"><div class="detail-label">Size</div><div class="detail-value">' + formatBytes(file.size) + '</div></div>' +
                    '<div class="detail-item"><div class="detail-label">MIME Type</div><div class="detail-value">' + file.mime_type + '</div></div>' +
                    '<div class="detail-item"><div class="detail-label">File Key</div><div class="detail-value">' + file.file_key + '</div></div>' +
                    (file.tags ? '<div class="detail-item"><div class="detail-label">Tags</div><div class="detail-value">' + file.tags + '</div></div>' : '') +
                    '<div class="detail-item"><div class="detail-label">Uploaded</div><div class="detail-value">' + new Date(file.uploaded_at).toLocaleString() + '</div></div>' +
                    '<div class="detail-item" style="grid-column: 1 / -1;"><div class="detail-label">Public URL</div><div class="url-copy"><input type="text" class="form-input" value="' + file.public_url + '" readonly><button class="btn btn-secondary" data-url="' + encodeURIComponent(file.public_url || '') + '" onclick="handleCopyClick(event, this)">📋 Copy</button></div></div>' +
                '</div>';

            modal.classList.add('active');
        }

        function closeModal() {
            document.getElementById('mediaModal').classList.remove('active');
        }

        function copyUrl(url) {
            navigator.clipboard.writeText(url).then(() => showToast('URL copied to clipboard.'));
        }

        async function deleteFile(fileKey) {
            const apiKey = getApiKey();
            const baseUrl = getBaseUrl();

            if (!apiKey) {
                alert('Please add your Admin API Key in the header.');
                return;
            }

            if (!confirm('Are you sure you want to delete this file?\\n\\n' + fileKey)) return;

            try {
                const response = await fetch(baseUrl + '/api/media/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                    body: JSON.stringify({ file_key: fileKey })
                });

                const data = await response.json();
                if (response.ok) {
                    showToast('File deleted successfully.');
                    loadGallery(currentPage);
                    closeModal();
                } else {
                    alert('Delete failed: ' + (data.error || 'Unknown error') + '\\nStatus: ' + response.status);
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

        window.addEventListener('load', () => {
            document.getElementById('apiBaseUrlTooltip').textContent = BASE_URL;

            const savedKey = localStorage.getItem('media_api_key');
            if (savedKey) {
                document.getElementById('apiKey').value = savedKey;
            }

            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');
            const unlockBtn = document.getElementById('unlockBtn');
            const uiPasswordInput = document.getElementById('uiPassword');

            if (uploadArea && fileInput) {
                uploadArea.addEventListener('click', () => fileInput.click());
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('drag-over');
                });
                uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
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
            }

            if (unlockBtn) unlockBtn.addEventListener('click', unlockUI);
            if (uiPasswordInput) {
                uiPasswordInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') unlockUI();
                });
            }

            if (sessionStorage.getItem(UI_UNLOCK_KEY) === 'true') {
                document.getElementById('accessGate').classList.add('hidden');
                document.getElementById('appShell').classList.remove('hidden');
                loadGallery();
            } else {
                uiPasswordInput.focus();
            }
        });

        document.getElementById('mediaModal').addEventListener('click', (e) => {
            if (e.target.id === 'mediaModal') closeModal();
        });
    </script>
</body>
</html>`;
