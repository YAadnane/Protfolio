import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { translations } from "./translations.js";
import "../style.css"; // Ensure global styles are bundled
import "../details-modal.css"; // Import modal styles

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
    initChatbot(); // Initialize Chatbot
    initReviewModal();
    checkMaintenanceMode();
});

// Maintenance Mode Check
function checkMaintenanceMode() {
    fetch('/api/settings/maintenance')
        .then(res => res.json())
        .then(data => {
            if (data.enabled) {
                const overlay = document.getElementById('maintenance-overlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                    document.body.style.overflow = 'hidden'; // Lock scroll
                }
            }
        })
        .catch(err => console.error('Maintenance Check Error:', err));
}

function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        try {
            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;

            const res = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const t = translations[currentLang];
                showToast(t["form.success.msg"], 'success');
                form.reset();
            } else {
                const t = translations[currentLang];
                const result = await res.json();
                showToast(`${t["form.error.msg"]} (${result.error})`, 'error');
            }
        } catch (err) {
            console.error(err);
            const t = translations[currentLang];
            showToast(t["form.error.title"], t["form.error.msg"], 'error');
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

async function fetchWithLang(endpoint) {
    const res = await fetch(`${API_URL}/${endpoint}?lang=${currentLang}&t=${Date.now()}`);
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
    const data = await res.json();
    return data.filter(item => !item.is_hidden);
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
    initSkillAnimations(); // Re-bind skill animations to new elements
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

window.optimizeHeroText = function() {
    const title = document.querySelector('.hero-title');
    if (!title) return;
    
    const runAdjustment = () => {
        // Reset to allow recalc
        title.style.fontSize = ''; 
        
        requestAnimationFrame(() => {
            const style = getComputedStyle(title);
            let currentSize = parseFloat(style.fontSize);
            let lineHeight = parseFloat(style.lineHeight);
            
            // Fallback
            if (isNaN(lineHeight)) lineHeight = currentSize * 1.2;

            // Strict limit: 3 lines (use 3.1 multiplier for safety)
            const maxAllowedHeight = lineHeight * 3.1;

            let loops = 0;
            // Checks offsetHeight which includes padding/border, title has none usually
            while (title.offsetHeight > maxAllowedHeight && currentSize > 20 && loops < 20) {
                 currentSize -= 3; // Aggressive step
                 title.style.fontSize = `${currentSize}px`;
                 // Recalculate line-height dependent on new font-size
                 lineHeight = parseFloat(getComputedStyle(title).lineHeight);
                 loops++;
            }
        });
    };

    runAdjustment();
    setTimeout(runAdjustment, 300); // Retry to catch font loads
};

window.addEventListener('resize', () => { clearTimeout(window.resizeTo); window.resizeTo = setTimeout(window.optimizeHeroText, 200); });


window.updateProjectCardsTheme = () => {
    const isLight = document.body.classList.contains('light-mode');
    
    // 1. Handle Fallback Gradients (Green vs Dark)
    const cards = document.querySelectorAll('.bento-fallback-gradient');
    cards.forEach(card => {
        if (isLight) {
            // Force Green Gradient with IMPORTANT priority
            card.style.setProperty('background', 'linear-gradient(160deg, #ffffff 20%, rgba(0, 191, 125, 0.3) 100%)', 'important');
            card.style.setProperty('opacity', '1', 'important');
            card.style.setProperty('border', '1px solid rgba(0, 191, 125, 0.1)', 'important');
            
            // Hide Overlay (Fallback AND Standard Overlay for Large Cards)
            const overlay = card.nextElementSibling;
            if (overlay && (overlay.classList.contains('bento-fallback-overlay') || overlay.classList.contains('bento-overlay'))) {
                overlay.style.setProperty('display', 'none', 'important');
            }
            
            // Also check for separate .bento-overlay if it's not the immediate sibling (structure varies)
            const parent = card.parentElement;
            if(parent) {
                 const regularOverlay = parent.querySelector('.bento-overlay');
                 if(regularOverlay) regularOverlay.style.setProperty('display', 'none', 'important');
            }
        } else {
            // Revert (remove priority)
            card.style.removeProperty('background');
            card.style.removeProperty('opacity');
            card.style.removeProperty('border');
            
            const overlay = card.nextElementSibling;
            if (overlay && (overlay.classList.contains('bento-fallback-overlay') || overlay.classList.contains('bento-overlay'))) {
                overlay.style.removeProperty('display');
            }
            
            const parent = card.parentElement;
            if(parent) {
                 const regularOverlay = parent.querySelector('.bento-overlay');
                 if(regularOverlay) regularOverlay.style.removeProperty('display');
            }
        }
    });

    // 2. Handle Text Colors (White for Media, Dark for Fallback)
    const allItems = document.querySelectorAll('.bento-item');
    allItems.forEach(item => {
         const hasMedia = item.classList.contains('has-media');
         const h3 = item.querySelector('h3');
         const p = item.querySelector('p');
         const btns = item.querySelectorAll('.btn-github, .btn-play');
         const tags = item.querySelectorAll('.bento-tags span');

         if (isLight) {
             if (hasMedia) {
                 // Media Card in Light Mode -> Force White Text
                 if(h3) h3.style.cssText = 'color: #ffffff !important; text-shadow: 0 2px 4px rgba(0,0,0,0.5);';
                 if(p) p.style.cssText = 'color: #ffffff !important; text-shadow: 0 2px 4px rgba(0,0,0,0.5);';
                 btns.forEach(b => {
                     b.style.cssText = 'color: #ffffff !important; background: rgba(255,255,255,0.2) !important; border-color: rgba(255,255,255,0.3) !important;';
                 });
                 tags.forEach(t => t.style.cssText = 'background: rgba(0,0,0,0.6) !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.2) !important;');
             } else {
                // Fallback (Green) Card in Light Mode -> Dark Text (Default)
                // We clear styles to let CSS variables take over (which are correct for light mode)
                 if(h3) h3.style.cssText = ''; 
                 if(p) p.style.cssText = '';
                 btns.forEach(b => b.style.cssText = '');
                 tags.forEach(t => t.style.cssText = '');
             }
         } else {
             // Dark Mode -> Clear all inline styles
             if(h3) h3.style.cssText = ''; 
             if(p) p.style.cssText = '';
             btns.forEach(b => b.style.cssText = '');
             tags.forEach(t => t.style.cssText = '');
         }
    });
};

function initTheme() {
    const themeBtn = document.getElementById('theme-switch');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    // Apply initial theme
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    
    // Run style update immediately (waiting for DOM content done in caller)
    // But projects might not be loaded yet. That's why we also call it in loadProjects.
    // However, if we just toggled, we must run it.
    setTimeout(window.updateProjectCardsTheme, 100);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
             document.body.classList.toggle('light-mode');
             const isLight = document.body.classList.contains('light-mode');
             localStorage.setItem('theme', isLight ? 'light' : 'dark');
             themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
             
             // UPDATE CARDS ON TOGGLE
             window.updateProjectCardsTheme();
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
            window.optimizeHeroText(); // Adjust size immediately
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

// --- HELPER: Global Sync ---
// --- HELPER: Global Sync ---
window.updateGlobalCounters = (id, type, value, entityType = 'project') => {
    // 1. Update Data Source
    if (entityType === 'project') {
        const p1 = allProjectsData.find(p => p.id == id);
        const p2 = originalProjectsData.find(p => p.id == id);
        
        if (type === 'likes') {
             if (p1) p1.likes_count = value;
             if (p2) p2.likes_count = value;
             const els = document.querySelectorAll(`.like-project-count-${id}`);
             els.forEach(el => {
                 el.innerText = value;
                 el.style.color = '#00ff9d';
                 setTimeout(() => el.style.color = '', 500);
             });
        } else if (type === 'comments') {
             if (p1) p1.comments_count = value;
             if (p2) p2.comments_count = value;
             const els = document.querySelectorAll(`.comment-project-count-${id}`);
             els.forEach(el => {
                 el.innerText = value;
                 el.style.color = '#00ff9d';
                 setTimeout(() => el.style.color = '', 500);
             });
        } else if (type === 'views') {
             if (p1) p1.clicks = value;
             if (p2) p2.clicks = value;
             const els = document.querySelectorAll(`.view-project-count-${id}`);
             els.forEach(el => {
                 el.innerText = value;
                 el.style.color = '#00ff9d';
                 setTimeout(() => el.style.color = '', 500);
             });
        }
    } else if (entityType === 'article') {
        if (window.articlesMap && window.articlesMap[id]) {
            const art = window.articlesMap[id];
            if (type === 'likes') art.likes_count = value;
            if (type === 'comments') art.comments_count = value;
            if (type === 'views') art.clicks = value;
        }

        const animate = (els) => {
            els.forEach(el => {
                el.innerText = value;
                el.style.color = '#00ff9d';
                setTimeout(() => el.style.color = '', 500);
            });
        };

        if (type === 'likes') {
            animate(document.querySelectorAll(`.like-article-count-${id}`));
            // Also update Modal counter if exists
            const modalCount = document.getElementById('article-likes-count');
            const modalLikes = document.getElementById('article-likes');
            if (modalCount && modalLikes && modalLikes.dataset.articleId == id) {
                modalCount.innerText = value;
            }
        } else if (type === 'comments') {
            animate(document.querySelectorAll(`.comment-article-count-${id}`));
            // Also update Modal counter if exists
            const modalCount = document.getElementById('article-comments-count');
            const modalComments = document.getElementById('article-comments');
            if (modalCount && modalComments && modalComments.dataset.articleId == id) {
                modalCount.innerText = value;
            }
        } else if (type === 'views') {
            animate(document.querySelectorAll(`.view-article-count-${id}`));
            // Also update Modal counter if exists
            const modalCount = document.getElementById('article-views-count');
            const modalViews = document.getElementById('article-views');
            if (modalCount && modalViews && modalViews.dataset.articleId == id) {
                modalCount.innerText = value;
            }
        }
    }
    console.log(`[SYNC] Updated ${entityType} ${id} ${type} to ${value}`);
};

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
        case 'github': return '<i class="fa-brands fa-github"></i>';
        case 'twitter': return '<i class="fa-brands fa-x-twitter"></i>';
        case 'email': return '<i class="fa-solid fa-envelope"></i>';
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









// =========================================
// PROJECT PAGINATION
// =========================================
let allProjectsData = [];
let originalProjectsData = [];
let currentProjectPage = 0;
const PROJECTS_PER_PAGE = 3;

async function loadProjects() {
    try {
        const res = await fetch(`${API_URL}/projects?lang=${currentLang}`);
        const projects = (await res.json()).filter(p => !p.is_hidden);
        allProjectsData = projects;
        originalProjectsData = [...projects];
        currentProjectPage = 0;
        renderProjectsPage();
        initializeProjectFilters();
    } catch (err) { console.error("Failed to load projects", err); }
}

function renderProjectsPage() {
    const container = document.getElementById('projects-grid');
    if (!container) return;
    container.innerHTML = ''; 

    const start = currentProjectPage * PROJECTS_PER_PAGE;
    const end = start + PROJECTS_PER_PAGE;
    const projectsToRender = allProjectsData.slice(start, end);

    projectsToRender.forEach((p, index) => {
            let sizeClass = 'medium';
            if (index === 0) sizeClass = 'large';
            if (index === 3) sizeClass = 'wide';

            const item = document.createElement('div');
            item.className = `bento-item ${sizeClass}`;
            if (p.image) item.classList.add('has-media'); // Add class if image exists
            item.setAttribute('data-tilt', '');
            item.dataset.track = 'project';
            item.dataset.id = p.id;
            
            const tagsHtml = p.tags.split(',').map(tag => `<span class="tag-pill">${tag.trim()}</span>`).join('');

            // Interaction Stats (Safe fallback)
            const clicks = p.clicks || 0;
            const likes = p.likes_count || 0;
            const comments = p.comments_count || 0;

            let mediaHtml = '';
            if (p.image) {
                  mediaHtml = `<div class="bento-bg" style="background-image: url('${p.image}')"></div>`;
            }

            // Check if image is a file path (uploaded) or a class name
            let bgContent = '';
            let hasMedia = false; // Flag to determine if text should remain white

            if (p.image && p.image.startsWith('/uploads/')) {
                hasMedia = true;
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
                // It's a CSS class or external URL - treat as media if it's not just a pattern? 
                // Assumed media for safety if user provides custom class.
                // But often these are gradients. Let's assume NOT media unless specified.
                bgContent = `<div class="bento-bg ${p.image}"></div>`;
            } else {
                // Fallback: No image/video -> Use CSS Class for styling
               bgContent = `
                    <div class="bento-bg bento-fallback-gradient"></div>
                    <div class="bento-fallback-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;"></div>
                `;
            }

            // Unified HTML construction - REVERTED TO BENTO STYLE WITH INTERACTIONS
            item.innerHTML = `
                ${bgContent}
                <div class="bento-content">
                    ${p.category ? `<span class="project-category-badge">${p.category}</span>` : ''}
                    <h3>${p.title}</h3>
                    <p>${p.description}</p>
                    
                    <div class="bento-tags" style="margin-top: auto; margin-bottom: 1rem;">
                        ${p.tags.split(',').map(tag => `<span>${tag.trim()}</span>`).join('')}
                    </div>

                    <div class="interaction-bar" style="margin-bottom: 1rem; justify-content: flex-start;">
                         <div class="interaction-item no-pointer" title="Views">
                            <i class="fa-solid fa-eye"></i> <span class="view-project-count-${p.id}">${clicks}</span>
                         </div>
                         <div class="interaction-item interaction-like like-project-btn-${p.id}" onclick="window.toggleLike('project', ${p.id}, this)">
                            <i class="fa-regular fa-heart"></i> <span class="like-count like-project-count-${p.id}">${likes}</span>
                         </div>
                         <div class="interaction-item" onclick="window.openFeedbackModal('project', ${p.id})">
                            <i class="fa-regular fa-comment"></i> <span class="comment-project-count-${p.id}">${comments}</span>
                         </div>
                    </div>

                    <div class="project-actions">
                        <a href="${p.link}" class="btn-github" target="_blank" title="View Code" onclick="event.stopPropagation(); window.trackEvent('click_project', ${p.id}, this)">
                            <i class="fa-brands fa-github"></i> GitHub
                        </a>
                        ${p.image && p.image.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) ? 
                            `<button class="btn-play" onclick="event.stopPropagation(); window.trackEvent('click_project', ${p.id}, this); openVideoModal('${API_URL.replace('/api', '')}${p.image}')"><i class="fa-solid fa-play"></i> Demo</button>` 
                            : ''}
                    </div>
                </div>
                ${sizeClass === 'large' ? '<div class="bento-overlay"></div>' : ''}
            `;
            
            if (hasMedia) item.classList.add('has-media');


            // CLICK HANDLER FOR MODAL
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
                // Don't open if clicking action buttons (handled by stopPropagation above, but safety check)
                if (e.target.closest('a') || e.target.closest('button')) return;
                
                // Track Click
                if(window.trackEvent) window.trackEvent('click_project', p.id, item);
                
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
        
        // APPLY THEME STYLES after rendering
        if (window.updateProjectCardsTheme) window.updateProjectCardsTheme();
        updateProjectNavigation();
}

function updateProjectNavigation() {
    const container = document.getElementById('projects-grid');
    if (!container) return;
    
    const section = container.parentElement;
    const oldById = document.getElementById('project-nav-controls-unique');
    if (oldById) oldById.remove();
    
    document.querySelectorAll('.project-nav-controls').forEach(ctrl => ctrl.remove());
    
    const navControls = document.createElement('div');
    navControls.id = 'project-nav-controls-unique';
    navControls.className = 'project-nav-controls';
    section.appendChild(navControls);
    
    const totalPages = Math.ceil(allProjectsData.length / PROJECTS_PER_PAGE);
    const hasPrev = currentProjectPage > 0;
    const hasNext = currentProjectPage < totalPages - 1;
    
    navControls.innerHTML = `
        <button class="btn-nav-project ${!hasPrev ? 'disabled' : ''}" onclick="window.prevProjectPage()" ${!hasPrev ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Previous
        </button>
        <span class="page-indicator">Page ${currentProjectPage + 1} / ${totalPages}</span>
        <button class="btn-nav-project ${!hasNext ? 'disabled' : ''}" onclick="window.nextProjectPage()" ${!hasNext ? 'disabled' : ''}>
            Next <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;
}

window.prevProjectPage = () => {
    if (currentProjectPage > 0) {
        currentProjectPage--;
        renderProjectsPage();
        document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
    }
};

window.nextProjectPage = () => {
    const totalPages = Math.ceil(allProjectsData.length / PROJECTS_PER_PAGE);
    if (currentProjectPage < totalPages - 1) {
        currentProjectPage++;
        renderProjectsPage();
        document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
    }
};

function initializeProjectFilters() {
    const categorySelect = document.getElementById('filter-project-category');
    const tagSelect = document.getElementById('filter-project-tag');
    
    if (!categorySelect || !tagSelect || allProjectsData.length === 0) return;
    
    if (originalProjectsData.length === 0) {
        originalProjectsData = [...allProjectsData];
    }
    
    const categories = [...new Set(originalProjectsData.map(p => p.category || '').filter(Boolean))].sort();
    const allTags = originalProjectsData.flatMap(p => (p.tags && typeof p.tags === 'string') ? p.tags.split(',').map(t => t.trim()) : []).filter(Boolean);
    const uniqueTags = [...new Set(allTags)].sort();
    
    if (categorySelect.options.length === 1) {
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            categorySelect.appendChild(opt);
        });
    }
    
    if (tagSelect.options.length === 1) {
        uniqueTags.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            tagSelect.appendChild(opt);
        });
    }
    
    categorySelect.onchange = applyProjectFilters;
    tagSelect.onchange = applyProjectFilters;
}

function applyProjectFilters() {
    const categorySelect = document.getElementById('filter-project-category');
    const tagSelect = document.getElementById('filter-project-tag');
    
    const selectedCategory = categorySelect?.value || '';
    const selectedTag = tagSelect?.value || '';
    
    let filtered = [...originalProjectsData];
    
    if (selectedCategory) {
        filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (selectedTag) {
        filtered = filtered.filter(p => {
            const projectTags = p.tags.split(',').map(t => t.trim());
            return projectTags.includes(selectedTag);
        });
    }
    
    allProjectsData = filtered;
    currentProjectPage = 0;
    renderProjectsPage();
}

// Open Project Modal with Notion Content Support
window.openProjectModal = async function(project) {
    const modal = document.getElementById('project-modal');
    if (!modal) return;
    
    // Populate modal with project data
    document.getElementById('project-modal-title').textContent = project.title || '';
    document.getElementById('project-modal-img').src = project.image ? `${API_URL.replace('/api', '')}${project.image}` : '';
    document.getElementById('project-modal-desc').textContent = project.description || '';
    document.getElementById('project-modal-role').textContent = project.role || 'Developer';
    document.getElementById('project-modal-subject').textContent = project.category || 'General';
    
    // Technologies
    const techsContainer = document.getElementById('project-modal-techs');
    if (project.tags) {
        const tags = project.tags.split(',').map(t => t.trim());
        techsContainer.innerHTML = tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('');
    } else {
        techsContainer.innerHTML = '';
    }
    
    // Tasks
    const tasksContainer = document.getElementById('project-modal-tasks');
    tasksContainer.innerHTML = '<li>Development and implementation</li>';
    
    // Reset Notion section
    const notionSection = document.getElementById('project-notion-section');
    const notionLoading = document.getElementById('project-notion-loading');
    const notionContent = document.getElementById('project-notion-content');
    const notionError = document.getElementById('project-notion-error');
    
    notionSection.style.display = 'none';
    notionLoading.style.display = 'none';
    notionContent.style.display = 'none';
    notionError.style.display = 'none';
    notionContent.innerHTML = '';
    
    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Fetch Notion content if available
    try {
        const response = await fetch(`${API_URL}/projects/${project.id}/notion-content`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.content && data.content.trim()) {
                notionSection.style.display = 'block';
                notionLoading.style.display = 'flex';
                
                setTimeout(() => {
                    notionContent.innerHTML = data.content;
                    notionLoading.style.display = 'none';
                    notionContent.style.display = 'block';
                }, 300);
            }
        }
    } catch (error) {
        console.error('Error fetching Notion content:', error);
    }
};

// Close Project Modal
window.closeProjectModal = function() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};


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
                const t = translations[currentLang];
                container.innerHTML = `<p style="color:var(--text-muted); width:100%; text-align:center;" data-i18n="certifications.no_results">${t['certifications.no_results']}</p>`;
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
                item.dataset.track = 'certif';
                item.dataset.id = c.id;
                // Make item clickable for modal
                item.style.cursor = 'pointer';
                item.onclick = (e) => {
                    // Prevent if clicking the eye icon specifically (optional, keeping both behaviors)
                    if(e.target.closest('.btn-icon')) return;
                    
                    // Track Click
                    if(window.trackEvent) window.trackEvent('click_certif', c.id);

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
        // (Moved to top-level below)


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

// --- ARTICLE MODAL LOGIC ---
window.openArticleModal = (url, id, title, date) => {
    console.log('openArticleModal:', { url, id, title, date });

    const modal = document.getElementById('article-modal');
    if (!modal) return;
    
    // Set Header Info
    const titleEl = document.getElementById('article-modal-title');
    const dateEl = document.getElementById('article-modal-date');
    const iframe = document.getElementById('article-iframe');
    
    if (titleEl) titleEl.textContent = title;
    if (dateEl) dateEl.textContent = date;
    
    // Set Fallback Link IMMEDIATELY (V3 Cache Buster)
    let btnFallback = document.getElementById('article-fallback-link-v3');

    // Auto-Recovery for Version Mismatch (Old HTML / New JS)
    if (!btnFallback) {
        console.warn('Fallback button (v3) missing in DOM. Attempting auto-recovery...');
        const headerActions = document.querySelector('.article-modal-header-actions'); // Specific container
        if (headerActions) {
             btnFallback = document.createElement('a');
             btnFallback.id = 'article-fallback-link-v3';
             btnFallback.className = 'btn-secondary';
             btnFallback.target = '_blank';
             btnFallback.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; text-decoration: none; font-size: 0.8rem; padding: 0.4rem 0.8rem;';
             // Insert before the close button (last child)
             headerActions.insertBefore(btnFallback, headerActions.lastElementChild);
             console.log('Auto-recovered fallback button.');
        } else {
             console.error('Critical: Could not find modal header actions container.');
        }
    }
    
    if (btnFallback) {
        // VISIBLE PROOF OF UPDATE (v3)
        btnFallback.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Open Original (v3)';
        
        if (url && url !== 'undefined' && url !== 'null') {
            btnFallback.href = url;
            btnFallback.onclick = null; // Clean handlers
            btnFallback.style.pointerEvents = 'auto';
            btnFallback.style.opacity = '1';
        } else {
            console.error(`OpenArticleModal Error: Article "${title}" (ID: ${id}) has empty URL!`);
            btnFallback.removeAttribute('href'); // Prevent reload #
            btnFallback.style.pointerEvents = 'none';
            btnFallback.style.opacity = '0.5';
            btnFallback.innerHTML += ' (No Link)';
        }
    } else {
        console.warn('Robustness failed: Fallback button still null.');
    }

    // Handle URL
    let useSrcDoc = false;
    let srcDocContent = '';

    // Notion URL Handling
    if (url.includes('notion.so') || url.includes('notion.site')) {
        // Show placeholder for Notion content
        useSrcDoc = true;
        srcDocContent = `
            <html>
            <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; color: #333; text-align: center;">
                <h2 style="margin-bottom: 1rem;">Content hosted on Notion</h2>
                <p style="margin-bottom: 2rem; color: #666;">This article is hosted directly on Notion.</p>
                <a href="${url}" target="_blank" style="background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Read on Notion</a>
            </body>
            </html>
        `;
    }

    if (iframe) {
        if (useSrcDoc) {
             iframe.removeAttribute('src');
             iframe.srcdoc = srcDocContent;
        } else {
             iframe.removeAttribute('srcdoc');
             iframe.src = url;
        }
    }

    modal.style.display = 'flex';
    gsap.from('.article-modal-content', { y: 50, opacity: 0, duration: 0.3, ease: 'power2.out' });
};

window.closeArticleModal = () => {
    const modal = document.getElementById('article-modal');
    if (!modal) return;
    
    modal.style.display = 'none';
    const iframe = document.getElementById('article-iframe');
    if (iframe) iframe.src = ''; // Stop playback/loading
};

// Close on click outside
const artModal = document.getElementById('article-modal');
if (artModal) {
    artModal.onclick = (e) => {
        if (e.target === artModal) closeArticleModal();
    }
}

const uiTranslations = {
    en: { brochure: "Brochure", website: "Website", linkedin: "LinkedIn", present: "Present" },
    fr: { brochure: "Brochure", website: "Site Web", linkedin: "LinkedIn", present: "Présent" }
};

// Helper for Horizontal Pagination Dots
function setupPaginationDots(contentId, paginationId, cardSelector) {
    const content = document.getElementById(contentId);
    const pagination = document.getElementById(paginationId);
    if (!content || !pagination) return;

    const cards = content.querySelectorAll(cardSelector);
    if (cards.length === 0) {
        pagination.innerHTML = ''; // Hide if no items
        return;
    }

    // Determine items per view based on screen width (match CSS)
    const getItemsPerView = () => window.innerWidth > 768 ? 2 : 1;
    let itemsPerView = getItemsPerView();
    let numPages = Math.ceil(cards.length / itemsPerView);

    // Create Dots
    const createDots = () => {
        pagination.innerHTML = '';
        if (numPages <= 1) return; // No dots if only 1 page

        for (let i = 0; i < numPages; i++) {
            const dot = document.createElement('div');
            dot.className = `slider-dot ${i === 0 ? 'active' : ''}`;
            dot.dataset.page = i;
            dot.onclick = () => scrollToPage(i);
            pagination.appendChild(dot);
        }
    };

    // Scroll to Page
    const scrollToPage = (pageIndex) => {
        const scrollAmount = content.offsetWidth * pageIndex;
        content.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        updateActiveDot(pageIndex);
    };

    // Update Active Dot
    const updateActiveDot = (activeIndex) => {
        const dots = pagination.querySelectorAll('.slider-dot');
        dots.forEach((dot, index) => {
            if (index === activeIndex) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    };

    // Listen for Scroll to update dots (debounced)
    let isScrolling;
    content.addEventListener('scroll', () => {
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(() => {
            const scrollLeft = content.scrollLeft;
            const containerWidth = content.offsetWidth;
            const currentPage = Math.round(scrollLeft / containerWidth);
            updateActiveDot(currentPage);
        }, 66);
    });

    // Handle Resize
    window.addEventListener('resize', () => {
        const newItemsPerView = getItemsPerView();
        if (newItemsPerView !== itemsPerView) {
            itemsPerView = newItemsPerView;
            numPages = Math.ceil(cards.length / itemsPerView);
            createDots();
            scrollToPage(0); // Reset to start
        }
    });

    // Initial Setup
    createDots();
}

async function loadEducation() {
        try {
    const edu = await fetchWithLang('education');
    console.log('[DEBUG] Education data received:', edu);
        const container = document.getElementById('education-content');
        container.innerHTML = '';

        edu.forEach(e => {
            const card = document.createElement('div');
            card.className = 'timeline-card';

            const hasLogo = e.logo && e.logo.trim() !== '';
            const logoUrl = hasLogo ? `${API_URL.replace('/api', '')}${e.logo}` : '';
            const initial = (e.institution || '?').charAt(0).toUpperCase();
            
            // Date Logic
            const t = uiTranslations[currentLang] || uiTranslations['en'];
            let dateDisplay = e.year || ''; 
            if (dateDisplay === 'NULL') dateDisplay = '';
            
            if (e.start_date && e.start_date !== 'NULL') {
                dateDisplay = `${e.start_date}${e.end_date ? ' - ' + e.end_date : ' - ' + t.present}`;
            }

            card.innerHTML = `
                <div class="timeline-header">
                    <div class="timeline-logo">
                        ${hasLogo 
                            ? `<img src="${logoUrl}" alt="${e.institution}" class="timeline-logo-img">` 
                            : `<span class="timeline-initial">${initial}</span>`
                        }
                    </div>
                    <div class="timeline-info">
                        <span class="timeline-year">${dateDisplay}</span>
                        <h4>${e.degree}</h4>
                        <p class="institution">${e.institution}</p>
                    </div>
                </div>
                </div>
                ${e.description ? `<p class="desc">${e.description}</p>` : ''}
                
                ${e.brochure ? `
                    <div class="timeline-actions">
                        <a href="${API_URL.replace('/api', '')}${e.brochure}" target="_blank" class="btn-timeline">
                            <i class="fa-solid fa-file-pdf"></i> ${t.brochure}
                        </a>
                    </div>
                ` : ''}
            `;
            container.appendChild(card);
        });

        // Trigger Animation for Cards
        gsap.from("#education-content .timeline-card", {
            scrollTrigger: {
                trigger: "#education-content",
                start: "top 80%"
            },
            y: 50,
            opacity: 0,
            duration: 0.6,
            stagger: 0.2,
            ease: "power2.out"
        });

        // Initialize Pagination Dots
        setTimeout(() => {
            setupPaginationDots('education-content', 'education-pagination', '.timeline-card');
        }, 100); // Delay slightly to ensure DOM render

    } catch (err) { console.error("Failed to load education", err); }
}

async function loadExperience() {
    try {
    const exp = await fetchWithLang('experience');
    console.log('[DEBUG] Experience data received:', exp);
        const container = document.getElementById('experience-content');
        container.innerHTML = '';


        exp.forEach(e => {
            const card = document.createElement('div');
            card.className = 'timeline-card';
            
            const hasLogo = e.logo && e.logo.trim() !== '';
            const logoUrl = hasLogo ? `${API_URL.replace('/api', '')}${e.logo}` : '';
            const initial = (e.company || '?').charAt(0).toUpperCase();

            // Date Logic
            const t = uiTranslations[currentLang] || uiTranslations['en'];
            let dateDisplay = e.year || '';
            if (dateDisplay === 'NULL') dateDisplay = '';

            if (e.start_date && e.start_date !== 'NULL') {
                dateDisplay = `${e.start_date}${e.end_date ? ' - ' + e.end_date : ' - ' + t.present}`;
            }

            card.innerHTML = `
                <div class="timeline-header">
                     <div class="timeline-logo">
                        ${hasLogo 
                            ? `<img src="${logoUrl}" alt="${e.company}" class="timeline-logo-img">` 
                            : `<span class="timeline-initial">${initial}</span>`
                        }
                    </div>
                    <div class="timeline-info">
                        <span class="timeline-year">${dateDisplay}</span>
                        <h4>${e.role}</h4>
                        <p class="institution">${e.company}</p>
                    </div>
                </div>
                <p class="desc">${e.description}</p>
                
                <div class="timeline-actions">
                    ${e.website ? `
                        <a href="${e.website}" target="_blank" class="btn-timeline">
                            <i class="fa-solid fa-globe"></i> ${t.website}
                        </a>
                    ` : ''}
                    ${e.linkedin ? `
                        <a href="${e.linkedin}" target="_blank" class="btn-timeline">
                            <i class="fa-brands fa-linkedin"></i> ${t.linkedin}
                        </a>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
        
        // Trigger Animation for Cards
        gsap.from(".timeline-card", {
            scrollTrigger: {
                trigger: "#experience-content",
                start: "top 80%"
            },
            y: 50,
            opacity: 0,
            duration: 0.6,
            stagger: 0.2,
            ease: "power2.out"
        });

        // Initialize Pagination Dots
        setTimeout(() => {
            setupPaginationDots('experience-content', 'experience-pagination', '.timeline-card');
        }, 100);

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
// ARTICLES SECTION
// =========================================

// Global map to store article objects for modal access
window.articlesMap = window.articlesMap || {};

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

    // Helper to append messages
    function appendMessage(html, sender, id = null, i18nKey = null) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerHTML = html;
        if (id) div.id = id;
        if (i18nKey) div.setAttribute('data-i18n', i18nKey);
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    // Initialize with Welcome Message if empty
    if (messages.children.length === 0) {
         const welcomeKey = "chatbot.welcome";
         const welcomeText = translations[currentLang]?.[welcomeKey] || "Hello! Ask me anything about Adnane.";
         appendMessage(welcomeText, 'bot', null, welcomeKey);
    }

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            input.focus();
            // Scroll to bottom when opening
            messages.scrollTop = messages.scrollHeight;
        }
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

    draw(colorRgb = "0, 255, 157", opacity = 0.5) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorRgb}, ${opacity})`;
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
    
    const isLight = document.body.classList.contains('light-mode');
    const colorRgb = isLight ? "0, 150, 80" : "0, 255, 157"; // Darker green for light mode
    const particleOpacity = isLight ? 0.8 : 0.5;

    particles.forEach((p, index) => {
        p.update();
        p.draw(colorRgb, particleOpacity);

        for (let j = index + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${colorRgb}, ${1 - dist / 150})`;
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
function initSkillAnimations() {
    const skillsSection = document.querySelector('#skills-grid');
    if (skillsSection) {
        const progressBars = document.querySelectorAll('.progress');
        
        // Initialize all bars to 0
        progressBars.forEach(bar => {
            bar.style.transform = 'scaleX(0)';
        });
        
        // Create observer with low threshold for immediate trigger
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Trigger all bars immediately
                    progressBars.forEach(bar => {
                        bar.style.transform = 'scaleX(1)';
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -10% 0px'
        });
        
        observer.observe(skillsSection);
    }
}

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


    // Skill Bars Animation - In Separate Function
    initSkillAnimations();

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


    // --- NOTION MODAL LOGIC ---
    window.openArticleModal = async (link, id, title, date) => {
        const modal = document.getElementById('article-modal');
        if(!modal) return;
        
        // Show Modal & Load State
        modal.style.display = 'flex';
        document.getElementById('article-modal-title').textContent = title;
        document.getElementById('article-modal-date').innerHTML = `<i class="fa-regular fa-calendar"></i> ${date}`;
        document.getElementById('article-modal-original').href = link;
        
        const body = document.getElementById('article-modal-body');
        body.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:1rem;"></i><br>Loading content...</div>';
        
        // Extract Notion ID from Link (last 32 hex chars)
        const match = link.match(/([a-f0-9]{32})$/);
        let notionId = match ? match[1] : null;

        // Try UUID format if simple hex failed
        if (!notionId) {
             const matchUUID = link.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
             if (matchUUID) notionId = matchUUID[1];
        }

        if (!notionId) {
             // Fallback: Open original link if ID parsing fails
             window.open(link, '_blank');
             window.closeArticleModal();
             return;
        }

        try {
            const res = await fetch(`${API_URL}/notion/page/${notionId}`);
            const blocks = await res.json();
            
            if (blocks.error) throw new Error(blocks.error);
            
            // Render Blocks
            body.innerHTML = renderNotionBlocks(blocks);
            
            // Highlight Code if hljs exists (optional)
            if (window.hljs) window.hljs.highlightAll();

        } catch (err) {
            console.error("Notion Fetch Error:", err);
            body.innerHTML = `<div style="text-align:center; padding:2rem; color:#ff4d4d;">
                <i class="fa-solid fa-triangle-exclamation"></i><br>
                Failed to load content.<br>
                <a href="${link}" target="_blank" style="color:var(--accent-color); margin-top:1rem; display:inline-block;">Open in Notion</a>
            </div>`;
        }
    };

    window.closeArticleModal = () => {
        const modal = document.getElementById('article-modal');
        if(modal) modal.style.display = 'none';
        const body = document.getElementById('article-modal-body');
        if(body) body.innerHTML = ''; // Clear content
    };

    function renderNotionBlocks(blocks) {
        let html = '';
        blocks.forEach(block => {
             const type = block.type;
             const value = block[type];
             
             switch(type) {
                 case 'paragraph':
                     html += `<p class="notion-p">${renderRichText(value.rich_text)}</p>`;
                     break;
                 case 'heading_1':
                     html += `<h1 class="notion-h1">${renderRichText(value.rich_text)}</h1>`;
                     break;
                 case 'heading_2':
                     html += `<h2 class="notion-h2">${renderRichText(value.rich_text)}</h2>`;
                     break;
                 case 'heading_3':
                     html += `<h3 class="notion-h3">${renderRichText(value.rich_text)}</h3>`;
                     break;
                 case 'bulleted_list_item':
                     html += `<ul class="notion-ul"><li class="notion-li">${renderRichText(value.rich_text)}</li></ul>`;
                     break;
                 case 'numbered_list_item':
                     html += `<ol class="notion-ol"><li class="notion-li">${renderRichText(value.rich_text)}</li></ol>`;
                     break;
                 case 'quote':
                     html += `<blockquote class="notion-quote">${renderRichText(value.rich_text)}</blockquote>`;
                     break;
                 case 'callout':
                     html += `<div class="notion-callout">
                        <span style="font-size:1.5rem;">${value.icon?.emoji || '💡'}</span>
                        <div>${renderRichText(value.rich_text)}</div>
                     </div>`;
                     break;
                 case 'code':
                     html += `<div class="notion-code"><pre><code class="language-${value.language}">${escapeHtml(value.rich_text[0]?.plain_text || '')}</code></pre></div>`;
                     break;
                 case 'image':
                     const src = value.type === 'external' ? value.external.url : value.file.url;
                     const caption = value.caption ? renderRichText(value.caption) : '';
                     html += `<div class="notion-image"><img src="${src}" alt="Article Image"><caption class="notion-caption" style="display:block; text-align:center; font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;">${caption}</caption></div>`;
                     break;
             }
        });
        return html;
    }

    function renderRichText(textArray) {
        if (!textArray) return '';
        return textArray.map(t => {
            let content = escapeHtml(t.plain_text);
            if (t.annotations.bold) content = `<strong>${content}</strong>`;
            if (t.annotations.italic) content = `<em>${content}</em>`;
            if (t.annotations.strikethrough) content = `<del>${content}</del>`;
            if (t.annotations.code) content = `<code style="background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:4px; font-family:'JetBrains Mono';">${content}</code>`;
            if (t.href) content = `<a href="${t.href}" target="_blank" style="color:var(--accent-color); text-decoration:underline;">${content}</a>`;
            return content;
        }).join('');
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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
            const slidesHtml = slides.map(group => `
                <div class="article-slide">
                    ${group.map(art => {
                        const dateStr = art.date ? new Date(art.date).toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
                        const updatedStr = art.updated_date ? new Date(art.updated_date).toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
                        const dateHtml = updatedStr ? `${dateStr} <br><span style="font-size:0.85em; opacity:0.8"><i class="fa-solid fa-rotate"></i> ${updatedStr}</span>` : `${dateStr}`;

                        const clicks = art.clicks || 0;
                        const likes = art.likes_count || 0;
                        const comments = art.comments_count || 0;

                        // Store article in global map for modal access
                        window.articlesMap[art.id] = art;

                         return `
                        <div class="article-card" data-tilt data-id="${art.id}" data-track="article">
                            <div class="article-image">
                                ${art.image 
                                    ? `<img src="${art.image.startsWith('http') ? art.image : (API_URL.replace('/api', '') + art.image)}" alt="${art.title}" style="width:100%; height:100%; object-fit:cover;">`
                                    : `<div style="width:100%; height:100%; background: linear-gradient(45deg, #111, #222); display:flex; align-items:center; justify-content:center;">
                                        <i class="fa-solid fa-newspaper" style="font-size: 3rem; color: #333;"></i>
                                       </div>`
                                }
                            </div>
                            <div class="article-content">
                                <div class="article-meta-top">
                                    <span class="article-date"><i class="fa-regular fa-calendar"></i> ${dateHtml}</span>
                                    <div class="article-tags-inline">
                                        ${art.tags ? art.tags.split(',').slice(0, 2).map(t => `<span class="tag-pill">${t.trim()}</span>`).join('') : ''}
                                    </div>
                                </div>
                                <h3 class="article-title">${art.title}</h3>
                                <p class="article-summary">${art.summary}</p>
                                
                                <div class="article-footer">
                                    <div class="interaction-bar">
                                         <div class="interaction-item no-pointer" title="Views">
                                            <i class="fa-solid fa-eye"></i> <span class="view-article-count-${art.id}">${clicks}</span>
                                         </div>
                                         <div class="interaction-item interaction-like like-article-btn-${art.id}" onclick="window.toggleLike('article', ${art.id}, this)">
                                            <i class="fa-regular fa-heart"></i> <span class="like-count like-article-count-${art.id}">${likes}</span>
                                         </div>
                                         <div class="interaction-item" onclick="window.openFeedbackModal('article', ${art.id})">
                                            <i class="fa-regular fa-comment"></i> <span class="comment-article-count-${art.id}">${comments}</span>
                                         </div>
                                    </div>
                                    <a href="${art.link}" class="read-more-btn" data-article-id="${art.id}" onclick="event.preventDefault(); window.openArticleModalById('${art.id}')">
                                        ${translations[currentLang]?.["articles.readMore"] || "Read Article"}
                                    </a>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `).join('');

            track.innerHTML = slidesHtml;
            if (window.applyTranslations) window.applyTranslations();

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
        }; // End of render

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
                    ${group.map(r => {
                        // Safe List: Platforms where unavatar.io works reliably without auth walls
                        const safeAvatarPlatforms = ['github', 'twitter', 'x', 'gitlab', 'dribbble', 'behance', 'email'];
                        let safePlatformStr = (r.social_platform || '').toLowerCase();
                        const isSafePlatform = safeAvatarPlatforms.includes(safePlatformStr);
                        
                        // Avatar URL Logic
                        let avatarUrl = '';
                        let onerrorAttr = '';
                        
                        if (r.social_link && isSafePlatform) {
                            // Try fetching real photo for safe platforms
                            avatarUrl = `https://unavatar.io/${encodeURIComponent(r.social_link)}?fallback=false`;
                            onerrorAttr = `onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=random&color=fff'"`;
                        } else {
                            // Force Initials for LinkedIn, Instagram, etc. to avoid platform logos
                            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=random&color=fff`;
                        }

                        // Link Rendering: Show link for all (Email uses mailto)
                        const showLink = !!r.social_link;
                        let href = r.social_link;
                        if (safePlatformStr === 'email' && !href.startsWith('mailto:')) {
                            href = `mailto:${href}`;
                        }

                        // TRUNCATION LOGIC
                        const MAX_LENGTH = 20;
                        const isLong = r.message.length > MAX_LENGTH;
                        const displayMessage = isLong ? r.message.substring(0, MAX_LENGTH) + '...' : r.message;
                        const lang = localStorage.getItem('lang') || 'fr';
                        const t = translations[lang] || translations['fr'];
                        const viewMoreText = t["review.view_more"] || "Voir plus";


                        return `
                        <div class="testimonial-card">
                            <div class="testimonial-header">
                                <!-- Avatar Injection -->
                                ${r.social_link || r.name ? 
                                    `<img src="${avatarUrl}" 
                                          class="testimonial-avatar" 
                                          alt="${r.name}"
                                          loading="lazy"
                                          ${onerrorAttr}
                                    />` 
                                : ''}
                                
                                <div class="testimonial-info">
                                    <h4 class="testimonial-name">
                                        ${r.name} 
                                        ${showLink ? `<a href="${href}" target="_blank" style="color:var(--accent-color); margin-left:5px;">
                                            ${getSocialIcon(r.social_platform)}
                                        </a>` : ''}
                                    </h4>
                                    <span class="testimonial-role">${r.role || ''}</span>
                                </div>
                                <div class="testimonial-rating">
                                    ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}
                                </div>
                            </div>
                            <p class="testimonial-text">
                                "${displayMessage}"
                                ${isLong ? `<button class="read-more-review" onclick="openReviewDetails('${r.id}')">${viewMoreText}</button>` : ''}
                            </p>
                        </div>
                    `}).join("")}
                </div>
            `).join("");

            window.reviewsData = reviews; // Store for modal access

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

    // Platform Change Logic (Email vs URL)
    const platformSelect = document.getElementById('review-platform');
    const linkInput = document.getElementById('review-link');
    
    if (platformSelect && linkInput) {
        platformSelect.addEventListener('change', () => {
            if (platformSelect.value === 'email') {
                linkInput.type = 'email';
                linkInput.placeholder = 'your@email.com (For Avatar)';
            } else {
                linkInput.type = 'url';
                linkInput.placeholder = 'Profile Link';
            }
        });
    }

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
        // Simple client-side sterilization helper
        const escapeHTML = (str) => {
            if (!str) return '';
            return str.replace(/[&<>"']/g, function(m) {
                switch (m) {
                    case '&': return '&amp;';
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '"': return '&quot;';
                    case "'": return '&#039;';
                    default: return m;
                }
            });
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText || "Submit Review"; // Restore variable with fallback
            
            // 1. Get raw values
            const rawName = document.getElementById("review-name").value.trim();
            const rawMessage = document.getElementById("review-message").value.trim();
            const rawRole = document.getElementById("review-role").value.trim();
            const rawLink = document.getElementById("review-link").value.trim();

            if (!rawName || !rawMessage) {
                const t = translations[currentLang] || translations['en'];
                showNotification(t["review.error.title"] || "Error", t["review.validation.error"] || "Please fill required fields", 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerText = "Sending...";

            // 2. Sterilize/Sanitize inputs before sending for extra safety
            const data = {
                name: escapeHTML(rawName),
                role: escapeHTML(rawRole),
                rating: document.getElementById("review-rating").value,
                social_link: escapeHTML(rawLink),
                social_platform: document.getElementById("review-platform").value,
                message: escapeHTML(rawMessage)
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
// REVIEW DETAILS MODAL LOGIC
// =========================================
window.openReviewDetails = function(id) {
    const review = window.reviewsData.find(r => r.id == id);
    if (!review) return;

    const modal = document.getElementById('review-details-modal');
    const header = document.getElementById('review-details-header');
    const text = document.getElementById('review-details-text');

    // Reconstruct Avatar
    const safeAvatarPlatforms = ['github', 'twitter', 'x', 'gitlab', 'dribbble', 'behance', 'email'];
    const safePlatformStr = (review.social_platform || '').toLowerCase();
    const isSafePlatform = safeAvatarPlatforms.includes(safePlatformStr);
    
    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&background=random&color=fff`;
    let onerrorAttr = '';

    if (review.social_link && isSafePlatform) {
        avatarUrl = `https://unavatar.io/${encodeURIComponent(review.social_link)}?fallback=false`;
        onerrorAttr = `onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&background=random&color=fff'"`;
    }

    header.innerHTML = `
        <img src="${avatarUrl}" ${onerrorAttr} alt="${review.name}">
        <div class="review-details-info">
            <h3>${review.name}</h3>
            <span>${review.role || ''}</span>
            <div class="review-details-rating">
                ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
            </div>
        </div>
    `;

    text.innerHTML = review.message.replace(/\n/g, '<br>'); // Preserve line breaks

    modal.style.display = 'flex';
};

window.closeReviewDetailsModal = function() {
    const modal = document.getElementById('review-details-modal');
    if (modal) modal.style.display = 'none';
};

// Close on outside click
window.addEventListener('click', (e) => {
    const modal = document.getElementById('review-details-modal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});


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
    // 1. Mobile Container Logic
    let mobileContainer = document.querySelector('.mobile-shape-container');
    
    // Always remove and recreate to ensure fresh event listeners
    if (mobileContainer) {
        mobileContainer.remove();
    }

    // Insert before hero-title
    const heroContent = document.querySelector('.hero-content');
    const heroTitle = document.querySelector('.hero-title');
    
    if (!heroContent || !heroTitle) return; // Ensure elements exist

    mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-shape-container';
    heroContent.insertBefore(mobileContainer, heroTitle);

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
    
    // Attach Interaction to this new mobile container
    setTimeout(() => attachCubeInteraction(mobileContainer), 0);
}

// =========================================
// PROJECT MODAL LOGIC (Global Scope)
// =========================================
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

    // IMAGE / MEDIA HANDLING
    // We target the container directly because the inner IMG might be destroyed/swapped for VIDEO
    const mediaContainer = modal.querySelector('.project-modal-image-container');
    if (!mediaContainer) return;

    // Reset Container
    mediaContainer.innerHTML = '';
    mediaContainer.style.display = 'flex';

    if (project.image && project.image.startsWith('/uploads/')) {
        const imageUrl = `${API_URL.replace('/api', '')}${project.image}`;
        const isVideo = project.image.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);

        if (isVideo) {
            const video = document.createElement('video');
            video.src = imageUrl;
            video.controls = true;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.style.width = '100%';
            video.style.maxHeight = '500px';
            video.style.borderRadius = '8px';
            mediaContainer.appendChild(video);
        } else {
             const img = document.createElement('img');
             img.src = imageUrl;
             img.id = 'project-modal-img'; // Re-create ID for consistency
             mediaContainer.appendChild(img);
        }
    } else if (project.image && !project.image.startsWith('bento-')) {
         const img = document.createElement('img');
         img.src = project.image;
         img.id = 'project-modal-img';
         mediaContainer.appendChild(img);
    } else {
        // Fallback or specific class handling
        // We can just leave it empty or show a placeholder
        mediaContainer.style.display = 'none'; // Hide container if no media
    }
    
    if (mediaContainer.children.length > 0) {
        mediaContainer.style.display = 'flex'; // Restore display
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

    // GitHub Link & Interactions
    const footer = modal.querySelector('.project-modal-footer');
    if (footer) {
        footer.style.display = 'flex';
        footer.style.flexDirection = 'column';
        footer.style.gap = '1rem';
        footer.style.alignItems = 'stretch';
        
        const likes = project.likes_count || 0;
        const comments = project.comments_count || 0;
        const clicks = project.clicks || 0;

        footer.innerHTML = `
            <div class="interaction-bar" style="margin: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; width: 100%;">
                 <div class="interaction-item no-pointer" title="Views" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--accent-color); color: var(--accent-color);">
                    <i class="fa-solid fa-eye"></i> <span class="view-project-count-${project.id}">${clicks}</span>
                 </div>
                 <div class="interaction-item interaction-like like-project-btn-${project.id}" onclick="window.toggleLike('project', ${project.id}, this)" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--accent-color); color: var(--accent-color); cursor: pointer; transition: all 0.3s ease;">
                    <i class="fa-regular fa-heart"></i> <span class="like-count like-project-count-${project.id}">${likes}</span>
                 </div>
                 <div class="interaction-item" onclick="window.openFeedbackModal('project', ${project.id})" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--accent-color); color: var(--accent-color); cursor: pointer; transition: all 0.3s ease;">
                    <i class="fa-regular fa-comment"></i> <span class="comment-project-count-${project.id}">${comments}</span>
                 </div>
            </div>
            <a id="project-modal-link" href="${project.link || '#'}" target="_blank" class="btn-github-modal" style="${!project.link ? 'display:none' : 'display:flex; justify-content: center; width: 100%; box-sizing: border-box;'}">
              <i class="fa-brands fa-github"></i> <span data-i18n="project.view_code">View Code</span>
            </a>
        `;
    }


    // Translation update for labels (Role, Subject, Techs, Tasks)
    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }

    // Reset and Load Notion Content if available
    const notionSection = document.getElementById('project-notion-section');
    const notionLoading = document.getElementById('project-notion-loading');
    const notionContent = document.getElementById('project-notion-content');
    const notionError = document.getElementById('project-notion-error');
    
    if (notionSection) {
        notionSection.style.display = 'none';
        if (notionLoading) notionLoading.style.display = 'none';
        if (notionContent) {
            notionContent.style.display = 'none';
            notionContent.innerHTML = '';
        }
        if (notionError) notionError.style.display = 'none';
    }

    // Show Modal
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    document.body.style.overflow = 'hidden';

    // Fetch Notion content asynchronously (don't block modal opening)
    if (project.id && notionSection) {
        fetch(`/api/projects/${project.id}/notion-content`)
            .then(response => response.json())
            .then(data => {
                if (data.content && data.content.trim()) {
                    notionSection.style.display = 'block';
                    notionLoading.style.display = 'flex';
                    
                    setTimeout(() => {
                        if (notionContent) {
                            notionContent.innerHTML = data.content;
                            notionLoading.style.display = 'none';
                            notionContent.style.display = 'block';
                        }
                    }, 300);
                }
            })
            .catch(error => {
                console.error('Error fetching Notion content:', error);
                // Silently fail - don't show error to user
            });
    }

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
    
    // SAFETY: Expose close function globally for existing HTML onclick references
    window.closeProjectModal = closeFn;
}
window.openProjectModal = openProjectModal; 

// =========================================
// VIDEO MODAL LOGIC
// =========================================
function openVideoModal(videoSrc) {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('modal-video-player');
    if (!modal || !video) return;

    // Pause any currently playing video before setting new source
    if (video) video.pause();

    video.src = videoSrc;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
    
    // Play video
    try {
        video.play();
    } catch(e) { console.error("Auto-play failed", e); }

    document.body.style.overflow = 'hidden';

    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) closeVideoModal();
    };
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('modal-video-player');
    if (!modal) return;

    if (video) {
        video.pause();
        video.src = "";
    }

    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;

// =========================================
// HERO CUBE INTERACTION (Drag + Auto-Rotate)
// =========================================
function attachCubeInteraction(container) {
    if (!container) return;
    const cube = container.querySelector('.data-cube') || container.querySelector('.cube') || container.querySelector('.sphere') || container.querySelector('.pyramid');
    if (!cube) return;

    // Check if already attached (prevent duplicates)
    if (container.dataset.interactionAttached) return;
    container.dataset.interactionAttached = 'true';

    // Independent state for each cube
    let isDragging = false;
    let startX, startY;
    let currentX = -30;
    let currentY = -30;
    
    let autoRotateSpeedX = 0.5;
    let autoRotateSpeedY = 0.5;
    let animationFrameId;

    // 1. Disable CSS Animation
    cube.style.animation = 'none';

    // 2. Animation Loop
    const animate = () => {
        if (!isDragging) {
            currentX += autoRotateSpeedX;
            currentY += autoRotateSpeedY;
            cube.style.transform = `rotateY(${currentX}deg) rotateX(${currentY}deg)`;
        }
        animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Mouse Events
    container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        cube.style.cursor = 'grabbing';
        cube.style.transition = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        currentX += deltaX * 0.5;
        currentY -= deltaY * 0.5;

        cube.style.transform = `rotateY(${currentX}deg) rotateX(${currentY}deg)`;

        startX = e.clientX;
        startY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        cube.style.cursor = 'grab';
    });

    // Touch Events (Mobile)
    container.addEventListener('touchstart', (e) => {
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        cube.style.transition = 'none';
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        
        currentX += deltaX * 0.5;
        currentY -= deltaY * 0.5;
        
        cube.style.transform = `rotateY(${currentX}deg) rotateX(${currentY}deg)`;
        
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: false });

    window.addEventListener('touchend', () => {
         if (isDragging) isDragging = false;
    });
}

function initHeroCubeInteraction() {
    // Desktop
    attachCubeInteraction(document.querySelector('.hero-visual'));
    
    // Mobile (if already exists)
    attachCubeInteraction(document.querySelector('.mobile-shape-container'));
}

// Initialize


// =========================================
// INTERACTION FUNCTIONS (Likes & Comments)
// =========================================

function getOrCreateClientId() {
    let clientId = localStorage.getItem('portfolio_client_id');
    if (!clientId) {
        clientId = crypto.randomUUID();
        localStorage.setItem('portfolio_client_id', clientId);
    }
    return clientId;
}

window.toggleLike = async (type, id, element) => {
    // Prevent bubbling if inside a clickable card
    if (event) event.stopPropagation();

    // Visual feedback immediately
    const countEl = element.querySelector('.like-count'); // Use class for specificity
    const icon = element.querySelector('i');
    const OriginalCount = parseInt(countEl.innerText);
    
    // Toggle class optimistically
    // Assuming we don't know state, but usually we just animate
    // Ideally we track 'liked' state in DOM data attribute
    
    try {
        const clientId = getOrCreateClientId();
        const res = await fetch(`${API_URL}/interact/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id, client_id: clientId })
        });
        const data = await res.json();
        
        if (data.liked) {
            // Update ALL instances
            const selector = type === 'project' ? `.like-project-btn-${id}` : `.like-article-btn-${id}`;
            const icons = document.querySelectorAll(`${selector} i`); 
            const btns = document.querySelectorAll(selector);

            if (btns.length > 0) {
                btns.forEach(btn => btn.classList.add('active'));
                icons.forEach(ic => {
                    ic.classList.remove('fa-regular');
                    ic.classList.add('fa-solid');
                });
            } else {
                // Fallback for non-class-based elements
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
                element.classList.add('active');
            }
        } else {
            const selector = type === 'project' ? `.like-project-btn-${id}` : `.like-article-btn-${id}`;
            const icons = document.querySelectorAll(`${selector} i`);
            const btns = document.querySelectorAll(selector);

            if (btns.length > 0) {
                btns.forEach(btn => btn.classList.remove('active'));
                icons.forEach(ic => {
                    ic.classList.remove('fa-solid');
                    ic.classList.add('fa-regular');
                });
            } else {
                // Fallback
                icon.classList.remove('fa-solid');
                icon.classList.add('fa-regular');
                element.classList.remove('active');
            }
        }
        
        // Update Counts Everywhere
        window.updateGlobalCounters(id, 'likes', data.count, type);

    } catch (e) {
        console.error("Like failed", e);
    }
};

// Function to load and display comments
window.loadComments = (type, id) => {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    commentsList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Loading comments...</p>';
    
    fetch(`${API_URL}/comments?type=${type}&id=${id}&t=${Date.now()}`)
        .then(res => res.json())
        .then(comments => {
            // Update Global Counters
            window.updateGlobalCounters(id, 'comments', comments.length, type);

            if (!comments || comments.length === 0) {
                const t = translations[currentLang];
                commentsList.innerHTML = `<p style="color:var(--text-muted); text-align:center;" data-i18n="comments.empty">${t['comments.empty']}</p>`;
            } else {
                commentsList.innerHTML = comments.map(c => `
                    <div class="comment-item">
                        <div class="comment-header">
                            <span class="comment-name">${c.name || 'Anonymous'}</span>
                            <span class="comment-date">${new Date(c.date).toLocaleDateString()}</span>
                        </div>
                        <p class="comment-body">${c.message}</p>
                        ${c.social_link ? `<a href="${c.social_link}" target="_blank" class="comment-link"><i class="fa-solid fa-link"></i> ${c.social_platform || 'Link'}</a>` : ''}
                    </div>
                `).join('');
            }
        })
        .catch(err => {
            console.error("Failed to load comments", err);
            commentsList.innerHTML = '<p style="color:#ff4757; text-align:center;">Failed to load comments.</p>';
        });
};

window.openFeedbackModal = (type, id) => {
    if (event) event.stopPropagation();
    const modal = document.getElementById('feedback-modal');
    document.getElementById('feedback-type').value = type;
    document.getElementById('feedback-id').value = id;
    modal.style.zIndex = '100000';
    modal.style.display = 'flex';
    
    // Load comments using the new function
    window.loadComments(type, id);
};


window.closeFeedbackModal = () => {
    document.getElementById('feedback-modal').style.display = 'none';
    // Reset form state when closing
    const form = document.getElementById('feedback-form');
    const icon = document.getElementById('feedback-toggle-icon');
    if (form) {
        form.style.maxHeight = '0';
        form.style.opacity = '0';
    }
    if (icon) {
        icon.style.transform = 'rotate(0deg)';
    }
};

// Toggle Feedback Form visibility - IMPROVED VERSION
window.toggleFeedbackForm = function() {
    console.log('Toggle feedback form called'); // Debug log
    
    // Try multiple ways to find the elements
    let form = document.getElementById('feedback-form');
    let icon = document.getElementById('feedback-toggle-icon');
    
    console.log('Form element:', form);
    console.log('Icon element:', icon);
    
    // If not found, try querySelector
    if (!form) {
        form = document.querySelector('#feedback-form');
        console.log('Form found via querySelector:', form);
    }
    
    if (!icon) {
        icon = document.querySelector('#feedback-toggle-icon');
        console.log('Icon found via querySelector:', icon);
    }
    
    if (!form || !icon) {
        console.error('Form or icon not found');
        console.log('Available forms:', document.querySelectorAll('form'));
        console.log('Modal visible:', document.getElementById('feedback-modal')?.style.display);
        return;
    }
    
    // Check current state by checking computed max-height
    const currentMaxHeight = window.getComputedStyle(form).maxHeight;
    const isCollapsed = currentMaxHeight === '0px';
    
    console.log('Current max-height:', currentMaxHeight);
    console.log('Current state:', isCollapsed ? 'collapsed' : 'expanded');
    
    if (isCollapsed) {
        // Expand
        form.style.maxHeight = '1000px';
        form.style.opacity = '1';
        icon.style.transform = 'rotate(180deg)';
        console.log('Expanding form');
    } else {
        // Collapse
        form.style.maxHeight = '0';
        form.style.opacity = '0';
        icon.style.transform = 'rotate(0deg)';
        console.log('Collapsing form');
    }
};

// Add click event listener using delegation (works even if DOM not ready)
document.addEventListener('click', function(e) {
    // Check if clicked element is the toggle title or its children
    const toggleTitle = e.target.closest('#feedback-toggle-title');
    if (toggleTitle) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Title clicked via delegation!');
        window.toggleFeedbackForm();
    }
});


// Toast Notification Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle Feedback Form Submission
const feedbackForm = document.getElementById('feedback-form');
if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries()); // type, id, name, message
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/interact/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

            if (result.success || res.ok) {
                showToast(translations[currentLang]?.["feedback.success"] || "Thanks! Your feedback has been sent.", 'success');
                // Don't close modal - reload comments to show new one
                e.target.reset();
                
                // Collapse form after submission
                const form = document.getElementById('feedback-form');
                const icon = document.getElementById('feedback-toggle-icon');
                if (form) {
                    form.style.maxHeight = '0';
                    form.style.opacity = '0';
                }
                if (icon) {
                    icon.style.transform = 'rotate(0deg)';
                }
                
                // OPTIMISTIC UI: Inject new comment immediately
                const commentsList = document.getElementById('comments-list');
                if (commentsList) {
                    // Remove "empty" slogan/message if present
                    if (commentsList.children.length === 1 && commentsList.children[0].tagName === 'P') {
                        commentsList.innerHTML = '';
                    }
                    
                    const safeName = data.name ? data.name.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'Anonymous';
                    const safeMsg = data.message ? data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
                    
                    const newCommentHtml = `
                    <div class="comment-item" style="animation: highlight 1s ease-out;">
                        <div class="comment-header">
                            <span class="comment-name">${safeName}</span>
                            <span class="comment-date">${new Date().toLocaleDateString()}</span>
                        </div>
                        <p class="comment-body">${safeMsg}</p>
                    </div>
                    `;
                    commentsList.insertAdjacentHTML('afterbegin', newCommentHtml);
                }
                
                // Update comment counts everywhere
                const { type, id } = data;
                // Prefer server count if available, else increment local
                 let newCount = result.new_count;
                 if (newCount === undefined) {
                     const currentEl = document.querySelector(`.comment-${type}-count-${id}`);
                     newCount = (parseInt(currentEl?.innerText || '0')) + 1;
                 }
                window.updateGlobalCounters(id, 'comments', newCount, type);
            } else {
                showToast(translations[currentLang]?.["feedback.error"] || "Failed to submit feedback.", 'error');
            }
        } catch (err) {
            console.error(err);
            showToast(translations[currentLang]?.["feedback.error.submit"] || "Error submitting form.", 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Close modal on click outside
window.onclick = function(event) {
    const modal = document.getElementById('feedback-modal');
    if (event.target == modal) {
        window.closeFeedbackModal();
    }
};


// =========================================
// ANALYTICS TRACKING HELPER
// =========================================
window.trackEvent = async (type, id, element) => {
    // Determine Entity Type
    const entityType = type.includes('article') ? 'article' : 'project';
    
    // OPTIMISTIC UPDATE
    try {
        let currentVal = 0;
        if (entityType === 'project') {
             const p = allProjectsData.find(x => x.id == id);
             if(p) currentVal = p.clicks || 0;
        } else {
             if(window.articlesMap && window.articlesMap[id]) {
                 currentVal = window.articlesMap[id].clicks || 0;
             }
        }
        
        // Immediately show +1
        window.updateGlobalCounters(id, 'views', currentVal + 1, entityType);
        
    } catch(e) { console.warn("Optimistic update failed", e); }

    try {
        const res = await fetch(`${API_URL}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id })
        });
        const data = await res.json();
        console.log('Track response:', data);

        // Update view counters everywhere in real-time (Server Truth)
        if (data.success && data.views_count !== undefined) {
             window.updateGlobalCounters(id, 'views', data.views_count, entityType);
        }
    } catch (err) {
        console.error('Track event failed:', err); }
};

// Track Visit on Load
window.addEventListener('load', () => {
    // Wait slightly to ensure currentLang is initialized if needed, though it's sync.
    const lang = localStorage.getItem('lang') || (navigator.language.startsWith('en') ? 'en' : 'fr');
    fetch('/api/track/visit', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: lang })
    }).catch(err => console.error('Visit tracking failed', err));
});

// =========================================
// ARTICLE MODAL (Notion Content)
// =========================================
window.openArticleModal = async function(notionLink, articleId, title, date, article = {}) {
    const modal = document.getElementById('article-modal');
    const loadingDiv = document.getElementById('article-loading');
    const contentDiv = document.getElementById('article-content');
    const errorDiv = document.getElementById('article-error');
    const titleEl = document.getElementById('article-modal-title');
    const dateEl = document.getElementById('article-modal-date');
    const linkEl = document.getElementById('article-original-link');
    
    // Analytics elements
    const viewsCountEl = document.getElementById('article-views-count');
    const likesCountEl = document.getElementById('article-likes-count');
    const commentsCountEl = document.getElementById('article-comments-count');
    const updatedEl = document.getElementById('article-modal-updated');
    const updatedDateEl = document.getElementById('article-updated-date');
    
    if (!modal) return;
    
    // Set title and date
    if (titleEl) titleEl.textContent = title;
    if (dateEl) dateEl.textContent = date;
    if (linkEl) linkEl.href = notionLink;
    
    // Set analytics data (initial values)
    if (viewsCountEl) viewsCountEl.textContent = article.views_count || article.clicks || 0;
    if (likesCountEl) likesCountEl.textContent = article.likes_count || 0;
    if (commentsCountEl) commentsCountEl.textContent = article.comments_count || 0;
    
    // Show updated date if available
    if (article.updated_date && updatedEl && updatedDateEl) {
        updatedDateEl.textContent = article.updated_date;
        updatedEl.style.display = 'inline';
    } else if (updatedEl) {
        updatedEl.style.display = 'none';
    }
    
    // Store article ID for interaction handlers and add SYNC classes
    const modalLikes = document.getElementById('article-likes');
    const modalComments = document.getElementById('article-comments');
    const modalViews = document.getElementById('article-views');
    
    // Clear old classes cleaning (optional but good)
    if (modalViews) {
        modalViews.dataset.articleId = articleId;
        viewsCountEl.className = `view-article-count-${articleId}`;
    }
    if (modalLikes) {
        modalLikes.dataset.articleId = articleId;
        likesCountEl.className = `like-count like-article-count-${articleId}`;
    }
    if (modalComments) {
        modalComments.dataset.articleId = articleId;
        commentsCountEl.className = `comment-article-count-${articleId}`;
    }
    
    // Show modal with loading state
    modal.style.display = 'flex';
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    // Track view and update counter in real-time
    window.trackEvent('view_article', articleId, null);
    
    try {
        // Fetch article content from Notion API
        const response = await fetch(`${API_URL}/articles/${articleId}/content?lang=${currentLang}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Inject HTML content
        const t = translations[currentLang];
        contentDiv.innerHTML = data.content || `<p style="color: var(--text-muted);" data-i18n="article.no_content">${t['article.no_content']}</p>`;
        
        // Hide loading, show content
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        
    } catch (err) {
        console.error('Failed to load article content:', err);
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
    }
};

window.closeArticleModal = function() {
    const modal = document.getElementById('article-modal');
    if (modal) modal.style.display = 'none';
};

// Helper function to open modal by article ID
window.openArticleModalById = function(articleId) {
    const article = window.articlesMap[articleId];
    if (!article) {
        console.error('Article not found:', articleId);
        return;
    }
    
    // Format date using the same logic as in loadArticles
    const dateStr = article.date ? new Date(article.date).toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    window.openArticleModal(article.link, articleId, article.title, dateStr, article);
    
    // Store article ID in modal for interaction handlers
    const modalLikes = document.getElementById('article-likes');
    const modalComments = document.getElementById('article-comments');
    if (modalLikes) modalLikes.dataset.articleId = articleId;
    if (modalComments) modalComments.dataset.articleId = articleId;
};

// =========================================
// MODAL INTERACTION HELPERS
// =========================================
window.toggleLikeInModal = function(event) {
    event.stopPropagation();
    const modalLikes = document.getElementById('article-likes');
    const articleId = modalLikes ? modalLikes.dataset.articleId : null;
    
    if (!articleId) {
        console.error('No article ID found in modal');
        return;
    }
    
    window.toggleLike('article', articleId, modalLikes);
};

window.openFeedbackFromModal = function(event) {
    event.stopPropagation();
    const modalComments = document.getElementById('article-comments');
    const articleId = modalComments ? modalComments.dataset.articleId : null;
    
    if (!articleId) {
        console.error('No article ID found in modal');
        return;
    }
    
    window.openFeedbackModal('article', articleId);
};

// Initialize Hero Cube Interaction
initHeroCubeInteraction();

// =========================================
// SUBSCRIPTION POPUP LOGIC
// =========================================
window.initSubscriptionPopup = function() {
    // Check if already subscribed or dismissed recently (optional, here we check 'subscribed' flag)
    if (localStorage.getItem('portfolio_subscribed') === 'true') {
        return;
    }

    setTimeout(() => {
        const modal = document.getElementById('subscribe-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Simple animation
            modal.style.opacity = '0';
            requestAnimationFrame(() => {
                modal.style.transition = 'opacity 0.5s ease';
                modal.style.opacity = '1';
            });
        }
    }, 5000); // 5 seconds
};

window.openSubscribeModal = function() {
    const modal = document.getElementById('subscribe-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        requestAnimationFrame(() => {
            modal.style.transition = 'opacity 0.5s ease';
            modal.style.opacity = '1';
        });
    }
};

window.closeSubscribeModal = function() {
    const modal = document.getElementById('subscribe-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 500);
    }
};

window.handleSubscribe = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const name = document.getElementById('sub-name').value;
    const email = document.getElementById('sub-email').value;

    try {
        const res = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        
        const data = await res.json();

        if (res.status === 201) {
            // Created (New)
            const msg = data.message || (translations && translations[currentLang] && translations[currentLang]["subscribe.success"] 
                ? translations[currentLang]["subscribe.success"] 
                : "Welcome to the community! 🚀");
            
            showToast(msg, 'success');
            
            // Close modal
            closeSubscribeModal();
            // Store preference
            localStorage.setItem('portfolio_subscribed', 'true');
            // Reset form
            document.getElementById('subscribe-form').reset();
        } else if (res.status === 200) {
             // Reactivated (200) - Use specific message
            const msg = data.message || (translations && translations[currentLang] && translations[currentLang]["subscribe.reactivated"] 
                ? translations[currentLang]["subscribe.reactivated"] 
                : "Welcome back! Your subscription has been reactivated. 🚀");
            
            showToast(msg, 'success');
            
            closeSubscribeModal();
            localStorage.setItem('portfolio_subscribed', 'true');
            document.getElementById('subscribe-form').reset();
        } else if (res.status === 409) {
            // Already exists
            const msg = data.error || (translations && translations[currentLang] && translations[currentLang]["subscribe.exists"] 
                ? translations[currentLang]["subscribe.exists"] 
                : "You are already subscribed.");
            showToast(msg, 'info'); // Info style for duplicate
            
             // Close modal
            closeSubscribeModal();
        } else {
            const msg = (translations && translations[currentLang] && translations[currentLang]["error.generic"] 
                ? translations[currentLang]["error.generic"] 
                : "Something went wrong.");
            showToast(data.error || msg, 'error');
        }
    } catch (err) {
        console.error(err);
        const msg = (translations && translations[currentLang] && translations[currentLang]["error.server"] 
            ? translations[currentLang]["error.server"] 
            : "Server error. Please try again later.");
        showToast(msg, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// --- Unsubscribe Logic ---
window.openUnsubscribeModal = () => {
    closeSubscribeModal(); // Close the other one if open
    const modal = document.getElementById('unsubscribe-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Auto-focus email input if possible
        setTimeout(() => document.getElementById('unsub-email').focus(), 100);
    }
    // Update placeholders based on language
    updatePageLanguage();
};

window.closeUnsubscribeModal = () => {
    const modal = document.getElementById('unsubscribe-modal');
    if (modal) {
        modal.classList.add('fade-out'); // Optional animation class if you have it
        modal.style.display = 'none';
        modal.classList.remove('fade-out');
    }
}

window.handleUnsubscribe = async (e) => {
    e.preventDefault();
    const email = document.getElementById('unsub-email').value;
    
    if (!email) return;

    try {
        const res = await fetch(`${API_URL}/subscribe`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await res.json();

        if (res.ok) {
             const msg = translations && translations[currentLang] && translations[currentLang]["unsubscribe.success"] 
                ? translations[currentLang]["unsubscribe.success"] 
                : "Unsubscribed successfully.";
            showToast(msg, 'success');
            
            closeUnsubscribeModal();
            localStorage.removeItem('portfolio_subscribed');
            document.getElementById('unsubscribe-form').reset();
        } else {
             const msg = translations && translations[currentLang] && translations[currentLang]["unsubscribe.error"] 
                ? translations[currentLang]["unsubscribe.error"] 
                : "Error unsubscribing.";
            showToast(data.error || msg, 'error');
        }
    } catch (err) {
        console.error(err);
        const msg = (translations && translations[currentLang] && translations[currentLang]["error.server"] 
            ? translations[currentLang]["error.server"] 
            : "Server error.");
        showToast(msg, 'error');
    }
};

// Initialize Subscription Popup & Chatbot
window.addEventListener('load', () => {
    initSubscriptionPopup();
    initChatbot();
});
