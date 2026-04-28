// ==================== CONFIGURAÇÃO FIREBASE ====================
const firebaseConfig = {
    apiKey: "AIzaSyAApYxcRCdKCa5X4B5Mqe_tCVafjTbU6bM",
    authDomain: "chatbox-f7578.firebaseapp.com",
    projectId: "chatbox-f7578",
    storageBucket: "chatbox-f7578.firebasestorage.app",
    messagingSenderId: "136199002752",
    appId: "1:136199002752:web:e36cbea04d75877eb0e465"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ==================== ESTADO GLOBAL ====================
let currentUser = null, currentUid = null;
let activeTab = 'now';
let sideNowVisible = false;
let currentChatUid = null;
let chatsListener = null;
let currentMediaData = null;
let mainCarouselTimer = null;
let mainCarouselPaused = false;
let carouselUnsubscribe = null;
let lastMediaIds = [];  // IDs dos documentos com mídia no carrossel
const translationCache = {};

// ==================== ELEMENTOS DOM ====================
const mainFeed = document.getElementById('mainFeed');
const sideNow = document.getElementById('sideNow');

// ==================== ATUALIZAR CABEÇALHO ====================
function updateHeaderProfile() {
    if (!currentUser) return;
    document.getElementById('headerAvatar').src = currentUser.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100';
    document.getElementById('headerName').textContent = currentUser.firstName || 'Usuário';
    document.getElementById('headerStatus').textContent = currentUser.status || 'Sem status';
    document.getElementById('headerQuote').textContent = currentUser.quote || '';
}

// ==================== HELPERS ====================
function showToast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(window._toastTimer); window._toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function closeAllModals() { document.querySelectorAll('.app-modal').forEach(m => m.classList.remove('active')); }

// ==================== TRADUÇÃO ====================
async function translateText(text, targetLang) {
    if (!text || !targetLang || targetLang === 'pt') return text;
    const key = `${text}_${targetLang}`;
    if (translationCache[key]) return translationCache[key];
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
        const data = await res.json();
        const translated = data[0][0][0];
        translationCache[key] = translated;
        return translated;
    } catch (e) { return text; }
}
async function applyLanguage(lang) {
    if (!lang || lang === 'pt') return;
    const els = document.querySelectorAll('[data-translate]');
    for (const el of els) {
        const original = el.getAttribute('data-original') || el.textContent;
        if (!el.getAttribute('data-original')) el.setAttribute('data-original', original);
        el.textContent = await translateText(original, lang);
    }
}

// ==================== LIMPEZA DO FEED ====================
function clearFeedExceptWrapper() {
    const wrapper = document.getElementById('exhibitionWrapper');
    while (mainFeed.firstChild) {
        if (mainFeed.firstChild !== wrapper) mainFeed.removeChild(mainFeed.firstChild);
        else break;
    }
    while (mainFeed.lastChild && mainFeed.lastChild !== wrapper) mainFeed.removeChild(mainFeed.lastChild);
}

// ==================== ABAS ====================
function switchTab(tab, el) {
    if (tab === 'now' && activeTab === 'now') {
        toggleSideNow();
        return;
    }
    document.querySelectorAll('.header-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    activeTab = tab;
    renderFeed(tab);
}

function toggleSideNow() {
    sideNowVisible = !sideNowVisible;
    sideNow.classList.toggle('visible', sideNowVisible);
    mainFeed.classList.toggle('shifted', sideNowVisible);
}
sideNow.addEventListener('click', toggleSideNow);

function renderFeed(tab) {
    if (!mainFeed) return;
    const exhibitionWrapper = document.getElementById('exhibitionWrapper');

    // Cancela listener do carrossel se sair da aba Exposição
    if (tab !== 'exhibition' && carouselUnsubscribe) {
        carouselUnsubscribe();
        carouselUnsubscribe = null;
        lastMediaIds = [];
        if (mainCarouselTimer) clearInterval(mainCarouselTimer);
    }

    clearFeedExceptWrapper();

    if (tab === 'now') {
        if (exhibitionWrapper) exhibitionWrapper.style.display = 'none';
        loadNowFeed();
    } else if (tab === 'exhibition') {
        if (!exhibitionWrapper) {
            renderExhibitionTabFallback();
            return;
        }
        exhibitionWrapper.style.display = 'flex';
        loadExhibitionCarousel();  // Carrossel reativo usando apenas a coleção posts
        loadExhibitionPosts();     // Posts de texto (exclui os que têm mídia)
        loadOnlineFriends();       // Amigos online
    } else if (tab === 'textz') {
        if (exhibitionWrapper) exhibitionWrapper.style.display = 'none';
        loadChatList();
    }
}

function renderExhibitionTabFallback() {
    const wrapper = document.createElement('div');
    wrapper.id = 'exhibitionWrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.innerHTML = `
        <div class="carousel-section" id="carouselSection">
            <div class="carousel-container"><div class="carousel-track" id="carouselTrack"></div></div>
            <div class="carousel-indicators" id="carouselIndicators"></div>
        </div>
        <div id="onlineFriends" class="online-friends-strip"></div>
        <div id="exhibitionTextPosts" class="cards-wrapper"></div>
    `;
    mainFeed.appendChild(wrapper);
    loadExhibitionCarousel();
    loadExhibitionPosts();
    loadOnlineFriends();
}

// ==================== ABA NOW ====================
async function loadNowFeed() {
    mainFeed.innerHTML = '<p style="color:#fff;text-align:center;padding:20px;">Carregando...</p>';
    try {
        const friends = currentUser?.friends || [];
        const ids = [currentUid, ...friends].slice(0, 20);
        const snapshots = await Promise.all(ids.map(uid => db.collection('users').doc(uid).get()));
        const users = [];
        snapshots.forEach(snap => {
            if (snap.exists) {
                const u = snap.data();
                if (u.status || u.quote) users.push({ id: snap.id, ...u });
            }
        });
        if (users.length === 0) {
            mainFeed.innerHTML = '<p style="color:#fff;text-align:center;padding:20px;">Nenhum pensamento por aqui.</p>';
            return;
        }
        users.sort((a, b) => {
            const dateA = a.statusUpdatedAt?.toDate ? a.statusUpdatedAt.toDate() : new Date(0);
            const dateB = b.statusUpdatedAt?.toDate ? b.statusUpdatedAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        mainFeed.innerHTML = '';
        users.forEach(user => mainFeed.appendChild(createNowCard(user)));
    } catch (error) {
        mainFeed.innerHTML = '<p style="color:#fff;text-align:center;padding:20px;">Erro ao carregar.</p>';
    }
}

function createNowCard(user) {
    const card = document.createElement('div');
    card.className = 'card';
    const activityIcon = user.activityType === 'music' ? '🎵' : user.activityType === 'reading' ? '📖' : user.activityType === 'film' ? '🎬' : user.activityType === 'location' ? '📍' : '💭';
    const activityClass = user.activityType || 'music';
    const verifiedBadge = user.isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : '';
    const vipBadge = user.isVIP ? '<span class="vip-badge">🎉 VIP</span>' : '';
    const nameRow = `
        <div class="name-row">
            <span class="card-name">${user.firstName || user.name || 'Usuário'}</span>
            ${verifiedBadge} ${vipBadge}
            <span class="card-timestamp">Agora</span>
        </div>`;
    const activityHTML = user.status ? `<div class="activity-desc"><i>${activityIcon}</i> ${user.status}</div>` : '';
    let quoteBlock = '';
    if (user.quote && user.quote.trim() !== '') {
        quoteBlock = `
            <div class="card-separator"></div>
            <div class="card-quote-block">
                <span class="quote-mark">“</span>
                <span class="card-quote-text">${user.quote}</span>
            </div>`;
    }
    const vipBorderClass = user.isVIP ? 'vip' : '';
    card.innerHTML = `
        <div class="card-header">
            <div class="avatar-wrapper">
                <img src="${user.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50'}" class="avatar-img ${vipBorderClass}" alt="${user.name}">
                <div class="activity-indicator ${activityClass}">${activityIcon}</div>
            </div>
            <div class="card-user-info">
                ${nameRow}
                ${activityHTML}
            </div>
        </div>
        ${quoteBlock}
    `;
    return card;
}

// ==================== CARROSSEL REATIVO (APENAS POSTS COM MÍDIA) ====================
async function loadExhibitionCarousel() {
    const track = document.getElementById('carouselTrack');
    const indicators = document.getElementById('carouselIndicators');
    if (!track || !indicators) return;

    // Cancela listener e timer anteriores
    if (carouselUnsubscribe) carouselUnsubscribe();
    if (mainCarouselTimer) clearInterval(mainCarouselTimer);
    lastMediaIds = []; // Reseta IDs para forçar rebuild na próxima snapshot

    track.innerHTML = '<div class="carousel-slide" style="color:#fff;display:flex;align-items:center;justify-content:center;">Carregando...</div>';
    indicators.innerHTML = '';

    // Listener na coleção posts, filtrando apenas documentos que têm o campo "media" não vazio
    carouselUnsubscribe = db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
            const ids = [];
            const mediaItems = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.media && data.media.trim() !== '') {
                    ids.push(doc.id);
                    mediaItems.push({ id: doc.id, ...data });
                }
            });

            // Só reconstrói o carrossel se a lista de IDs mudou
            if (arraysEqual(ids, lastMediaIds)) return;
            lastMediaIds = ids;

            if (mediaItems.length === 0) {
                track.innerHTML = '<div class="carousel-slide" style="color:#fff;display:flex;align-items:center;justify-content:center;">Nenhuma mídia na exposição ainda.</div>';
                indicators.innerHTML = '';
                return;
            }

            // Guarda o índice atual (aproximado) para restaurar depois
            const currentSlide = Math.round(track.scrollLeft / (track.querySelector('.carousel-slide')?.offsetWidth || 1));

            track.innerHTML = '';
            indicators.innerHTML = '';

            mediaItems.forEach((item, i) => {
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                if (item.mediaType === 'video') {
                    slide.innerHTML = `<video src="${item.media}" controls style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>`;
                } else {
                    slide.innerHTML = `<img src="${item.media}" alt="Mídia" loading="lazy">`;
                }
                // NÃO adiciona mais evento de clique para abrir detalhe
                // slide.addEventListener('click', () => openDetail()); // REMOVIDO
                track.appendChild(slide);

                const dot = document.createElement('span');
                dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
                dot.addEventListener('click', () => {
                    track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
                    updateMainDots(i);
                    resetCarouselTimer();
                });
                indicators.appendChild(dot);
            });

            const slides = track.querySelectorAll('.carousel-slide');
            const newIndex = Math.min(currentSlide, slides.length - 1);
            if (slides[newIndex]) {
                track.scrollTo({ left: slides[newIndex].offsetLeft, behavior: 'auto' });
                updateMainDots(newIndex);
            }

            if (mainCarouselTimer) clearInterval(mainCarouselTimer);
            if (slides.length > 1) {
                let autoIndex = newIndex;
                mainCarouselTimer = setInterval(() => {
                    if (mainCarouselPaused) return;
                    autoIndex = (autoIndex + 1) % slides.length;
                    const next = track.querySelectorAll('.carousel-slide')[autoIndex];
                    if (next) {
                        track.scrollTo({ left: next.offsetLeft, behavior: 'smooth' });
                        updateMainDots(autoIndex);
                    }
                }, 3000);
            }
        });

    track.addEventListener('touchstart', () => { mainCarouselPaused = true; resetCarouselTimer(); });
    track.addEventListener('touchend', () => { mainCarouselPaused = false; });
    track.addEventListener('mousedown', () => { mainCarouselPaused = true; resetCarouselTimer(); });
    track.addEventListener('mouseup', () => { mainCarouselPaused = false; });
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function resetCarouselTimer() {
    if (mainCarouselTimer) clearInterval(mainCarouselTimer);
    if (mainCarouselPaused) return;
    const track = document.getElementById('carouselTrack');
    if (!track) return;
    const slides = track.querySelectorAll('.carousel-slide');
    if (slides.length <= 1) return;
    let currentIndex = Math.round(track.scrollLeft / slides[0].offsetWidth) || 0;
    mainCarouselTimer = setInterval(() => {
        if (mainCarouselPaused) return;
        currentIndex = (currentIndex + 1) % slides.length;
        track.scrollTo({ left: slides[currentIndex].offsetLeft, behavior: 'smooth' });
        updateMainDots(currentIndex);
    }, 3000);
}

function updateMainDots(idx) {
    document.querySelectorAll('#carouselIndicators .carousel-dot').forEach((dot, i) => dot.classList.toggle('active', i === idx));
}

// ==================== POSTS DE TEXTO (SEM MÍDIA) ====================
async function loadExhibitionPosts() {
    const container = document.getElementById('exhibitionTextPosts');
    if (!container) return;
    container.innerHTML = '<p style="color:#fff;text-align:center;">Carregando posts...</p>';
    try {
        const snapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(40)
            .get();

        const textPosts = [];
        snapshot.forEach(doc => {
            const post = doc.data();
            // Exclui posts que tenham mídia (já estão no carrossel)
            if (!post.media || post.media.trim() === '') {
                textPosts.push(post);
            }
        });

        if (textPosts.length === 0) {
            container.innerHTML = '<p style="color:#fff;text-align:center;">Nenhum post de texto ainda.</p>';
            return;
        }
        container.innerHTML = '';
        textPosts.forEach(post => container.appendChild(createPostCard(post)));
    } catch (e) {
        container.innerHTML = '<p style="color:#fff;text-align:center;">Erro ao carregar posts.</p>';
    }
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'card';
    const time = post.createdAt ? new Date(post.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : post.time || '';
    const verifiedBadge = post.isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : '';
    const vipBadge = post.isVIP ? '<span class="vip-badge">🎉 VIP</span>' : '';
    card.innerHTML = `
        <div class="card-header">
            <img src="${post.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50'}" class="avatar-img" style="width:40px;height:40px;">
            <div>
                <div style="font-weight:500;">${post.name || 'Usuário'} ${verifiedBadge} ${vipBadge}</div>
                <div style="font-size:12px;color:#888;">${time} ${post.location ? '📍 '+post.location : ''}</div>
            </div>
        </div>
        <div style="margin-top:8px;">${post.quote || ''}</div>
        <div style="display:flex;gap:20px;margin-top:10px;font-size:13px;color:#555;">
            <span>❤️ ${post.likes || 0}</span><span>💬 ${post.comments || 0}</span><span>🔄 ${post.shares || 0}</span>
        </div>
    `;
    return card;
}

// ==================== AMIGOS ONLINE ====================
async function loadOnlineFriends() {
    const strip = document.getElementById('onlineFriends');
    if (!strip || !currentUser?.friends?.length) {
        if (strip) strip.innerHTML = '<span style="color:#aaa;">Nenhum amigo online</span>';
        return;
    }
    strip.innerHTML = '<span style="color:#aaa;">Carregando...</span>';
    const friendIds = currentUser.friends.slice(0, 15);
    const friendDocs = await Promise.all(friendIds.map(uid => db.collection('users').doc(uid).get()));
    const onlineFriends = friendDocs
        .filter(doc => doc.exists && doc.data().statusType === 'online')
        .map(doc => ({ id: doc.id, ...doc.data() }));
    if (onlineFriends.length === 0) {
        strip.innerHTML = '<span style="color:#aaa; font-size:12px;">Nenhum amigo online</span>';
        return;
    }
    strip.innerHTML = onlineFriends.map(f => `
        <div style="text-align:center; flex-shrink:0; cursor:pointer; position:relative;"
             onclick="openFriendProfile('${f.id}')">
            <img src="${f.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50'}"
                 style="width:50px; height:50px; border-radius:50%; object-fit:cover;
                        border:2px solid #58d3f7; box-shadow:0 0 6px rgba(88,211,247,0.5);"
                 alt="${f.name}">
            <div style="font-size:10px; color:#fff; margin-top:4px; max-width:60px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${f.firstName || f.name}
            </div>
            <div style="position:absolute; bottom:2px; right:2px; width:12px; height:12px;
                        background:#4CAF50; border-radius:50%; border:1px solid #fff;"></div>
        </div>
    `).join('');
}

// ==================== LOGIN ====================
function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    if (tab === 'login') {
        document.querySelectorAll('.login-tab')[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('registerForm').classList.remove('active');
    } else {
        document.querySelectorAll('.login-tab')[1].classList.add('active');
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('loginForm').classList.remove('active');
    }
}
async function registerEmail() {
    const fn = document.getElementById('regFirstName').value.trim();
    const ln = document.getElementById('regLastName').value.trim();
    const em = document.getElementById('regEmail').value.trim();
    const pw = document.getElementById('regPassword').value.trim();
    if (!fn || !ln || !em || !pw) return showToast('Preencha todos os campos.');
    if (pw.length < 6) return showToast('Senha muito curta (mínimo 6).');
    try {
        const cred = await auth.createUserWithEmailAndPassword(em, pw);
        await db.collection('users').doc(cred.user.uid).set({
            firstName: fn, lastName: ln, name: `${fn} ${ln}`, email: em, password: pw,
            avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
            status: '', quote: '',
            friends: [], lastRead: {}, coins: 0, challenges: {},
            isVIP: false, isVerified: false, isAdmin: false, vipExpiresAt: null,
            hasCrown: false, crownColor: '#ffd700', frameColor: null, frameStyle: 'solid',
            chatBackground: null, appBackground: null, statusType: 'online', language: 'pt',
            activityType: 'music',
            statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`Conta criada! Bem-vindo(a), ${fn}!`);
    } catch (e) {
        if (e.code === 'auth/email-already-in-use') showToast('E‑mail já cadastrado.');
        else showToast('Erro: ' + e.message);
    }
}
async function loginEmail() {
    const em = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value.trim();
    if (!em || !pw) return showToast('Preencha e‑mail e senha.');
    try { await auth.signInWithEmailAndPassword(em, pw); }
    catch (e) {
        if (e.code === 'auth/wrong-password') showToast('Senha incorreta.');
        else if (e.code === 'auth/user-not-found') showToast('E‑mail não cadastrado.');
        else showToast('Erro: ' + e.message);
    }
}
function logoutUser() {
    if (currentUid) db.collection('users').doc(currentUid).update({ statusType: 'offline' }).catch(() => {});
    auth.signOut();
    closeAllModals();
    if (carouselUnsubscribe) { carouselUnsubscribe(); carouselUnsubscribe = null; lastMediaIds = []; }
    if (mainCarouselTimer) clearInterval(mainCarouselTimer);
    document.getElementById('loginModal').classList.add('active');
}

// ==================== AUTH LISTENER ====================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUid = user.uid;
        const ref = db.collection('users').doc(user.uid);
        const snap = await ref.get();
        if (!snap.exists) { await auth.signOut(); return; }
        currentUser = snap.data();
        await ref.update({ statusType: 'online' }).catch(() => {});
        if (currentUser.vipExpiresAt && currentUser.vipExpiresAt.toDate() < new Date()) {
            await ref.update({ isVIP: false, vipExpiresAt: null, hasCrown: false, frameColor: null, frameStyle: 'solid', chatBackground: null, appBackground: null }).catch(() => {});
            currentUser = (await ref.get()).data();
        }
        document.getElementById('loginModal').classList.remove('active');
        updateHeaderProfile();
        if (currentUser.language) await applyLanguage(currentUser.language);
        renderFeed('now');
    } else {
        if (currentUid) db.collection('users').doc(currentUid).update({ statusType: 'offline' }).catch(() => {});
        currentUid = null; currentUser = null;
        if (carouselUnsubscribe) { carouselUnsubscribe(); carouselUnsubscribe = null; lastMediaIds = []; }
        if (mainCarouselTimer) clearInterval(mainCarouselTimer);
        document.getElementById('loginModal').classList.add('active');
        mainFeed.innerHTML = '';
    }
});

// ==================== PERFIL PRÓPRIO ====================
function openProfileModal() {
    if (!currentUid) return;
    document.getElementById('editFirstName').value = currentUser.firstName || '';
    document.getElementById('editLastName').value = currentUser.lastName || '';
    document.getElementById('editStatus').value = currentUser.status || '';
    document.getElementById('editQuote').value = currentUser.quote || '';
    document.getElementById('profileAvatarPreview').src = currentUser.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150';
    document.getElementById('editLanguage').value = currentUser.language || 'pt';
    document.getElementById('editPassword').value = ''; document.getElementById('editPasswordConfirm').value = '';
    document.getElementById('coinsDisplay').textContent = currentUser.coins || 0;
    openModal('profileModal');
}
function handleProfileAvatarUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('profileAvatarPreview').src = e.target.result;
        window._newAvatarData = e.target.result;
    };
    reader.readAsDataURL(file);
}
async function saveProfile() {
    const fn = document.getElementById('editFirstName').value.trim(), ln = document.getElementById('editLastName').value.trim();
    const status = document.getElementById('editStatus').value.trim(), quote = document.getElementById('editQuote').value.trim();
    const language = document.getElementById('editLanguage').value;
    const pass = document.getElementById('editPassword').value.trim(), pass2 = document.getElementById('editPasswordConfirm').value.trim();
    if (!fn || !ln) return showToast('Nome e sobrenome obrigatórios.');
    if (pass && pass !== pass2) return showToast('Senhas não conferem.');
    const updates = { firstName: fn, lastName: ln, name: `${fn} ${ln}`, status, quote, language };
    if (window._newAvatarData) updates.avatar = window._newAvatarData;
    if (pass && pass.length >= 6) { try { await auth.currentUser.updatePassword(pass); } catch (e) { showToast('Erro ao alterar senha.'); return; } }
    if (status || quote) updates.statusUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(currentUid).update(updates);
    window._newAvatarData = null;
    showToast('Perfil atualizado!');
    closeModal('profileModal');
    currentUser = (await db.collection('users').doc(currentUid).get()).data();
    updateHeaderProfile();
    if (language !== currentUser.language) { currentUser.language = language; await applyLanguage(language); }
}

// ==================== PUBLICADOR (TEXTO / MÍDIA) ====================
function switchPostTab(tab) {
    document.querySelectorAll('.post-tab').forEach(t => t.classList.remove('active'));
    if (tab === 'texto') {
        document.querySelectorAll('.post-tab')[0].classList.add('active');
        document.getElementById('postTextSection').style.display = 'block';
        document.getElementById('postMediaSection').style.display = 'none';
    } else {
        document.querySelectorAll('.post-tab')[1].classList.add('active');
        document.getElementById('postTextSection').style.display = 'none';
        document.getElementById('postMediaSection').style.display = 'block';
    }
}

function toggleEmojiPicker() { const p = document.getElementById('emojiPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
function insertEmoji(e) { document.getElementById('newPostText').value += e; document.getElementById('emojiPicker').style.display = 'none'; }
function handlePostImageUpload(event) { const f = event.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = e => { currentMediaData = { type: 'image', url: e.target.result }; showMediaPreview(); }; r.readAsDataURL(f); event.target.value = ''; }
function handleVideoUrl(url) { if (!url.trim()) return; currentMediaData = { type: 'video', url: url.trim() }; showMediaPreview(); }
function showMediaPreview() { const p = document.getElementById('mediaPreview'), c = document.getElementById('mediaContent'); if (!currentMediaData) return; p.style.display = 'block'; c.innerHTML = currentMediaData.type === 'image' ? `<img src="${currentMediaData.url}">` : `<video src="${currentMediaData.url}" controls></video>`; }
function removeMedia() { currentMediaData = null; document.getElementById('mediaPreview').style.display = 'none'; document.getElementById('mediaContent').innerHTML = ''; }
function focusLocation() { document.getElementById('locationInput').focus(); }

async function publishPost() {
    if (!currentUid) return showToast('Faça login.');
    const activePostTab = document.querySelector('.post-tab.active')?.textContent.includes('Mídia') ? 'midia' : 'texto';
    const loc = document.getElementById('locationInput').value.trim();
    let text = '';
    if (activePostTab === 'texto') {
        text = document.getElementById('newPostText').value.trim();
        if (!text) return showToast('Escreva algo.');
    } else {
        text = document.getElementById('mediaCaption').value.trim();
        if (!currentMediaData) return showToast('Selecione uma imagem ou vídeo.');
    }

    const postData = {
        userId: currentUid,
        name: currentUser.name,
        avatar: currentUser.avatar,
        quote: text,
        time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        likes: 0, likedBy: [], comments: 0, shares: 0,
        isYellow: false, isFixed: false,
        location: loc || null,
        media: currentMediaData?.url || null,
        mediaType: currentMediaData?.type || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isVIP: currentUser.isVIP || false,
        isVerified: currentUser.isVerified || false
    };

    // Salva exclusivamente na coleção posts
    await db.collection('posts').add(postData);

    const userRef = db.collection('users').doc(currentUid);
    await userRef.update({ coins: firebase.firestore.FieldValue.increment(10) });
    const today = new Date().toISOString().slice(0,10), challenges = currentUser.challenges || {};
    if (!challenges[today]) challenges[today] = { posts: 1 }; else challenges[today].posts = (challenges[today].posts||0)+1;
    if (challenges[today].posts === 3 && !challenges[today].rewarded) {
        await userRef.update({ coins: firebase.firestore.FieldValue.increment(50), [`challenges.${today}.rewarded`]: true });
        showToast('Desafio concluído! +50 moedas 🎉');
    } else await userRef.update({ [`challenges.${today}.posts`]: challenges[today].posts });

    document.getElementById('newPostText').value = '';
    document.getElementById('locationInput').value = '';
    if (document.getElementById('mediaCaption')) document.getElementById('mediaCaption').value = '';
    removeMedia();
    closeModal('postModal'); showToast('Publicado! +10 moedas');

    // Atualiza a lista de posts de texto se estiver na aba Exposição
    if (activeTab === 'exhibition') {
        loadExhibitionPosts();
    }
}

// ==================== CÂMERA ====================
async function capturePhoto() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const html = `<div id="cameraModal" style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;z-index:400;display:flex;flex-direction:column;"><video id="cameraPreview" autoplay style="flex:1;width:100%;object-fit:cover;"></video><div style="display:flex;gap:10px;padding:15px;justify-content:center;"><button onclick="takeSnapshot()" class="btn-primary" style="width:60px;height:60px;border-radius:50%;">📷</button><button onclick="closeCamera()" class="btn-outline" style="color:#fff;border-color:#fff;">Cancelar</button></div></div>`;
        document.getElementById('appContainer').insertAdjacentHTML('beforeend', html);
        document.getElementById('cameraPreview').srcObject = stream; window._cameraStream = stream;
    } catch (e) { showToast('Câmera não disponível'); }
}
function takeSnapshot() {
    const video = document.getElementById('cameraPreview'); const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    currentMediaData = { type: 'image', url: canvas.toDataURL('image/jpeg', 0.8) };
    showMediaPreview(); closeCamera(); showToast('Foto capturada!');
}
function closeCamera() { if (window._cameraStream) window._cameraStream.getTracks().forEach(t => t.stop()); const m = document.getElementById('cameraModal'); if (m) m.remove(); }

// ==================== BUSCA ====================
async function openSearchModal() {
    const lang = currentUser?.language || 'pt';
    const html = `<div id="searchModal" class="app-modal active" style="z-index:300;"><div class="modal-header"><i class="fas fa-arrow-left modal-close" onclick="closeModal('searchModal');document.getElementById('searchModal').remove();"></i><span data-translate>Buscar Usuários</span></div><div class="modal-body"><input type="text" id="searchInput" class="input-field" placeholder="${await translateText('Digite um nome...', lang)}" oninput="performSearch(this.value)"><div id="searchResults"></div></div></div>`;
    document.getElementById('appContainer').insertAdjacentHTML('beforeend', html);
    document.getElementById('searchInput').focus();
}
async function performSearch(query) {
    const lang = currentUser?.language || 'pt';
    const results = document.getElementById('searchResults');
    if (!query || query.length < 2) { results.innerHTML = `<p>${await translateText('Digite ao menos 2 letras...', lang)}</p>`; return; }
    results.innerHTML = `<p>${await translateText('Buscando...', lang)}</p>`;
    const snap = await db.collection('users').where('name','>=',query).where('name','<=',query+'\uf8ff').limit(20).get();
    if (snap.empty) { results.innerHTML = `<p>${await translateText('Nenhum usuário encontrado.', lang)}</p>`; return; }
    results.innerHTML = '';
    const friends = currentUser?.friends || [];
    const sentSnap = await db.collection('friendRequests').where('from', '==', currentUid).where('status', '==', 'pending').get();
    const pendingTo = new Set(sentSnap.docs.map(doc => doc.data().to));
    snap.forEach(doc => {
        const u = doc.data();
        if (doc.id === currentUid) return;
        const isFriend = friends.includes(doc.id);
        const isPending = pendingTo.has(doc.id);
        let actionBtn = '';
        if (isFriend) {
            actionBtn = `
                <button onclick="event.stopPropagation(); openChatDirect('${doc.id}'); closeModal('searchModal'); document.getElementById('searchModal').remove();" style="background:var(--bg-header-top);color:#fff;border:none;padding:6px 12px;border-radius:8px;font-size:12px;">💬 Conversar</button>
                <button onclick="event.stopPropagation(); unfriendUser('${doc.id}'); closeModal('searchModal'); document.getElementById('searchModal').remove();" style="background:#ccc;color:#333;border:none;padding:6px 12px;border-radius:8px;font-size:12px;margin-left:5px;">Deixar de seguir</button>`;
        } else if (isPending) {
            actionBtn = `<button disabled style="background:#ddd;color:#888;border:none;padding:6px 12px;border-radius:8px;font-size:12px;">Solicitação enviada</button>`;
        } else {
            actionBtn = `<button onclick="event.stopPropagation(); sendFriendRequest('${doc.id}'); closeModal('searchModal'); document.getElementById('searchModal').remove();" style="background:var(--text-cyan);color:#000;border:none;padding:6px 12px;border-radius:8px;font-size:12px;">+ Seguir</button>`;
        }
        results.innerHTML += `
            <div class="contact-item" style="justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;" onclick="openFriendProfile('${doc.id}');closeModal('searchModal');document.getElementById('searchModal').remove();">
                    <img src="${u.avatar||'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50'}" class="contact-avatar">
                    <div><b>${u.name}</b><br><small>${u.status||''}</small></div>
                </div>
                <div>${actionBtn}</div>
            </div>`;
    });
}

// ==================== AMIGOS ====================
async function sendFriendRequest(toUid) {
    if (!currentUid) return showToast('Faça login.');
    const existing = await db.collection('friendRequests').where('from', '==', currentUid).where('to', '==', toUid).where('status', '==', 'pending').get();
    if (!existing.empty) return showToast('Solicitação já enviada.');
    if (currentUser.friends?.includes(toUid)) return showToast('Vocês já são amigos.');
    await db.collection('friendRequests').add({
        from: currentUid, to: toUid, fromName: currentUser.name,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Solicitação enviada!');
}
async function unfriendUser(uid) {
    if (!currentUid) return showToast('Faça login.');
    if (!confirm('Deixar de seguir este usuário?')) return;
    await db.collection('users').doc(currentUid).update({ friends: firebase.firestore.FieldValue.arrayRemove(uid) });
    await db.collection('users').doc(uid).update({ friends: firebase.firestore.FieldValue.arrayRemove(currentUid) });
    currentUser = (await db.collection('users').doc(currentUid).get()).data();
    showToast('Deixou de seguir.');
}

// ==================== PERFIL DE OUTRO USUÁRIO ====================
async function openFriendProfile(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return showToast('Usuário não encontrado.');
    const u = userDoc.data();
    const lang = currentUser?.language || 'pt';
    const isFriend = (currentUser.friends || []).includes(uid);
    const sentSnap = await db.collection('friendRequests').where('from','==',currentUid).where('to','==',uid).where('status','==','pending').get();
    const isPending = !sentSnap.empty;
    let actionBtn = '';
    if (isFriend) {
        actionBtn = `
            <button onclick="openChatDirect('${uid}');closeModal('userProfileModal');" class="btn-primary" style="margin-top:10px;">💬 ${await translateText('Conversar',lang)}</button>
            <button onclick="unfriendUser('${uid}');closeModal('userProfileModal');" class="btn-outline" style="margin-top:5px;">Deixar de seguir</button>`;
    } else if (isPending) {
        actionBtn = `<button disabled class="btn-outline" style="margin-top:10px;">Solicitação enviada</button>`;
    } else {
        actionBtn = `<button onclick="sendFriendRequest('${uid}');closeModal('userProfileModal');" class="btn-primary" style="margin-top:10px;">+ Seguir</button>`;
    }
    document.getElementById('userProfileModal').querySelector('.modal-body').innerHTML = `
        <div style="text-align:center;">
            <img src="${u.avatar}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid ${u.isVIP&&u.frameColor?u.frameColor:'#ccc'};">
            <h2>${u.name} ${u.isVerified?'<i class="fas fa-check-circle verified-badge"></i>':''} ${u.isVIP?'<span class="vip-badge">VIP</span>':''}</h2>
            <p>${u.status||await translateText('Sem status',lang)}</p>
            <p style="color:#888;">${u.quote||''}</p>
            ${actionBtn}
        </div>`;
    openModal('userProfileModal');
}

// ==================== SOLICITAÇÕES DE AMIZADE ====================
function openFriendRequestsModal() { openModal('friendRequestsModal'); renderFriendRequests(); }
async function renderFriendRequests() {
    const list = document.getElementById('friendRequestsList');
    const snap = await db.collection('friendRequests').where('to','==',currentUid).where('status','==','pending').get();
    if (snap.empty) { list.innerHTML = '<p>Nenhuma solicitação.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(doc => {
        const r = doc.data();
        list.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px;align-items:center;">
            <b>${r.fromName || r.from}</b>
            <div>
                <button onclick="respondFriendRequest('${doc.id}','accepted')" class="btn-primary" style="width:auto;padding:8px 15px;">Aceitar</button>
                <button onclick="respondFriendRequest('${doc.id}','rejected')" class="btn-outline" style="width:auto;padding:8px 15px;">Recusar</button>
            </div>
        </div>`;
    });
}
async function respondFriendRequest(reqId, status) {
    const req = await db.collection('friendRequests').doc(reqId).get(), d = req.data();
    if (status === 'accepted') {
        await db.collection('users').doc(d.from).update({ friends: firebase.firestore.FieldValue.arrayUnion(d.to) });
        await db.collection('users').doc(d.to).update({ friends: firebase.firestore.FieldValue.arrayUnion(d.from) });
    }
    await db.collection('friendRequests').doc(reqId).update({ status });
    currentUser = (await db.collection('users').doc(currentUid).get()).data();
    renderFriendRequests();
    showToast(status === 'accepted' ? 'Amigo adicionado!' : 'Solicitação recusada.');
}

// ==================== CONTATOS E CHAT ====================
function openContactsModal() {
    openModal('contactsModal'); const list = document.getElementById('contactsList'); list.innerHTML = '<p>Carregando...</p>';
    const friends = currentUser.friends || []; if (!friends.length) { list.innerHTML = '<p>Você ainda não tem amigos.</p>'; return; }
    Promise.all(friends.map(async uid => { try { const doc = await db.collection('users').doc(uid).get(); if (!doc.exists) return null; const u = doc.data(); return { uid, name: u.name||'Usuário', avatar: u.avatar||'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50' }; } catch (e) { return null; } })).then(contacts => {
        const valid = contacts.filter(c => c !== null); let html = '<h4>Amigos</h4>';
        if (valid.length === 0) html += '<p>Nenhum contato disponível.</p>';
        else valid.forEach(c => { html += `<div class="contact-item" onclick="openFriendProfile('${c.uid}')"><img src="${c.avatar}" class="contact-avatar"><div><b>${c.name}</b></div></div>`; });
        list.innerHTML = html;
    });
}
async function loadChatList() {
    if (!mainFeed) return;
    const friends = currentUser?.friends || [];
    if (!friends.length) { mainFeed.innerHTML = '<p style="color:#F5F5F5;text-align:center;padding:20px;">Nenhum amigo.</p>'; return; }
    const chats = [];
    for (const uid of friends) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) continue;
            const u = userDoc.data();
            const cid = [currentUid, uid].sort().join('_');
            const lastSnap = await db.collection('chats').doc(cid).collection('messages').orderBy('createdAt','desc').limit(1).get();
            let lastMsg = 'Nenhuma mensagem', lastTime = '';
            if (!lastSnap.empty) { const m = lastSnap.docs[0].data(); lastMsg = m.text.substring(0, 40); lastTime = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''; }
            chats.push({ uid, name: u.name, avatar: u.avatar, lastMsg, lastTime });
        } catch (e) {}
    }
    mainFeed.innerHTML = chats.map(c => `
        <div class="chat-list-item" onclick="openChatDirect('${c.uid}')">
            <img src="${c.avatar}" class="chat-list-avatar">
            <div class="chat-list-info"><div class="chat-list-name">${c.name}</div><div class="chat-list-lastmsg">${c.lastMsg}</div></div>
            <div class="chat-list-meta"><span class="chat-list-time">${c.lastTime}</span></div>
        </div>`).join('');
}
function openChatDirect(uid) {
    currentChatUid = uid;
    document.getElementById('chatModal').classList.add('active');
    db.collection('users').doc(uid).get().then(doc => { if (doc.exists) { document.getElementById('chatName').textContent = doc.data().name; document.getElementById('chatAvatar').src = doc.data().avatar; } });
    listenToChat(uid);
}
function closeChat() { document.getElementById('chatModal').classList.remove('active'); currentChatUid = null; if (chatsListener) chatsListener(); }
function listenToChat(uid) {
    const cid = [currentUid, uid].sort().join('_');
    const area = document.getElementById('chatMessages');
    if (chatsListener) chatsListener();
    chatsListener = db.collection('chats').doc(cid).collection('messages').orderBy('createdAt','asc').onSnapshot(async snap => {
        area.innerHTML = '';
        for (const doc of snap.docs) {
            const m = doc.data(); const isMine = m.senderId === currentUid;
            const time = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
            if (m.type === 'image') area.innerHTML += `<div class="msg-bubble ${isMine?'msg-sent':'msg-received'}"><img src="${m.imageData}" style="max-width:200px;border-radius:8px;"><div class="msg-time">${time}</div></div>`;
            else area.innerHTML += `<div class="msg-bubble ${isMine?'msg-sent':'msg-received'}"><div>${m.text}</div><div class="msg-time">${time}</div></div>`;
        }
        area.scrollTop = area.scrollHeight;
        db.collection('users').doc(currentUid).update({[`lastRead.${cid}`]: firebase.firestore.FieldValue.serverTimestamp()});
    });
}
async function sendChatMessage() {
    const text = document.getElementById('chatMsgInput').value.trim();
    if (!text || !currentChatUid) return;
    const cid = [currentUid, currentChatUid].sort().join('_');
    await db.collection('chats').doc(cid).collection('messages').add({ text, senderId: currentUid, senderName: currentUser.name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('chatMsgInput').value = '';
}
async function handleChatImageUpload(event) {
    const file = event.target.files[0]; if (!file || !currentChatUid) return;
    const reader = new FileReader();
    reader.onload = async (e) => { const cid = [currentUid, currentChatUid].sort().join('_'); await db.collection('chats').doc(cid).collection('messages').add({ text: '📷 Imagem', senderId: currentUid, senderName: currentUser.name, imageData: e.target.result, type: 'image', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); };
    reader.readAsDataURL(file); event.target.value = '';
}
function openMenuModal() { openModal('menuModal'); }

// ==================== FEEDBACK ====================
async function submitFeedback() {
    const text = document.getElementById('feedbackText').value.trim();
    if (!text) return showToast('Escreva seu feedback.');
    await db.collection('feedback').add({ userId: currentUid, userName: currentUser.name, userEmail: currentUser.email, text, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('feedbackText').value = '';
    closeModal('feedbackModal');
    showToast('Feedback enviado! Obrigado.');
}

// ==================== INICIALIZAÇÃO ====================
document.querySelectorAll('.header-tab').forEach(tab => {
    tab.addEventListener('click', function(e) { switchTab(this.dataset.tab, this); });
});
// Removido listener de tecla Escape que chamava closeDetail, pois não existe mais.

// ==================== EXPOSIÇÃO GLOBAL ====================
window.switchTab = switchTab;
window.switchLoginTab = switchLoginTab;
window.registerEmail = registerEmail;
window.loginEmail = loginEmail;
window.logoutUser = logoutUser;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.publishPost = publishPost;
window.capturePhoto = capturePhoto;
window.takeSnapshot = takeSnapshot;
window.closeCamera = closeCamera;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.handlePostImageUpload = handlePostImageUpload;
window.handleVideoUrl = handleVideoUrl;
window.removeMedia = removeMedia;
window.focusLocation = focusLocation;
window.openProfileModal = openProfileModal;
window.handleProfileAvatarUpload = handleProfileAvatarUpload;
window.saveProfile = saveProfile;
window.openFriendRequestsModal = openFriendRequestsModal;
window.respondFriendRequest = respondFriendRequest;
window.sendFriendRequest = sendFriendRequest;
window.unfriendUser = unfriendUser;
window.openChat = openChatDirect;
window.openChatDirect = openChatDirect;
window.closeChat = closeChat;
window.sendChatMessage = sendChatMessage;
window.handleChatImageUpload = handleChatImageUpload;
window.openContactsModal = openContactsModal;
window.openFriendProfile = openFriendProfile;
window.openMenuModal = openMenuModal;
window.openSearchModal = openSearchModal;
window.performSearch = performSearch;
window.submitFeedback = submitFeedback;
window.switchPostTab = switchPostTab;