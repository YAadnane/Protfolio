import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const API_URL = 'http://localhost:3000/api';

// =========================================
// DYNAMIC CONTENT LOADING
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadGeneralInfo(),
        loadShapes(),
        loadProjects(),
        loadCertifications(),
        loadEducation(),
        loadExperience(),
        loadSkills()
    ]);
    
    // Initialize animations AFTER content is loaded
    initAnimations();
    initMobileMenu();
});

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navList = document.querySelector('.nav-list');

    if (hamburger && navList) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navList.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navList.classList.remove('active');
        }));
    }
}

async function loadGeneralInfo() {
    try {
        const res = await fetch(`${API_URL}/general`);
        const data = await res.json();
        
        if (!data) return;

        // Hero
        if (data.hero_subtitle) document.querySelector('.hero-subtitle').innerHTML = `<i class="fa-solid fa-terminal"></i> ${data.hero_subtitle}`;
        if (data.hero_title) document.querySelector('.hero-title').innerText = data.hero_title;
        if (data.hero_description) document.querySelector('.hero-description').innerHTML = data.hero_description;

        // About
        if (data.about_lead) document.querySelector('.about-text .lead').innerText = data.about_lead;
        if (data.about_bio) document.querySelector('.about-text p:nth-of-type(2)').innerText = data.about_bio;

        // Stats
        if (data.stat_years) document.querySelector('.stat-number[data-target="3"]').setAttribute('data-target', data.stat_years);
        if (data.stat_projects) document.querySelector('.stat-number[data-target="10"]').setAttribute('data-target', data.stat_projects);
        if (data.stat_companies) document.querySelector('.stat-number[data-target="3"]').setAttribute('data-target', data.stat_companies);



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

async function loadShapes() {
    try {
        const res = await fetch(`${API_URL}/shapes`);
        const shapes = (await res.json()).filter(s => !s.is_hidden);
        const container = document.querySelector('.hero-visual');
        if (!container) return;
        
        container.innerHTML = ''; // Clear existing

        shapes.forEach(shape => {
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
                        <div class="pyramid-face front">${shape.face_front || ''}</div>
                        <div class="pyramid-face back">${shape.face_back || ''}</div>
                        <div class="pyramid-face right">${shape.face_right || ''}</div>
                        <div class="pyramid-face left">${shape.face_left || ''}</div>
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
    } catch (err) { console.error("Failed to load shapes", err); }
}

async function loadProjects() {
    try {
        const res = await fetch(`${API_URL}/projects`);
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
                const isVideo = p.image.match(/\.(mp4|webm|ogg)$/i);

                if (isVideo) {
                    bgContent = `
                        <video class="bento-bg" autoplay loop muted playsinline style="object-fit: cover; width: 100%; height: 100%; opacity: 0.6;">
                            <source src="${imageUrl}" type="video/${isVideo[1]}">
                            Your browser does not support the video tag.
                        </video>
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1)); z-index: 1;"></div>
                    `;
                } else {
                    // It's an image
                    bgContent = `
                        <div class="bento-bg" style="background-image: url('${imageUrl}'); opacity: 0.6; width: 100%; height: 100%; background-size: cover; background-position: center;"></div>
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1)); z-index: 1;"></div>
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
                        <a href="${p.link}" class="btn-github" target="_blank" title="View Code">
                            <i class="fa-brands fa-github"></i> GitHub
                        </a>
                        ${p.image && p.image.match(/\.(mp4|webm|ogg)$/i) ? 
                            `<button class="btn-play" onclick="openVideoModal('${API_URL.replace('/api', '')}${p.image}')"><i class="fa-solid fa-play"></i> Demo</button>` 
                            : ''}
                    </div>
                </div>
                ${bgContent}
                ${sizeClass === 'large' ? '<div class="bento-overlay"></div>' : ''}
            `;

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
        const res = await fetch(`${API_URL}/certifications`);
        const certs = (await res.json()).filter(c => !c.is_hidden);
        const container = document.getElementById('cert-list');
        container.innerHTML = '';

        certs.forEach(c => {
            const item = document.createElement('div');
            item.className = 'cert-item';
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
                    <i class="${c.icon}"></i>
                    <div style="flex-grow: 1;">
                        <span style="display: block; font-weight: bold;">${c.name}</span>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                            ${c.issuer ? `<span style="color: var(--accent-color);">${c.issuer}</span>` : ''}
                            ${c.issuer && c.year ? ' • ' : ''}
                            ${c.year ? `<span>${c.year}</span>` : ''}
                        </div>
                        ${c.domain ? `<span style="display: block; font-size: 0.75rem; color: #666; margin-top: 0.1rem;">${c.domain}</span>` : ''}
                    </div>
                    ${c.pdf ? `
                        <a href="${API_URL.replace('/api', '')}${c.pdf}" target="_blank" class="btn-icon" title="View Certificate" style="color: var(--accent-color); font-size: 1.2rem; transition: transform 0.2s;">
                            <i class="fa-solid fa-eye"></i>
                        </a>
                    ` : ''}
                </div>
            `;
            container.appendChild(item);
        });

        // Populate Filters
        const domainSelect = document.getElementById('filter-domain');
        const issuerSelect = document.getElementById('filter-issuer');
        
        // Get unique values
        const domains = [...new Set(certs.map(c => c.domain).filter(Boolean))].sort();
        const issuers = [...new Set(certs.map(c => c.issuer).filter(Boolean))].sort();

        // Populate Domain Select
        if (domainSelect.options.length === 1) { // Only populate if empty (except default)
            domains.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                domainSelect.appendChild(opt);
            });
        }

        // Populate Issuer Select
        if (issuerSelect.options.length === 1) {
            issuers.forEach(i => {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                issuerSelect.appendChild(opt);
            });
        }

        // Filter Logic
        const filterCerts = () => {
            const selectedDomain = domainSelect.value;
            const selectedIssuer = issuerSelect.value;

            const items = container.querySelectorAll('.cert-item');
            items.forEach((item, index) => {
                const cert = certs[index];
                const matchDomain = !selectedDomain || cert.domain === selectedDomain;
                const matchIssuer = !selectedIssuer || cert.issuer === selectedIssuer;
                
                if (matchDomain && matchIssuer) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        };

        domainSelect.onchange = filterCerts;
        issuerSelect.onchange = filterCerts;

    } catch (err) { console.error("Failed to load certifications", err); }
}

async function loadEducation() {
    try {
        const res = await fetch(`${API_URL}/education`);
        const edu = (await res.json()).filter(e => !e.is_hidden);
        const container = document.getElementById('education-list');
        container.innerHTML = '<h3 class="column-title"><i class="fa-solid fa-graduation-cap"></i> Education</h3>';

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
        const res = await fetch(`${API_URL}/experience`);
        const exp = (await res.json()).filter(e => !e.is_hidden);
        const container = document.getElementById('experience-list');
        container.innerHTML = '<h3 class="column-title"><i class="fa-solid fa-briefcase"></i> Experience</h3>';

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
        const res = await fetch(`${API_URL}/skills`);
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
window.addEventListener("resize", resize);
resize();

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
    gsap.utils.toArray(".stat-number").forEach(stat => {
        const target = parseInt(stat.getAttribute("data-target"));
        gsap.to(stat, {
            scrollTrigger: {
                trigger: stat,
                start: "top 85%"
            },
            innerText: target,
            duration: 2,
            snap: { innerText: 1 },
            ease: "power2.out",
            onUpdate: function() {
                this.targets()[0].innerText = Math.ceil(this.targets()[0].innerText) + "+";
            }
        });
    });

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
