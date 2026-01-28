console.log('%c Admin Core Loaded v3.0 (Global Fix)', 'background:#2ed573; color:#000; padding:4px; border-radius:4px;');
// import { gsap } from "https://cdn.skypack.dev/gsap";

const API_URL = '/api';

// --- CURSOR LOGIC (Old Approach) ---
function initCursor() {
    const cursorDot = document.querySelector("[data-cursor-dot]");
    const cursorOutline = document.querySelector("[data-cursor-outline]");
    
    if (!cursorDot || !cursorOutline) return;

    window.addEventListener("mousemove", (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        gsap.to(cursorOutline, {
            x: posX,
            y: posY,
            duration: 0.15,
            ease: "power2.out"
        });
    });

    // Hover effects
    const interactiveElements = document.querySelectorAll("a, button, input, select, textarea, .card, .chart-container, .admin-card, .btn-icon");
    interactiveElements.forEach(el => {
        el.addEventListener("mouseenter", () => document.body.classList.add("hovering"));
        el.addEventListener("mouseleave", () => document.body.classList.remove("hovering"));
    });
}
initCursor();

let currentTab = 'overview';
let editingId = null;
let currentAdminLang = localStorage.getItem('admin_lang') || 'en';

window.updateAdminLang = (lang) => {
    currentAdminLang = lang;
    localStorage.setItem('admin_lang', lang);
    loadContent(currentTab);
};

// Check for token
const token = localStorage.getItem('admin_token');
if (!token) {
    window.location.href = '/login.html';
}

// Logout function
window.logout = function() {
    localStorage.removeItem('admin_token');
    window.location.href = '/login.html';
};

// --- CUSTOM MODAL & NOTIFICATIONS ---
window.showConfirm = (title, message, confirmText = 'Delete', confirmColor = '#ff0055') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        titleEl.textContent = title;
        msgEl.textContent = message;
        
        // Dynamic Button
        okBtn.textContent = confirmText;
        okBtn.style.background = confirmColor;

        modal.classList.add('open');
        modal.style.display = 'flex'; 

        const cleanup = () => {
            modal.classList.remove('open');
            modal.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            // Reset to default for next time (optional, but good practice if reused)
            okBtn.textContent = 'Delete';
            okBtn.style.background = '#ff0055'; 
        };

        okBtn.onclick = () => { cleanup(); resolve(true); };
        cancelBtn.onclick = () => { cleanup(); resolve(false); };
    });
};

window.showNotification = (message, type = 'info') => {
    try {
        const container = document.getElementById('notification-container');
        if (!container) {
            console.error('Notification container not found!');
            // Fallback to alert if critical
            if (type === 'error') alert(message);
            return;
        }

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(notif);

        // Auto remove
        setTimeout(() => {
            if (notif && notif.parentNode) {
                notif.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (notif && notif.parentNode) notif.remove();
                }, 300);
            }
        }, 3000);
    } catch (e) {
        console.error('Notification Error:', e);
        alert(message); // Ultimate fallback
    }
};

// --- MEDIA MANAGER FUNCTIONS ---
window.deleteMedia = async (filename) => {
    const confirmed = await showConfirm('Delete File?', `Are you sure you want to delete ${filename}?`);
    if (!confirmed) return;

    try {
        const encodedFilename = encodeURIComponent(filename);
        const res = await fetch(`${API_URL}/media/${encodedFilename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showNotification('File deleted successfully', 'success');
            
            // Optimistic UI Update: Robust Selector
            // Escape filename for selector just in case of quotes (basic safety)
            const safeFilename = filename.replace(/"/g, '\\"');
            const card = document.querySelector(`.admin-card[data-filename="${safeFilename}"]`);

            if (card) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 300);
            } else {
                 console.warn('Card not found in DOM for deletion:', filename);
            }

            // Wait a bit for FS to settle, then hard refresh
            setTimeout(() => {
                loadMedia(); 
            }, 500);
        } else {
            showNotification('Failed to delete file', 'error');
        }
    } catch (err) {
        console.error('Error deleting file:', err);
        showNotification('Error deleting file', 'error');
    }
};

async function loadMedia() {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '<p>Loading media...</p>';
    
    // Hide "Add New" button when in media tab
    const addBtn = document.querySelector('.btn-add');
    if (addBtn) addBtn.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/media?t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const files = await res.json();

        grid.innerHTML = '';
        grid.innerHTML = '';
        if (!Array.isArray(files) || files.length === 0) {
            grid.innerHTML = '<p>No media files found (or API error).</p>';
            return;
        }

        files.forEach(file => {
            const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const isVideo = file.name.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);
            const isPDF = file.name.match(/\.pdf$/i);

            let previewHtml = '';
            if (isImage) {
                previewHtml = `<div style="height: 150px; background-image: url('${file.url}'); background-size: cover; background-position: center; border-radius: 0.5rem; margin-bottom: 1rem;"></div>`;
            } else if (isVideo) {
                 previewHtml = `
                    <div style="height: 150px; background: #000; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; margin-bottom: 1rem; position: relative;">
                        <i class="fa-solid fa-video" style="font-size: 3rem; color: #555;"></i>
                    </div>`;
            } else if (isPDF) {
                 previewHtml = `
                    <div style="height: 150px; background: #2a2a2a; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <i class="fa-solid fa-file-pdf" style="font-size: 3rem; color: #ff0055;"></i>
                    </div>`;
            } else {
                 previewHtml = `
                    <div style="height: 150px; background: #2a2a2a; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <i class="fa-solid fa-file" style="font-size: 3rem; color: #888;"></i>
                    </div>`;
            }

            const card = document.createElement('div');
            card.className = 'admin-card';
            card.dataset.filename = file.name; // Crucial for deletion targeting
            card.innerHTML = `
                ${previewHtml}
                <div style="margin-bottom: 0.5rem;">
                    <a href="${file.url}" target="_blank" style="color: var(--accent-color); font-weight: 500; word-break: break-all;">${file.name}</a>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                    Size: ${file.size}<br>
                    Modified: ${new Date(file.mtime).toLocaleDateString()}
                </div>
                <div class="admin-actions">
                    <button class="btn-delete" onclick="deleteMedia('${file.name}')">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                    <a href="${file.url}" download="${file.name}" class="btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem; text-decoration: none; color: var(--text-main); display: inline-flex; align-items: center; justify-content: center; margin-right: 0.5rem;" title="Download">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    <button class="btn-secondary" onclick="navigator.clipboard.writeText('${file.url}'); showNotification('URL copied!', 'success');" style="padding: 0.5rem 1rem; font-size: 0.9rem;" title="Copy URL">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading media:', err);
        grid.innerHTML = '<p>Error loading media files.</p>';
    }
}

const fields = {
    projects: [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'tags', label: 'Tags (comma separated)', type: 'text' },
        { name: 'category', label: 'Category', type: 'text' },
        
        // New Modal Fields
        { name: 'role', label: 'Role', type: 'text' },
        { name: 'year', label: 'Year', type: 'text' },
        { name: 'subject', label: 'Subject', type: 'text' },
        { name: 'tasks', label: 'Tasks (One per line)', type: 'textarea' },

        { name: 'image', label: 'Image Class (or upload file)', type: 'text' }, // Keep for fallback
        { name: 'imageFile', label: 'Upload Image/Video', type: 'file' }, // New file input
        { name: 'link', label: 'Link', type: 'text' },
        { name: 'github_link', label: 'GitHub Link', type: 'text' },
        { name: 'notion_url', label: 'Notion Page URL', type: 'text' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    certifications: [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'issuer', label: 'Issuer', type: 'text' },
        { name: 'year', label: 'Year', type: 'text' },
        { name: 'domain', label: 'Domain', type: 'text' },
        { name: 'icon', label: 'Icon Class (FontAwesome)', type: 'text' },
        { 
            name: 'status', 
            label: 'Status', 
            type: 'select', 
            options: ['obtained', 'in_progress', 'planned'] 
        },
        // Detailed Modal Fields
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'skills', label: 'Skills (comma separated)', type: 'text' },
        { name: 'credential_id', label: 'Credential ID', type: 'text' },
        { name: 'credential_url', label: 'Verification URL', type: 'text' },
        { 
            name: 'level', 
            label: 'Level', 
            type: 'select', 
            options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] 
        },
        { name: 'pdf', label: 'Current PDF Path', type: 'text' }, // Read-only or manual edit
        { name: 'pdfFile', label: 'Upload Certificate (PDF Only)', type: 'file', accept: '.pdf' },
        { name: 'image', label: 'Current Image Path', type: 'text' },
        { name: 'imageFile', label: 'Upload Preview (Image Only)', type: 'file' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    education: [
        { name: 'degree', label: 'Degree', type: 'text' },
        { name: 'institution', label: 'Institution', type: 'text' },
        // { name: 'year', label: 'Year', type: 'text' }, // Repaced by Start/End
        { name: 'start_date', label: 'Start Date (e.g. 2020 or Sep 2020)', type: 'text' },
        { name: 'end_date', label: 'End Date (Leave empty for Present)', type: 'text' },
        
        { name: 'logo', label: 'Logo Path', type: 'text' },
        { name: 'logoFile', label: 'Upload Logo (Image)', type: 'file' },
        { name: 'brochure', label: 'Brochure Path', type: 'text' },
        { name: 'brochureFile', label: 'Upload Brochure (PDF)', type: 'file', accept: '.pdf' },

        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    experience: [
        { name: 'role', label: 'Role', type: 'text' },
        { name: 'company', label: 'Company', type: 'text' },
        // { name: 'year', label: 'Year', type: 'text' },
        { name: 'start_date', label: 'Start Date (e.g. 2020)', type: 'text' },
        { name: 'end_date', label: 'End Date (Leave empty for Present)', type: 'text' },

        { name: 'logo', label: 'Logo Path', type: 'text' },
        { name: 'logoFile', label: 'Upload Logo (Image)', type: 'file' },
        { name: 'website', label: 'Website URL', type: 'text' },
        { name: 'linkedin', label: 'LinkedIn URL', type: 'text' },

        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    articles: [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'summary', label: 'Summary', type: 'textarea' },
        { name: 'link', label: 'Link URL', type: 'text' },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'updated_date', label: 'Modification Date', type: 'date' },
        { name: 'tags', label: 'Theme / Tags (comma separated)', type: 'text' },
        { name: 'image', label: 'Current Image Path (or external URL)', type: 'text' },
        { name: 'imageFile', label: 'Cover Image', type: 'file' },
        { name: 'lang', label: 'Language', type: 'select', options: ['en', 'fr'] },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    skills: [
        { name: 'category', label: 'Category', type: 'text' },
        { name: 'icon', label: 'Category Icon Class (FontAwesome)', type: 'text' },
        { name: 'name', label: 'Skill Name', type: 'text' },
        { name: 'level', label: 'Level (%)', type: 'number' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    shapes: [
        { name: 'type', label: 'Shape Type', type: 'select', options: ['cube', 'pyramid', 'sphere'] },
        { name: 'icon', label: 'Icon Class (e.g. fa-solid fa-brain)', type: 'text' },
        { name: 'face_front', label: 'Front Text (or Sphere Text)', type: 'text' },
        { name: 'face_back', label: 'Back Text', type: 'text' },
        { name: 'face_right', label: 'Right Text', type: 'text' },
        { name: 'face_left', label: 'Left Text', type: 'text' },
        { name: 'face_top', label: 'Top Text (Cube only)', type: 'text' },
        { name: 'face_bottom', label: 'Bottom Text (Cube only)', type: 'text' },
        { name: 'size', label: 'Size (Scale 0.1 - 2.0)', type: 'number', step: '0.1' },
        { name: 'pos_x', label: 'Position X % (0-100)', type: 'number' },
        { name: 'pos_y', label: 'Position Y % (0-100)', type: 'number' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' },
        { name: 'is_mobile_visible', label: 'Afficher sur mobile (Un seul)', type: 'checkbox' }
    ],
    general: [
        { name: 'hero_subtitle', label: 'Hero Subtitle', type: 'text' },
        { name: 'hero_title', label: 'Hero Title', type: 'text' },
        { name: 'hero_description', label: 'Hero Description 1', type: 'textarea' },
        { name: 'hero_description_2', label: 'Hero Description 2 (Optional)', type: 'textarea' },
        { name: 'hero_description_3', label: 'Hero Description 3 (Optional)', type: 'textarea' },
        { name: 'about_lead', label: 'About Lead Text', type: 'textarea' },
        { name: 'about_bio', label: 'About Bio', type: 'textarea' },

        { name: 'profile_image', label: 'Current Profile Image Path', type: 'text' },
        { name: 'profileImage', label: 'Upload Profile Image', type: 'file' },
        { name: 'cv_file', label: 'Current CV Path', type: 'text' },
        { name: 'cvFile', label: 'Upload New CV (PDF Only)', type: 'file', accept: '.pdf' },
        { name: 'email', label: 'Email', type: 'text' },
        { name: 'phone', label: 'Phone', type: 'text' },
        { name: 'location', label: 'Location', type: 'text' },
        { name: 'linkedin_link', label: 'LinkedIn URL', type: 'text' },
        { name: 'github_link', label: 'GitHub URL', type: 'text' },
        { name: 'gemini_api_key', label: 'Gemini API Key (Leave empty to keep current)', type: 'password' },
        { 
            name: 'gemini_model', 
            label: 'Gemini Model', 
            type: 'select', 
            options: [
                'gemini-2.0-flash-exp', 
                'gemini-2.0-flash', 
                'gemini-2.5-flash',
                'gemini-1.5-flash', 
                'gemini-1.5-pro',
                'gemini-pro', 
                'gemini-flash-latest'
            ] 
        },
        { name: 'notion_api_key', label: 'Notion API Key (Leave empty to keep current)', type: 'password' }
    ],
    profile: [
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'password', label: 'New Password (leave blank to keep current)', type: 'password' }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const langSelect = document.getElementById('admin-lang-select');
    if (langSelect) {
        langSelect.value = currentAdminLang;
        langSelect.onchange = (e) => window.updateAdminLang(e.target.value);
    }
    loadContent(currentTab);
    setupModal();
    initCursor();
    initThemeAdmin();
    updateUnreadCount();
});

async function updateUnreadCount() {
    try {
        const res = await fetch(`${API_URL}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        const unread = messages.filter(m => !m.is_read || m.is_read == 0).length;
        const badge = document.getElementById('msg-badge');
        
        if (unread > 0) {
            badge.innerText = unread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } catch (err) { console.error('Error fetching messages count:', err); }
}

// Tab Switching
window.switchTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/Hide "Add New" button based on tab
    const addBtn = document.querySelector('.btn-add');
    if (addBtn) {
        if (tab === 'media' || tab === 'messages') {
            addBtn.style.display = 'none';
        } else {
             addBtn.style.display = 'flex';
        }
    }

    if (tab === 'media') {
        loadMedia();
    } else if (tab === 'database') {
        renderDatabaseView();
    } else {
        loadContent(tab);
    }
};

const SEARCHABLE_TABS = ['projects', 'certifications', 'education', 'experience', 'skills', 'articles', 'shapes'];
let currentTabData = [];

// Initialize Search Listener
document.addEventListener('DOMContentLoaded', () => {
    // ... existing init code ...
    const searchInput = document.getElementById('admin-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterAndRender(e.target.value);
        });
    }
});

// Load Content
async function loadContent(type, isRefresh = false) {
    if (!type) return; 
    window.currentTab = type; // Keep tracker in sync
    const grid = document.getElementById('content-grid');
    if (!isRefresh) {
        grid.innerHTML = '<p>Loading...</p>';
    }
    
    // Reset Search
    const searchContainer = document.getElementById('admin-search-container');
    const searchInput = document.getElementById('admin-search-input');
    if(searchInput) searchInput.value = '';

    // Show/Hide Search Bar
    if (searchContainer) {
        if (SEARCHABLE_TABS.includes(type)) {
            searchContainer.style.display = 'block';
        } else {
            searchContainer.style.display = 'none';
        }
    }

    let endpoint;
    if (type === 'reviews') {
        endpoint = `${API_URL}/admin/reviews`;
    } else if (type === 'system') {
        endpoint = `${API_URL}/admin/system`;
    } else if (type === 'overview') {
        endpoint = `${API_URL}/admin/stats`;
    } else {
        endpoint = `${API_URL}/${type}`;
    }
    
    try {
        let url = `${endpoint}?lang=${currentAdminLang}&t=${Date.now()}`;
        if (type === 'overview' && window.overviewFilters) {
            if (window.overviewFilters.year) url += `&year=${window.overviewFilters.year}`;
            if (window.overviewFilters.month) url += `&month=${window.overviewFilters.month}`;
            if (window.overviewFilters.lang) url += `&lang=${window.overviewFilters.lang}`;
            if (window.overviewFilters.device) url += `&device=${window.overviewFilters.device}`;
            if (window.overviewFilters.sort) url += `&sort=${window.overviewFilters.sort}`;
        }

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                 window.location.href = '/login.html';
                 return;
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        currentTabData = data; // Store for filtering
        
        let filteredData = data;
        
        // Handle specific non-generic tabs immediately (restore their original logic)
        if (type === 'general' || type === 'profile') {
           renderSpecialCard(type, data);
           return;
        }

        if (type === 'messages') {
            renderMessages(data);
            return;
        }

        if (type === 'reviews') {
            renderReviews(data);
            return;
        }

        if (type === 'system') {
            renderSystemStats(data);
            return;
        }

        if (type === 'overview') {
            renderOverview(data);
            return;
        }
        
        // For generic searchable tabs
        renderItems(data);

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p>Error loading data.</p>';
    }
}

// Helper functions
const createList = (id, items, icon, visible = false) => {
    if (!items || items.length === 0) return `<div id="${id}" style="display:${visible?'block':'none'}; color:var(--text-muted); padding:1rem;">No data available.</div>`;
    
    // Determine unit label
    let unit = 'Views';
    const sort = window.overviewFilters ? window.overviewFilters.sort : 'views';
    if (sort === 'likes') unit = 'Likes';
    else if (sort === 'comments') unit = 'Comments';

    return `
        <div id="${id}" style="display:${visible?'block':'none'}; max-height:400px; overflow-y:auto; padding-right:5px;">
            ${items.map((item, i) => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.8rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <div style="color:var(--text-muted); width:20px;">#${i+1}</div>
                        <div style="width:40px; height:40px; background:rgba(255,255,255,0.05); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                            <i class="${icon}"></i>
                        </div>
                        <div>
                            <div style="font-weight:bold;">${item.name || item.title}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${item.clicks||0} ${unit}</div>
                        </div>
                    </div>
                    <div style="color:var(--primary-color); font-weight:bold;">${item.clicks||0}</div>
                </div>
            `).join('')}
        </div>
    `;
};
window.createList = createList;

// Overview Render
window.overviewFilters = { year: new Date().getFullYear(), month: '' };

function renderOverview(data) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';
    
    // Calculate totals for charts (Use backend precise counts if available, fallback to sum if not - now backend sends them)
    const projClicks = data.clicks_projects !== undefined ? data.clicks_projects : (data.top_projects ? data.top_projects.reduce((s,i)=>s+(i.clicks||0),0) : 0);
    const certClicks = data.clicks_certifs !== undefined ? data.clicks_certifs : (data.top_certifs ? data.top_certifs.reduce((s,i)=>s+(i.clicks||0),0) : 0);
    const artClicks = data.clicks_articles !== undefined ? data.clicks_articles : (data.top_articles ? data.top_articles.reduce((s,i)=>s+(i.clicks||0),0) : 0);

    // Filter Handlers
    window.applyOverviewFilter = () => {
        const year = document.getElementById('ov-year').value;
        const month = document.getElementById('ov-month').value;
        const lang = document.getElementById('ov-lang').value;
        const device = document.getElementById('ov-device').value;
        const sort = document.getElementById('ov-sort').value;
        window.overviewFilters = { year, month, lang, device, sort };
        loadContent('overview', true); // Trigger refresh with new filters
    };

    // Helper for Stat Card
    const card = (icon, value, label, id = '') => `
        <div class="admin-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.5rem; text-align:center; min-height:120px;">
            <i class="${icon}" style="font-size:2.5rem; color:var(--accent-color); margin-bottom:1rem;"></i>
            <div style="display:flex; flex-direction:column; align-items:center;">
                <div style="font-size:2rem; font-weight:600; margin-bottom:0.3rem;" ${id ? `id="${id}"` : ''}>${value}</div>
                <div style="color:var(--text-muted); font-size:0.9rem;">${label}</div>
            </div>
        </div>
    `;

    // 1. Content Stats
    const contentHtml = `
        <h2 style="grid-column:1/-1; margin-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">Content Overview</h2>
        ${card('fa-solid fa-briefcase', data.projects, 'Projects', 'stat-projects')}
        ${card('fa-solid fa-certificate', data.certifications, 'Certifications', 'stat-certifications')}
        ${card('fa-solid fa-newspaper', data.articles, 'Articles', 'stat-articles')}
    `;

    // 2. Interaction Stats
    const interactionHtml = `
        <h2 style="grid-column:1/-1; margin:2rem 0 1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">Interactions</h2>
        ${card('fa-solid fa-envelope', data.messages_total, `Total Messages<br><small style="color:var(--accent-color);">${data.messages_unread} unread</small>`, 'stat-messages')}
        ${card('fa-solid fa-star', data.reviews_total, `Reviews<br><small style="color:var(--accent-color);">${data.reviews_pending} pending</small>`, 'stat-reviews')}
    `;

    // 2.5 Audience Stats (Subscribers)
    const audienceHtml = `
        <h2 style="grid-column:1/-1; margin:2rem 0 1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">Audience</h2>
        ${card('fa-solid fa-users-viewfinder', data.subscribers_active !== undefined ? data.subscribers_active : 0, 'Active Subscribers', 'stat-subscribers-active')}
        ${card('fa-solid fa-user-xmark', data.subscribers_unsubscribed !== undefined ? data.subscribers_unsubscribed : 0, 'Unsubscribed', 'stat-subscribers-unsubscribed')}
        <div class="admin-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.5rem; text-align:center; min-height:120px; cursor:pointer; background:rgba(255, 255, 255, 0.03); transition: background 0.2s;" onclick="openSubscribersModal()" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <i class="fa-solid fa-list-ul" style="font-size:2rem; color:var(--text-muted); margin-bottom:0.5rem;"></i>
           <div style="font-weight:600; color:var(--text-main);">Manage List</div>
        </div>
    `;

    // 3. Analytics Stats (With Filters)
    const currentYear = new Date().getFullYear();
    // Use backend provided years or fallback to current year
    const years = (data.available_years && data.available_years.length > 0) ? data.available_years : [currentYear];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const analyticsHtml = `
        <div style="grid-column:1/-1; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; flex-wrap:wrap; gap:10px;">
            <h2 style="margin:0; width:100%; text-align:center;">Analytics</h2>
            
            <div class="analytics-filters" style="gap:10px; align-items:center;">
                <select id="ov-year" class="admin-input" style="padding:5px 10px; width:auto;">
                    <option value="">All Years</option>
                    ${years.map(y => `<option value="${y}" ${window.overviewFilters.year == y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
                <select id="ov-month" class="admin-input" style="padding:5px 10px; width:auto;">
                    <option value="">All Months</option>
                    ${months.map((m, i) => `<option value="${i+1}" ${window.overviewFilters.month == (i+1) ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
                <!-- New Filters -->
                 <select id="ov-lang" class="admin-input" style="padding:5px 10px; width:auto;">
                    <option value="">All Langs</option>
                    <option value="en" ${window.overviewFilters.lang == 'en' ? 'selected' : ''}>English</option>
                    <option value="fr" ${window.overviewFilters.lang == 'fr' ? 'selected' : ''}>Français</option>
                </select>
                 <select id="ov-device" class="admin-input" style="padding:5px 10px; width:auto;">
                    <option value="">All Devices</option>
                    <option value="desktop" ${window.overviewFilters.device == 'desktop' ? 'selected' : ''}>Desktop</option>
                    <option value="mobile" ${window.overviewFilters.device == 'mobile' ? 'selected' : ''}>Mobile</option>
                </select>
                
                
                <button class="btn-primary" style="padding:0.4rem 1rem;" onclick="applyOverviewFilter()">Filter</button>
            </div>
        </div>
        
        
        ${card('fa-solid fa-users', data.total_visitors, `Total Visitors<br><small style="color:var(--accent-color);">Unique IPs</small>`, 'stat-visitors')}
        ${card('fa-solid fa-user-clock', data.visitors_7d, `Visitors (7d)<br><small style="color:var(--accent-color);">Last 7 Days (Recent)</small>`, 'stat-visitors-7d')}
        ${card('fa-solid fa-hand-pointer', data.total_clicks, `Total Clicks<br><small style="color:var(--accent-color);">Projects/Certs/Articles</small>`, 'stat-clicks')}
        ${card('fa-regular fa-heart', data.total_likes, `Total Likes<br><small style="color:var(--accent-color);">Projects/Articles</small>`, 'stat-likes')}
        ${card('fa-regular fa-comment', data.total_comments, `Total Comments<br><small style="color:var(--accent-color);">Projects/Articles</small>`, 'stat-comments')}
    `;
    
    // --- POLLING LOGIC ---
    if (window.overviewPolling) clearInterval(window.overviewPolling);
    window.overviewPolling = setInterval(async () => {
        try {
            // Re-fetch only if tab is still overview (safety check)
            if (window.currentTab !== 'overview') {
                clearInterval(window.overviewPolling);
                return;
            }
            
            const q = window.overviewFilters;
            const params = new URLSearchParams();
            if (q.year) params.append('year', q.year);
            if (q.month) params.append('month', q.month);
            if (q.lang) params.append('lang', q.lang);
            if (q.device) params.append('device', q.device);
            if (q.sort) params.append('sort', q.sort);
            
            const res = await fetch(`${API_URL}/admin/stats?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Handle authentication errors
            if (res.status === 401 || res.status === 403) {
                clearInterval(window.overviewPolling);
                localStorage.removeItem('adminToken');
                window.location.href = 'login.html';
                return;
            }
            
            const newData = await res.json();
            
            // Update Text Content Only to avoid flicker
            const update = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
            
            update('stat-projects', newData.projects);
            update('stat-certifications', newData.certifications);
            update('stat-articles', newData.articles);
            update('stat-messages', newData.messages_total);
            update('stat-reviews', newData.reviews_total);
            update('stat-subscribers-active', newData.subscribers_active);
            update('stat-subscribers-unsubscribed', newData.subscribers_unsubscribed);
            update('stat-visitors', newData.total_visitors);
            update('stat-visitors-7d', newData.visitors_7d);
            update('stat-clicks', newData.total_clicks);
            update('stat-likes', newData.total_likes);
            update('stat-comments', newData.total_comments);
            update('stat-clicks', newData.total_clicks);
            
            // Also update charts if needed, but charts might re-animate. 
            // For now, text updates are the critical "live" requirement.
            
        } catch(e) { console.error("Polling error", e); }
    }, 5000); // 5 Seconds Interval


    // 4. Graphs
     const graphHtml = `
        <div style="grid-column:1/-1; margin-top:2rem;">
            <h3>Traffic History</h3>
             <div class="admin-card" style="height:350px; position:relative; overflow-x:auto;">
                 <div style="width:100%; min-width:min(1000px, 100%); height:300px; padding-bottom:10px;">
                    <canvas id="statsChart"></canvas>
                 </div>
             </div>
        </div>
    `;



    // 5. Top Content
    const topContentHtml = `
        <h3 style="grid-column:1/-1; margin-top:2rem;">Content Performance</h3>
        <div class="admin-card" style="grid-column:1/-1;">
             <div style="display:flex; gap:10px; margin-bottom:1rem; flex-wrap:wrap; align-items:center;">
                <div style="display:flex; gap:10px;">
                    <button class="filter-btn active" onclick="switchOverviewTab('top-projects', this)">Projects</button>
                    <button class="filter-btn" onclick="switchOverviewTab('top-certifs', this)">Certifications</button>
                    <button class="filter-btn" onclick="switchOverviewTab('top-articles', this)">Articles</button>
                </div>
                <div style="margin-left:auto;">
                     <select id="ov-sort" class="admin-input" style="padding:5px 10px; width:auto;" onchange="applyOverviewFilter()">
                        <option value="views" ${window.overviewFilters.sort == 'views' ? 'selected' : ''}>Sort: Views</option>
                        <option value="likes" ${window.overviewFilters.sort == 'likes' ? 'selected' : ''}>Sort: Likes</option>
                        <option value="comments" ${window.overviewFilters.sort == 'comments' ? 'selected' : ''}>Sort: Comments</option>
                    </select>
                </div>
            </div>
            ${createList('top-projects', data.top_projects, 'fa-solid fa-briefcase', true)}
            ${createList('top-certifs', data.top_certifs, 'fa-solid fa-certificate')}
            ${createList('top-articles', data.top_articles, 'fa-solid fa-newspaper')}
        </div>
    `;

    // 6. Chatbot Conversation History
    const chatbotHistoryHtml = `
        <h3 style="grid-column:1/-1; margin-top:2rem;">Recent Chatbot Conversations</h3>
        <div class="admin-card" style="grid-column:1/-1;">
            <div style="display:flex; gap:1rem; margin-bottom:1.5rem; align-items:center; flex-wrap:wrap;">
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <label style="color:var(--text-muted); font-size:0.9rem;">From:</label>
                    <input type="date" id="chatbot-start-date" class="admin-input" style="padding:0.4rem 0.8rem; width:auto;" />
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <label style="color:var(--text-muted); font-size:0.9rem;">To:</label>
                    <input type="date" id="chatbot-end-date" class="admin-input" style="padding:0.4rem 0.8rem; width:auto;" />
                </div>
                <button class="btn-primary" style="padding:0.4rem 1rem;" onclick="applyChatbotDateFilter()">Filter</button>
                <button class="btn-secondary" style="padding:0.4rem 1rem;" onclick="clearChatbotDateFilter()">Clear</button>
            </div>
            <div id="chatbot-history-container" style="max-height:500px; overflow-y:auto;">
                <div style="text-align:center; color:var(--text-muted); padding:2rem;">Loading...</div>
            </div>
        </div>
    `;

    grid.innerHTML = contentHtml + interactionHtml + audienceHtml + analyticsHtml + graphHtml + topContentHtml + chatbotHistoryHtml;

    // Load chatbot history
    loadChatbotHistory();

    // Initialize Traffic Chart (Using Global Filters)
    window.statsChart = null; 
    window.updateStatsChart = async () => {
        // Use global filters
        const year = window.overviewFilters.year || '';
        const month = window.overviewFilters.month || '';
        
        try {
            const res = await fetch(`${API_URL}/admin/stats/history?year=${year}&month=${month}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const historyData = await res.json();
            
            const ctx = document.getElementById('statsChart').getContext('2d');
            if (window.statsChart) window.statsChart.destroy();

            window.statsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: historyData.map(d => d.day),
                    datasets: [{
                        label: 'Visits',
                        data: historyData.map(d => d.count),
                        borderColor: '#2ed573',
                        backgroundColor: 'rgba(46, 213, 115, 0.1)',
                        borderWidth: 2,
                        pointRadius: 4, 
                        pointHoverRadius: 6,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#a4b0be' } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a4b0be' } },
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a4b0be' } }
                    }
                }
            });
        } catch(e) { console.error(e); }
    };

    setTimeout(() => {
        updateStatsChart(); // Traffic with default/global filter


    }, 100);

    // Tab Switcher for Top Content
    window.switchOverviewTab = (targetId, btn) => {
        if (btn && btn.parentElement) {
            btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        ['top-projects', 'top-certifs', 'top-articles'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (id === targetId) ? 'grid' : 'none';
        });
    };
}

// Load Chatbot History
async function loadChatbotHistory(startDate = '', endDate = '') {
    const container = document.getElementById('chatbot-history-container');
    if (!container) return;
    
    try {
        let url = `${API_URL}/admin/chatbot-history?limit=50`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch chatbot history');
        
        const conversations = await res.json();
        
        if (!conversations || conversations.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:2rem;">No conversations found</div>';
            return;
        }
        
        container.innerHTML = conversations.map((conv, i) => {
            const date = new Date(conv.date);
            const dateStr = date.toLocaleString();
            const questionPreview = conv.question.length > 100 ? conv.question.substring(0, 100) + '...' : conv.question;
            const answerPreview = conv.answer.length > 150 ? conv.answer.substring(0, 150) + '...' : conv.answer;
            
            return `
                <div style="border-bottom:1px solid rgba(255,255,255,0.05); padding:1rem; cursor:pointer; transition:background 0.2s;" 
                     onmouseover="this.style.background='rgba(255,255,255,0.02)'" 
                     onmouseout="this.style.background='transparent'"
                     onclick="toggleChatDetail(${i})">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.5rem;">
                        <div style="font-weight:bold; color:var(--accent-color);">
                            <i class="fa-solid fa-comment-dots"></i> Question
                        </div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${dateStr} ${conv.lang ? `[${conv.lang.toUpperCase()}]` : ''}</div>
                    </div>
                    <div style="color:var(--text-main); margin-bottom:0.8rem;">${questionPreview}</div>
                    <div style="font-weight:bold; color:#54a0ff; margin-bottom:0.3rem;">
                        <i class="fa-solid fa-robot"></i> Response
                    </div>
                    <div style="color:var(--text-muted); line-height:1.5;" id="chat-preview-${i}">${answerPreview}</div>
                    <div style="display:none; color:var(--text-muted); line-height:1.5; margin-top:0.5rem;" id="chat-full-${i}">
                        <div style="margin-top:0.5rem; padding:1rem; background:rgba(255,255,255,0.02); border-radius:0.5rem;">
                            <div style="margin-bottom:1rem;"><strong>Full Question:</strong><br/>${conv.question}</div>
                            <div><strong>Full Response:</strong><br/>${conv.answer}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Error loading chatbot history:', err);
        container.innerHTML = '<div style="text-align:center; color:#ff4757; padding:2rem;">Failed to load conversations</div>';
    }
}

// Toggle chat detail expansion
window.toggleChatDetail = (index) => {
    const preview = document.getElementById(`chat-preview-${index}`);
    const full = document.getElementById(`chat-full-${index}`);
    
    if (full.style.display === 'none') {
        preview.style.display = 'none';
        full.style.display = 'block';
    } else {
        preview.style.display = 'block';
        full.style.display = 'none';
    }
};

// Apply chatbot date filter
window.applyChatbotDateFilter = () => {
    const startDate = document.getElementById('chatbot-start-date').value;
    const endDate = document.getElementById('chatbot-end-date').value;
    loadChatbotHistory(startDate, endDate);
};

// Clear chatbot date filter
window.clearChatbotDateFilter = () => {
    document.getElementById('chatbot-start-date').value = '';
    document.getElementById('chatbot-end-date').value = '';
    loadChatbotHistory();
};

// System Stats Render
function renderSystemStats(data) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';

    // Helpers for formatting
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    };

    // Circular Progress Component
    const createCircle = (percent, color, label, valueText) => `
        <div class="stat-circle-card" style="background:var(--card-bg); padding:1.5rem; border-radius:1rem; border:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem;">
            <div style="position:relative; width:120px; height:120px; border-radius:50%; background:conic-gradient(${color} ${percent}%, rgba(255,255,255,0.05) 0);">
                <div style="position:absolute; top:10px; left:10px; right:10px; bottom:10px; background:var(--card-bg); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                    <span style="font-size:1.5rem; font-weight:bold; color:#fff;">${percent}%</span>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${label}</span>
                </div>
            </div>
            <div style="text-align:center;">
                <h4 style="margin:0; color:var(--text-main);">${valueText}</h4>
            </div>
        </div>
    `;

    // 1. Resources Row (CPU, RAM, DISK)
    const resourcesHtml = `
        <div style="grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
            ${createCircle(data.cpu.load, '#ff4757', 'CPU Load', `${data.cpu.cores} Cores - ${data.cpu.model}`)}
            ${createCircle(data.memory.percent, '#2ed573', 'RAM Usage', `${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}`)}
            ${data.disk.total ? createCircle(data.disk.percent, '#ffa502', 'Disk Usage', `${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}`) : '<div class="stat-circle-card" style="padding:2rem;">Disk Unavailable</div>'}
        </div>
    `;

    // 2. Info Row (Network, Uptime)
    const infoHtml = `
        <div style="grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:1.5rem;">
            <!-- Network Card -->
            <div class="admin-card">
                <h3><i class="fa-solid fa-network-wired" style="color:#1e90ff;"></i> Network Traffic</h3>
                <div style="display:flex; justify-content:space-between; margin-top:1.5rem;">
                    <div style="text-align:center;">
                        <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;"><i class="fa-solid fa-download"></i> Received</div>
                        <div style="font-size:1.5rem; font-weight:bold; color:#fff;">${formatBytes(data.network.rx)}</div>
                    </div>
                    <div style="width:1px; background:rgba(255,255,255,0.1);"></div>
                    <div style="text-align:center;">
                        <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;"><i class="fa-solid fa-upload"></i> Sent</div>
                        <div style="font-size:1.5rem; font-weight:bold; color:#fff;">${formatBytes(data.network.tx)}</div>
                    </div>
                </div>
            </div>

            <!-- Uptime Card -->
             <div class="admin-card">
                <h3><i class="fa-solid fa-clock" style="color:#a55eea;"></i> System Uptime</h3>
                <div style="display:flex; align-items:center; justify-content:center; height:100px;">
                    <div style="font-size:2rem; font-weight:bold; font-family:var(--font-heading); color:#fff;">${formatUptime(data.uptime)}</div>
                </div>
            </div>
        </div>
    `;

    grid.innerHTML = resourcesHtml + infoHtml;
    
    // Auto-refresh every 5 seconds if still on system tab
    if (!window.systemInterval) {
        window.systemInterval = setInterval(() => {
            if (currentTab === 'system') loadContent('system', true);
            else clearInterval(window.systemInterval), window.systemInterval = null;
        }, 5000);
    }
}

// Filter and Render
function filterAndRender(query) {
    if (!currentTabData) return;
    const lowerQuery = query.toLowerCase();
    
    const filtered = currentTabData.filter(item => {
        // Search in common fields
        const title = item.title || item.name || item.degree || item.role || item.face_front || '';
        const desc = item.description || item.summary || item.skills || item.institution || item.company || '';
        const tags = item.tags || item.category || '';
        
        return title.toLowerCase().includes(lowerQuery) || 
               desc.toLowerCase().includes(lowerQuery) || 
               tags.toLowerCase().includes(lowerQuery);
    });

    renderItems(filtered);
}

// Extracted Render Function for Generic Items
function renderItems(data) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = '<p>No items found.</p>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        // Store item data in dataset for easy editing
        card.dataset.item = JSON.stringify(item);
        
        const isHidden = item.is_hidden == 1 || item.is_hidden === true;
        const isMobile = item.is_mobile_visible == 1 || item.is_mobile_visible === true;
        card.style.opacity = isHidden ? '0.5' : '1';
        
        card.innerHTML = `
            <h3>${item.title || item.name || item.degree || item.role || (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) + ': ' + (item.face_front || 'Untitled') : (item.face_front ? 'Cube: ' + item.face_front : 'Item'))} ${isHidden ? '<span style="font-size:0.7em; background:#333; padding:2px 5px; border-radius:4px;">(Hidden)</span>' : ''} ${isMobile ? '<span style="font-size:0.7em; background:var(--accent-color); color:#000; padding:2px 5px; border-radius:4px; margin-left:5px;"><i class="fa-solid fa-mobile-screen"></i> Mobile Hero</span>' : ''}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; display:flex; justify-content:space-between; align-items:center;">
                <span>${item.category || item.issuer || item.institution || item.company || (item.size ? `Size: ${item.size}, Pos: ${item.pos_x}%, ${item.pos_y}%` : '')}</span>
                <span style="display:flex; gap:5px;">
                    ${item.clicks !== undefined ? `<span style="background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:12px; font-size:0.8rem; color:var(--text-main);"><i class="fa-solid fa-eye" style="color:var(--accent-color); margin-right:5px;"></i> ${item.clicks}</span>` : ''}
                    ${item.likes_count !== undefined ? `<span style="background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:12px; font-size:0.8rem; color:var(--text-main);"><i class="fa-solid fa-heart" style="color:#ff4757; margin-right:5px;"></i> ${item.likes_count}</span>` : ''}
                    ${item.comments_count !== undefined ? `<span role="button" onclick="window.openComments(null, ${item.id}); event.stopPropagation();" style="background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:12px; font-size:0.8rem; color:var(--text-main); cursor:pointer; pointer-events:auto; display:inline-flex; align-items:center;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'"><i class="fa-solid fa-comment" style="color:#54a0ff; margin-right:5px;"></i> ${item.comments_count}</span>` : ''}
                </span>
            </p>
            <div class="admin-actions">
                <button class="btn-edit" onclick='toggleVisibility(${item.id})' style="background: rgba(255, 255, 255, 0.1); color: ${isHidden ? '#ff4757' : '#2ed573'}; border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; margin-right: 0.5rem;" title="${isHidden ? 'Show' : 'Hide'}">
                    <i class="fa-solid ${isHidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
                </button>
                <button class="btn-edit" onclick='editItem(${JSON.stringify(item).replace(/'/g, "&#39;")})' style="background: rgba(0, 255, 157, 0.1); color: var(--accent-color); border: 1px solid rgba(0, 255, 157, 0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; margin-right: 0.5rem;"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteItem(${item.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    applyThemeStyles(); // Force styles after render
}

// Special Render Helpers (extracted from original loadContent)
function renderSpecialCard(type, data) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';
    
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.style.gridColumn = "1 / -1";
    card.dataset.item = JSON.stringify(data);
    
    let title = type === 'general' ? 'General Information' : 'Admin Profile';
    let subtitle = type === 'general' ? 'Hero, About, Stats & Cube Settings' : 'Manage your credentials';

    card.innerHTML = `
        <h3>${title}</h3>
        <p>${subtitle}</p>
        <div class="admin-actions">
            <button class="btn-edit" onclick='editItem(${JSON.stringify(data).replace(/'/g, "&#39;")})' style="background: rgba(0, 255, 157, 0.1); color: var(--accent-color); border: 1px solid rgba(0, 255, 157, 0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; margin-right: 0.5rem;"><i class="fa-solid fa-pen"></i> Edit ${type === 'profile' ? 'Profile' : 'Content'}</button>
        </div>
    `;
    grid.appendChild(card);
}

function renderMessages(data) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';
    if (data.length === 0) {
        grid.innerHTML = '<p>No messages yet.</p>';
        return;
    }
    data.forEach(msg => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.style.opacity = msg.is_read ? '0.6' : '1';
        card.style.borderColor = msg.is_read ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <span style="font-weight:bold; color:var(--text-main);">${msg.name}</span>
                <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(msg.date).toLocaleString()}</span>
            </div>
            <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">${msg.email}</div>
            <p style="background:rgba(255,255,255,0.05); padding:0.8rem; border-radius:0.5rem; font-size:0.95rem; margin-bottom:1rem;">${msg.message}</p>
            <div class="admin-actions">
                ${!msg.is_read ? `<button class="btn-edit" onclick="markAsRead(${msg.id})" style="background:rgba(0,255,157,0.1); color:var(--accent-color); border:none; padding:0.5rem 1rem; border-radius:0.5rem; cursor:pointer;"><i class="fa-solid fa-check"></i> Mark Read</button>` : '<span style="color:#666; font-size:0.8rem; align-self:center; margin-right:1rem;">Read</span>'}
                <button class="btn-delete" onclick="deleteMessage(${msg.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderReviews(data) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';
    if (data.length === 0) {
        grid.innerHTML = '<p>No reviews yet.</p>';
        return;
    }
    data.forEach(rev => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.style.opacity = !rev.is_approved ? '1' : '0.7';
        card.style.borderColor = !rev.is_approved ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:flex-start;">
                <div>
                    <span style="font-weight:bold; color:var(--text-main); font-size:1.1rem;">${rev.name}</span>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${rev.role || 'No Role'}</div>
                    <div style="font-size:0.8rem; color:var(--accent-color); margin-top:2px;">${rev.social_platform} ${rev.social_link ? `<a href="${rev.social_link}" target="_blank" style="color:white;"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}</div>
                </div>
                <div style="text-align:right;">
                        <span style="color:#ffd700;">${'★'.repeat(rev.rating)}</span>
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:5px;">${new Date(rev.date).toLocaleDateString()}</div>
                </div>
            </div>
            <p style="background:rgba(255,255,255,0.05); padding:0.8rem; border-radius:0.5rem; font-size:0.95rem; margin-bottom:1rem; font-style:italic;">"${rev.message}"</p>
            <div class="admin-actions">
                ${!rev.is_approved ? `<button class="btn-edit" onclick="approveReview(${rev.id})" style="background:rgba(0,255,157,0.1); color:var(--accent-color); border:none; padding:0.5rem 1rem; border-radius:0.5rem; cursor:pointer;"><i class="fa-solid fa-check"></i> Validate</button>` : '<span style="color:#666; font-size:0.8rem; align-self:center; margin-right:1rem;">Approved</span>'}
                <button class="btn-delete" onclick="deleteReview(${rev.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Toggle Visibility
window.toggleVisibility = async (id) => {
    try {
        // console.log('Toggling visibility for ID:', id); 

        const res = await fetch(`${API_URL}/${currentTab}`);
        const data = await res.json();
        const item = data.find(i => i.id === id);
        
        if (!item) {
            showNotification('Item not found', 'error');
            return;
        }

        // Toggle is_hidden
        const currentVal = (item.is_hidden == 1 || item.is_hidden === true) ? 1 : 0;
        item.is_hidden = currentVal === 1 ? 0 : 1;

        // Prepare body
        let body = JSON.stringify(item);
        let headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const updateRes = await fetch(`${API_URL}/${currentTab}/${id}`, {
            method: 'PUT',
            headers: headers,
            body: body
        });

        if (!updateRes.ok) {
            if (updateRes.status === 401 || updateRes.status === 403) {
                // simple redirect, no alert needed usually, or use verify token logic
                window.location.href = '/login.html';
                return;
            }
            const errText = await updateRes.text();
            throw new Error(`Failed to update: ${errText}`);
        }

        loadContent(currentTab);

    } catch (err) {
        console.error(err);
        showNotification('Error updating visibility: ' + err.message, 'error');
    }
};

// Delete Item
window.deleteItem = async (id) => {
    if(!await showConfirm('Delete Item?', 'Are you sure you want to delete this item?')) return;
    try {
        const res = await fetch(`${API_URL}/${currentTab}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadContent(currentTab);
            showNotification('Item deleted', 'success');
        } else {
            showNotification('Failed to delete', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error deleting item', 'error');
    }
};

// Edit Item
window.editItem = (item) => {
    editingId = item.id;
    openModal(true); // Pass true to indicate edit mode
    
    // Populate form
    setTimeout(() => {
        const form = document.getElementById('admin-form');
        Object.keys(item).forEach(key => {
            if (form.elements[key]) {
                if (form.elements[key].type === 'checkbox') {
                    form.elements[key].checked = (item[key] == 1 || item[key] === true);
                } else {
                    form.elements[key].value = item[key];
                }
            }
        });

        // Special handling for API Key placeholder
        if (item.has_api_key && form.elements['gemini_api_key']) {
            form.elements['gemini_api_key'].placeholder = 'Current key set (Hidden for security)';
        }

        document.getElementById('modal-title').innerText = 'Edit Item';
    }, 50);
};

// Modal Logic
window.openModal = (isEdit = false) => {
    const modal = document.getElementById('modal');
    const formFields = document.getElementById('form-fields');
    
    if (!isEdit) {
        editingId = null;
        document.getElementById('modal-title').innerText = 'Add Item';
    }
    
    formFields.innerHTML = '';
    
    fields[currentTab].forEach(field => {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        let inputHtml = '';
        if (field.type === 'textarea') {
            inputHtml = `<textarea name="${field.name}" rows="3"></textarea>`;
        } else if (field.type === 'file') {
            const accept = field.accept || 'image/*,video/*';
            inputHtml = `<input type="file" name="${field.name}" accept="${accept}">`;
        } else if (field.type === 'select') {
            const optionsHtml = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            inputHtml = `<select name="${field.name}">${optionsHtml}</select>`;
        } else if (field.type === 'checkbox') {
            inputHtml = `<input type="checkbox" name="${field.name}" style="width: auto; margin-right: 10px;">`;
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.flexDirection = 'row-reverse';
            div.style.justifyContent = 'flex-end';
        } else {
            const stepAttr = field.step ? ` step="${field.step}"` : '';
            inputHtml = `<input type="${field.type}" name="${field.name}"${stepAttr}>`;
        }

        if (field.type === 'checkbox') {
             div.innerHTML = `
                <label style="margin-bottom: 0;">${field.label}</label>
                ${inputHtml}
            `;
        } else {
            div.innerHTML = `
                <label>${field.label}</label>
                ${inputHtml}
            `;
        }
        formFields.appendChild(div);
    });
    
    modal.classList.add('open');
};

window.closeModal = () => {
    document.getElementById('modal').classList.remove('open');
};

function setupModal() {
    document.getElementById('admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        
        // File Size Check - GENERIC for all file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        for (const input of fileInputs) {
            if (input.files.length > 0) {
                const file = input.files[0];
                const maxSize = 500 * 1024 * 1024; // 500MB
                if (file.size > maxSize) {
                    showNotification(`File too large! Max 500MB. Yours: ${Math.round(file.size/1024/1024)}MB.`, 'error');
                    return;
                }
            }
        }
        
        submitBtn.innerText = 'Uploading... (Please wait)';
        submitBtn.disabled = true;

        const formData = new FormData(e.target);
        
        
        let method = (editingId || currentTab === 'general') ? 'PUT' : 'POST';
        let url = '';
        if (currentTab === 'general') {
            url = `${API_URL}/general`;
        } else if (currentTab === 'profile') {
            // Profile is always PUT
             url = `${API_URL}/profile`;
             method = 'PUT';
        } else {
            url = editingId ? `${API_URL}/${currentTab}/${editingId}` : `${API_URL}/${currentTab}`;
        }

        // Handle checkboxes explicitly
        const checkboxFields = document.querySelectorAll('input[type="checkbox"]');
        checkboxFields.forEach(cb => {
            formData.set(cb.name, cb.checked ? 1 : 0);
        });
        
        // Append current language to form data or json
        // For FormData, we set it directly.
        formData.set('lang', currentAdminLang);

        let body;
        let headers = {};

        if (currentTab === 'projects' || currentTab === 'general' || currentTab === 'certifications' || currentTab === 'articles' || currentTab === 'education' || currentTab === 'experience') {
            // Send FormData directly
            body = formData;
            // Do NOT set Content-Type header, browser sets it with boundary
        } else {
            // Convert to JSON for other tabs
            const data = Object.fromEntries(formData.entries());
            data.lang = currentAdminLang; // Explicitly ensure lang is in data object from formData entries (though formData.set above handles it, Object.fromEntries uses it)
            
            // Ensure is_hidden is 0 if not present (safety check)
            if (!editingId && data.is_hidden === undefined) data.is_hidden = 0;

            body = JSON.stringify(data);
            headers['Content-Type'] = 'application/json';
        }

        headers['Authorization'] = `Bearer ${token}`;



        try {
            const res = await fetch(url, {
                method: method,
                headers: headers,
                body: body
            });
            
            if (res.ok) {
                showNotification('Saved successfully!', 'success');
                closeModal();
                loadContent(currentTab);
            } else {
                const errData = await res.json().catch(() => ({}));
                showNotification('Server Error: ' + (errData.error || res.statusText || res.status), 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Network failure. check your connection or file size.', 'error');
        } finally {
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}


// Theme Logic
// Theme Logic
function initThemeAdmin() {
    const themeBtn = document.getElementById('admin-theme-switch');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        applyThemeStyles();
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
             document.body.classList.toggle('light-mode');
             const isLight = document.body.classList.contains('light-mode');
             localStorage.setItem('theme', isLight ? 'light' : 'dark');
             themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
             applyThemeStyles();
        });
    }
}

// Force apply styles if CSS fails
window.applyThemeStyles = () => {
    // console.log('Applying Theme Styles... Light Mode:', document.body.classList.contains('light-mode'));
    const isLight = document.body.classList.contains('light-mode');
    
    // Project Cards
    const cards = document.querySelectorAll('.admin-card');
    // console.log('Found cards:', cards.length);

    cards.forEach(card => {
        if (isLight) {
            // Nuke existing inline styles to ensure clean slate, then apply overrides
            // We use !important in JS by manipulating cssText
            card.style.cssText = `
                background-color: rgba(255, 255, 255, 0.9) !important;
                border: 1px solid rgba(0, 0, 0, 0.1) !important;
                color: #1a1a1a !important;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05) !important;
                backdrop-filter: blur(10px) !important;
                opacity: ${card.style.opacity || 1}; /* Preserve opacity if set */
                grid-column: ${card.style.gridColumn || 'auto'}; /* Preserve grid */
            `;
            
            card.querySelectorAll('h3, p').forEach(el => {
                el.style.color = (el.tagName === 'H3' ? '#1a1a1a' : '#555');
                el.style.textShadow = 'none';
            });
            
             card.querySelectorAll('.tag').forEach(el => {
                el.style.backgroundColor = 'rgba(0,0,0,0.05)';
                el.style.color = '#333';
            });

        } else {
            // Revert to stylesheet
            card.style.cssText = '';
            // Restore functional styles if needed (opacity/grid) - complicating factor.
            // Simplified: Just clear background/color/border
            card.style.backgroundColor = '';
            card.style.borderColor = ''; 
            card.style.color = '';
            card.style.boxShadow = '';
            // We might lose opacity setting if we nuked cssText above? 
            // Actually, in the 'else' block, we assume 'dark' is default CSS.
            // But we need to be careful not to break opacity logic for hidden items.
            // Better to NOT nuke cssText in dark mode, just remove specific overrides.
        }
    });

    // Database Viewer (if active)
    const dbSidebar = document.querySelector('.db-sidebar');
    const dbContent = document.querySelector('.db-content');
    if (dbSidebar && dbContent) {
        if (isLight) {
            dbSidebar.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
            dbContent.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
            dbSidebar.style.borderColor = 'rgba(0,0,0,0.1)';
            dbContent.style.borderColor = 'rgba(0,0,0,0.1)';
            document.querySelectorAll('.db-table-btn').forEach(btn => btn.style.color = '#1a1a1a');
             document.querySelectorAll('.db-header, .db-table thead th').forEach(el => {
                 el.style.backgroundColor = 'rgba(255,255,255,0.9)';
                 el.style.color = '#000';
            });
             document.querySelectorAll('.db-table tbody td').forEach(el => el.style.color = '#333');
        } else {
             // Reset
            dbSidebar.style.backgroundColor = '';
            dbContent.style.backgroundColor = '';
            dbSidebar.style.borderColor = '';
            dbContent.style.borderColor = '';
            document.querySelectorAll('.db-table-btn').forEach(btn => btn.style.color = '');
             document.querySelectorAll('.db-header, .db-table thead th').forEach(el => {
                 el.style.backgroundColor = '';
                 el.style.color = '';
            });
             document.querySelectorAll('.db-table tbody td').forEach(el => el.style.color = '');
        }
    }
};



// Messages Actions
// Approve Review
// Messages Actions
// Approve Review
window.approveReview = async (id) => {
    if (!await showConfirm('Approve Review?', 'Approve this review for publication?', 'Approve', '#2ed573')) return;
    try {
        const res = await fetch(`${API_URL}/reviews/${id}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadContent('reviews');
            showNotification('Review approved', 'success');
        } else {
            showNotification('Failed to approve review', 'error');
        }
    } catch (err) { console.error(err); }
};

// Delete Review
window.deleteReview = async (id) => {
    if (!await showConfirm('Delete Review?', 'Delete this review permanently?')) return;
    try {
        const res = await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadContent('reviews');
            showNotification('Review deleted', 'success');
        } else {
            showNotification('Failed to delete review', 'error');
        }
    } catch (err) { console.error(err); }
};

// --- MARK MESSAGE READ ---
window.markAsRead = async (id) => {
    // No confirmation needed for read status usually, but if user wants it:
    // if (!await showConfirm('Mark Read?', 'Mark as read?')) return; 
    // Actually simpler to just do it for UX, but consistent with request:
    try {
        const res = await fetch(`${API_URL}/messages/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
             // Refresh current tab if it's messages
            if (currentTab === 'messages') loadContent('messages');
            updateUnreadCount();
        }
    } catch (err) { console.error(err); }
};

window.deleteMessage = async (id) => {
    if (!await showConfirm('Delete Message?', 'Are you sure you want to delete this message?')) return;
    try {
        const res = await fetch(`${API_URL}/messages/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (currentTab === 'messages') loadContent('messages');
            updateUnreadCount();
            showNotification('Message deleted', 'success');
        }
    } catch (err) { console.error(err); }
};

// --- DATABASE VIEWER ---
// --- DATABASE VIEWER ---
async function renderDatabaseView() {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '<div style="text-align:center; padding:5rem; color:var(--text-muted); grid-column:1/-1;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; margin-bottom:1rem; color:var(--accent-color);"></i><br>Accessing Data Vault...</div>';

    // Clear Polling if exists
    if (window.overviewPolling) {
        clearInterval(window.overviewPolling);
        window.overviewPolling = null;
    }
    
    try {
        const res = await fetch(`${API_URL}/admin/database/tables`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tables = await res.json();

        if (!Array.isArray(tables)) throw new Error("Failed to fetch tables");

        // Layout: Sidebar for tables, Main area for data
        let html = `
            <div class="db-container">
                <!-- Table List -->
                <div class="db-sidebar">
                    <div class="db-checklist-title"><i class="fa-solid fa-table"></i> Tables (${tables.length})</div>
                    <div class="db-table-list">
                        ${tables.map(t => `<button onclick="loadTableData('${t}', this)" class="db-table-btn"><span>${t}</span> <i class="fa-solid fa-chevron-right" style="font-size:0.7rem; opacity:0.5;"></i></button>`).join('')}
                    </div>
                </div>

                <!-- Data View -->
                <div class="db-content" id="db-data-view">
                    <div style="display: flex; flex-direction:column; justify-content: center; align-items: center; height: 100%; color: var(--text-muted);">
                        <i class="fa-solid fa-database" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.2;"></i>
                        <p>Select a table to inspect data</p>
                    </div>
                </div>
            </div>
        `;
        
        grid.innerHTML = html;
        window.loadTableData = loadTableData; // Expose globally

    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="error-message" style="grid-column:1/-1;">Error loading database: ${err.message}</div>`;
    }
}

async function loadTableData(tableName, btnElement) {
    // Update Active State
    if (btnElement) {
        document.querySelectorAll('.db-table-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    const container = document.getElementById('db-data-view');
    container.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%;"><i class="fa-solid fa-circle-notch fa-spin" style="color:var(--accent-color); font-size:1.5rem;"></i></div>';

    try {
        const res = await fetch(`${API_URL}/admin/database/table/${tableName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // Define Clear Action
        window.clearTable = async (tName) => {
            if (!await showConfirm(`Clear ${tName}?`, `Are you sure you want to delete ALL data from ${tName}? This cannot be undone.`, 'Delete All', '#ff4757')) return;
            try {
                const delRes = await fetch(`${API_URL}/admin/database/table/${tName}`, {
                     method: 'DELETE',
                     headers: { 'Authorization': `Bearer ${token}` }
                });
                if (delRes.ok) {
                    showNotification(`Table ${tName} cleared`, 'success');
                    loadTableData(tName); // Reload empty
                } else {
                    const errData = await delRes.json();
                     showNotification(errData.error || 'Failed to clear table', 'error');
                }
            } catch (e) { console.error(e); }
        };

        if (data.length === 0) {
            container.innerHTML = `
                <div class="db-header">
                    <h3 style="margin:0;">${tableName}</h3>
                    <div style="display:flex; gap:1rem;">
                         <button onclick="renderDatabaseView()" style="background:none; border:none; color:var(--accent-color); cursor:pointer;"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; color:var(--text-muted);">
                    <i class="fa-regular fa-folder-open" style="font-size:2rem; margin-bottom:0.5rem; opacity:0.5;"></i>
                    <p>Table is empty</p>
                </div>`;
            return;
        }

        const headers = Object.keys(data[0]);

        let tableHtml = `
            <div class="db-header">
                <div style="display:flex; align-items:center; gap:1rem;">
                    <h3 style="margin:0; font-family:var(--font-heading);">${tableName}</h3>
                    <span class="badge" style="background:rgba(255,255,255,0.1);">${data.length} rows</span>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button onclick="clearTable('${tableName}')" style="background:rgba(255, 71, 87, 0.1); border:1px solid #ff4757; color:#ff4757; padding:0.4rem 0.8rem; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.85rem;"><i class="fa-solid fa-trash"></i> Clear Data</button>
                    <button onclick="loadTableData('${tableName}')" style="background:var(--accent-color); border:none; color:#000; padding:0.4rem 0.8rem; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.85rem;"><i class="fa-solid fa-rotate"></i> Refresh</button>
                </div>
            </div>
            <div class="db-data-wrapper">
                <table class="db-table">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${headers.map(h => `<td>${row[h] === null ? '<span style="color:#666">NULL</span>' : String(row[h])}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;

    } catch (err) {
        container.innerHTML = `<div style="padding:2rem; color:#ff4757;">Error loading table: ${err.message}</div>`;
    }
}

// Global Exports
window.loadContent = loadContent;
window.renderDatabaseView = renderDatabaseView;

// --- COMMENTS MANAGEMENT ---
window.openComments = async (type, id) => {
    // If id is passed as null due to earlier bug, catch it (though we fixed the call)
    if (!id) return;
    
    const modal = document.getElementById('comments-modal');
    const list = document.getElementById('comments-list');
    
    // Safety check map
    const typeMap = {
        'projects': 'project',
        'articles': 'article'
    };
    
    // Use type if provided (e.g. from button click), otherwise guess from tab
    const singularType = type || typeMap[window.currentTab] || window.currentTab;

    list.innerHTML = '<p style="color:var(--text-muted);">Loading comments...</p>';
    modal.classList.add('open');
    modal.style.display = 'flex';

    try {
        const res = await fetch(`${API_URL}/comments?type=${singularType}&id=${id}`);
        const comments = await res.json();

        if (comments.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem;">No approved comments yet.</p>';
            return;
        }

        list.innerHTML = comments.map(c => `
             <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:0.5rem; margin-bottom:1rem; border-left:3px solid var(--accent-color);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                    <div>
                        <span style="font-weight:bold; color:var(--text-main);">${c.name}</span>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${new Date(c.date).toLocaleString()}</div>
                    </div>
                    <button onclick="window.deleteComment('${c.id}', '${singularType}', '${id}')" style="background:rgba(255,71,87,0.1); color:#ff4757; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div style="font-size:0.95rem; line-height:1.4;">${c.message}</div>
             </div>
        `).join('');

    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="color:#ff4757;">Error loading comments.</p>';
    }
};

window.closeCommentsModal = () => {
    const modal = document.getElementById('comments-modal');
    modal.classList.remove('open');
    modal.style.display = 'none';
};

window.deleteComment = async (commentId, type, parentId) => {
    if (!await showConfirm('Delete Comment?', 'Are you sure you want to delete this comment?')) return;

    try {
        const res = await fetch(`${API_URL}/comments/${commentId}`, {
            method: 'DELETE',
             headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showNotification('Comment deleted', 'success');
            // Refresh the specific list
            openComments(type, parentId); // Re-fetch
            // Refresh main list to update count
            loadContent(window.currentTab);
        } else {
            showNotification('Failed to delete comment', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error deleting comment', 'error');
    }
};


window.toggleSidebar = () => {
    document.body.classList.toggle('sidebar-collapsed');
    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
    localStorage.setItem('sidebar_collapsed', isCollapsed);
};

// Init Sidebar State
if (localStorage.getItem('sidebar_collapsed') === 'true') {
    document.body.classList.add('sidebar-collapsed');
}

// --- SUBSCRIBER MANAGMENT ---
window.openSubscribersModal = () => {
    const modal = document.getElementById('subscribers-modal');
    if(modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        fetchAndRenderSubscribers();
    }
};

window.closeSubscribersModal = () => {
    const modal = document.getElementById('subscribers-modal');
    if(modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
};

async function fetchAndRenderSubscribers() {
    const tbody = document.getElementById('subscribers-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/admin/subscribers`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401 || res.status === 403) {
             window.location.href = '/login.html';
             return;
        }

        if(!res.ok) throw new Error('Failed to fetch subscribers');
        const subscribers = await res.json();

        if(subscribers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No subscribers found.</td></tr>';
            return;
        }

        tbody.innerHTML = subscribers.map(sub => `
            <tr>
                <td>
                    <span style="padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; background: ${sub.is_active ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)'}; color: ${sub.is_active ? '#2ed573' : '#ff4757'}; border: 1px solid ${sub.is_active ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 71, 87, 0.2)'};">
                        ${sub.is_active ? 'Active' : 'Unsubscribed'}
                    </span>
                </td>
                <td style="color:var(--text-main);">${sub.email || 'N/A'}</td>
                <td style="color:var(--text-muted);">${sub.name || '-'}</td>
                <td style="color:var(--text-muted);">${new Date(sub.created_at || sub.date).toLocaleDateString()}</td>
            </tr>
        `).join('');

    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ff4757; padding:2rem;">Error loading data.</td></tr>';
    }
}

// CSV Export Logic
window.downloadSubscribersCSV = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/subscribers`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        
        if (data.length === 0) {
            showNotification('No subscribers to export', 'error');
            return;
        }

        // CSV Header
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Email,Name,Status,Joined Date\n";

        // CSV Rows
        data.forEach(sub => {
            const status = sub.is_active ? 'Active' : 'Unsubscribed';
            const date = new Date(sub.created_at || sub.date).toLocaleDateString();
            // Escape commas in fields
            const cleanName = (sub.name || '').replace(/,/g, '');
            const row = `${sub.id},${sub.email},${cleanName},${status},${date}`;
            csvContent += row + "\n";
        });

        // Trigger Download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "subscribers_list.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error(err);
        showNotification('Failed to export CSV', 'error');
    }
};
