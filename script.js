'use strict';

/* ════════════════════════════════════════════════════════════
   FIREBASE INIT  (Compat v10 — CORS-safe for local dev)
════════════════════════════════════════════════════════════ */
const firebaseConfig = {
    apiKey: "AIzaSyCpi3iELwp7A87xUHDM8YZ35ynTS-wi2sQ",
    authDomain: "modern-portfolio-2b161.firebaseapp.com",
    projectId: "modern-portfolio-2b161",
    storageBucket: "modern-portfolio-2b161.firebasestorage.app",
    messagingSenderId: "901473446983",
    appId: "1:901473446983:web:edbd764d29fb79ee295562",
    measurementId: "G-V4FMKLMGPQ"
};

let db = null;
let cmsBootstrapped = false;
let cmsRetryTimer = null;

function initFirebase() {
    try {
        if (typeof firebase === 'undefined') return false;
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        return true;
    } catch (err) {
        console.warn('Firebase init failed:', err);
        return false;
    }
}

/* ════════════════════════════════════════════════════════════
   CMS — LOAD ALL DATA IN PARALLEL
════════════════════════════════════════════════════════════ */
async function loadCMSData() {
    if (!db) return;

    try {
        /* Fire all 6 queries at once */
        const [sRes, svRes, edRes, skRes, tlRes, prRes] = await Promise.allSettled([
            db.collection('settings').doc('general').get(),
            db.collection('services').get(),
            db.collection('education').get(),
            db.collection('skills').get(),
            db.collection('tools').get(),
            db.collection('projects').orderBy('createdAt', 'desc').get(),
        ]);

        if (sRes.status  === 'fulfilled') applySettings(sRes.value);
        if (svRes.status === 'fulfilled') renderServices(svRes.value);
        if (edRes.status === 'fulfilled') renderEducation(edRes.value);
        if (skRes.status === 'fulfilled') renderSkills(skRes.value);
        if (tlRes.status === 'fulfilled') renderTools(tlRes.value);
        if (prRes.status === 'fulfilled') renderProjects(prRes.value);

        /* Re-observe new dynamic elements for scroll animations & skill bars */
        initScrollAnimations();
        initSkillBars();
        initCardTilt();

    } catch (err) {
        console.error('CMS loadCMSData:', err);
    }
}

function bootstrapCMS(retryCount = 0) {
    if (cmsBootstrapped) return;

    if (initFirebase()) {
        cmsBootstrapped = true;
        loadCMSData();
        return;
    }

    if (retryCount >= 20) {
        console.warn('CMS bootstrap skipped: Firebase SDK unavailable.');
        return;
    }

    clearTimeout(cmsRetryTimer);
    cmsRetryTimer = setTimeout(() => bootstrapCMS(retryCount + 1), 250);
}

/* ── Helpers ── */
function setText(id, val) {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setHref(id, href) {
    if (!href) return;
    const el = document.getElementById(id);
    if (el) el.href = sanitizeUrl(href, '#', { allowRelative: false });
}

function sortByOrder(docs) {
    return [...docs].sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeIconClass(value, fallback) {
    const raw = String(value || '').trim();
    return /^[a-z0-9 -]+$/i.test(raw) ? raw : fallback;
}

function sanitizeUrl(value, fallback = '', options = {}) {
    const {
        allowRelative = true,
        allowMailto = false,
        allowTel = false,
        allowHash = false,
    } = options;
    const raw = String(value || '').trim();

    if (!raw) return fallback;
    if (allowHash && raw.startsWith('#')) return raw;

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw);
    if (allowRelative && !hasScheme) return raw;

    try {
        const parsed = new URL(raw, window.location.origin);
        const allowed = ['http:', 'https:'];
        if (allowMailto) allowed.push('mailto:');
        if (allowTel) allowed.push('tel:');
        return allowed.includes(parsed.protocol) ? parsed.href : fallback;
    } catch {
        return fallback;
    }
}

/* ── Apply Settings (settings/general doc) ── */
function applySettings(doc) {
    if (!doc.exists) return;
    const d = doc.data();

    /* Hero */
    const heroTitleEl = document.getElementById('cms-hero-title');
    if (heroTitleEl && d.heroTitle) {
        const parts = d.heroTitle.trim().split(' ');
        const last  = parts.pop();
        heroTitleEl.innerHTML = (parts.length ? `${escapeHtml(parts.join(' '))} ` : '') +
                                `<span class="gradient-text">${escapeHtml(last)}</span>`;
    }
    setText('cms-hero-subtitle', d.heroSubtitle);
    setText('cms-hero-desc',     d.heroDescription);

    /* About */
    setText('cms-about-1',       d.aboutText1);
    setText('cms-about-2',       d.aboutText2);
    setText('cms-stat-years',    d.statsYears);
    setText('cms-stat-projects', d.statsProjects);

    /* Hiring */
    setText('cms-hiring-badge', d.hiringBadge);
    setText('cms-hiring-title', d.hiringTitle);
    setText('cms-hiring-desc',  d.hiringDescription);

    /* Contact */
    setText('cms-contact-email',    d.contactEmail);
    setText('cms-contact-location', d.contactLocation);

    /* Social links — hero + contact */
    ['cms-social-github',   'cms-contact-github']   .forEach(id => setHref(id, d.socialGithub));
    ['cms-social-linkedin', 'cms-contact-linkedin']  .forEach(id => setHref(id, d.socialLinkedin));
    ['cms-social-instagram','cms-contact-instagram'] .forEach(id => setHref(id, d.socialInstagram));

    /* CV links (data-cv-link attribute) */
    if (d.cvUrl) {
        const cvUrl = sanitizeUrl(d.cvUrl, '', { allowRelative: true });
        document.querySelectorAll('[data-cv-link]').forEach(el => { el.href = cvUrl; });
    }

    /* Page title */
    if (d.heroTitle) {
        document.title = `${d.heroTitle} | PORTFOLİO`;
    }
}

/* ── Render Services ── */
function renderServices(snap) {
    const grid = document.getElementById('cms-services-grid');
    if (!grid || snap.empty) return;

    grid.innerHTML = '';
    sortByOrder(snap.docs).forEach((doc, i) => {
        const d     = doc.data();
        const delay = i > 0 ? ` delay-${Math.min(i, 3)}` : '';
        const card  = document.createElement('div');
        const iconClass = sanitizeIconClass(d.icon, 'fas fa-code');
        card.className = `service-card glass-card animate-on-scroll${delay}`;
        card.innerHTML = `
            <div class="service-icon"><i class="${iconClass}"></i></div>
            <h3>${escapeHtml(d.title || '')}</h3>
            <p>${escapeHtml(d.description || '')}</p>`;
        grid.appendChild(card);
    });
}

/* ── Render Education ── */
function renderEducation(snap) {
    const grid = document.getElementById('cms-education-grid');
    if (!grid || snap.empty) return;

    grid.innerHTML = '';
    sortByOrder(snap.docs).forEach((doc, i) => {
        const d     = doc.data();
        const delay = i > 0 ? ` delay-${Math.min(i, 3)}` : '';
        const card  = document.createElement('div');
        const iconClass = sanitizeIconClass(d.icon, 'fas fa-graduation-cap');
        card.className = `edu-card glass-card animate-on-scroll${delay}`;
        card.innerHTML = `
            <div class="edu-icon"><i class="${iconClass}"></i></div>
            <div class="edu-content">
                <span class="edu-year">${escapeHtml(d.year || '')}</span><br>
                <h3>${escapeHtml(d.degree || '')}</h3>
                <h4>${escapeHtml(d.school || '')}</h4><br>
                <p>${escapeHtml(d.description || '')}</p>
            </div>`;
        grid.appendChild(card);
    });
}

/* ── Render Skills (progress bars) ── */
function renderSkills(snap) {
    const container = document.getElementById('cms-skills-items');
    if (!container || snap.empty) return;

    container.innerHTML = '';
    sortByOrder(snap.docs).forEach(doc => {
        const d    = doc.data();
        const item = document.createElement('div');
        const iconClass = sanitizeIconClass(d.icon, 'fas fa-code');
        item.className  = 'skill-item';
        item.dataset.level = d.level || 0;
        item.innerHTML = `
            <div class="skill-item-header">
                <i class="${iconClass}"></i>
                <span class="skill-item-name">${escapeHtml(d.name || '')}</span>
                <small class="skill-level">${escapeHtml(d.levelLabel || '')}</small>
            </div>
            <div class="skill-bar"><div class="skill-bar-fill"></div></div>`;
        container.appendChild(item);
    });
}

/* ── Render Tools (chips) ── */
function renderTools(snap) {
    const container = document.getElementById('cms-tools-chips');
    if (!container || snap.empty) return;

    container.innerHTML = '';
    sortByOrder(snap.docs).forEach(doc => {
        const d    = doc.data();
        const chip = document.createElement('span');
        const iconClass = sanitizeIconClass(d.icon, 'fas fa-tools');
        chip.className = 'skill-chip';
        chip.innerHTML = `<i class="${iconClass}"></i> ${escapeHtml(d.name || '')}`;
        container.appendChild(chip);
    });
}

/* ── Render Projects (cards) ── */
function getProjectStatusMeta(status) {
    if (status === 'coming-soon') {
        return {
            label: 'Yakında hizmetinizde',
            className: 'status-badge status-badge-coming-soon',
        };
    }

    return {
        label: 'Yayında',
        className: 'status-badge',
    };
}

function renderProjects(snap) {
    const grid = document.getElementById('cms-projects-grid');
    if (!grid || snap.empty) return;

    grid.innerHTML = '';
    snap.docs.forEach((doc, i) => {
        const d     = doc.data();
        const delay = i > 0 ? ` delay-${Math.min(i, 3)}` : '';
        const tags  = (d.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('');
        const statusMeta = getProjectStatusMeta(d.status);
        const imageUrl = sanitizeUrl(d.img, '', { allowRelative: true });
        const githubUrl = sanitizeUrl(d.github, '#', { allowRelative: false });
        const webUrl = sanitizeUrl(d.web, '#', { allowRelative: false });
        const card  = document.createElement('article');
        card.className = `project-card glass-card animate-on-scroll${delay}`;
        card.innerHTML = `
            <div class="project-image">
                <div class="status-badge"><i class="fas fa-circle"></i> Yayında</div>
                <img src="${imageUrl}" alt="${escapeHtml(d.title || '')}"
                     class="project-img" loading="lazy" decoding="async"
                     onerror="this.style.opacity='0'">
            </div>
            <div class="project-content">
                <h3>${escapeHtml(d.title || '')}</h3>
                <p>${escapeHtml(d.desc || '')}</p>
                <div class="project-tags">${tags}</div>
                <div class="project-links">
                    <a href="${githubUrl}" class="link-btn" target="_blank" rel="noopener">
                        <i class="fab fa-github"></i> Code
                    </a>
                    <a href="${webUrl}" class="link-btn link-btn-web" target="_blank" rel="noopener">
                        <i class="fas fa-external-link-alt"></i> Web
                    </a>
                </div>
            </div>`;
        const statusBadge = card.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = statusMeta.className;
            statusBadge.innerHTML = `<i class="fas fa-circle"></i> ${statusMeta.label}`;
        }
        grid.appendChild(card);
    });
}

/* ════════════════════════════════════════════════════════════
   1. MOBILE MENU
════════════════════════════════════════════════════════════ */
function initMobileMenu() {
    const hamburger  = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeBtn   = document.querySelector('.close-menu');
    const links      = document.querySelectorAll('.mobile-nav-link');

    if (!hamburger || !mobileMenu) return;

    const open  = () => { mobileMenu.classList.add('open');    document.body.style.overflow = 'hidden'; };
    const close = () => { mobileMenu.classList.remove('open'); document.body.style.overflow = '';       };

    hamburger.addEventListener('click', open,  { passive: true });
    closeBtn?.addEventListener('click', close, { passive: true });
    links.forEach(l => l.addEventListener('click', close, { passive: true }));
}

/* ════════════════════════════════════════════════════════════
   2. HEADER SCROLL STATE + ACTIVE NAV LINK + PROGRESS BAR
════════════════════════════════════════════════════════════ */
function initScrollBehaviors() {
    const header      = document.getElementById('header');
    const progressBar = document.getElementById('scroll-progress');
    const sections    = [...document.querySelectorAll('section[id]')];
    const navLinks    = document.querySelectorAll('.nav-link');

    let ticking = false;

    const run = () => {
        const y = window.scrollY;

        header?.classList.toggle('scrolled', y > 50);

        if (progressBar) {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            progressBar.style.transform = `scaleX(${total > 0 ? y / total : 0})`;
        }

        let current = '';
        sections.forEach(s => {
            if (y >= s.offsetTop - s.clientHeight / 3) current = s.id;
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });

        ticking = false;
    };

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(run);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    run();
}

/* ════════════════════════════════════════════════════════════
   3. SCROLL-TRIGGERED ANIMATIONS
      Safe to call multiple times — new observer per call,
      but unobserves after trigger so no double-fire.
════════════════════════════════════════════════════════════ */
function initScrollAnimations() {
    const heroIds  = new Set([...document.querySelectorAll('.hero *')]);
    const elements = [...document.querySelectorAll('.animate-on-scroll')]
        .filter(el => !heroIds.has(el) && !el.classList.contains('show'));

    if (!elements.length) return;

    let active = 0;
    const MAX  = 3;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting || active >= MAX) return;
            active++;
            const el = entry.target;
            el.classList.add('show', 'visible');
            el.addEventListener('transitionend', () => { active = Math.max(0, active - 1); }, { once: true });
            observer.unobserve(el);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
}

/* ════════════════════════════════════════════════════════════
   4. SKILL BAR FILL
      Safe to call multiple times — skips already-filled bars.
════════════════════════════════════════════════════════════ */
function initSkillBars() {
    const items = [...document.querySelectorAll('.skill-item[data-level]')]
        .filter(el => {
            const fill = el.querySelector('.skill-bar-fill');
            return fill && !fill.style.width; // skip already-set bars
        });

    if (!items.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const fill  = entry.target.querySelector('.skill-bar-fill');
            const level = entry.target.dataset.level;
            if (fill && level) {
                fill.style.width = `${level}%`;
                fill.style.setProperty('--skill-w', `${level}%`);
            }
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.4 });

    items.forEach(item => observer.observe(item));
}

/* ════════════════════════════════════════════════════════════
   5. CARD TILT (desktop hover only)
      Safe to call multiple times — skips cards that already
      have a mousemove listener via the _tilt flag.
════════════════════════════════════════════════════════════ */
function initCardTilt() {
    const mq = window.matchMedia('(hover: hover) and (min-width: 1024px)');
    if (!mq.matches) return;

    document.querySelectorAll('.project-card').forEach(card => {
        if (card._tilt) return; // already bound
        card._tilt = true;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const cx   = rect.width  / 2;
            const cy   = rect.height / 2;
            const dx   = (e.clientX - rect.left - cx) / cx;
            const dy   = (e.clientY - rect.top  - cy) / cy;
            card.style.transform =
                `perspective(900px) rotateX(${(-dy * 5).toFixed(2)}deg) rotateY(${(dx * 5).toFixed(2)}deg) translateY(-6px)`;
        }, { passive: true });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        }, { passive: true });
    });
}

/* ════════════════════════════════════════════════════════════
   6. CANVAS BACKGROUND (Interactive Particle Network)
════════════════════════════════════════════════════════════ */
function initCanvasBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h;
    let particles = [];
    const particleCount = window.innerWidth < 768 ? 40 : 80;
    let mouse = { x: null, y: null };

    function resize() {
        w = canvas.width  = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize',   resize,                                    { passive: true });
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('mouseout',  ()  => { mouse.x = null;      mouse.y = null;      }, { passive: true });

    class Particle {
        constructor() {
            this.x  = Math.random() * w;
            this.y  = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 1.5 + 0.5;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > w) this.vx = -this.vx;
            if (this.y < 0 || this.y > h) this.vy = -this.vy;
            if (mouse.x != null) {
                const dx   = mouse.x - this.x;
                const dy   = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) { this.x -= dx * 0.015; this.y -= dy * 0.015; }
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
            ctx.fill();
        }
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            for (let j = i + 1; j < particles.length; j++) {
                const dx   = particles[i].x - particles[j].x;
                const dy   = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 - dist / 800})`;
                    ctx.lineWidth   = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }

    init();
    animate();
}

/* ════════════════════════════════════════════════════════════
   7. CONTACT FORM  (real SMTP via /api/contact)
════════════════════════════════════════════════════════════ */
function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    let msgDiv = form.querySelector('.form-success-msg');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.className = 'form-success-msg';
        msgDiv.innerHTML = '<i class="fas fa-check-circle"></i> Mesajınız başarıyla gönderildi!';
        form.appendChild(msgDiv);
    }

    let errDiv = form.querySelector('.form-error-msg');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.className = 'form-error-msg';
        errDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span class="err-text">Bir hata oluştu.</span>';
        form.appendChild(errDiv);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn          = form.querySelector('.submit-btn');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
        btn.disabled  = true;
        msgDiv.classList.remove('show');
        errDiv.classList.remove('show');

        const payload = {
            name:    document.getElementById('name').value.trim(),
            email:   document.getElementById('email').value.trim(),
            message: document.getElementById('message').value.trim(),
        };

        try {
            const res  = await fetch('/api/contact', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            const json = await res.json();

            if (res.ok) {
                form.reset();
                msgDiv.classList.add('show');
                setTimeout(() => msgDiv.classList.remove('show'), 5000);
            } else {
                errDiv.querySelector('.err-text').textContent = json.error || 'Bir hata oluştu. Lütfen tekrar deneyin.';
                errDiv.classList.add('show');
                setTimeout(() => errDiv.classList.remove('show'), 6000);
            }
        } catch {
            errDiv.querySelector('.err-text').textContent = 'Bağlantı hatası. Lütfen tekrar deneyin.';
            errDiv.classList.add('show');
            setTimeout(() => errDiv.classList.remove('show'), 6000);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled  = false;
        }
    });
}

/* ════════════════════════════════════════════════════════════
   INITIALISE ALL MODULES
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initScrollBehaviors();
    initScrollAnimations();
    initSkillBars();
    initCardTilt();
    initCanvasBackground();
    initContactForm();

    /* Firebase CMS — load async, non-blocking */
    bootstrapCMS();
});

window.addEventListener('load', () => {
    bootstrapCMS();
});
