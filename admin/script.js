'use strict';

// ════════════════════════════════════════════════════════════
//  FIREBASE INIT  (Compat v10 — CORS-safe for local dev)
// ════════════════════════════════════════════════════════════
const firebaseConfig = {
    apiKey: "AIzaSyCpi3iELwp7A87xUHDM8YZ35ynTS-wi2sQ",
    authDomain: "modern-portfolio-2b161.firebaseapp.com",
    projectId: "modern-portfolio-2b161",
    storageBucket: "modern-portfolio-2b161.appspot.com", // Bazı projelerde .firebasestorage.app yerine bu geçerlidir
    messagingSenderId: "901473446983",
    appId: "1:901473446983:web:edbd764d29fb79ee295562",
    measurementId: "G-V4FMKLMGPQ"
};

firebase.initializeApp(firebaseConfig);
const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// Hata ayıklama için auth durumunu kontrol edelim
auth.onAuthStateChanged(user => {
    if (user) console.log("Firebase Auth: Giriş yapılmış -", user.email);
    else console.warn("Firebase Auth: Oturum açık değil!");
});

// ════════════════════════════════════════════════════════════
//  LOGIN & AUTH STATE
// ════════════════════════════════════════════════════════════
const loginScreen     = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm       = document.getElementById('login-form');
const logoutBtn       = document.getElementById('logout-btn');
let cmsInitialized = false;

// Dinamik Auth State Dinleyici (Google'ın önerdiği standart giriş doğrulama)
auth.onAuthStateChanged((user) => {
    if (user) {
        // Zaten giriş yapmış, doğrudan panele atla
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        initCMS(); // Verileri ve dinleyicileri başlat
    } else {
        // Çıkış yapmış (veya hiç giriş yapmamış), login ekranını göster
        loginScreen.classList.add('active');
        dashboardScreen.classList.remove('active');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const pass  = document.getElementById('admin-pass').value.trim();
    const errEl = document.getElementById('login-error');
    const btn   = document.getElementById('login-submit-btn');

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kontrol Ediliyor...';
    btn.disabled  = true;
    errEl.textContent = '';

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        // signIn başarılı olursa onAuthStateChanged tetiklenir ve dashboard'a geçer.
    } catch (err) {
        console.error("Giriş Hatası:", err);
        errEl.textContent = 'Giriş Başarısız. E-posta veya Şifre Hatalı.';
    } finally {
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Giriş Yap';
        btn.disabled  = false;
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        // signOut olunca otomatik onAuthStateChanged tetiklenir, login ekranına döner.
    } catch (err) {
        console.error("Çıkış Hatası:", err);
        showToast('Çıkış yapılamadı!', 'error');
    }
});

// ════════════════════════════════════════════════════════════
//  VARSAYILAN VERİLER — Site HTML'inde hard-coded olan içerik
//  İlk çalıştırmada Firebase'e otomatik aktarılır.
// ════════════════════════════════════════════════════════════
const DEFAULT_DATA = {
    services: [
        { icon: 'fas fa-code',        title: 'Web Geliştirme',    description: 'Performanslı, hızlı ve SEO dostu modern web uygulamaları geliştiriyorum. Temiz kod ile uzun ömürlü çözümler üretiyorum.',                                                          order: 1 },
        { icon: 'fas fa-paint-brush', title: 'UI/UX Tasarım',     description: 'Kullanıcı odaklı, estetik ve işlevsel arayüzler tasarlıyor, ziyaretçilerinize akılda kalıcı bir deneyim sunuyorum.',                                                                 order: 2 },
        { icon: 'fas fa-mobile-alt',  title: 'Responsive Tasarım', description: 'Tüm cihazlarda (mobil, tablet, masaüstü) kusursuz çalışan esnek düzenler oluşturuyorum.',                                                                                             order: 3 },
    ],
    education: [
        { icon: 'fas fa-graduation-cap', year: '2024 - 2026 ( Devam Ediyor )', degree: 'Web Tasarım ve Kodlama', school: 'Bandırma 17 Eylül Üniversitesi', description: 'Web Geliştirme üzerine çalışmalarına devam ediyor, Veri Yapıları ve Algoritmalar hakkında eğitim alıyor.', order: 1 },
        { icon: 'fas fa-school',         year: '2020 - 2024',                  degree: 'Anadolu Lisesi',         school: 'İvrindi Anadolu Lisesi',           description: 'Sayısal bölüm üzerine okudu.',                                                                          order: 2 },
    ],
    skills: [
        { icon: 'fab fa-wordpress', name: 'WordPress',  level: 80, levelLabel: 'İyi',   order: 1 },
        { icon: 'fab fa-html5',     name: 'HTML5',       level: 85, levelLabel: 'İyi',   order: 2 },
        { icon: 'fab fa-css3-alt',  name: 'CSS',         level: 82, levelLabel: 'İyi',   order: 3 },
        { icon: 'fab fa-js',        name: 'JavaScript',  level: 50, levelLabel: 'Temel', order: 4 },
        { icon: 'fab fa-php',       name: 'PHP',         level: 62, levelLabel: 'Orta',  order: 5 },
        { icon: 'fab fa-python',    name: 'Python',      level: 60, levelLabel: 'Orta',  order: 6 },
        { icon: 'fas fa-database',  name: 'SQL',         level: 65, levelLabel: 'Orta',  order: 7 },
        { icon: 'fab fa-node-js',   name: 'Node.js',     level: 42, levelLabel: 'Temel', order: 8 },
    ],
    tools: [
        { icon: 'fab fa-figma',       name: 'Figma',         order: 1 },
        { icon: 'fas fa-laptop-code', name: 'Visual Studio', order: 2 },
        { icon: 'fas fa-code',        name: 'VS Code',       order: 3 },
        { icon: 'fab fa-github',      name: 'Github',        order: 4 },
        { icon: 'fas fa-image',       name: 'Photoshop',     order: 5 },
    ],
    projects: [
        { title: 'Hava Durumu Sitesi', desc: 'Anlık olarak veri çeken türkiyenin 81 ilini kapsayan ve bazı dış devletlerin de hava durumunu gösteren bir web sitesi.',       img: 'img/havadurumu.png',     github: 'https://github.com/mustafayksl100/weather-app',   web: 'https://weather-app-three-chi-22.vercel.app/', tags: ['Html', 'Css', 'JavaScript']   },
        { title: 'CarbonTracker',      desc: 'Karbon ayak izinizi takip etmenizi sağlayan, çevre dostu alışkanlıklar edinmenize yardımcı olan modern bir web uygulaması.',   img: 'img/carbontracker.png',  github: 'https://github.com/mustafayksl100/carbontracker', web: 'https://eko-ayak-izi.vercel.app/',              tags: ['React', 'Vite', 'JavaScript']  },
        { title: 'WebBuilder',         desc: 'Sürükle-bırak özelliği ile kod yazmadan profesyonel web siteleri oluşturmanızı sağlayan güçlü bir web site inşa aracı.',       img: 'img/webbilder.png',      github: 'https://github.com/mustafayksl100/webbuilder',    web: 'https://webbuilderplus.vercel.app/',            tags: ['React', 'Node.js', 'MySQL']    },
    ],
};

// ════════════════════════════════════════════════════════════
//  OTO-SEED — İlk girişte boş koleksiyonları varsayılan veriyle doldurur.
//  Hangi koleksiyonların seed edildiği Firestore'da _meta/seeded'a kaydedilir,
//  böylece sonraki girişlerde tekrar çalışmaz.
// ════════════════════════════════════════════════════════════
async function autoSeedOnFirstRun() {
    try {
        const metaRef = db.collection('_meta').doc('seeded');
        const metaDoc = await metaRef.get();
        const seeded  = metaDoc.exists ? (metaDoc.data() || {}) : {};

        const collections = ['services', 'education', 'skills', 'tools', 'projects'];
        const toSeed = [];

        for (const col of collections) {
            if (seeded[col]) continue; // Bu koleksiyon daha önce seed edildi
            const snap = await db.collection(col).limit(1).get();
            if (snap.empty) toSeed.push(col);
        }

        if (toSeed.length === 0) return;

        showToast(`İlk kurulum: ${toSeed.length} bölüm yükleniyor...`);

        for (const col of toSeed) {
            await performSeed(col);
        }

        // Hangi koleksiyonların seed edildiğini işaretle
        const update = {};
        toSeed.forEach(col => { update[col] = true; });
        await metaRef.set(update, { merge: true });

        showToast('Mevcut site verileri panele aktarıldı!');
    } catch (err) {
        console.warn('autoSeedOnFirstRun:', err);
    }
}

async function performSeed(collection) {
    const data = DEFAULT_DATA[collection];
    if (!data) return;
    const batch = db.batch();
    data.forEach(item => {
        const ref = db.collection(collection).doc();
        batch.set(ref, { ...item, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
}

// ════════════════════════════════════════════════════════════
//  CMS INIT — çalıştır tüm modülleri
// ════════════════════════════════════════════════════════════
function initCMS() {
    if (cmsInitialized) {
        loadSettings();
        return;
    }

    cmsInitialized = true;
    initSidebar();
    initTabs();
    initSubTabs();
    initSkillRangeSlider();
    bindForms();

    // Önce oto-seed yap, sonra ilk sekmeyi yükle
    autoSeedOnFirstRun().then(() => loadSettings());
}

// ════════════════════════════════════════════════════════════
//  SIDEBAR (mobil toggle)
// ════════════════════════════════════════════════════════════
function initSidebar() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    const open  = () => { sidebar.classList.add('open');    overlay.classList.add('visible');    document.body.style.overflow = 'hidden'; };
    const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); document.body.style.overflow = '';      };

    toggle.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
    overlay.addEventListener('click', close);
}

// ════════════════════════════════════════════════════════════
//  TAB SWITCHING
// ════════════════════════════════════════════════════════════
const TAB_TITLES = {
    settings:  'Genel Ayarlar',
    projects:  'Projeler',
    education: 'Eğitim',
    skills:    'Yetenekler',
    services:  'Hizmetler',
};

const TAB_LOADERS = {
    settings:  loadSettings,
    projects:  loadProjects,
    education: loadEducation,
    skills:    () => { loadSkills(); loadTools(); },
    services:  loadServices,
};

function initTabs() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
            document.getElementById('page-title').textContent = TAB_TITLES[tab] || tab;

            // Mobilde sidebar'ı kapat
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-overlay').classList.remove('visible');
            document.body.style.overflow = '';

            TAB_LOADERS[tab]?.();
        });
    });
}

// ════════════════════════════════════════════════════════════
//  SUB-TABS (Yetenekler sekmesi içi)
// ════════════════════════════════════════════════════════════
function initSubTabs() {
    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.subtab;
            document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`sub-${target}`)?.classList.add('active');
        });
    });
}

// ════════════════════════════════════════════════════════════
//  SKILL RANGE SLIDER
// ════════════════════════════════════════════════════════════
function initSkillRangeSlider() {
    const range   = document.getElementById('sk-level');
    const display = document.getElementById('sk-level-display');
    range?.addEventListener('input', () => { display.textContent = range.value; });
}

// ════════════════════════════════════════════════════════════
//  FORM BINDINGS
// ════════════════════════════════════════════════════════════
function bindForms() {
    document.getElementById('settings-form')     .addEventListener('submit', saveSettings);
    document.getElementById('add-project-form')  .addEventListener('submit', addProject);
    document.getElementById('add-education-form').addEventListener('submit', addEducation);
    document.getElementById('add-skill-form')    .addEventListener('submit', addSkill);
    document.getElementById('add-tool-form')     .addEventListener('submit', addTool);
    document.getElementById('add-service-form')  .addEventListener('submit', addService);
    bindEditorControls();
    initImageUpload('p-img');
}

// ════════════════════════════════════════════════════════════
//  IMAGE UPLOAD MODULE
//  initImageUpload(fieldId) — fieldId: proje görsel URL input'unun id'si
//  Firebase Storage'a yükler, URL'yi ilgili input'a yazar.
// ════════════════════════════════════════════════════════════
function initImageUpload(fieldId) {
    const zone      = document.getElementById(`${fieldId}-zone`);
    const fileInput = document.getElementById(`${fieldId}-file`);
    const zoneBody  = document.getElementById(`${fieldId}-zone-body`);
    const progress  = document.getElementById(`${fieldId}-progress`);
    const bar       = document.getElementById(`${fieldId}-bar`);
    const pct       = document.getElementById(`${fieldId}-pct`);
    const preview   = document.getElementById(`${fieldId}-preview`);
    const clearBtn  = document.getElementById(`${fieldId}-clear`);
    const urlInput  = document.getElementById(fieldId);

    if (!zone) return;

    // Dosya seçme — zone'a tıklayınca
    zone.addEventListener('click', (e) => {
        if (e.target === clearBtn || clearBtn.contains(e.target)) return;
        if (preview.style.display !== 'none') return; // Önizleme varsa tıklama açmasın
        fileInput.click();
    });

    // Drag & drop
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) uploadImage(file);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) uploadImage(fileInput.files[0]);
    });

    // Temizle butonu
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUploadZone();
    });

    // URL input'a elle yazılınca önizlemeyi güncelle
    urlInput.addEventListener('input', () => {
        const val = urlInput.value.trim();
        if (val) {
            preview.src = val;
            preview.style.display = 'block';
            zoneBody.style.display = 'none';
            clearBtn.style.display = 'flex';
        } else {
            resetUploadZone();
        }
    });

    function resetUploadZone() {
        preview.style.display  = 'none';
        preview.src            = '';
        zoneBody.style.display = 'flex';
        clearBtn.style.display = 'none';
        progress.style.display = 'none';
        bar.style.width        = '0%';
        pct.textContent        = '0%';
        zone.classList.remove('has-image', 'uploading');
        fileInput.value        = '';
        urlInput.value         = '';
    }

    async function uploadImage(file) {
        // Boyut kontrolü — 5 MB
        if (file.size > 5 * 1024 * 1024) {
            showToast('Dosya 5 MB limitini aşıyor!', 'error');
            return;
        }

        // Uzantı kontrolü
        if (!file.type.startsWith('image/')) {
            showToast('Sadece görsel dosyaları yüklenebilir!', 'error');
            return;
        }

        // Yerel önizleme hemen göster
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src            = ev.target.result;
            preview.style.display  = 'block';
            zoneBody.style.display = 'none';
        };
        reader.readAsDataURL(file);

        // İlerleme çubuğunu göster
        progress.style.display = 'flex';
        zone.classList.add('uploading');

        const ext      = file.name.split('.').pop();
        const fileName = `projects/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const ref      = storage.ref(fileName);
        console.log('Yükleme başlatılıyor:', fileName);
        const task = ref.put(file);

        task.on('state_changed',
            (snap) => {
                const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                console.log('Yükleme ilerlemesi:', p + '%');
                bar.style.width  = `${p}%`;
                pct.textContent  = `${p}%`;
            },
            (err) => {
                console.error('FIREBASE UPLOAD ERROR:', err);
                // Kullanıcıya tam hata kodunu gösterelim (auth/unauthorized vb)
                showToast(`Yükleme Hatası: ${err.code} - ${getUploadErrorMessage(err)}`, 'error');
                progress.style.display = 'none';
                zone.classList.remove('uploading');
            },
            async () => {
                console.log('Yükleme tamamlandı, URL alınıyor...');
                const downloadURL = await ref.getDownloadURL();
                urlInput.value         = downloadURL;
                progress.style.display = 'none';
                clearBtn.style.display = 'flex';
                zone.classList.remove('uploading');
                zone.classList.add('has-image');
                showToast('Görsel başarıyla yüklendi!');
            }
        );
    }
}

// ════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ════════════════════════════════════════════════════════════
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon  = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════
function setBtn(btnId, html, disabled = false) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.innerHTML = html;
    btn.disabled  = disabled;
}

function sortByOrder(docs) {
    return docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
}

function getUploadErrorMessage(err) {
    const code = err?.code || '';

    if (code === 'storage/unauthorized') {
        return 'Görsel yüklenemedi: Firebase Storage kuralları bu kullanıcıya izin vermiyor.';
    }

    if (code === 'storage/canceled') {
        return 'Görsel yükleme işlemi iptal edildi.';
    }

    if (code === 'storage/invalid-default-bucket' || code === 'storage/bucket-not-found') {
        return 'Görsel yüklenemedi: Firebase Storage bucket ayarı eksik veya hatalı.';
    }

    if (code === 'storage/quota-exceeded') {
        return 'Görsel yüklenemedi: Storage kotası dolmuş veya plan yükseltmesi gerekiyor.';
    }

    return 'Görsel yüklenemedi. Firebase Storage yapılandırmasını kontrol edin.';
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
    const { allowRelative = true } = options;
    const raw = String(value || '').trim();
    if (!raw) return fallback;

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw);
    if (allowRelative && !hasScheme) return raw;

    try {
        const parsed = new URL(raw, window.location.origin);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
    } catch {
        return fallback;
    }
}

const editState = {
    projects: null,
    education: null,
    skills: null,
    tools: null,
    services: null,
};

function syncProjectUploadUi(url = '') {
    const preview = document.getElementById('p-img-preview');
    const zoneBody = document.getElementById('p-img-zone-body');
    const clearBtn = document.getElementById('p-img-clear');
    const progress = document.getElementById('p-img-progress');
    const zone = document.getElementById('p-img-zone');
    const bar = document.getElementById('p-img-bar');
    const pct = document.getElementById('p-img-pct');
    const cleanUrl = sanitizeUrl(url, '', { allowRelative: true });

    if (!preview || !zoneBody || !clearBtn || !progress || !zone) return;

    progress.style.display = 'none';
    zone.classList.remove('uploading');
    if (bar) bar.style.width = '0%';
    if (pct) pct.textContent = '0%';

    if (cleanUrl) {
        // Admin paneli /admin/ klasöründe, görseller /img/ klasöründe.
        // Eğer yerel bir yol girildiyse (img/ ile başlıyorsa), önizleme için başına ../ ekleyelim.
        let previewUrl = cleanUrl;
        if (cleanUrl.startsWith('img/') || cleanUrl.startsWith('./img/')) {
            previewUrl = '../' + (cleanUrl.startsWith('./') ? cleanUrl.substring(2) : cleanUrl);
        }

        preview.src            = previewUrl;
        preview.style.display  = 'block';
        zoneBody.style.display = 'none';
        clearBtn.style.display = 'flex';
        zone.classList.add('has-image');
        return;
    }

    preview.src = '';
    preview.style.display = 'none';
    zoneBody.style.display = 'flex';
    clearBtn.style.display = 'none';
    zone.classList.remove('has-image');
}

function resetProjectForm() {
    document.getElementById('add-project-form')?.reset();
    setValue('p-status', 'live');
    syncProjectUploadUi('');
}

function populateProjectForm(data) {
    setValue('p-title', data.title || '');
    setValue('p-desc', data.desc || '');
    setValue('p-img', data.img || '');
    setValue('p-code', data.github || '');
    setValue('p-web', data.web || '');
    setValue('p-tags', Array.isArray(data.tags) ? data.tags.join(', ') : '');
    setValue('p-status', data.status || 'live');
    syncProjectUploadUi(data.img || '');
}

function resetEducationForm() {
    document.getElementById('add-education-form')?.reset();
    setValue('e-icon', 'fas fa-graduation-cap');
    setValue('e-order', '1');
}

function populateEducationForm(data) {
    setValue('e-icon', data.icon || 'fas fa-graduation-cap');
    setValue('e-year', data.year || '');
    setValue('e-degree', data.degree || '');
    setValue('e-school', data.school || '');
    setValue('e-desc', data.description || '');
    setValue('e-order', String(data.order || 1));
}

function resetSkillForm() {
    document.getElementById('add-skill-form')?.reset();
    setValue('sk-level', '80');
    setValue('sk-order', '1');
    setValue('sk-levelLabel', 'İyi');
    document.getElementById('sk-level-display').textContent = '80';
}

function populateSkillForm(data) {
    setValue('sk-icon', data.icon || '');
    setValue('sk-name', data.name || '');
    setValue('sk-level', String(data.level || 0));
    setValue('sk-levelLabel', data.levelLabel || 'Temel');
    setValue('sk-order', String(data.order || 1));
    document.getElementById('sk-level-display').textContent = String(data.level || 0);
}

function resetToolForm() {
    document.getElementById('add-tool-form')?.reset();
    setValue('t-order', '1');
}

function populateToolForm(data) {
    setValue('t-icon', data.icon || '');
    setValue('t-name', data.name || '');
    setValue('t-order', String(data.order || 1));
}

function resetServiceForm() {
    document.getElementById('add-service-form')?.reset();
    setValue('sv-icon', 'fas fa-code');
    setValue('sv-order', '1');
}

function populateServiceForm(data) {
    setValue('sv-icon', data.icon || 'fas fa-code');
    setValue('sv-title', data.title || '');
    setValue('sv-desc', data.description || '');
    setValue('sv-order', String(data.order || 1));
}

const EDITOR_CONFIG = {
    projects: {
        formId: 'add-project-form',
        titleId: 'project-form-title',
        noteId: 'project-form-note',
        submitBtnId: 'submit-project-btn',
        cancelBtnId: 'cancel-project-edit-btn',
        addTitle: 'Yeni Proje Ekle',
        editTitle: 'Projeyi Duzenle',
        addNote: 'Yeni kayit ekleyin veya listeden duzenle secin.',
        editNote: 'Duzenleme modu aktif. Kaydi guncelleyebilir veya iptal edebilirsiniz.',
        addButtonHtml: '<i class="fas fa-cloud-upload-alt"></i> Projeyi Yayina Al',
        editButtonHtml: '<i class="fas fa-pen-to-square"></i> Projeyi Guncelle',
        reset: resetProjectForm,
        populate: populateProjectForm,
        getLabel: (data) => data.title || 'Proje',
    },
    education: {
        formId: 'add-education-form',
        titleId: 'education-form-title',
        noteId: 'education-form-note',
        submitBtnId: 'submit-edu-btn',
        cancelBtnId: 'cancel-education-edit-btn',
        addTitle: 'Yeni Eğitim Ekle',
        editTitle: 'Egitimi Duzenle',
        addNote: 'Yeni kayit ekleyin veya listeden duzenle secin.',
        editNote: 'Duzenleme modu aktif. Kaydi guncelleyebilir veya iptal edebilirsiniz.',
        addButtonHtml: '<i class="fas fa-plus"></i> Egitimi Ekle',
        editButtonHtml: '<i class="fas fa-pen-to-square"></i> Egitimi Guncelle',
        reset: resetEducationForm,
        populate: populateEducationForm,
        getLabel: (data) => data.degree || data.school || 'Egitim',
    },
    skills: {
        formId: 'add-skill-form',
        titleId: 'skill-form-title',
        noteId: 'skill-form-note',
        submitBtnId: 'submit-skill-btn',
        cancelBtnId: 'cancel-skill-edit-btn',
        addTitle: 'Yeni Yetenek Ekle',
        editTitle: 'Yetenegi Duzenle',
        addNote: 'Yeni kayit ekleyin veya listeden duzenle secin.',
        editNote: 'Duzenleme modu aktif. Kaydi guncelleyebilir veya iptal edebilirsiniz.',
        addButtonHtml: '<i class="fas fa-plus"></i> Yetenek Ekle',
        editButtonHtml: '<i class="fas fa-pen-to-square"></i> Yetenegi Guncelle',
        reset: resetSkillForm,
        populate: populateSkillForm,
        getLabel: (data) => data.name || 'Yetenek',
    },
    tools: {
        formId: 'add-tool-form',
        titleId: 'tool-form-title',
        noteId: 'tool-form-note',
        submitBtnId: 'submit-tool-btn',
        cancelBtnId: 'cancel-tool-edit-btn',
        addTitle: 'Yeni Arac Ekle',
        editTitle: 'Araci Duzenle',
        addNote: 'Yeni kayit ekleyin veya listeden duzenle secin.',
        editNote: 'Duzenleme modu aktif. Kaydi guncelleyebilir veya iptal edebilirsiniz.',
        addButtonHtml: '<i class="fas fa-plus"></i> Arac Ekle',
        editButtonHtml: '<i class="fas fa-pen-to-square"></i> Araci Guncelle',
        reset: resetToolForm,
        populate: populateToolForm,
        getLabel: (data) => data.name || 'Arac',
    },
    services: {
        formId: 'add-service-form',
        titleId: 'service-form-title',
        noteId: 'service-form-note',
        submitBtnId: 'submit-service-btn',
        cancelBtnId: 'cancel-service-edit-btn',
        addTitle: 'Yeni Hizmet Ekle',
        editTitle: 'Hizmeti Duzenle',
        addNote: 'Yeni kayit ekleyin veya listeden duzenle secin.',
        editNote: 'Duzenleme modu aktif. Kaydi guncelleyebilir veya iptal edebilirsiniz.',
        addButtonHtml: '<i class="fas fa-plus"></i> Hizmet Ekle',
        editButtonHtml: '<i class="fas fa-pen-to-square"></i> Hizmeti Guncelle',
        reset: resetServiceForm,
        populate: populateServiceForm,
        getLabel: (data) => data.title || 'Hizmet',
    },
};

const EDITOR_LOADERS = {
    projects: loadProjects,
    education: loadEducation,
    skills: loadSkills,
    tools: loadTools,
    services: loadServices,
};

function updateEditorUi(section) {
    const cfg = EDITOR_CONFIG[section];
    const form = document.getElementById(cfg.formId);
    const title = document.getElementById(cfg.titleId);
    const note = document.getElementById(cfg.noteId);
    const submitBtn = document.getElementById(cfg.submitBtnId);
    const cancelBtn = document.getElementById(cfg.cancelBtnId);
    const isEditing = form?.dataset.mode === 'edit';
    const icon = isEditing ? 'fa-pen-to-square' : 'fa-plus-circle';

    if (title) {
        title.innerHTML = `<i class="fas ${icon}"></i> ${isEditing ? cfg.editTitle : cfg.addTitle}`;
    }

    if (note) {
        note.textContent = isEditing ? cfg.editNote : cfg.addNote;
        note.classList.toggle('is-editing', isEditing);
    }

    if (submitBtn) {
        submitBtn.innerHTML = isEditing ? cfg.editButtonHtml : cfg.addButtonHtml;
    }

    if (cancelBtn) {
        cancelBtn.classList.toggle('is-hidden', !isEditing);
    }
}

function startEdit(section, id, data) {
    const cfg = EDITOR_CONFIG[section];
    const form = document.getElementById(cfg.formId);
    if (!form) return;

    editState[section] = id;
    form.dataset.mode = 'edit';
    form.dataset.editingId = id;
    form.dataset.editLabel = cfg.getLabel(data);
    cfg.populate(data);
    updateEditorUi(section);
    EDITOR_LOADERS[section]?.();
    form.closest('.form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit(section) {
    const cfg = EDITOR_CONFIG[section];
    const form = document.getElementById(cfg.formId);
    if (!form) return;

    editState[section] = null;
    delete form.dataset.mode;
    delete form.dataset.editingId;
    delete form.dataset.editLabel;
    cfg.reset();
    updateEditorUi(section);
    EDITOR_LOADERS[section]?.();
}

function getEditingId(section) {
    const cfg = EDITOR_CONFIG[section];
    return document.getElementById(cfg.formId)?.dataset.editingId || '';
}

function bindEditorControls() {
    Object.entries(EDITOR_CONFIG).forEach(([section, cfg]) => {
        document.getElementById(cfg.cancelBtnId)?.addEventListener('click', () => cancelEdit(section));
        updateEditorUi(section);
    });
}

function restoreEditorSubmit(section) {
    const cfg = EDITOR_CONFIG[section];
    const btn = document.getElementById(cfg.submitBtnId);
    if (!btn) return;
    btn.disabled = false;
    updateEditorUi(section);
}

// ════════════════════════════════════════════════════════════
//  ── TAB 1: GENEL AYARLAR ──
// ════════════════════════════════════════════════════════════

// Genel Ayarlar için varsayılan değerler (Firebase'de kayıt yoksa form bunlarla dolar)
const DEFAULT_SETTINGS = {
    heroTitle:         'Mustafa Yüksel',
    heroSubtitle:      'Web Developer',
    heroDescription:   'Hızlı, erişilebilir ve görsel olarak çarpıcı, olağanüstü dijital deneyimler oluşturuyorum.',
    aboutText1:        'Şu anda Türkiye\'de yaşayan tutkulu bir geliştiriciyim. Uzmanlığım, yalnızca iyi çalışmakla kalmayıp aynı zamanda güzel görünen web uygulamaları geliştirmek. Temiz kodun ve minimal tasarımın gücüne inanıyorum.',
    aboutText2:        'Kod yazmadığım zamanlarda beni yeni teknolojileri keşfederken, açık kaynaklı projelere katkıda bulunurken veya tasarım becerilerimi geliştirirken bulabilirsiniz. Her zaman yeni fırsatlara ve ilgi çekici projelere açığım.',
    statsYears:        '2+',
    statsProjects:     '10+',
    hiringBadge:       'Açık Pozisyonlara Başvuruya Hazır',
    hiringTitle:       'Yeni Fırsatlar Arıyorum',
    hiringDescription: 'Tutkulu, öğrenmeye açık ve sonuç odaklı bir geliştirici olarak ekibinize değer katmaya hazırım. Modern web teknolojileri konusundaki yetkinliğim ve problem çözme becerilerimle projelerinizi bir üst seviyeye taşıyabilirim.',
    contactEmail:      'yukselmustafa544@gmail.com',
    contactLocation:   'Balıkesir/Bandırma',
    cvUrl:             'mustafa yüksel cv.pdf',
    socialGithub:      'https://github.com/mustafayksl100',
    socialLinkedin:    'https://www.linkedin.com/in/mustafa-y%C3%BCksel-48646032a',
    socialInstagram:   'https://www.instagram.com/mustafa_yuksel488',
};

async function loadSettings() {
    setBtn('settings-save-btn', '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...', true);
    try {
        const doc = await db.collection('settings').doc('general').get();
        // Firebase'de kayıt varsa onu, yoksa site varsayılanlarını göster
        const d = doc.exists ? doc.data() : DEFAULT_SETTINGS;

        setValue('s-heroTitle',     d.heroTitle         || DEFAULT_SETTINGS.heroTitle);
        setValue('s-heroSubtitle',  d.heroSubtitle       || DEFAULT_SETTINGS.heroSubtitle);
        setValue('s-heroDesc',      d.heroDescription    || DEFAULT_SETTINGS.heroDescription);
        setValue('s-about1',        d.aboutText1         || DEFAULT_SETTINGS.aboutText1);
        setValue('s-about2',        d.aboutText2         || DEFAULT_SETTINGS.aboutText2);
        setValue('s-statsYears',    d.statsYears         || DEFAULT_SETTINGS.statsYears);
        setValue('s-statsProjects', d.statsProjects      || DEFAULT_SETTINGS.statsProjects);
        setValue('s-hiringBadge',   d.hiringBadge        || DEFAULT_SETTINGS.hiringBadge);
        setValue('s-hiringTitle',   d.hiringTitle        || DEFAULT_SETTINGS.hiringTitle);
        setValue('s-hiringDesc',    d.hiringDescription  || DEFAULT_SETTINGS.hiringDescription);
        setValue('s-email',         d.contactEmail       || DEFAULT_SETTINGS.contactEmail);
        setValue('s-location',      d.contactLocation    || DEFAULT_SETTINGS.contactLocation);
        setValue('s-cvUrl',         d.cvUrl              || DEFAULT_SETTINGS.cvUrl);
        setValue('s-github',        d.socialGithub       || DEFAULT_SETTINGS.socialGithub);
        setValue('s-linkedin',      d.socialLinkedin     || DEFAULT_SETTINGS.socialLinkedin);
        setValue('s-instagram',     d.socialInstagram    || DEFAULT_SETTINGS.socialInstagram);
    } catch (err) {
        console.error('loadSettings:', err);
        showToast('Ayarlar yüklenemedi.', 'error');
    } finally {
        setBtn('settings-save-btn', '<i class="fas fa-save"></i> Tüm Ayarları Kaydet', false);
    }
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

async function saveSettings(e) {
    e.preventDefault();
    setBtn('settings-save-btn', '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...', true);

    const data = {
        heroTitle:         document.getElementById('s-heroTitle').value.trim(),
        heroSubtitle:      document.getElementById('s-heroSubtitle').value.trim(),
        heroDescription:   document.getElementById('s-heroDesc').value.trim(),
        aboutText1:        document.getElementById('s-about1').value.trim(),
        aboutText2:        document.getElementById('s-about2').value.trim(),
        statsYears:        document.getElementById('s-statsYears').value.trim(),
        statsProjects:     document.getElementById('s-statsProjects').value.trim(),
        hiringBadge:       document.getElementById('s-hiringBadge').value.trim(),
        hiringTitle:       document.getElementById('s-hiringTitle').value.trim(),
        hiringDescription: document.getElementById('s-hiringDesc').value.trim(),
        contactEmail:      document.getElementById('s-email').value.trim(),
        contactLocation:   document.getElementById('s-location').value.trim(),
        cvUrl:             document.getElementById('s-cvUrl').value.trim(),
        socialGithub:      document.getElementById('s-github').value.trim(),
        socialLinkedin:    document.getElementById('s-linkedin').value.trim(),
        socialInstagram:   document.getElementById('s-instagram').value.trim(),
        updatedAt:         firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await db.collection('settings').doc('general').set(data, { merge: true });
        showToast('Tüm ayarlar başarıyla kaydedildi!');
    } catch (err) {
        console.error('saveSettings:', err);
        showToast('Kayıt sırasında bir hata oluştu!', 'error');
    } finally {
        setBtn('settings-save-btn', '<i class="fas fa-save"></i> Tüm Ayarları Kaydet', false);
    }
}

// ════════════════════════════════════════════════════════════
//  ── TAB 2: PROJELER ──
// ════════════════════════════════════════════════════════════

async function loadProjects() {
    const list = document.getElementById('project-list');
    list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
    try {
        const snap = await db.collection('projects').orderBy('createdAt', 'desc').get();
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> Henüz proje eklenmemiş.</p>'; return; }
        snap.forEach(doc => list.appendChild(makeProjectCard(doc.id, doc.data())));
    } catch (err) {
        console.error('loadProjects:', err);
        list.innerHTML = '<p class="error-state"><i class="fas fa-exclamation-triangle"></i> Projeler yüklenemedi.</p>';
    }
}

function makeProjectCard(id, data) {
    const desc = (data.desc || '').trim();
    const imageUrl = sanitizeUrl(data.img, '', { allowRelative: true });
    const el = document.createElement('div');
    el.className = `list-item${editState.projects === id ? ' is-editing' : ''}`;
    el.innerHTML = `
        <img class="item-thumb" src="${imageUrl}" alt="${escapeHtml(data.title || '')}" onerror="this.src='https://placehold.co/80x60/0d1221/6366f1?text=IMG'">
        <div class="item-info">
            <h4>${escapeHtml(data.title || '')}</h4>
            <p class="item-meta">${(data.tags || []).map(tag => escapeHtml(tag)).join(' · ')}</p>
            ${desc ? `<p class="item-desc">${escapeHtml(desc)}</p>` : ''}
        </div>
        <div class="list-item-actions">
            <button class="btn btn-edit btn-sm" data-action="edit" title="Duzenle">
                <i class="fas fa-pen-to-square"></i>
                <span>Duzenle</span>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete" title="Sil">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    el.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit('projects', id, data));
    el.querySelector('[data-action="delete"]').addEventListener('click', async (e) => {
        if (!confirm(`"${data.title}" projesini silmek istediğinize emin misiniz?`)) return;
        const btn = e.currentTarget;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        await db.collection('projects').doc(id).delete();
        if (getEditingId('projects') === id) cancelEdit('projects');
        showToast('Proje silindi.');
        loadProjects();
    });
    return el;
}

async function addProject(e) {
    e.preventDefault();
    const editingId = getEditingId('projects');
    const isEditing = Boolean(editingId);
    setBtn('submit-project-btn', `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? 'Guncelleniyor...' : 'Ekleniyor...'}`, true);
    try {
        const payload = {
            title:     document.getElementById('p-title').value.trim(),
            desc:      document.getElementById('p-desc').value.trim(),
            img:       document.getElementById('p-img').value.trim(),
            github:    document.getElementById('p-code').value.trim(),
            web:       document.getElementById('p-web').value.trim(),
            tags:      document.getElementById('p-tags').value.split(',').map(t => t.trim()).filter(Boolean),
            status:    document.getElementById('p-status').value || 'live',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (isEditing) {
            await db.collection('projects').doc(editingId).set(payload, { merge: true });
        } else {
            await db.collection('projects').add({
                ...payload,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        cancelEdit('projects');
        showToast(isEditing ? 'Proje guncellendi!' : 'Proje basariyla yayina alindi!');
    } catch (err) {
        console.error('addProject:', err);
        showToast(isEditing ? 'Proje guncellenemedi!' : 'Proje eklenemedi!', 'error');
    } finally {
        restoreEditorSubmit('projects');
    }
}

// ════════════════════════════════════════════════════════════
//  ── TAB 3: EĞİTİM ──
// ════════════════════════════════════════════════════════════

async function loadEducation() {
    const list = document.getElementById('education-list');
    list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
    try {
        const snap = await db.collection('education').get();
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> Henüz eğitim bilgisi eklenmemiş.</p>'; return; }
        sortByOrder(snap.docs).forEach(doc => list.appendChild(makeEducationCard(doc.id, doc.data())));
    } catch (err) {
        console.error('loadEducation:', err);
        list.innerHTML = '<p class="error-state"><i class="fas fa-exclamation-triangle"></i> Eğitim bilgileri yüklenemedi.</p>';
    }
}

function makeEducationCard(id, data) {
    const el = document.createElement('div');
    el.className = `list-item${editState.education === id ? ' is-editing' : ''}`;
    const iconClass = sanitizeIconClass(data.icon, 'fas fa-graduation-cap');
    el.innerHTML = `
        <div class="item-icon-wrap"><i class="${iconClass}"></i></div>
        <div class="item-info">
            <h4>${escapeHtml(data.degree || data.school || '')}</h4>
            <p class="item-meta">${escapeHtml(data.school || '')} &middot; ${escapeHtml(data.year || '')}</p>
            ${(data.description || '').trim() ? `<p class="item-desc">${escapeHtml(data.description.trim())}</p>` : ''}
        </div>
        <div class="list-item-actions">
            <button class="btn btn-edit btn-sm" data-action="edit" title="Duzenle">
                <i class="fas fa-pen-to-square"></i>
                <span>Duzenle</span>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete" title="Sil">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    el.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit('education', id, data));
    el.querySelector('[data-action="delete"]').addEventListener('click', async (e) => {
        if (!confirm('Bu eğitim kaydını silmek istediğinize emin misiniz?')) return;
        const btn = e.currentTarget; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
        await db.collection('education').doc(id).delete();
        if (getEditingId('education') === id) cancelEdit('education');
        showToast('Eğitim kaydı silindi.');
        loadEducation();
    });
    return el;
}

async function addEducation(e) {
    e.preventDefault();
    const editingId = getEditingId('education');
    const isEditing = Boolean(editingId);
    setBtn('submit-edu-btn', `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? 'Guncelleniyor...' : 'Ekleniyor...'}`, true);
    try {
        const payload = {
            icon:        document.getElementById('e-icon').value.trim() || 'fas fa-graduation-cap',
            year:        document.getElementById('e-year').value.trim(),
            degree:      document.getElementById('e-degree').value.trim(),
            school:      document.getElementById('e-school').value.trim(),
            description: document.getElementById('e-desc').value.trim(),
            order:       parseInt(document.getElementById('e-order').value) || 1,
            updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (isEditing) {
            await db.collection('education').doc(editingId).set(payload, { merge: true });
        } else {
            await db.collection('education').add({
                ...payload,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        cancelEdit('education');
        showToast(isEditing ? 'Egitim guncellendi!' : 'Egitim bilgisi eklendi!');
    } catch (err) {
        console.error('addEducation:', err);
        showToast(isEditing ? 'Egitim guncellenemedi!' : 'Egitim eklenemedi!', 'error');
    } finally {
        restoreEditorSubmit('education');
    }
}

// ════════════════════════════════════════════════════════════
//  ── TAB 4: YETENEKler ──
// ════════════════════════════════════════════════════════════

async function loadSkills() {
    const list = document.getElementById('skills-list');
    list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
    try {
        const snap = await db.collection('skills').get();
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> Henüz yetenek eklenmemiş.</p>'; return; }
        sortByOrder(snap.docs).forEach(doc => list.appendChild(makeSkillCard(doc.id, doc.data())));
    } catch (err) {
        console.error('loadSkills:', err);
        list.innerHTML = '<p class="error-state"><i class="fas fa-exclamation-triangle"></i> Yetenekler yüklenemedi.</p>';
    }
}

function makeSkillCard(id, data) {
    const el = document.createElement('div');
    el.className = `list-item${editState.skills === id ? ' is-editing' : ''}`;
    const iconClass = sanitizeIconClass(data.icon, 'fas fa-code');
    el.innerHTML = `
        <div class="item-icon-wrap"><i class="${iconClass}"></i></div>
        <div class="item-info" style="flex:1">
            <h4>${escapeHtml(data.name || '')}</h4>
            <div class="skill-mini-bar"><div class="skill-mini-fill" style="width:${data.level}%"></div></div>
            <p class="item-meta">${escapeHtml(data.levelLabel || '')} &middot; ${escapeHtml(data.level || 0)}%</p>
        </div>
        <div class="list-item-actions">
            <button class="btn btn-edit btn-sm" data-action="edit" title="Duzenle">
                <i class="fas fa-pen-to-square"></i>
                <span>Duzenle</span>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete" title="Sil">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    el.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit('skills', id, data));
    el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`"${data.name}" yeteneğini silmek istediğinize emin misiniz?`)) return;
        await db.collection('skills').doc(id).delete();
        if (getEditingId('skills') === id) cancelEdit('skills');
        showToast('Yetenek silindi.');
        loadSkills();
    });
    return el;
}

async function addSkill(e) {
    e.preventDefault();
    const editingId = getEditingId('skills');
    const isEditing = Boolean(editingId);
    setBtn('submit-skill-btn', `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? 'Guncelleniyor...' : 'Ekleniyor...'}`, true);
    try {
        const payload = {
            icon:       document.getElementById('sk-icon').value.trim() || 'fas fa-code',
            name:       document.getElementById('sk-name').value.trim(),
            level:      parseInt(document.getElementById('sk-level').value),
            levelLabel: document.getElementById('sk-levelLabel').value,
            order:      parseInt(document.getElementById('sk-order').value) || 1,
            updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (isEditing) {
            await db.collection('skills').doc(editingId).set(payload, { merge: true });
        } else {
            await db.collection('skills').add({
                ...payload,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        cancelEdit('skills');
        showToast(isEditing ? 'Yetenek guncellendi!' : 'Yetenek eklendi!');
    } catch (err) {
        console.error('addSkill:', err);
        showToast(isEditing ? 'Yetenek guncellenemedi!' : 'Yetenek eklenemedi!', 'error');
    } finally {
        restoreEditorSubmit('skills');
    }
}

// ── ARAÇLAR ──

async function loadTools() {
    const list = document.getElementById('tools-list');
    list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
    try {
        const snap = await db.collection('tools').get();
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> Henüz araç eklenmemiş.</p>'; return; }
        sortByOrder(snap.docs).forEach(doc => list.appendChild(makeToolCard(doc.id, doc.data())));
    } catch (err) {
        console.error('loadTools:', err);
        list.innerHTML = '<p class="error-state"><i class="fas fa-exclamation-triangle"></i> Araçlar yüklenemedi.</p>';
    }
}

function makeToolCard(id, data) {
    const el = document.createElement('div');
    el.className = `list-item${editState.tools === id ? ' is-editing' : ''}`;
    const iconClass = sanitizeIconClass(data.icon, 'fas fa-tools');
    el.innerHTML = `
        <div class="item-icon-wrap"><i class="${iconClass}"></i></div>
        <div class="item-info"><h4>${escapeHtml(data.name || '')}</h4></div>
        <div class="list-item-actions">
            <button class="btn btn-edit btn-sm" data-action="edit" title="Duzenle">
                <i class="fas fa-pen-to-square"></i>
                <span>Duzenle</span>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete" title="Sil">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    el.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit('tools', id, data));
    el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`"${data.name}" aracını silmek istediğinize emin misiniz?`)) return;
        await db.collection('tools').doc(id).delete();
        if (getEditingId('tools') === id) cancelEdit('tools');
        showToast('Araç silindi.');
        loadTools();
    });
    return el;
}

async function addTool(e) {
    e.preventDefault();
    const editingId = getEditingId('tools');
    const isEditing = Boolean(editingId);
    setBtn('submit-tool-btn', `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? 'Guncelleniyor...' : 'Ekleniyor...'}`, true);
    try {
        const payload = {
            icon:      document.getElementById('t-icon').value.trim() || 'fas fa-tools',
            name:      document.getElementById('t-name').value.trim(),
            order:     parseInt(document.getElementById('t-order').value) || 1,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (isEditing) {
            await db.collection('tools').doc(editingId).set(payload, { merge: true });
        } else {
            await db.collection('tools').add({
                ...payload,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        cancelEdit('tools');
        showToast(isEditing ? 'Arac guncellendi!' : 'Arac eklendi!');
    } catch (err) {
        console.error('addTool:', err);
        showToast(isEditing ? 'Arac guncellenemedi!' : 'Arac eklenemedi!', 'error');
    } finally {
        restoreEditorSubmit('tools');
    }
}

// ════════════════════════════════════════════════════════════
//  ── TAB 5: HİZMETLER ──
// ════════════════════════════════════════════════════════════

async function loadServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
    try {
        const snap = await db.collection('services').get();
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = '<p class="empty-state"><i class="fas fa-inbox"></i> Henüz hizmet eklenmemiş.</p>'; return; }
        sortByOrder(snap.docs).forEach(doc => list.appendChild(makeServiceCard(doc.id, doc.data())));
    } catch (err) {
        console.error('loadServices:', err);
        list.innerHTML = '<p class="error-state"><i class="fas fa-exclamation-triangle"></i> Hizmetler yüklenemedi.</p>';
    }
}

function makeServiceCard(id, data) {
    const preview = (data.description || '').substring(0, 70) + ((data.description || '').length > 70 ? '…' : '');
    const el = document.createElement('div');
    el.className = `list-item${editState.services === id ? ' is-editing' : ''}`;
    const iconClass = sanitizeIconClass(data.icon, 'fas fa-briefcase');
    el.innerHTML = `
        <div class="item-icon-wrap"><i class="${iconClass}"></i></div>
        <div class="item-info">
            <h4>${escapeHtml(data.title || '')}</h4>
            <p class="item-meta">${escapeHtml(preview)}</p>
        </div>
        <div class="list-item-actions">
            <button class="btn btn-edit btn-sm" data-action="edit" title="Duzenle">
                <i class="fas fa-pen-to-square"></i>
                <span>Duzenle</span>
            </button>
            <button class="btn btn-danger btn-sm" data-action="delete" title="Sil">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    el.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit('services', id, data));
    el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`"${data.title}" hizmetini silmek istediğinize emin misiniz?`)) return;
        await db.collection('services').doc(id).delete();
        if (getEditingId('services') === id) cancelEdit('services');
        showToast('Hizmet silindi.');
        loadServices();
    });
    return el;
}

async function addService(e) {
    e.preventDefault();
    const editingId = getEditingId('services');
    const isEditing = Boolean(editingId);
    setBtn('submit-service-btn', `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? 'Guncelleniyor...' : 'Ekleniyor...'}`, true);
    try {
        const payload = {
            icon:        document.getElementById('sv-icon').value.trim() || 'fas fa-briefcase',
            title:       document.getElementById('sv-title').value.trim(),
            description: document.getElementById('sv-desc').value.trim(),
            order:       parseInt(document.getElementById('sv-order').value) || 1,
            updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (isEditing) {
            await db.collection('services').doc(editingId).set(payload, { merge: true });
        } else {
            await db.collection('services').add({
                ...payload,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        cancelEdit('services');
        showToast(isEditing ? 'Hizmet guncellendi!' : 'Hizmet basariyla eklendi!');
    } catch (err) {
        console.error('addService:', err);
        showToast(isEditing ? 'Hizmet guncellenemedi!' : 'Hizmet eklenemedi!', 'error');
    } finally {
        restoreEditorSubmit('services');
    }
}

// ════════════════════════════════════════════════════════════
//  SEED (Manuel) — "Varsayılanları Yükle" butonu için
//  Koleksiyon boşsa seed eder, doluysa uyarı verir.
// ════════════════════════════════════════════════════════════
async function seedDefaultData(collection) {
    const existing = await db.collection(collection).limit(1).get();
    if (!existing.empty) {
        showToast(`"${collection}" zaten dolu — önce tüm kayıtları silin.`, 'error');
        return;
    }
    await performSeed(collection);
    showToast(`${DEFAULT_DATA[collection]?.length || 0} varsayılan kayıt eklendi!`);
    const loaders = { services: loadServices, education: loadEducation, skills: loadSkills, tools: loadTools, projects: loadProjects };
    loaders[collection]?.();
}
