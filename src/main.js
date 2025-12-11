import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { translations } from "./translations.js";
import "../style.css"; // Ensure global styles are bundled

gsap.registerPlugin(ScrollTrigger);

const API_URL = '/api';
let heroTypewriterTimeout = null;

// =========================================
// DYNAMIC CONTENT LOADING
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initLanguage(); // Init language first
    await Promise.all([
        loadGeneralInfo(),
        loadShapes(),
        loadProjects(),
        loadCertifications(),
        loadEducation(),
        loadExperience(),
        loadSkills(),
        loadArticles(),
        loadStats(),
        loadReviews()
    ]);
    
    // Initialize animations AFTER content is loaded
    initAnimations();
    initMobileMenu();
    initContactForm();
    initChatbot(); // Initialize Chatbot
    initReviewModal();
});

function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        
        // Collect data
        const inputs = form.querySelectorAll('input, textarea');
        const data = {
            name: inputs[0].value,
            email: inputs[1].value,
            message: inputs[2].value
        };

        try {
            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;

            const res = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                const t = translations[currentLang];
                showNotification(t["form.success.title"], t["form.success.msg"], 'success');
                form.reset();
            } else {
                const t = translations[currentLang];
                showNotification(t["form.error.title"], `${t["form.error.msg"]} (${result.error})`, 'error');
            }
        } catch (err) {
            console.error(err);
            const t = translations[currentLang];
            showNotification(t["form.error.title"], t["form.error.msg"], 'error');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    // Select both navList (desktop/old) and mobileOverlay (new) to be safe
    const navList = document.querySelector('.nav-list'); 
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            if (mobileOverlay) mobileOverlay.classList.toggle('active');
            // document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when link is clicked
        const links = document.querySelectorAll('.mobile-nav-link');
        links.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                if (mobileOverlay) mobileOverlay.classList.remove('active');
                // document.body.style.overflow = '';
            });
        });
    }
}

// =========================================
// LANGUAGE SUPPORT
// =========================================
// Force French as default or detect browser language, defaulting to FR if unsure
const userLang = navigator.language || navigator.userLanguage; 
let currentLang = localStorage.getItem('lang') || (userLang.startsWith('en') ? 'en' : 'fr');

function initLanguage() {
    const langBtn = document.getElementById('lang-switch');
    if (langBtn) {
        langBtn.innerText = currentLang === 'en' ? 'FR' : 'EN'; // Show opposite language to switch to
        langBtn.addEventListener('click', toggleLanguage);
    }
    updatePageLanguage();
}

async function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'fr' : 'en';
    localStorage.setItem('lang', currentLang);
    
    const langBtn = document.getElementById('lang-switch');
    if (langBtn) langBtn.innerText = currentLang === 'en' ? 'FR' : 'EN';
    
    updatePageLanguage();
    
    // Reload all dynamic content from DB with new language
    await loadAllContent(); 
}

async function loadAllContent() {
    await Promise.all([
        loadGeneralInfo(),
        loadShapes(),
        loadProjects(),
        loadCertifications(),
        loadEducation(),
        loadExperience(),
        loadSkills(),
        loadStats(),
        loadArticles()
    ]);
    // Re-trigger animations if needed, though they might be attached to elements
    ScrollTrigger.refresh();
}

function updatePageLanguage() {
    const t = translations[currentLang];
    
    // Update text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
             // Handle HTML content (icons etc)
             if (t[key].includes('<')) el.innerHTML = t[key];
             else el.innerText = t[key];
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });

    // Update HTML lang attribute
    // Update HTML lang attribute
    document.documentElement.lang = currentLang;
}

function initTheme() {
    const themeBtn = document.getElementById('theme-switch');
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

async function loadGeneralInfo() {
    try {
        const res = await fetch(`${API_URL}/general?lang=${currentLang}&t=${Date.now()}`);
        const data = await res.json();
        
        if (!data) return;

        // Profile Image
        if (data.profile_image) {
            const imgEl = document.getElementById('about-profile-img');
            if (imgEl) imgEl.src = data.profile_image;
        }

        // Hero
        if (data.hero_subtitle) document.querySelector('.hero-subtitle').innerHTML = `<i class="fa-solid fa-terminal"></i> ${data.hero_subtitle}`;
        if (data.hero_title) {
            const formatted = data.hero_title.split(' ').map(w => `<span class="scramble-text">${w}</span>`).join(' ');
            document.querySelector('.hero-title').innerHTML = formatted;
        }
        
        // Hero Description Typewriter / Rotator
        const descEl = document.querySelector('.hero-description');
        if (descEl) {
            // Clear any existing timeout from previous language load
            if (heroTypewriterTimeout) {
                clearTimeout(heroTypewriterTimeout);
                heroTypewriterTimeout = null;
            }

            const descriptions = [data.hero_description, data.hero_description_2, data.hero_description_3].filter(d => d);
            
            if (descriptions.length > 0) {
                let currentIdx = 0;
                let charIdx = 0;
                let isDeleting = false;
                let typeSpeed = 50;

                const type = () => {
                    const currentText = descriptions[currentIdx];
                    
                    if (isDeleting) {
                        descEl.textContent = currentText.substring(0, charIdx - 1);
                        charIdx--;
                        typeSpeed = 30; // Faster deleting
                    } else {
                        descEl.textContent = currentText.substring(0, charIdx + 1);
                        // Add cursor effect if desired, but simple text content is safer for layout
                        charIdx++;
                        typeSpeed = 50; // Normal typing
                    }

                    if (!isDeleting && charIdx === currentText.length) {
                        // Finished typing, wait before deleting
                        isDeleting = true;
                        typeSpeed = 2000; // Wait 2s
                    } else if (isDeleting && charIdx === 0) {
                        // Finished deleting, move to next
                        isDeleting = false;
                        currentIdx = (currentIdx + 1) % descriptions.length;
                        typeSpeed = 500; // Pause before typing next
                    }

                    heroTypewriterTimeout = setTimeout(type, typeSpeed);
                };

                // Start typing
                type();
            }
        }

        // About
        if (data.about_lead) document.querySelector('.about-text .lead').innerText = data.about_lead;
        if (data.about_bio) document.querySelector('.about-text p:nth-of-type(2)').innerText = data.about_bio;

        // Stats
        // Stats




        // CV & Contact
        // CV & Contact
        const cvLink = document.getElementById('cv-link');
        if (data.cv_file) {
            if (cvLink) {
                cvLink.href = data.cv_file;
                cvLink.setAttribute('download', '');
                cvLink.style.display = 'inline-flex';
            }
        } else {
            if (cvLink) {
                cvLink.removeAttribute('download');
                cvLink.href = '#';
                cvLink.onclick = (e) => {
                    e.preventDefault();
                    alert("CV not uploaded yet.");
                };
            }
        }
        if (data.email) {
            const emailLink = document.getElementById('contact-email');
            if (emailLink) {
                emailLink.href = `mailto:${data.email}`;
                emailLink.innerHTML = `<i class="fa-solid fa-envelope"></i> ${data.email}`;
            }
        }
        if (data.phone) {
            const phoneLink = document.getElementById('contact-phone');
            if (phoneLink) {
                phoneLink.href = `tel:${data.phone.replace(/\s/g, '')}`;
                phoneLink.innerHTML = `<i class="fa-solid fa-phone"></i> ${data.phone}`;
            }
        }
        if (data.location) {
            const locSpan = document.getElementById('contact-location');
            if (locSpan) locSpan.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${data.location}`;
        }
        if (data.linkedin_link) {
            const linkedin = document.getElementById('contact-linkedin');
            if (linkedin) linkedin.href = data.linkedin_link;
        }
        if (data.github_link) {
            const github = document.getElementById('contact-github');
            if (github) github.href = data.github_link;
        }

    } catch (err) { console.error("Failed to load general info", err); }
}

// --- HELPER: Counter Animation ---
function animateCounter(el, target, duration = 1500) {
    if (!el) return;
    
    // Clear existing timer if any
    if (el._timer) clearInterval(el._timer);

    const end = parseInt(target, 10);
    if (isNaN(end)) {
        el.innerText = target;
        return;
    }
    
    let start = 0;
    const stepTime = 20; // 20ms
    const steps = duration / stepTime;
    const increment = end / steps;
    
    // Reset to 0 before starting
    el.innerText = "0+";

    const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
            start = end;
            clearInterval(timer);
            el.innerText = end + "+"; // Ensure clean end (no decimal)
        } else {
            el.innerText = Math.floor(start) + "+";
        }
    }, stepTime);
    
    el._timer = timer;
}

// --- HELPER: Social Icons ---
function getSocialIcon(platform) {
    switch(platform) {
        case 'linkedin': return '<i class="fa-brands fa-linkedin"></i>';
        case 'facebook': return '<i class="fa-brands fa-facebook"></i>';
        case 'instagram': return '<i class="fa-brands fa-instagram"></i>';
        case 'reddit': return '<i class="fa-brands fa-reddit"></i>';
        case 'medium': return '<i class="fa-brands fa-medium"></i>';
        default: return '<i class="fa-solid fa-globe"></i>';
    }
}

async function loadShapes() {
    try {
        const res = await fetch(`${API_URL}/shapes?lang=${currentLang}&t=${Date.now()}`);
        const shapes = (await res.json()).filter(s => !s.is_hidden);
        const container = document.querySelector('.hero-visual');
        if (!container) return;
        
        container.innerHTML = ''; // Clear existing desktop shapes

        // ALSO Clear mobile container explicitly to prevent persistence
        const mobileContainer = document.querySelector('.mobile-shape-container');
        if (mobileContainer) mobileContainer.innerHTML = '';

        shapes.forEach(shape => {
             // Check for Mobile Shape
             if (shape.is_mobile_visible) {
                 renderMobileShape(shape);
             }

             // Standard Desktop/Visual Shapes (always float in background)
             const wrapper = document.createElement('div');
            wrapper.className = 'cube-wrapper'; // Reuse wrapper for positioning
            wrapper.style.left = `${shape.pos_x}%`;
            wrapper.style.top = `${shape.pos_y}%`;
            wrapper.style.transform = `translate(-50%, -50%) scale(${shape.size})`;
            
            let iconHTML = '';
            if (shape.icon) {
                iconHTML = `<i class="${shape.icon}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3rem; color: var(--accent-color); text-shadow: 0 0 10px var(--accent-color);"></i>`;
            }
            
            let innerHTML = '';

            if (shape.type === 'pyramid') {
                innerHTML = `
                    <div class="data-pyramid">
                        ${iconHTML}
                        <div class="pyramid-face front">${translateShape(shape.face_front || '')}</div>
                        <div class="pyramid-face back">${translateShape(shape.face_back || '')}</div>
                        <div class="pyramid-face right">${translateShape(shape.face_right || '')}</div>
                        <div class="pyramid-face left">${translateShape(shape.face_left || '')}</div>
                    </div>
                `;
            } else if (shape.type === 'sphere') {
                innerHTML = `
                    <div class="data-sphere">
                        <div class="sphere-ring"></div>
                        <div class="sphere-ring"></div>
                        <div class="sphere-ring"></div>
                        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:var(--accent-color); font-family:var(--font-mono); font-weight:bold; text-align: center;">
                            ${iconHTML ? iconHTML : (shape.face_front || 'DATA')}
                        </div>
                    </div>
                `;
            } else {
                // Default Cube
                innerHTML = `
                    <div class="data-cube">
                        ${iconHTML}
                        <div class="cube-face front">${shape.face_front || ''}</div>
                        <div class="cube-face back">${shape.face_back || ''}</div>
                        <div class="cube-face right">${shape.face_right || ''}</div>
                        <div class="cube-face left">${shape.face_left || ''}</div>
                        <div class="cube-face top">${shape.face_top || ''}</div>
                        <div class="cube-face bottom">${shape.face_bottom || ''}</div>
                    </div>
                `;
            }
            
            wrapper.innerHTML = innerHTML;
            container.appendChild(wrapper);
        });

        // Toggle visibility of mobile container based on content
        if (mobileContainer) {
            if (mobileContainer.children.length === 0) {
                mobileContainer.style.display = 'none';
            } else {
                mobileContainer.style.display = ''; // Revert to CSS default (flex on mobile, none on desktop)
            }
        }

    } catch (err) { console.error("Failed to load shapes", err); }
}





async function loadProjects() {
    try {
        const res = await fetch(`${API_URL}/projects?lang=${currentLang}`);
        const projects = (await res.json()).filter(p => !p.is_hidden);
        const container = document.getElementById('projects-grid');
        container.innerHTML = ''; 

        projects.forEach((p, index) => {
            let sizeClass = 'medium';
            if (index === 0) sizeClass = 'large';
            if (index === 3) sizeClass = 'wide';

            const item = document.createElement('div');
            item.className = `bento-item ${sizeClass}`;
            item.setAttribute('data-tilt', '');
            
            const tagsHtml = p.tags.split(',').map(tag => `<span>${tag.trim()}</span>`).join('');

            // Check if image is a file path (uploaded) or a class name
            let bgContent = '';
            
            if (p.image && p.image.startsWith('/uploads/')) {
                const imageUrl = `${API_URL.replace('/api', '')}${p.image}`;
                const isVideo = p.image.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);

                if (isVideo) {
                    bgContent = `
                        <video class="bento-bg is-video" autoplay loop muted playsinline>
                            <source src="${imageUrl}" type="video/${isVideo[1].toLowerCase() === 'mov' ? 'quicktime' : isVideo[1].toLowerCase()}">
                            Your browser does not support the video tag.
                        </video>
                        <div class="media-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1)); z-index: 1;"></div>
                    `;
                } else {
                    // It's an image
                    bgContent = `
                        <div class="bento-bg is-image" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;"></div>
                        <div class="media-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1)); z-index: 1;"></div>
                    `;
                }
            } else if (p.image && p.image.trim() !== '') {
                // It's a CSS class or external URL
                bgContent = `<div class="bento-bg ${p.image}"></div>`;
            } else {
                // Fallback: No image/video -> Gradient Background
                bgContent = `
                    <div class="bento-bg" style="background: linear-gradient(135deg, #1a1a1a, #0a0a0a); opacity: 1;"></div>
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at top right, rgba(0, 255, 157, 0.1), transparent 60%); z-index: 1;"></div>
                `;
            }

            // Unified HTML construction
            item.innerHTML = `
                <div class="bento-content">
                    <h3>${p.title}</h3>
                    <p>${p.description}</p>
                    <div class="bento-tags" style="margin-top: 1rem; margin-bottom: 1.5rem;">${tagsHtml}</div>
                    <div class="project-actions">
                        <a href="${p.link}" class="btn-github" target="_blank" title="View Code" onclick="event.stopPropagation()">
                            <i class="fa-brands fa-github"></i> GitHub
                        </a>
                        ${p.image && p.image.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) ? 
                            `<button class="btn-play" onclick="event.stopPropagation(); openVideoModal('${API_URL.replace('/api', '')}${p.image}')"><i class="fa-solid fa-play"></i> Demo</button>` 
                            : ''}
                    </div>
                </div>
                ${bgContent}
                ${sizeClass === 'large' ? '<div class="bento-overlay"></div>' : ''}
            `;

            // CLICK HANDLER FOR MODAL
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
                // Don't open if clicking action buttons (handled by stopPropagation above, but safety check)
                if (e.target.closest('a') || e.target.closest('button')) return;
                openProjectModal(p);
            });

            container.appendChild(item);
        });

        // Initialize VanillaTilt if available
        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".bento-item"), {
                max: 5,
                speed: 400,
                glare: true,
                "max-glare": 0.2
            });
        }

        // Populate Filters
        const categorySelect = document.getElementById('filter-project-category');
        const tagSelect = document.getElementById('filter-project-tag');

        // Get unique categories and tags
        const categories = [...new Set(projects.map(p => p.category).filter(Boolean))].sort();
        const allTags = projects.flatMap(p => p.tags.split(',').map(t => t.trim())).filter(Boolean);
        const uniqueTags = [...new Set(allTags)].sort();

        // Populate Category Select
        if (categorySelect.options.length === 1) {
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                categorySelect.appendChild(opt);
            });
        }

        // Populate Tag Select
        if (tagSelect.options.length === 1) {
            uniqueTags.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                tagSelect.appendChild(opt);
            });
        }

        // Filter Logic
        const filterProjects = () => {
            const selectedCategory = categorySelect.value;
            const selectedTag = tagSelect.value;

            const items = container.querySelectorAll('.bento-item');
            items.forEach((item, index) => {
                const project = projects[index];
                const projectTags = project.tags.split(',').map(t => t.trim());
                
                const matchCategory = !selectedCategory || project.category === selectedCategory;
                const matchTag = !selectedTag || projectTags.includes(selectedTag);

                if (matchCategory && matchTag) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        };

        categorySelect.onchange = filterProjects;
        tagSelect.onchange = filterProjects;

    } catch (err) { console.error("Failed to load projects", err); }
}

// Video Play Logic
window.openVideoModal = (videoUrl) => {
    // Open video in a new tab/window
    window.open(videoUrl, '_blank');
};

async function loadCertifications() {
    try {
        const res = await fetch(`${API_URL}/certifications?lang=${currentLang}`);
        const certs = (await res.json()).filter(c => !c.is_hidden);
        const container = document.getElementById('cert-list');
        
        if (!container) return;

        // --- FILTER UI INJECTION (Status Buttons) ---
        // Always re-inject or update to handle language changes if this function is called on language switch
        const existingFilter = document.getElementById('cert-status-filter');
        const t = translations[currentLang]; // Get translations for current lang

        const filterHtmlContent = `
            <button class="filter-btn active" data-status="all">${t["certifications.filter.all"]}</button>
            <button class="filter-btn" data-status="obtained"><i class="fa-solid fa-check-circle"></i> ${t["certifications.filter.obtained"]}</button>
            <button class="filter-btn" data-status="in_progress"><i class="fa-solid fa-spinner"></i> ${t["certifications.filter.in_progress"]}</button>
            <button class="filter-btn" data-status="planned"><i class="fa-solid fa-calendar"></i> ${t["certifications.filter.planned"]}</button>
        `;

        if (!existingFilter) {
            const filterContainer = document.createElement('div');
            filterContainer.id = 'cert-status-filter';
            filterContainer.style.cssText = "display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; justify-content: center;";
            filterContainer.innerHTML = filterHtmlContent;
            container.insertAdjacentElement('beforebegin', filterContainer);
        } else {
            // Update text if it exists (for language switch)
            // But we need to preserve active class. 
            // Simpler strategy: If we are reloading content, likely the entire section is rebuilt or we can just replace innerHTML and re-attach listeners.
            // Let's replace innerHTML and re-bind listeners to be safe and simple.
            const activeStatus = existingFilter.querySelector('.active')?.dataset.status || 'all';
            existingFilter.innerHTML = filterHtmlContent;
            // Restore active
            existingFilter.querySelectorAll('.filter-btn').forEach(btn => {
                if(btn.dataset.status === activeStatus) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }

        // --- FILTER POPULATION (Dropdowns) ---
        // ... (Dropdown logic stays mostly same, but make sure we don't duplicate listeners/options if called multiple times)
        const domainSelect = document.getElementById('filter-domain');
        const issuerSelect = document.getElementById('filter-issuer');
        
        // Restore visibility if I hid them previously
        if(domainSelect && domainSelect.parentElement.style.display === 'none') {
             domainSelect.parentElement.style.display = 'flex';
        }

        // Get unique values
        const domains = [...new Set(certs.map(c => c.domain).filter(Boolean))].sort();
        const issuers = [...new Set(certs.map(c => c.issuer).filter(Boolean))].sort();

        // Populate Domain Select (Clear first to avoid duplicates on reload)
        if (domainSelect) { 
            domainSelect.innerHTML = ''; // Clear all
            const defaultDomain = document.createElement('option');
            defaultDomain.value = "";
            // Add fallback to prevent empty box
            defaultDomain.textContent = t["certifications.filter.domains"] || "All Domains"; 
            domainSelect.appendChild(defaultDomain);

            domains.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                domainSelect.appendChild(opt);
            });
        }

        // Populate Issuer Select
        if (issuerSelect) {
            issuerSelect.innerHTML = ''; // Clear all
            const defaultIssuer = document.createElement('option');
            defaultIssuer.value = "";
            // Add fallback
            defaultIssuer.textContent = t["certifications.filter.issuers"] || "All Issuers";
            issuerSelect.appendChild(defaultIssuer);

            issuers.forEach(i => {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                issuerSelect.appendChild(opt);
            });
        }

        let currentStatusFilter = document.querySelector('#cert-status-filter .active')?.dataset.status || 'all';

        const renderCerts = () => {
            // Re-fetch translations in case they changed (unlikely but safe) or just use 't'
            const badgesT = translations[currentLang]; 
            container.innerHTML = '';
            
            const selectedDomain = domainSelect ? domainSelect.value : '';
            const selectedIssuer = issuerSelect ? issuerSelect.value : '';

            // Combined Filter Logic
            const filtered = certs.filter(c => {
                const matchStatus = currentStatusFilter === 'all' || c.status === currentStatusFilter;
                const matchDomain = !selectedDomain || c.domain === selectedDomain;
                const matchIssuer = !selectedIssuer || c.issuer === selectedIssuer;
                return matchStatus && matchDomain && matchIssuer;
            });

            if (filtered.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted); width:100%; text-align:center;">No certifications found matching criteria.</p>';
                return;
            }

            filtered.forEach(c => {
                // Status Badge Logic
                let statusBadge = '';
                if (c.status === 'in_progress') {
                    statusBadge = `<span style="font-size:0.7rem; background:rgba(255, 165, 0, 0.1); color:orange; padding:2px 8px; border-radius:12px; border:1px solid rgba(255, 165, 0, 0.3); margin-left:8px; white-space:nowrap;">${badgesT["certifications.status.in_progress"]}</span>`;
                } else if (c.status === 'planned') {
                    statusBadge = `<span style="font-size:0.7rem; background:rgba(0, 191, 255, 0.1); color:deepskyblue; padding:2px 8px; border-radius:12px; border:1px solid rgba(0, 191, 255, 0.3); margin-left:8px; white-space:nowrap;">${badgesT["certifications.status.planned"]}</span>`;
                }

                const item = document.createElement('div');
                item.className = 'cert-item';
                // Make item clickable for modal
                item.style.cursor = 'pointer';
                item.onclick = (e) => {
                    // Prevent if clicking the eye icon specifically (optional, keeping both behaviors)
                    if(e.target.closest('.btn-icon')) return;
                    openCertModal(c); 
                };

                item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
                    <div style="font-size: 1.5rem; color: var(--accent-color); min-width: 40px; text-align: center;">
                        <i class="${c.icon || 'fa-solid fa-certificate'}"></i>
                    </div>
                    <div style="flex-grow: 1;">
                        <div style="display:flex; align-items:center;">
                            <span style="display: block; font-weight: bold;">${c.name}</span>
                            ${statusBadge}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                            ${c.issuer ? `<span style="color: var(--accent-color);">${c.issuer}</span>` : ''}
                            ${c.issuer && c.year ? ' • ' : ''}
                            ${c.year ? `<span>${c.year}</span>` : ''}
                        </div>
                        ${c.domain ? `<span style="display: block; font-size: 0.75rem; color: #666; margin-top: 0.1rem;">${c.domain}</span>` : ''}
                    </div>
                    <div class="btn-icon" style="color: var(--accent-color); font-size: 1.2rem;">
                         <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem; opacity: 0.7;"></i>
                    </div>
                </div>
                `;
                container.appendChild(item);
            });
            
            // GSAP Animation
            // GSAP Animation - Disabled to ensure visibility
            /*
            gsap.from(container.children, {
                y: 20,
                opacity: 0,
                duration: 0.4,
                stagger: 0.05,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: container,
                    start: 'top 80%'
                }
            });
            */
        };

        // Initial Render
        renderCerts();

        // Status Button Listeners (Need to re-attach if we replaced innerHTML)
        const buttons = document.querySelectorAll('#cert-status-filter .filter-btn');
        buttons.forEach(btn => {
            btn.onclick = () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatusFilter = btn.dataset.status;
                renderCerts();
            };
        });

        // Dropdown Listeners
        if(domainSelect) domainSelect.onchange = renderCerts;
        if(issuerSelect) issuerSelect.onchange = renderCerts;
        
        // --- MODAL LOGIC ---
        function openProjectModal(project) {
    const modal = document.getElementById('project-modal');
    if (!modal) return;

    // Elements
    const titleEl = document.getElementById('project-modal-title');
    const categoryEl = document.getElementById('project-modal-category');
    const yearEl = document.getElementById('project-modal-year');
    const imgEl = document.getElementById('project-modal-img');
    const descEl = document.getElementById('project-modal-desc');
    const roleEl = document.getElementById('project-modal-role');
    const subjectEl = document.getElementById('project-modal-subject');
    const techsContainer = document.getElementById('project-modal-techs');
    const tasksContainer = document.getElementById('project-modal-tasks');
    const linkEl = document.getElementById('project-modal-link');

    // Populate Data
    if (titleEl) titleEl.innerText = project.title || 'Untitled Project';
    
    if (categoryEl) {
        // Use icon for category if available or generic folder
        categoryEl.innerHTML = `<i class="fa-solid fa-folder"></i> ${project.category || 'General'}`;
    }
    
    if (yearEl) {
        yearEl.innerHTML = `<i class="fa-regular fa-calendar"></i> ${project.year || new Date().getFullYear()}`;
    }

    if (imgEl) {
        if (project.image && project.image.startsWith('/uploads/')) {
            imgEl.src = `${API_URL.replace('/api', '')}${project.image}`;
            imgEl.style.display = 'block';
        } else if (project.image && !project.image.startsWith('bento-')) {
            imgEl.src = project.image;
            imgEl.style.display = 'block';
        } else {
            // Hide image if it's a CSS class or missing
            imgEl.style.display = 'none';
        }
    }

    if (descEl) descEl.innerText = project.description || '';
    
    // Left Column Info
    if (roleEl) roleEl.innerText = project.role || 'Developer';
    if (subjectEl) subjectEl.innerText = project.subject || project.category || 'N/A';

    // Technologies (Tags)
    if (techsContainer) {
        techsContainer.innerHTML = '';
        if (project.tags) {
            project.tags.split(',').forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tech-tag';
                span.innerText = tag.trim();
                techsContainer.appendChild(span);
            });
        }
    }

    // Tasks List
    if (tasksContainer) {
        tasksContainer.innerHTML = '';
        if (project.tasks) {
            // Handle both newline separated (textarea) or just text
            const tasks = project.tasks.split('\n').filter(t => t.trim() !== '');
            if (tasks.length > 0) {
                 tasks.forEach(task => {
                    const li = document.createElement('li');
                    li.innerText = task.trim();
                    tasksContainer.appendChild(li);
                });
            } else {
                 tasksContainer.innerHTML = '<li>No specific tasks listed.</li>';
            }
        }
    }

    // GitHub Link
    if (linkEl) {
        linkEl.href = project.link || '#';
        if (!project.link) linkEl.style.display = 'none';
        else linkEl.style.display = 'inline-flex';
    }

    // Translation update for labels (Role, Subject, Techs, Tasks)
    // We can call updateTranslations() if needed, but the labels have data-i18n attributes.
    // However, since we just injected HTML, we need to ensure translations are applied.
    if (typeof updateTranslations === 'function') {
        updateTranslations();
    }

    // Show Modal
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    document.body.style.overflow = 'hidden';

    // Close Handler
    const closeBtn = modal.querySelector('.project-modal-close');
    const closeFn = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    };
    
    if (closeBtn) closeBtn.onclick = closeFn;
    
    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) closeFn();
    };
    
    // Esc key support already in global listener? If not add it.
}
        window.openCertModal = (cert) => {
            const modal = document.getElementById('cert-modal');
            if(!modal) return;

            // Populate Fields
            document.getElementById('cert-modal-title').textContent = cert.name;
            document.getElementById('cert-modal-issuer').textContent = cert.issuer || 'Unknown Issuer';
            
            const idEl = document.getElementById('cert-modal-id');
            if (cert.credential_id) {
                idEl.textContent = `ID: ${cert.credential_id}`;
                idEl.style.display = 'block';
            } else {
                idEl.style.display = 'none';
            }

            document.getElementById('cert-modal-desc').textContent = cert.description || 'No description available.';
            
            // Image Logic
            const imgEl = document.getElementById('cert-modal-img');
            if (cert.image) {
                imgEl.src = cert.image.startsWith('http') ? cert.image : `${API_URL.replace('/api', '')}${cert.image}`;
                imgEl.parentElement.style.display = 'flex';
            } else {
                // Use a generic placeholder if no image
                imgEl.src = 'https://placehold.co/600x400/2a2a2a/FFF?text=Certificate+Preview';
            }

            // Skills
            const skillsContainer = document.getElementById('cert-modal-skills');
            skillsContainer.innerHTML = '';
            if (cert.skills) {
                cert.skills.split(',').forEach(skill => {
                    const tag = document.createElement('span');
                    tag.className = 'cert-skill-tag';
                    tag.textContent = skill.trim();
                    skillsContainer.appendChild(tag);
                });
            } else {
                skillsContainer.innerHTML = '<span style="color:#999; font-size:0.8rem;">No specific skills listed.</span>';
            }

            // Meta
            document.getElementById('cert-modal-level').innerHTML = `<i class="fa-regular fa-star"></i> ${cert.level || 'Certificate'}`;
            document.getElementById('cert-modal-date').innerHTML = `<i class="fa-regular fa-calendar"></i> ${cert.year || 'N/A'}`;

            // Verify Link
            const linkBtn = document.getElementById('cert-modal-link');
            if (cert.credential_url) {
                linkBtn.href = cert.credential_url;
                linkBtn.style.display = 'inline-flex';
                linkBtn.className = 'btn-verify';
                linkBtn.innerHTML = 'Verify Certification <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left:5px;"></i>';
            } else if (cert.pdf) {
                // Fallback to PDF view
                linkBtn.href = `${API_URL.replace('/api', '')}${cert.pdf}`;
                linkBtn.style.display = 'inline-flex';
                linkBtn.className = 'btn-verify';
                linkBtn.innerHTML = 'View PDF <i class="fa-solid fa-file-pdf" style="margin-left:5px;"></i>';
            } else {
                linkBtn.style.display = 'none';
            }

            // Verified Badge (if verified/URL exists)
            document.getElementById('cert-modal-verified-badge').style.display = (cert.credential_url || cert.status === 'obtained') ? 'flex' : 'none';

            // Show Modal
            modal.style.display = 'flex';
            gsap.from('.cert-modal-content', { y: 50, opacity: 0, duration: 0.3, ease: 'power2.out' });
        };

        window.closeCertModal = () => {
             const modal = document.getElementById('cert-modal');
             if(modal) modal.style.display = 'none';
        };

        // Close on click outside
        const modal = document.getElementById('cert-modal');
        if(modal) {
            modal.onclick = (e) => {
                if (e.target === modal) closeCertModal();
            }
        }

    } catch (err) { console.error("Failed to load certifications", err); }
}

    async function loadEducation() {
        try {
            const res = await fetch(`${API_URL}/education?lang=${currentLang}&t=${Date.now()}`);
        const edu = (await res.json()).filter(e => !e.is_hidden);
        const container = document.getElementById('education-content');
        container.innerHTML = '';

        edu.forEach(e => {
            const card = document.createElement('div');
            card.className = 'timeline-card';
            card.innerHTML = `
                <span class="timeline-year">${e.year}</span>
                <h4>${e.degree}</h4>
                <p class="institution">${e.institution}</p>
                ${e.description ? `<p class="desc">${e.description}</p>` : ''}
            `;
            container.appendChild(card);
        });
    } catch (err) { console.error("Failed to load education", err); }
}

async function loadExperience() {
    try {
        const res = await fetch(`${API_URL}/experience?lang=${currentLang}&t=${Date.now()}`);
        const exp = (await res.json()).filter(e => !e.is_hidden);
        const container = document.getElementById('experience-content');
        container.innerHTML = '';

        exp.forEach(e => {
            const card = document.createElement('div');
            card.className = 'timeline-card';
            card.innerHTML = `
                <span class="timeline-year">${e.year}</span>
                <h4>${e.role}</h4>
                <p class="institution">${e.company}</p>
                <p class="desc">${e.description}</p>
            `;
            container.appendChild(card);
        });
    } catch (err) { console.error("Failed to load experience", err); }
}

async function loadSkills() {
    try {
        const res = await fetch(`${API_URL}/skills?lang=${currentLang}`);
        const skills = (await res.json()).filter(s => !s.is_hidden);
        const container = document.getElementById('skills-grid');
        container.innerHTML = '';

        const categories = {};
        skills.forEach(s => {
            if (!categories[s.category]) categories[s.category] = [];
            categories[s.category].push(s);
        });

        for (const [cat, items] of Object.entries(categories)) {
            const catDiv = document.createElement('div');
            catDiv.className = 'skill-category';
            
            let icon = 'fa-code';
            // Check if any item in this category has an icon defined
            const iconItem = items.find(i => i.icon);
            if (iconItem && iconItem.icon) {
                icon = iconItem.icon;
            } else {
                // Fallback logic
                if (cat.includes('Data')) icon = 'fa-brain';
                if (cat.includes('Big Data')) icon = 'fa-server';
            }

            // Check if any skill in this category has a level > 0
            const hasLevels = items.some(s => s.level && s.level > 0);

            let contentHtml = '';
            if (hasLevels) {
                contentHtml = `<div class="skill-bars">
                    ${items.map(s => `
                        <div class="skill-bar-item">
                            <div class="skill-info"><span>${s.name}</span><span>${s.level}%</span></div>
                            <div class="progress-bar"><div class="progress" style="width: ${s.level}%"></div></div>
                        </div>
                    `).join('')}
                </div>`;
            } else {
                contentHtml = `<div class="skill-tags-cloud">
                    ${items.map(s => `<span class="tech-tag">${s.name}</span>`).join('')}
                </div>`;
            }

            catDiv.innerHTML = `
                <h3><i class="fa-solid ${icon}"></i> ${cat}</h3>
                ${contentHtml}
            `;
            container.appendChild(catDiv);
        }
    } catch (err) { console.error("Failed to load skills", err); }
}

// =========================================
// 1. CANVAS PARTICLE NETWORK
// =========================================
const canvas = document.getElementById("data-network");
const ctx = canvas.getContext("2d");
let width, height;
let particles = [];

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();
// =========================================
// CHATBOT LOGIC
// =========================================
function initChatbot() {
    const toggleBtn = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('chat-close');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    let lastMessageTime = 0; // Cooldown timer state

    if (!toggleBtn || !chatWindow) return;

    // Initialize with Welcome Message
    if (messages.children.length === 0) {
         const welcomeText = translations[currentLang]?.["chatbot.welcome"] || "Hello!";
         // Use setTimeout to ensure appendMessage is defined (hoisting works but just to be safe in module strict mode if function was expression)
         // Actually, since I removed the function definition earlier (step 5227), I hope I didn't verify it was removed.
         // Wait! In step 5227 I removed the duplicate definition at the BOTTOM.
         // But did I ADD the definition at the TOP?
         // NO! I cancelled the `replace_file_content` in step 5223 and 5225 failed because "appendMessage moved to top of scope" was not found (target mismatch).
         // Step 5225 TRIED to remove the bottom one. Did it succeed?
         // Step 5227 succeeded?
         // NO, Step 5225 output said: "The following changes were made...".
         // Step 5223 failed.
         // So I have NOT yet added the top definition, but I might have removed the bottom one in Step 5225.
         // If I removed the bottom one and didn't add the top one, `appendMessage` is UNDEFINED.
         // THIS WOULD BREAK THE CODE.
         
         // I must check if `appendMessage` exists.
         // I need to ADD `appendMessage` definition inside `initChatbot`!
    }
    
    function appendMessage(html, sender, id = null, i18nKey = null) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerHTML = html;
        if (id) div.id = id;
        if (i18nKey) div.setAttribute('data-i18n', i18nKey); // Add translation key
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    // Call welcome after definition
    if (messages.children.length === 0) {
         const welcomeText = translations[currentLang]?.["chatbot.welcome"] || "Hello!";
         appendMessage(welcomeText, 'bot', null, 'chatbot.welcome'); // Pass key
    }

    // Initialize with Welcome Message
    const welcomeText = translations[currentLang]["chatbot.welcome"] || "Hello! Ask me anything.";
    if (messages.children.length === 0) { // Only if empty
         // Ensure appendMessage is defined before calling it, or move this call down?
         // appendMessage is defined below. Function hoisting works for function declarations.
         // BUT appendMessage is defined inside initChatbot. It IS hoisted within the scope.
         // Let's add it after function definition or invoke it later.
         // Actually, safer to define appendMessage first OR put this logic after definition.
    }
    
    // Better: define appendMessage first in the scope or put this logic at the end of initChatbot function (but before user interaction).
    // Let's restructure initChatbot slightly.
    
    // ...

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) input.focus();
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
    });

    // Send Message
    async function sendMessage() {
        // Cooldown Check
        const now = Date.now();
        if (now - lastMessageTime < 15000) return;

        const text = input.value.trim();
        if (!text) return;

        // Start Cooldown
        lastMessageTime = now;
        
        // Disable UI
        sendBtn.disabled = true;
        input.disabled = true;

        // Start Countdown UI
        let timeLeft = 15;
        const waitText = translations[currentLang]?.["chatbot.wait"] || "Wait";
        const originalIcon = '<i class="fa-solid fa-paper-plane"></i>';
        
        sendBtn.innerHTML = `<span style="font-size:0.8rem">${waitText} ${timeLeft}s</span>`;
        
        const timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                sendBtn.disabled = false;
                input.disabled = false;
                sendBtn.innerHTML = originalIcon;
                // input.focus(); // Optional: might be annoying on mobile
            } else {
                 sendBtn.innerHTML = `<span style="font-size:0.8rem">${waitText} ${timeLeft}s</span>`;
            }
        }, 1000);

        // Add User Message
        appendMessage(text, 'user');
        input.value = '';

        // Add Loading Message
        const loadingId = 'loading-' + Date.now();
        appendMessage('<i class="fa-solid fa-spinner fa-spin"></i> Thinking...', 'bot', loadingId);

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, lang: currentLang })
            });
            const data = await res.json();

            // Remove Loading
            const loadingMsg = document.getElementById(loadingId);
            if (loadingMsg) loadingMsg.remove();

            if (data.error) {
                appendMessage('Error: ' + data.error, 'bot');
            } else {
                // Parse markdown-like bolding if needed, or just plain text
                // Gemini returns markdown. Simple formatting replacement:
                let reply = data.reply
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>');
                appendMessage(reply, 'bot');
            }

        } catch (err) {
            console.error(err);
             const loadingMsg = document.getElementById(loadingId);
            if (loadingMsg) loadingMsg.remove();
            appendMessage('Sorry, something went wrong. Please try again later.', 'bot');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // appendMessage moved to top of scope
}

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 157, 0.5)";
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    
    particles.forEach((p, index) => {
        p.update();
        p.draw();

        for (let j = index + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 255, 157, ${1 - dist / 150})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// =========================================
// 2. HACKER TEXT SCRAMBLE
// =========================================
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

function scrambleText(element) {
    const originalText = element.innerText;
    let iterations = 0;
    
    const interval = setInterval(() => {
        element.innerText = originalText
            .split("")
            .map((letter, index) => {
                if (index < iterations) return originalText[index];
                return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("");
        
        if (iterations >= originalText.length) clearInterval(interval);
        iterations += 1 / 3;
    }, 30);
}

document.querySelectorAll(".scramble-text").forEach(el => {
    ScrollTrigger.create({
        trigger: el,
        start: "top 80%",
        onEnter: () => scrambleText(el)
    });
});

// =========================================
// 3. ANIMATIONS (GSAP) - INITIALIZED AFTER LOAD
// =========================================
function initAnimations() {
    ScrollTrigger.refresh();

    // Custom Cursor
    const cursorDot = document.querySelector("[data-cursor-dot]");
    const cursorOutline = document.querySelector("[data-cursor-outline]");

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

    // Hover effects (Re-select dynamic elements)
    const interactiveElements = document.querySelectorAll("a, button, .bento-item, .tech-tag, .cert-item");
    interactiveElements.forEach(el => {
        el.addEventListener("mouseenter", () => document.body.classList.add("hovering"));
        el.addEventListener("mouseleave", () => document.body.classList.remove("hovering"));
    });

    // Hero Animations
    const tl = gsap.timeline();
    tl.from(".hero-subtitle", { opacity: 0, y: 20, duration: 1 })
      .from(".hero-description", { opacity: 0, y: 20, duration: 1 }, "-=0.5")
      .from(".hero-buttons", { opacity: 0, y: 20, duration: 1 }, "-=0.5")
      .from(".data-cube", { opacity: 0, scale: 0, duration: 1.5, ease: "elastic.out(1, 0.5)" }, "-=1");

    // Section Titles & Content Animation
    gsap.utils.toArray(".section-title, .line-separator, .about-text, .stats-grid, .contact-text, .contact-form, .column-title").forEach(el => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: "top 85%"
            },
            y: 30,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        });
    });

    // Skill Bars Animation
    gsap.utils.toArray(".progress").forEach(bar => {
        gsap.to(bar, {
            scrollTrigger: {
                trigger: bar,
                start: "top 85%"
            },
            scaleX: 1,
            duration: 1.5,
            ease: "power3.out"
        });
    });

    // Stats Counter Animation


    // Bento Grid & Cards Stagger
    gsap.utils.toArray(".bento-item, .timeline-card, .cert-item").forEach((item, i) => {
        gsap.from(item, {
            scrollTrigger: {
                trigger: item,
                start: "top 90%"
            },
            opacity: 0,
            y: 50,
            duration: 0.8,
            ease: "power3.out"
        });
    });

    // Tilt Effect
    const bentoItems = document.querySelectorAll(".bento-item");
    bentoItems.forEach(item => {
        item.addEventListener("mousemove", (e) => {
            const rect = item.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;

            gsap.to(item, {
                rotationX: rotateX,
                rotationY: rotateY,
                transformPerspective: 1000,
                duration: 0.4,
                ease: "power2.out"
            });
        });

        item.addEventListener("mouseleave", () => {
            gsap.to(item, { rotationX: 0, rotationY: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" });
        });
    });
}

async function loadStats() {
    try {
        const res = await fetch(`${API_URL}/stats?lang=${currentLang}&t=${Date.now()}`);
        const data = await res.json();

        const ids = {
            years: 'stats-years',
            projects: 'stats-projects',
            companies: 'stats-companies',
            certs: 'stats-certs',
            articles: 'stats-articles',
            reviews: 'stats-reviews'
        };

        const updateStats = () => {
            for (const [key, id] of Object.entries(ids)) {
                const el = document.getElementById(id);
                if (el && data[key] !== undefined) {
                    animateCounter(el, data[key]);
                }
            }
        };

        // Use IntersectionObserver to start animation when visible
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateStats();
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 }); // Start when 20% visible
            observer.observe(statsGrid);
            
            // Allow triggering immediately if already visible or check logic fails
            // But to avoid double run, we rely on observer. 
            // Fallback for non-observer browsers? (Rare now, but safe)
        } else {
             updateStats();
        }

    } catch (err) { console.error("Failed to load stats", err); }
}

async function loadArticles() {
    try {
        const res = await fetch(`${API_URL}/articles?lang=${currentLang}&t=${Date.now()}`);
        const articles = (await res.json()).filter(a => !a.is_hidden);
        const track = document.getElementById("articles-track");
        const pagination = document.getElementById("articles-pagination");

        if (!track || !pagination) return;

        const render = (items) => {
            if (items.length === 0) {
                track.innerHTML = "<p style=\"width:100%; text-align: center; color: var(--text-muted); padding: 2rem;\">No articles found.</p>";
                pagination.innerHTML = "";
                return;
            }

            const isMobile = window.innerWidth <= 768;
            const itemsPerSlide = isMobile ? 1 : 3;
            
            // Chunk items
            const slides = [];
            for (let i = 0; i < items.length; i += itemsPerSlide) {
                slides.push(items.slice(i, i + itemsPerSlide));
            }

            // Render Slides
            track.innerHTML = slides.map(group => `
                <div class="article-slide">
                    ${group.map(art => {
                        const dateStr = art.date ? new Date(art.date).toLocaleDateString() : new Date().toLocaleDateString();
                        // Check if date is valid
                        const displayDate = dateStr === 'Invalid Date' ? new Date().toLocaleDateString() : dateStr;

                        return `
                        <div class="article-card">
                            <div class="article-image">
                                ${art.image ? `<img src="${API_URL.replace("/api", "")}${art.image}" alt="${art.title}">` : `<div style="width:100%; height:100%; background: var(--nav-border); display:flex; align-items:center; justify-content:center; color:var(--text-muted);"><i class="fa-solid fa-newspaper" style="font-size:2rem;"></i></div>`}
                            </div>
                            <div class="article-content">
                                <div class="article-date">${displayDate}</div>
                                <h3 class="article-title">${art.title || 'Untitled'}</h3>
                                <p class="article-summary">${art.summary || 'No summary available.'}</p>
                                <div class="article-tags" style="margin-bottom: 1rem;">
                                    ${art.tags ? art.tags.split(",").map(t => `<span class="tech-tag small" style="font-size:0.7rem; padding:0.2rem 0.5rem; margin-right: 5px;">${t.trim()}</span>`).join("") : ""}
                                </div>
                                <a href="${art.link || '#'}" target="_blank" class="article-link">
                                     ${translations[currentLang]?.["articles.read"] || "Read More"} <i class="fa-solid fa-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                    `}).join("")}
                    ${/* Fill empty grid spots for layout consistency if needed (CSS grid handles this well usually) */ ""}
                </div>
            `).join("");

            // Render Pagination
            pagination.innerHTML = slides.map((_, idx) => `
                <span class="slider-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
            `).join("");

            // Logic
            let currentSlide = 0;
            const updateSlide = (index) => {
                currentSlide = index;
                track.style.transform = `translateX(-${currentSlide * 100}%)`;
                pagination.querySelectorAll('.slider-dot').forEach((d, i) => {
                    d.classList.toggle('active', i === currentSlide);
                });
            };

            pagination.querySelectorAll('.slider-dot').forEach(dot => {
                dot.onclick = () => updateSlide(parseInt(dot.dataset.index));
            });

             // Swipe support
            let touchStartX = 0;
            track.ontouchstart = e => touchStartX = e.changedTouches[0].screenX;
            track.ontouchend = e => {
                const diff = e.changedTouches[0].screenX - touchStartX;
                if (Math.abs(diff) > 50) {
                     if (diff > 0 && currentSlide > 0) updateSlide(currentSlide - 1);
                     else if (diff < 0 && currentSlide < slides.length - 1) updateSlide(currentSlide + 1);
                }
            };
        };
        
        // Initial Render
        render(articles);

        const filterSelect = document.getElementById("filter-article-tag");
        const searchInput = document.getElementById("filter-article-search");

        // Populate Tags
        if (filterSelect) {
            while (filterSelect.options.length > 1) {
                filterSelect.remove(1);
            }
            const allTags = articles.flatMap(a => a.tags ? a.tags.split(",").map(t => t.trim()) : []);
            const uniqueTags = [...new Set(allTags)].sort();
            uniqueTags.forEach(tag => {
                const opt = document.createElement("option");
                opt.value = tag;
                opt.innerText = tag;
                filterSelect.appendChild(opt);
            });
        }

        // Combined Filter Logic
        const applyFilters = () => {
            const tag = filterSelect ? filterSelect.value : "";
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

            const filtered = articles.filter(a => {
                const matchesTag = !tag || (a.tags && a.tags.split(",").map(t => t.trim()).includes(tag));
                const matchesSearch = !query || (a.title && a.title.toLowerCase().includes(query));
                return matchesTag && matchesSearch;
            });

            render(filtered);
        };

        if (filterSelect) filterSelect.onchange = applyFilters;
        if (searchInput) searchInput.oninput = applyFilters;

        // Resize Listener for Article Slider
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(applyFilters, 300); // Re-run applyFilters to re-chunk correctly
        });

    } catch (err) { console.error("Failed to load articles", err); }
}

async function loadReviews() {
    try {
        const res = await fetch(`${API_URL}/reviews`);
        const reviews = await res.json();
        const track = document.getElementById("testimonials-track");
        const pagination = document.getElementById("testimonials-pagination");
        
        if(!track || !pagination) return;

        if (reviews.length === 0) {
            track.innerHTML = "<p style='width:100%; text-align:center; color:var(--text-muted); padding: 2rem;'>No reviews yet. Be the first!</p>";
            // Update stats handled by loadStats() now
            return;
        }

        // Update stats handled by loadStats() now

        const renderSlider = () => {
            const isMobile = window.innerWidth <= 768;
            const itemsPerSlide = isMobile ? 2 : 6;
            
            // Chunk reviews
            const slides = [];
            for (let i = 0; i < reviews.length; i += itemsPerSlide) {
                slides.push(reviews.slice(i, i + itemsPerSlide));
            }

            // Render Slides
            track.innerHTML = slides.map(group => `
                <div class="testimonial-slide">
                    ${group.map(r => `
                        <div class="testimonial-card">
                            <div class="testimonial-header">
                                <div class="testimonial-info">
                                    <h4 class="testimonial-name">
                                        ${r.name} 
                                        ${r.social_link ? `<a href="${r.social_link}" target="_blank" style="color:var(--accent-color); margin-left:5px;">
                                            ${getSocialIcon(r.social_platform)}
                                        </a>` : ''}
                                    </h4>
                                    <span class="testimonial-role">${r.role || ''}</span>
                                </div>
                                <div class="testimonial-rating">
                                    ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}
                                </div>
                            </div>
                            <p class="testimonial-text">"${r.message}"</p>
                        </div>
                    `).join("")}
                    ${/* Fill empty spots if needed for grid layout consistency? Not strictly needed with css grid */ ""}
                </div>
            `).join("");

            // Render Pagination
            pagination.innerHTML = slides.map((_, idx) => `
                <span class="slider-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
            `).join("");

            // Logic
            let currentSlide = 0;
            const updateSlide = (index) => {
                currentSlide = index;
                track.style.transform = `translateX(-${currentSlide * 100}%)`;
                pagination.querySelectorAll('.slider-dot').forEach((d, i) => {
                    d.classList.toggle('active', i === currentSlide);
                });
            };

            pagination.querySelectorAll('.slider-dot').forEach(dot => {
                dot.onclick = () => updateSlide(parseInt(dot.dataset.index));
            });

            // Swipe support (simple)
            let touchStartX = 0;
            track.ontouchstart = e => touchStartX = e.changedTouches[0].screenX;
            track.ontouchend = e => {
                const diff = e.changedTouches[0].screenX - touchStartX;
                if (Math.abs(diff) > 50) {
                     if (diff > 0 && currentSlide > 0) updateSlide(currentSlide - 1);
                     else if (diff < 0 && currentSlide < slides.length - 1) updateSlide(currentSlide + 1);
                }
            };
        };

        // Initial Render
        renderSlider();

        // Re-render on Resize (debounced)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(renderSlider, 300);
        });

    } catch (err) { console.error("Failed to load reviews", err); }
}

function initReviewModal() {
    const modal = document.getElementById("review-modal");
    const btn = document.getElementById("open-review-modal");
    const close = modal?.querySelector(".close-modal");
    const form = document.getElementById("review-form");
    const stars = modal?.querySelectorAll(".star");
    const ratingInput = document.getElementById("review-rating");

    if (!modal || !btn) return;

    btn.onclick = () => {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    };

    const closeModal = () => {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    };

    if(close) close.onclick = closeModal;
    window.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Star Rating Logic
    if(stars) {
        stars.forEach(star => {
            star.onclick = () => {
                const val = star.dataset.value;
                ratingInput.value = val;
                stars.forEach(s => {
                    s.classList.toggle("active", s.dataset.value <= val);
                });
            };
        });
        // Init state
        const initialVal = ratingInput.value;
        stars.forEach(s => s.classList.toggle("active", s.dataset.value <= initialVal));
    }



function showNotification(title, message, type = 'success') {
    const popup = document.getElementById('notification-popup');
    const titleEl = document.getElementById('notification-title');
    const msgEl = document.getElementById('notification-message');
    const iconEl = popup.querySelector('.notification-icon i');

    if (!popup) return;

    titleEl.textContent = title;
    msgEl.textContent = message;

    popup.className = `notification-popup ${type} show`;

    if (type === 'success') {
        iconEl.className = 'fa-solid fa-check-circle';
    } else {
        iconEl.className = 'fa-solid fa-circle-exclamation';
    }

    setTimeout(() => {
        popup.classList.remove('show');
    }, 5000);
}

    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            
            const name = document.getElementById("review-name").value.trim();
            const message = document.getElementById("review-message").value.trim();

            if (!name || !message) {
                const t = translations[currentLang];
                showNotification(t["review.error.title"], t["review.validation.error"], 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerText = "Sending...";

            const data = {
                name: name,
                role: document.getElementById("review-role").value,
                rating: document.getElementById("review-rating").value,
                social_link: document.getElementById("review-link").value,
                social_platform: document.getElementById("review-platform").value,
                message: message
            };

            try {
                const res = await fetch(`${API_URL}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if(res.ok) {
                    const t = translations[currentLang];
                    showNotification(t["review.success.title"], t["review.success.msg"], 'success');
                    closeModal();
                    form.reset();
                    loadReviews(); // Refresh list
                } else {
                    const t = translations[currentLang];
                    showNotification(t["review.error.title"], t["review.error.msg"], 'error');
                }
            } catch(err) {
                console.error(err);
                const t = translations[currentLang];
                showNotification(t["review.error.title"], t["review.error.msg"], 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        };
    }
}


// =========================================
// MOBILE SLIDER CONTROLS (DOTS)
// =========================================
/*
function initMobileSliderControls() {
    const sliders = [
        { id: 'projects-grid' },
        { id: 'articles-grid' },
        { id: 'skills-grid' }
    ];

    sliders.forEach(s => {
        const el = document.getElementById(s.id);
        if (!el) return;

        if (el.parentElement.classList.contains('slider-container')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'slider-container';
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'slider-dots';
        wrapper.appendChild(dotsContainer);

        const updateDots = () => {
            dotsContainer.innerHTML = '';
            const items = Array.from(el.children).filter(c => c.style.display !== 'none');
            const itemCount = items.length;
            if (itemCount === 0) return;

            for (let i = 0; i < itemCount; i++) {
                const dot = document.createElement('div');
                dot.className = 'slider-dot';
                if (i === 0) dot.classList.add('active');
                dot.onclick = () => items[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                dotsContainer.appendChild(dot);
            }
        };

        setTimeout(updateDots, 500);

        el.addEventListener('scroll', () => {
            const centerPos = el.scrollLeft + (el.offsetWidth / 2);
            const items = Array.from(el.children).filter(c => c.style.display !== 'none');
            let activeIndex = 0;
            let minDist = Infinity;

            items.forEach((item, index) => {
                const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
                const dist = Math.abs(centerPos - itemCenter);
                if (dist < minDist) {
                    minDist = dist;
                    activeIndex = index;
                }
            });

            const dots = dotsContainer.querySelectorAll('.slider-dot');
            dots.forEach((dot, idx) => {
                if (idx === activeIndex) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        }, { passive: true });
    });
}
/*
        const prevBtn = document.createElement('button');
        prevBtn.className = 'slider-nav-btn prev';
        prevBtn.innerHTML = '<i class=\a-solid fa-chevron-left\></i>';
        prevBtn.onclick = () => el.scrollBy({ left: -300, behavior: 'smooth' });

        const nextBtn = document.createElement('button');
        nextBtn.className = 'slider-nav-btn next';
        nextBtn.innerHTML = '<i class=\a-solid fa-chevron-right\></i>';
        nextBtn.onclick = () => el.scrollBy({ left: 300, behavior: 'smooth' });

        wrapper.appendChild(prevBtn);
        wrapper.appendChild(nextBtn);
    });
}
// Init after short delay to ensure DOM is ready and grid is populated
window.addEventListener('load', () => setTimeout(initMobileSliderControls, 100));
*/



// =========================================
// MOBILE SLIDER CONTROLS (DOTS)
// =========================================
function initMobileSliderControls() {
    const sliders = [
        { id: 'projects-grid' },
        { id: 'articles-grid' },
        { id: 'skills-grid' }
    ];

    sliders.forEach(s => {
        const el = document.getElementById(s.id);
        if (!el) return;

        if (el.parentElement.classList.contains('slider-container')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'slider-container';
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'slider-dots';
        wrapper.appendChild(dotsContainer);

        const updateDots = () => {
            dotsContainer.innerHTML = '';
            const items = Array.from(el.children).filter(c => c.style.display !== 'none');
            const itemCount = items.length;
            if (itemCount === 0) return;

            for (let i = 0; i < itemCount; i++) {
                const dot = document.createElement('div');
                dot.className = 'slider-dot';
                if (i === 0) dot.classList.add('active');
                dot.onclick = () => items[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                dotsContainer.appendChild(dot);
            }
        };

        setTimeout(updateDots, 500);

        el.addEventListener('scroll', () => {
            const centerPos = el.scrollLeft + (el.offsetWidth / 2);
            const items = Array.from(el.children).filter(c => c.style.display !== 'none');
            let activeIndex = 0;
            let minDist = Infinity;

            items.forEach((item, index) => {
                const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
                const dist = Math.abs(centerPos - itemCenter);
                if (dist < minDist) {
                    minDist = dist;
                    activeIndex = index;
                }
            });

            const dots = dotsContainer.querySelectorAll('.slider-dot');
            dots.forEach((dot, idx) => {
                if (idx === activeIndex) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        }, { passive: true });
    });
}
window.addEventListener('load', () => setTimeout(initMobileSliderControls, 100));

function renderMobileShape(shape) {
    // 1. Find or create mobile container
    let mobileContainer = document.querySelector('.mobile-shape-container');
    if (!mobileContainer) {
        // Insert before hero-title
        const heroContent = document.querySelector('.hero-content');
        const heroTitle = document.querySelector('.hero-title');
        if (heroContent && heroTitle) {
            mobileContainer = document.createElement('div');
            mobileContainer.className = 'mobile-shape-container';
            heroContent.insertBefore(mobileContainer, heroTitle);
        }
    }

    if (!mobileContainer) return;
    mobileContainer.innerHTML = ''; // Clear prev

    // 2. Create the shape (Reusable Cube Logic simplified)
    const size = '120px'; // Fixed size for mobile header
    
    // We can reuse the HTML structure of the cube/pyramid
    // For simplicity, let's just make it a standard cube for now or clone the logic?
    // Let's Clone the logic but statically positioned
    
    const scene = document.createElement('div');
    scene.className = 'scene mobile-scene';
    scene.style.width = size;
    scene.style.height = size;

    const obj = document.createElement('div');
    obj.className = shape.type === 'sphere' ? 'sphere' : (shape.type === 'pyramid' ? 'pyramid' : 'cube');
    
    // Faces text
    const texts = {
        front: shape.face_front,
        back: shape.face_back,
        right: shape.face_right,
        left: shape.face_left,
        top: shape.face_top,
        bottom: shape.face_bottom
    };

    if (shape.type === 'cube') {
        const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
        faces.forEach(face => {
            const div = document.createElement('div');
            div.className = `cube-face ${face}`;
            div.innerHTML = texts[face] || '';
            div.style.borderColor = 'var(--accent-color)';
            div.style.color = 'var(--text-color)';
            div.style.background = 'rgba(255, 255, 255, 0.05)';
            obj.appendChild(div);
        });
    } else if (shape.type === 'pyramid') {
        const sides = ['front', 'back', 'right', 'left'];
        sides.forEach(side => {
            const div = document.createElement('div');
            div.className = `pyramid-face ${side}`;
            div.innerHTML = texts[side] || '';
            obj.appendChild(div);
        });
        // Base
        const base = document.createElement('div');
        base.className = 'pyramid-base';
        obj.appendChild(base);
    } else if (shape.type === 'sphere') {
         // Simple sphere representation
         obj.innerHTML = `<span class="sphere-text">${texts.front || ''}</span>`;
    }

    // Icon
     if (shape.icon) {
        const i = document.createElement('i');
        i.className = shape.icon;
        i.style.position = 'absolute';
        i.style.top = '50%';
        i.style.left = '50%';
        i.style.transform = 'translate(-50%, -50%)';
        i.style.fontSize = '2rem';
        i.style.color = 'var(--accent-color)';
        obj.appendChild(i);
    }

    scene.appendChild(obj);
    mobileContainer.appendChild(scene);
}
