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

const fields = {
    projects: [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'tags', label: 'Tags (comma separated)', type: 'text' },
        { name: 'category', label: 'Category', type: 'text' },
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
        { name: 'pdf', label: 'Current PDF Path', type: 'text' }, // Read-only or manual edit
        { name: 'pdfFile', label: 'Upload PDF', type: 'file' },
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
        { name: 'is_hidden', label: 'Hide from Public', type: 'checkbox' }
    ],
    general: [
        { name: 'hero_subtitle', label: 'Hero Subtitle', type: 'text' },
        { name: 'hero_title', label: 'Hero Title', type: 'text' },
        { name: 'hero_description', label: 'Hero Description', type: 'textarea' },
        { name: 'about_lead', label: 'About Lead Text', type: 'textarea' },
        { name: 'about_bio', label: 'About Bio', type: 'textarea' },
        { name: 'stat_years', label: 'Years Experience', type: 'number' },
        { name: 'stat_projects', label: 'Projects Count', type: 'number' },
        { name: 'stat_companies', label: 'Companies Count', type: 'number' },
        { name: 'profile_image', label: 'Current Profile Image Path', type: 'text' },
        { name: 'profileImage', label: 'Upload Profile Image', type: 'file' },
        { name: 'cv_file', label: 'Current CV Path', type: 'text' },
        { name: 'cvFile', label: 'Upload New CV (PDF)', type: 'file' },
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
                'gemini-1.5-flash', 
                'gemini-1.5-pro',
                'gemini-pro', 
                'gemini-flash-latest'
            ] 
        }
    ],
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
    loadContent(tab);
};

// Load Content
async function loadContent(type) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '<p>Loading...</p>';
    
    try {
        const res = await fetch(`${API_URL}/${type}?lang=${currentAdminLang}&t=${Date.now()}`, {
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

        if (type === 'general') {
            const card = document.createElement('div');
            card.className = 'admin-card';
            card.style.gridColumn = "1 / -1";
            card.dataset.item = JSON.stringify(data);
            card.innerHTML = `
                <h3>General Information</h3>
                <p>Hero, About, Stats & Cube Settings</p>
                <div class="admin-actions">
                    <button class="btn-edit" onclick='editItem(${JSON.stringify(data).replace(/'/g, "&#39;")})' style="background: rgba(0, 255, 157, 0.1); color: var(--accent-color); border: 1px solid rgba(0, 255, 157, 0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; margin-right: 0.5rem;"><i class="fa-solid fa-pen"></i> Edit Content</button>
                </div>
            `;
            grid.appendChild(card);
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
        }

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'admin-card';
            // Store item data in dataset for easy editing
            card.dataset.item = JSON.stringify(item);
            
            const isHidden = item.is_hidden == 1 || item.is_hidden === true;
            card.style.opacity = isHidden ? '0.5' : '1';
            
            card.innerHTML = `
                <h3>${item.title || item.name || item.degree || item.role || (item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) + ': ' + (item.face_front || 'Untitled') : (item.face_front ? 'Cube: ' + item.face_front : 'Item'))} ${isHidden ? '<span style="font-size:0.7em; background:#333; padding:2px 5px; border-radius:4px;">(Hidden)</span>' : ''}</h3>
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
            alert('Item not found');
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
                alert('Session expired. Please login again.');
                window.location.href = '/login.html';
                return;
            }
            const errText = await updateRes.text();
            throw new Error(`Failed to update: ${errText}`);
        }

        loadContent(currentTab);

    } catch (err) {
        console.error(err);
        alert('Error updating visibility: ' + err.message);
    }
};

// Delete Item
window.deleteItem = async (id) => {
    if(!confirm('Are you sure?')) return;
    try {
        await fetch(`${API_URL}/${currentTab}/${id}`, { 
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        loadContent(currentTab);
    } catch (err) {
        alert('Error deleting item');
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
            inputHtml = `<input type="file" name="${field.name}" accept="image/*,video/*">`;
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
        const formData = new FormData(e.target);
        
        const method = (editingId || currentTab === 'general') ? 'PUT' : 'POST';
        let url = '';
        if (currentTab === 'general') {
            url = `${API_URL}/general`;
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

        if (currentTab === 'projects' || currentTab === 'general' || currentTab === 'certifications') {
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
            await fetch(url, {
                method: method,
                headers: headers,
                body: body
            });
            closeModal();
            loadContent(currentTab);
        } catch (err) {
            console.error(err);
            alert('Error saving item');
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
window.markAsRead = async (id) => {
    if (!confirm('Mark as read?')) return;
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
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
        const res = await fetch(`${API_URL}/messages/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (currentTab === 'messages') loadContent('messages');
            updateUnreadCount();
        }
    } catch (err) { console.error(err); }
};
