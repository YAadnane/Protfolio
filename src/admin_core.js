import { gsap } from "gsap";

const API_URL = '/api';
let currentTab = 'projects';
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
        if (files.length === 0) {
            grid.innerHTML = '<p>No media files found.</p>';
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
        { name: 'year', label: 'Year', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    experience: [
        { name: 'role', label: 'Role', type: 'text' },
        { name: 'company', label: 'Company', type: 'text' },
        { name: 'year', label: 'Year', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    articles: [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'summary', label: 'Summary', type: 'textarea' },
        { name: 'link', label: 'Link URL', type: 'text' },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'tags', label: 'Theme / Tags (comma separated)', type: 'text' },
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
        }
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

// Load Content
async function loadContent(type) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '<p>Loading...</p>';
    
    const endpoint = (type === 'reviews') ? `${API_URL}/admin/reviews` : `${API_URL}/${type}`;
    
    try {
        const res = await fetch(`${endpoint}?lang=${currentAdminLang}&t=${Date.now()}`, {
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
        
        grid.innerHTML = '';

        if (type === 'general' || type === 'profile') {
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
            return;
        }

        if (type === 'messages') {
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
            return;
            return;
        }

        if (type === 'reviews') {
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
                <p style="color: var(--text-muted); font-size: 0.9rem;">
                    ${item.category || item.issuer || item.institution || item.company || (item.size ? `Size: ${item.size}, Pos: ${item.pos_x}%, ${item.pos_y}%` : '')}
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
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p>Error loading data.</p>';
    }
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

        if (currentTab === 'projects' || currentTab === 'general' || currentTab === 'certifications' || currentTab === 'articles') {
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
function initThemeAdmin() {
    const themeBtn = document.getElementById('admin-theme-switch');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
             document.body.classList.toggle('light-mode');
             const isLight = document.body.classList.contains('light-mode');
             localStorage.setItem('theme', isLight ? 'light' : 'dark');
             themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }
}

// Cursor Logic
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
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.matches('a, button, .btn-edit, .btn-delete, .tab-btn, input, textarea')) {
            document.body.classList.add("hovering");
        } else {
            document.body.classList.remove("hovering");
        }
    });
}

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
async function renderDatabaseView() {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Loading Database...</div>';

    try {
        const res = await fetch(`${API_URL}/admin/database/tables`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tables = await res.json();

        if (!Array.isArray(tables)) throw new Error("Failed to fetch tables");

        // Layout: Sidebar for tables, Main area for data
        let html = `
            <div style="grid-column: 1 / -1; display: grid; grid-template-columns: 250px 1fr; gap: 1rem; height: calc(100vh - 200px); width: 100%;">
                <!-- Table List -->
                <div class="card" style="overflow-y: auto; height: 100%;">
                    <h3 style="margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Tables</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${tables.map(t => `<li style="margin-bottom: 0.5rem;"><button onclick="loadTableData('${t}')" style="width: 100%; text-align: left; padding: 0.5rem; background: rgba(255,255,255,0.05); border: none; color: var(--text-main); cursor: pointer; border-radius: 4px;">${t}</button></li>`).join('')}
                    </ul>
                </div>

                <!-- Data View -->
                <div class="card" id="db-data-view" style="overflow: auto; height: 100%;">
                    <div style="display: flex; justify-content: center; align-items: center; height: 100%; color: var(--text-muted);">
                        Select a table to view data
                    </div>
                </div>
            </div>
        `;
        
        grid.innerHTML = html;
        window.loadTableData = loadTableData; // Expose globally

    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="error-message">Error loading database: ${err.message}</div>`;
    }
}

async function loadTableData(tableName) {
    const container = document.getElementById('db-data-view');
    container.innerHTML = '<div style="padding:1rem;">Loading data...</div>';

    try {
        const res = await fetch(`${API_URL}/admin/database/table/${tableName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        if (data.length === 0) {
            container.innerHTML = `<div style="padding:1rem;"><h3>${tableName}</h3><p>Table is empty.</p></div>`;
            return;
        }

        const headers = Object.keys(data[0]);

        let tableHtml = `
            <div style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
                <h3>${tableName} <span style="font-size:0.8rem; color:var(--text-muted);">(${data.length} rows visible)</span></h3>
                <button onclick="renderDatabaseView()" style="background:none; border:none; color:var(--accent-color); cursor:pointer;"><i class="fa-solid fa-rotate"></i> Refresh</button>
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.1);">
                            ${headers.map(h => `<th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1);">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                ${headers.map(h => `<td style="padding: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${row[h] === null ? '<span style="color:#666">NULL</span>' : String(row[h]).substring(0, 50)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;

    } catch (err) {
        container.innerHTML = `<div class="error-message">Error loading table: ${err.message}</div>`;
    }
}
