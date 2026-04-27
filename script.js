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

// ==================== PERSISTÊNCIA DE SESSÃO ====================
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ==================== ESTADO GLOBAL ====================
let currentUser = null, currentUid = null;
let postsListener = null, profileListener = null;
let exhibitionListener = null;
let activeTab = 'feed', currentFilter = 'all';
let currentChatUid = null, chatsListener = null;
let viewedUid = null, currentMediaData = null;
let groupChatsListeners = {};
let globalConfig = {};
let onlineFriendsListener = null;
let notificationPermissionGranted = false;

// ==================== PERMISSÕES DO DISPOSITIVO ====================
async function requestAllPermissions() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        notificationPermissionGranted = perm === 'granted';
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(50);
}

function showNativeNotification(title, body) {
    if (!notificationPermissionGranted) return;
    if ('Notification' in window) {
        new Notification(title, { body, icon: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&q=80' });
    }
}

// ==================== HELPERS ====================
function showToast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(window._toastTimer); window._toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function closeAllModals() { document.querySelectorAll('.app-modal').forEach(m => m.classList.remove('active')); }

// ==================== CONFIGURAÇÃO GLOBAL (DEV) ====================
async function loadGlobalConfig() {
    try {
        const doc = await db.collection('config').doc('global').get();
        if (doc.exists) { globalConfig = doc.data().settings || {}; applyGlobalConfig(globalConfig); }
        db.collection('config').doc('global').onSnapshot(snap => {
            if (snap.exists) { globalConfig = snap.data().settings || {}; applyGlobalConfig(globalConfig); }
        });
    } catch (e) { console.error('Erro ao carregar configs:', e); }
}

function applyGlobalConfig(config) {
    if (config.primaryColor) document.documentElement.style.setProperty('--bg-header-top', config.primaryColor);
    if (config.appBackground) document.getElementById('appContainer').style.backgroundImage = `url(${config.appBackground})`;
    window._globalChatBg = config.chatBackground || null;
}

// ==================== ABAS ====================
function switchTab(tab, el) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('nowWrapper').style.display = (tab === 'feed') ? 'block' : 'none';
    document.getElementById('exhibitionWrapper').style.display = (tab === 'exhibition') ? 'block' : 'none';
    document.getElementById('chatsWrapper').style.display = (tab === 'chats') ? 'flex' : 'none';

    if (exhibitionListener && tab !== 'exhibition') {
        exhibitionListener();
        exhibitionListener = null;
    }

    if (tab === 'feed') {
        loadStatusFeed();
    } else if (tab === 'exhibition') {
        setupExhibitionListener();
    } else if (tab === 'chats') {
        loadChatList();
    }
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
            avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
            status: 'acabou de entrar', quote: '"Compartilhando pensamentos..."',
            friends: [], lastRead: {}, coins: 0, challenges: {},
            isVIP: false, isVerified: false, isAdmin: false, vipExpiresAt: null,
            hasCrown: false, crownColor: '#ffd700', frameColor: null, frameStyle: 'solid',
            chatBackground: null, appBackground: null, statusType: 'online'
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
    auth.signOut();
    closeAllModals();
    document.getElementById('loginModal').classList.add('active');
    applyUserToHeader(null);
}

// ==================== AUTH LISTENER ====================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUid = user.uid;
        const ref = db.collection('users').doc(user.uid);
        const snap = await ref.get();
        if (!snap.exists) { await auth.signOut(); return; }
        currentUser = snap.data();
        await ref.update({ statusType: 'online' });
        if (currentUser.vipExpiresAt && currentUser.vipExpiresAt.toDate() < new Date()) {
            await ref.update({ isVIP: false, vipExpiresAt: null, hasCrown: false, frameColor: null, frameStyle: 'solid', chatBackground: null, appBackground: null });
            currentUser = (await ref.get()).data();
        }
        applyUserToHeader(currentUser);
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('adminNavItem').style.display = (currentUser.email === 'nandinsillva84@gmail.com' || currentUser.isAdmin === true) ? 'block' : 'none';
        await requestAllPermissions();
        initApp();
    } else {
        if (currentUid) db.collection('users').doc(currentUid).update({ statusType: 'offline' }).catch(() => {});
        currentUid = null; currentUser = null;
        document.getElementById('loginModal').classList.add('active');
        applyUserToHeader(null);
        if (postsListener) postsListener();
        if (profileListener) profileListener();
        if (chatsListener) chatsListener();
        if (exhibitionListener) exhibitionListener();
        if (onlineFriendsListener) onlineFriendsListener();
    }
});

function applyUserToHeader(u) {
    if (!u) {
        document.getElementById('mainAvatar').src = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80';
        document.getElementById('mainName').innerHTML = 'Visitante';
        document.getElementById('mainStatus').innerHTML = '<i class="fas fa-headphones"></i> online';
        document.getElementById('mainQuote').innerHTML = '<span class="time">Agora:</span> ...';
        return;
    }
    document.getElementById('mainAvatar').src = u.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80';
    let statusColor = '#ccc';
    if (u.statusType === 'online') statusColor = '#4caf50';
    else if (u.statusType === 'away') statusColor = '#ff9800';
    else if (u.statusType === 'busy') statusColor = '#f44336';
    document.getElementById('mainAvatar').style.border = (u.isVIP && u.frameColor) ? `3px ${u.frameStyle || 'solid'} ${u.frameColor}` : `3px solid ${statusColor}`;
    let name = u.name || 'Visitante';
    if (u.isVerified) name += ' <i class="fas fa-check-circle verified-badge"></i>';
    if (u.isVIP && u.hasCrown) name += ` <i class="fas fa-crown" style="color:${u.crownColor||'#ffd700'};"></i>`;
    if (u.isVIP) name += ' <span class="vip-badge">VIP</span>';
    document.getElementById('mainName').innerHTML = name;
    document.getElementById('mainStatus').innerHTML = `<i class="fas fa-headphones"></i> ${u.status || 'online'}`;
    document.getElementById('mainQuote').innerHTML = `<span class="time">Agora:</span> ${u.quote || '...'}`;
    document.getElementById('appContainer').style.backgroundImage = u.appBackground ? `url(${u.appBackground})` : (globalConfig.appBackground || "url('https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')");
}

function listenToMyProfile() {
    if (!currentUid) return;
    if (profileListener) profileListener();
    profileListener = db.collection('users').doc(currentUid).onSnapshot(doc => {
        if (doc.exists) { currentUser = doc.data(); applyUserToHeader(currentUser); }
    });
}

// ==================== ABA NOW (STATUS) ====================
async function loadStatusFeed() {
    const wrapper = document.getElementById('nowWrapper');
    wrapper.innerHTML = '<p style="color:#fff;text-align:center;padding:20px;">Carregando...</p>';
    const friends = currentUser.friends || [];
    const statusList = [];
    for (const uid of friends) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const u = userDoc.data();
                statusList.push({
                    name: u.name || 'Usuário sem nome',
                    avatar: u.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80',
                    status: u.status || 'Sem status',
                    quote: u.quote || ''
                });
            }
        } catch (e) {}
    }
    wrapper.innerHTML = `
        <div class="exhibition-card" style="background: linear-gradient(135deg, var(--bg-header-top), var(--bg-header-bottom)); color: #fff; padding: 20px;">
            <h3 style="margin-bottom: 10px;">Meu Status</h3>
            <p style="font-size: 18px;">${currentUser.status || 'Sem status definido'}</p>
            <p style="font-size: 14px; opacity: 0.8;">${currentUser.quote || ''}</p>
            <button onclick="openProfileModal()" style="margin-top: 10px; background: rgba(255,255,255,0.2); border: none; color: #fff; padding: 8px 16px; border-radius: 20px;">Editar status</button>
        </div>
        <h4 style="color: #fff; margin: 15px 0 10px 0;">Status dos Amigos</h4>
        ${statusList.length === 0 ? '<p style="color:#fff;text-align:center;">Nenhum amigo ainda.</p>' : ''}
        ${statusList.map(s => `
            <div class="card" style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <img src="${s.avatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                <div>
                    <b>${s.name}</b>
                    <p style="font-size: 14px; color: #555;">${s.status}</p>
                    <small style="color: #888;">${s.quote}</small>
                </div>
            </div>
        `).join('')}
    `;
}

// ==================== ABA EXPOSIÇÃO (CORRIGIDA) ====================
function setupExhibitionListener() {
    const postsRef = db.collection('posts').orderBy('createdAt', 'desc');
    exhibitionListener = postsRef.onSnapshot(snap => {
        const allPosts = [];
        snap.forEach(doc => allPosts.push({ id: doc.id, ...doc.data() }));

        // Filtra apenas mídias (imagem/vídeo) para o carrossel
        const mediaPosts = allPosts.filter(p => p.media && (p.mediaType === 'image' || p.mediaType === 'video'));
        buildCarousel(mediaPosts.slice(0, 10)); // máximo 10 no carrossel

        loadOnlineFriends();

        // Filtra apenas posts de texto (com quote) para a lista abaixo
        const textPosts = allPosts.filter(p => p.quote && !p.media);
        renderExhibition(textPosts.slice(0, 30)); // limite para performance
    });
}

function renderExhibition(posts) {
    const wrapper = document.getElementById('exhibitionPosts');
    wrapper.innerHTML = '';
    if (!posts.length) { wrapper.innerHTML = '<div style="color:#fff;text-align:center;margin-top:50px;">Nenhum post de texto ainda.</div>'; return; }
    posts.forEach(p => {
        const card = document.createElement('div');
        card.className = 'exhibition-card';
        card.innerHTML = `
            <div class="exhibition-header">
                <img src="${p.avatar}" onerror="this.src='https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80'">
                <div class="exhibition-info">
                    <h3>${p.name}</h3>
                    <p><i class="${p.statusIcon || 'fas fa-headphones'}"></i> ${p.statusText || ''}</p>
                    ${p.location ? `<p><i class="fas fa-map-marker-alt"></i> ${p.location}</p>` : ''}
                </div>
            </div>
            <div class="exhibition-quote">${p.quote}</div>
        `;
        wrapper.appendChild(card);
    });
}

// ==================== FEED (NOW RÁPIDO) ====================
function setupPostsListener() {
    if (postsListener) postsListener();
    postsListener = db.collection('posts').orderBy('createdAt','desc').onSnapshot(snap => {
        const all = [];
        snap.forEach(doc => all.push({ id: doc.id, ...doc.data() }));
        renderFeed(all);
    });
}

function renderFeed(posts) {
    const wrapper = document.getElementById('nowWrapper');
    wrapper.innerHTML = '';
    if (!posts.length) { wrapper.innerHTML = '<div style="color:#fff;text-align:center;margin-top:50px;">Nenhum post.</div>'; return; }
    posts.forEach(p => {
        const liked = currentUid && p.likedBy?.includes(currentUid);
        let mediaHTML = '';
        if (p.media && p.mediaType === 'image') mediaHTML = `<div style="margin-top:10px;border-radius:12px;overflow:hidden;"><img src="${p.media}" style="width:100%;"></div>`;
        else if (p.media && p.mediaType === 'video') mediaHTML = `<div style="margin-top:10px;border-radius:12px;overflow:hidden;"><video src="${p.media}" controls style="width:100%;"></video></div>`;
        let locHTML = p.location ? `<div style="font-size:12px;color:#888;margin-top:5px;"><i class="fas fa-map-marker-alt"></i> ${p.location}</div>` : '';
        wrapper.innerHTML += `
            <div class="card ${p.isYellow ? 'yellow' : ''}">
                <div class="card-top">
                    <img src="${p.avatar}" class="card-avatar" onerror="this.src='https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80'">
                    <div class="card-content">
                        <div class="card-name" onclick="openUserProfile('${p.userId}')">${p.name}</div>
                        <div class="card-quote">${p.quote}</div>
                        ${mediaHTML} ${locHTML}
                    </div>
                </div>
                <div class="card-footer">
                    <span class="card-time">${p.time}</span><div class="card-line"></div>
                    <div class="card-interactions">
                        <span class="interaction" onclick="toggleLike('${p.id}')"><i class="${liked?'fas':'far'} fa-heart" style="color:${liked?'var(--like-red)':'inherit'}"></i> ${p.likes}</span>
                        <span class="interaction" onclick="openComments('${p.id}')">💬 ${p.comments || 0}</span>
                        <span class="interaction" onclick="sharePost('${p.id}')"><i class="fas fa-share"></i> ${p.shares}</span>
                    </div>
                </div>
            </div>`;
    });
}

function buildCarousel(posts) {
    const track = document.getElementById('carouselTrack');
    const inds = document.getElementById('carouselIndicators');
    if (!track || !inds) return;
    track.innerHTML = posts.map(p => `<div class="carousel-slide" onclick="showToast('Mídia de ${p.name}')"><img src="${p.avatar}" onerror="this.src='https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80'"><div class="carousel-text"><h4>${p.name}</h4><p>${p.mediaType === 'video' ? '🎥 Vídeo' : '📷 Imagem'}</p></div></div>`).join('');
    inds.innerHTML = posts.map((_,i) => `<span class="carousel-dot ${i===0?'active':''}" onclick="goToCarouselSlide(${i})"></span>`).join('');
    currentCarouselIndex = 0; updateCarouselPosition(); startCarouselAuto();
}
let carouselInterval = null, currentCarouselIndex = 0;
function updateCarouselPosition() { document.getElementById('carouselTrack').style.transform = `translateX(-${currentCarouselIndex*100}%)`; document.querySelectorAll('.carousel-dot').forEach((d,i) => d.classList.toggle('active', i===currentCarouselIndex)); }
function goToCarouselSlide(i) { currentCarouselIndex = i; updateCarouselPosition(); restartCarouselAuto(); }
function nextCarouselSlide() { const slides = document.querySelectorAll('.carousel-slide').length; if (slides) currentCarouselIndex = (currentCarouselIndex+1)%slides; updateCarouselPosition(); }
function startCarouselAuto() { clearInterval(carouselInterval); carouselInterval = setInterval(nextCarouselSlide, 4000); }
function restartCarouselAuto() { clearInterval(carouselInterval); startCarouselAuto(); }

async function toggleLike(postId) {
    if (!currentUid) return;
    const ref = db.collection('posts').doc(postId);
    const doc = await ref.get();
    if (!doc.exists) return;
    const data = doc.data(); const likedBy = data.likedBy || [];
    if (likedBy.includes(currentUid)) await ref.update({likes: data.likes-1, likedBy: firebase.firestore.FieldValue.arrayRemove(currentUid)});
    else await ref.update({likes: data.likes+1, likedBy: firebase.firestore.FieldValue.arrayUnion(currentUid)});
}
function openComments(postId) { showToast('Comentários em breve!'); }
async function sharePost(postId) { await db.collection('posts').doc(postId).update({shares: firebase.firestore.FieldValue.increment(1)}); showToast('Compartilhado!'); }

// ==================== PUBLICADOR ====================
function toggleEmojiPicker() { const p = document.getElementById('emojiPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
function insertEmoji(e) { document.getElementById('newPostText').value += e; document.getElementById('emojiPicker').style.display = 'none'; }
function handlePostImageUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { currentMediaData = { type: 'image', url: e.target.result }; showMediaPreview(); };
    reader.readAsDataURL(file); event.target.value = '';
}
function handleVideoUrl(url) { if (!url.trim()) return; currentMediaData = { type: 'video', url: url.trim() }; showMediaPreview(); }
function showMediaPreview() {
    const preview = document.getElementById('mediaPreview'), content = document.getElementById('mediaContent');
    if (!currentMediaData) return;
    preview.style.display = 'block'; content.innerHTML = currentMediaData.type === 'image' ? `<img src="${currentMediaData.url}">` : `<video src="${currentMediaData.url}" controls></video>`;
}
function removeMedia() { currentMediaData = null; document.getElementById('mediaPreview').style.display = 'none'; document.getElementById('mediaContent').innerHTML = ''; }
function focusLocation() { document.getElementById('locationInput').focus(); }

async function publishPost() {
    if (!currentUid) return showToast('Faça login.');
    const text = document.getElementById('newPostText').value.trim();
    const location = document.getElementById('locationInput').value.trim();
    if (!text && !currentMediaData) return showToast('Escreva algo ou adicione mídia.');
    await db.collection('posts').add({
        userId: currentUid, name: currentUser.name, avatar: currentUser.avatar,
        quote: text, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        likes:0, likedBy:[], comments:0, shares:0, isYellow:false, isFixed:false,
        location: location || null, media: currentMediaData?.url || null, mediaType: currentMediaData?.type || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const userRef = db.collection('users').doc(currentUid);
    await userRef.update({ coins: firebase.firestore.FieldValue.increment(10) });
    const today = new Date().toISOString().slice(0,10);
    const challenges = currentUser.challenges || {};
    if (!challenges[today]) challenges[today] = { posts: 1 };
    else challenges[today].posts = (challenges[today].posts || 0) + 1;
    if (challenges[today].posts === 3 && !challenges[today].rewarded) {
        await userRef.update({ coins: firebase.firestore.FieldValue.increment(50), [`challenges.${today}.rewarded`]: true });
        showToast('Desafio concluído! +50 moedas 🎉');
    } else { await userRef.update({ [`challenges.${today}.posts`]: challenges[today].posts }); }
    document.getElementById('newPostText').value = '';
    document.getElementById('locationInput').value = '';
    removeMedia(); document.getElementById('emojiPicker').style.display = 'none';
    closeModal('postModal'); showToast('Publicado! +10 moedas');
}

// ==================== PERFIL PRÓPRIO ====================
function openProfileModal() {
    if (!currentUid) return;
    document.getElementById('editFirstName').value = currentUser.firstName || '';
    document.getElementById('editLastName').value = currentUser.lastName || '';
    document.getElementById('editStatus').value = currentUser.status || '';
    document.getElementById('editQuote').value = currentUser.quote || '';
    document.getElementById('profileAvatarPreview').src = currentUser.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80';
    document.getElementById('editPassword').value = ''; document.getElementById('editPasswordConfirm').value = '';
    document.getElementById('vipCustomization').style.display = currentUser.isVIP ? 'block' : 'none';
    if (currentUser.isVIP) document.getElementById('editFrameColor').value = currentUser.frameColor || '#ffd700';
    document.getElementById('coinsDisplay').textContent = currentUser.coins || 0;
    document.getElementById('vipBuyBtn').style.display = (currentUser.coins >= (globalConfig.vipCost || 200) && !currentUser.isVIP) ? 'block' : 'none';
    openModal('profileModal');
}
function handleProfileAvatarUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { document.getElementById('profileAvatarPreview').src = e.target.result; window._newAvatarData = e.target.result; };
    reader.readAsDataURL(file);
}
async function saveProfile() {
    const fn = document.getElementById('editFirstName').value.trim();
    const ln = document.getElementById('editLastName').value.trim();
    const status = document.getElementById('editStatus').value.trim();
    const quote = document.getElementById('editQuote').value.trim();
    const pass = document.getElementById('editPassword').value.trim();
    const pass2 = document.getElementById('editPasswordConfirm').value.trim();
    if (!fn || !ln) return showToast('Nome e sobrenome obrigatórios.');
    if (pass && pass !== pass2) return showToast('Senhas não conferem.');
    const updates = { firstName: fn, lastName: ln, name: `${fn} ${ln}`, status, quote };
    if (window._newAvatarData) updates.avatar = window._newAvatarData;
    if (pass && pass.length >= 6) {
        try { await auth.currentUser.updatePassword(pass); } catch (e) { showToast('Erro ao alterar senha.'); return; }
    }
    if (currentUser.isVIP) {
        updates.frameColor = document.getElementById('editFrameColor').value;
        const chatBg = document.getElementById('editChatBgFile').files[0];
        const appBg = document.getElementById('editAppBgFile').files[0];
        if (chatBg) { const r = new FileReader(); r.onload = async (e) => { updates.chatBackground = e.target.result; await db.collection('users').doc(currentUid).update(updates); }; r.readAsDataURL(chatBg); }
        if (appBg) { const r = new FileReader(); r.onload = async (e) => { updates.appBackground = e.target.result; await db.collection('users').doc(currentUid).update(updates); }; r.readAsDataURL(appBg); }
    }
    await db.collection('users').doc(currentUid).update(updates);
    window._newAvatarData = null;
    showToast('Perfil atualizado!');
    closeModal('profileModal');
}
async function buyVipWithCoins() {
    const cost = globalConfig.vipCost || 200;
    if (!currentUid || currentUser.coins < cost || currentUser.isVIP) return;
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.collection('users').doc(currentUid).update({
        coins: currentUser.coins - cost, isVIP: true, vipExpiresAt: firebase.firestore.Timestamp.fromDate(exp),
        hasCrown: true, crownColor: '#ffd700', frameColor: '#ffd700', frameStyle: 'solid'
    });
    showToast('VIP ativado por 7 dias! 🎉');
    closeModal('profileModal');
}

// ==================== AMIGOS E SOLICITAÇÕES ====================
async function openUserProfile(uid) {
    if (uid === currentUid) return openProfileModal();
    viewedUid = uid;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return showToast('Usuário não encontrado.');
    const u = doc.data();
    document.getElementById('viewAvatar').src = u.avatar;
    document.getElementById('viewName').innerHTML = (u.isVerified ? '<i class="fas fa-check-circle verified-badge"></i> ' : '') + u.name;
    document.getElementById('viewStatus').textContent = u.status || '';
    document.getElementById('viewQuote').textContent = u.quote || '';
    const btn = document.getElementById('friendActionBtn');
    const friends = currentUser.friends || [];
    if (friends.includes(uid)) { btn.textContent = '✓ Amigos'; btn.disabled = true; }
    else {
        const pend = await db.collection('friendRequests').where('from','==',currentUid).where('to','==',uid).where('status','==','pending').get();
        btn.textContent = pend.empty ? 'Adicionar como amigo' : 'Solicitação enviada';
        btn.disabled = !pend.empty;
    }
    openModal('userProfileModal');
}
async function toggleFriendship() {
    if (!viewedUid) return;
    await db.collection('friendRequests').add({ from: currentUid, to: viewedUid, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('friendActionBtn').textContent = 'Solicitação enviada';
    document.getElementById('friendActionBtn').disabled = true;
    showToast('Solicitação enviada!');
    if (navigator.vibrate) navigator.vibrate(50);
}
function openFriendRequestsModal() { openModal('friendRequestsModal'); renderFriendRequests(); }
async function renderFriendRequests() {
    const list = document.getElementById('friendRequestsList');
    const snap = await db.collection('friendRequests').where('to','==',currentUid).where('status','==','pending').get();
    if (snap.empty) { list.innerHTML = '<p>Nenhuma solicitação.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(doc => {
        const r = doc.data();
        list.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px;"><b>${r.from}</b>
            <div><button onclick="respondFriendRequest('${doc.id}','accepted')">Aceitar</button>
            <button onclick="respondFriendRequest('${doc.id}','rejected')">Recusar</button></div></div>`;
    });
}
async function respondFriendRequest(reqId, status) {
    const req = await db.collection('friendRequests').doc(reqId).get();
    const d = req.data();
    if (status === 'accepted') {
        await db.collection('users').doc(d.from).update({ friends: firebase.firestore.FieldValue.arrayUnion(d.to) });
        await db.collection('users').doc(d.to).update({ friends: firebase.firestore.FieldValue.arrayUnion(d.from) });
        showNativeNotification('Nova amizade', `${d.from} aceitou seu pedido.`);
    }
    await db.collection('friendRequests').doc(reqId).update({ status });
    currentUser = (await db.collection('users').doc(currentUid).get()).data();
    applyUserToHeader(currentUser);
    renderFriendRequests();
    showToast(status === 'accepted' ? 'Amigo adicionado!' : 'Solicitação recusada.');
}

// ==================== AMIGOS ONLINE ====================
function loadOnlineFriends() {
    if (!currentUid) return;
    const container = document.getElementById('onlineFriends');
    if (!container) return;
    if (onlineFriendsListener) onlineFriendsListener();
    onlineFriendsListener = db.collection('users').where('statusType','==','online').onSnapshot(snap => {
        container.innerHTML = '';
        const friends = currentUser.friends || [];
        snap.forEach(doc => {
            if (doc.id === currentUid) return;
            const u = doc.data();
            if (!friends.includes(doc.id)) return;
            const avatar = u.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80';
            container.innerHTML += `
                <div style="text-align:center; cursor:pointer;" onclick="openFriendProfile('${doc.id}')">
                    <img src="${avatar}" style="width:50px;height:50px;border-radius:50%; border: 3px solid ${u.isVIP && u.frameColor ? u.frameColor : '#4caf50'}; object-fit:cover;">
                    <div style="font-size:11px;color:#fff;">${u.name.split(' ')[0]}</div>
                </div>`;
        });
    });
}

// ==================== PERFIL DO AMIGO ====================
async function openFriendProfile(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return showToast('Usuário não encontrado.');
    const u = userDoc.data();
    const postsSnap = await db.collection('posts').where('userId','==',uid).orderBy('createdAt','desc').limit(5).get();
    const posts = []; postsSnap.forEach(doc => posts.push(doc.data()));
    const mediaSnap = await db.collection('posts').where('userId','==',uid).where('media','!=',null).orderBy('media').orderBy('createdAt','desc').limit(10).get();
    const medias = []; mediaSnap.forEach(doc => medias.push(doc.data()));
    const profileHTML = `
        <div style="text-align: center;">
            <img src="${u.avatar}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid ${u.isVIP && u.frameColor ? u.frameColor : '#ccc'};">
            <h2>${u.name} ${u.isVerified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''} ${u.isVIP ? '<span class="vip-badge">VIP</span>' : ''}</h2>
            <p>${u.status || 'Sem status'}</p>
            <p style="color: #888;">${u.quote || ''}</p>
            <button onclick="openChatDirect('${uid}'); closeModal('userProfileModal');" class="btn-primary" style="margin-top: 10px;">💬 Conversar</button>
        </div>
        <h4 style="margin-top: 20px;">📝 Últimos Posts</h4>
        ${posts.length === 0 ? '<p>Nenhum post ainda.</p>' : ''}
        ${posts.map(p => `<div class="card" style="margin-bottom: 8px;"><div class="card-quote">${p.quote}</div><div class="card-time">${p.time}</div></div>`).join('')}
        <h4 style="margin-top: 20px;">🖼️ Galeria</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${medias.length === 0 ? '<p>Nenhuma mídia.</p>' : ''}
            ${medias.map(m => `<img src="${m.media}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">`).join('')}
        </div>
    `;
    document.getElementById('userProfileModal').querySelector('.modal-body').innerHTML = profileHTML;
    openModal('userProfileModal');
}

// ==================== CONTATOS ====================
function openContactsModal() {
    openModal('contactsModal');
    const list = document.getElementById('contactsList');
    list.innerHTML = '<p>Carregando...</p>';
    const friends = currentUser.friends || [];
    if (!friends.length) { list.innerHTML = '<p>Você ainda não tem amigos.</p>'; return; }
    Promise.all(friends.map(async uid => {
        try {
            const doc = await db.collection('users').doc(uid).get();
            if (!doc.exists) return null;
            const u = doc.data();
            return { uid, name: u.name || 'Usuário', avatar: u.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&q=80' };
        } catch (e) { return null; }
    })).then(contacts => {
        const validContacts = contacts.filter(c => c !== null);
        let html = '<h4>Amigos</h4>';
        if (validContacts.length === 0) html += '<p>Nenhum contato disponível.</p>';
        else validContacts.forEach(c => { html += `<div class="contact-item" onclick="openFriendProfile('${c.uid}')"><img src="${c.avatar}" class="contact-avatar"><div><b>${c.name}</b></div></div>`; });
        db.collection('groups').where('members','array-contains',currentUid).get().then(gSnap => {
            if (!gSnap.empty) {
                html += '<h4 style="margin-top:15px;">Grupos</h4>';
                gSnap.forEach(doc => { const g = doc.data(); html += `<div class="contact-item" onclick="openGroupChat('${doc.id}','${g.name}')"><i class="fas fa-users"></i><b>${g.name}</b></div>`; });
            }
            list.innerHTML = html;
        }).catch(() => { list.innerHTML = html; });
    }).catch(() => { list.innerHTML = '<p>Erro ao carregar contatos.</p>'; });
}

// ==================== CHAT INLINE (TEXTZ) ====================
async function loadChatList() {
    const wrapper = document.getElementById('chatsWrapper');
    wrapper.innerHTML = '<p style="text-align:center;color:#fff;padding:20px;">Carregando...</p>';
    const friends = currentUser.friends || [];
    if (!friends.length) { wrapper.innerHTML = '<p style="text-align:center;color:#fff;padding:20px;">Nenhum amigo.</p>'; return; }
    const chats = [];
    for (const uid of friends) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) continue;
            const u = userDoc.data();
            const cid = [currentUid, uid].sort().join('_');
            const lastSnap = await db.collection('chats').doc(cid).collection('messages').orderBy('createdAt','desc').limit(1).get();
            let lastMsg = 'Nenhuma mensagem', lastTime = '';
            if (!lastSnap.empty) {
                const m = lastSnap.docs[0].data();
                lastMsg = m.text.substring(0, 40);
                lastTime = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
            }
            let statusColor = '#ccc';
            if (u.statusType === 'online') statusColor = '#4caf50';
            else if (u.statusType === 'away') statusColor = '#ff9800';
            else if (u.statusType === 'busy') statusColor = '#f44336';
            chats.push({ uid, name: u.name || 'Usuário', avatar: u.avatar || '', lastMsg, lastTime, statusColor, isVIP: u.isVIP, frameColor: u.frameColor });
        } catch (e) {}
    }
    chats.sort((a,b) => (b.lastTime||'').localeCompare(a.lastTime||''));
    wrapper.innerHTML = chats.map(c => `
        <div class="chat-list-item" data-uid="${c.uid}" onclick="openChatInline('${c.uid}')">
            <img src="${c.avatar}" class="chat-list-avatar" style="border: 3px solid ${c.isVIP && c.frameColor ? c.frameColor : c.statusColor};" onerror="this.src='https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80'">
            <div class="chat-list-info"><div class="chat-list-name">${c.name}</div><div class="chat-list-lastmsg">${c.lastMsg}</div></div>
            <div class="chat-list-meta"><span class="chat-list-time">${c.lastTime}</span></div>
        </div>`).join('');
}
function openChatInline(uid) {
    if (!currentUid || !currentUser.friends.includes(uid)) return showToast('Adicione como amigo.');
    const previous = document.querySelector('.chat-inline');
    if (previous) previous.remove();
    const items = document.querySelectorAll('.chat-list-item');
    for (const item of items) {
        if (item.dataset.uid === uid) {
            item.insertAdjacentHTML('afterend', `<div class="chat-inline" id="inline-${uid}" style="background:#e5ddd5; padding:10px; max-height:300px; overflow-y:auto; border-bottom:1px solid #ccc;">
                <div class="chat-inline-messages" id="inlineMessages-${uid}" style="display:flex; flex-direction:column; gap:8px;">Carregando...</div>
                <div style="display:flex; gap:10px; margin-top:8px;">
                    <input type="text" id="inlineInput-${uid}" class="chat-input" placeholder="Digite..." style="flex:1; border-radius:20px; padding:8px;">
                    <button class="chat-send-btn" onclick="sendInlineMessage('${uid}')"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>`);
            item.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            listenToInlineChat(uid);
            break;
        }
    }
}
function listenToInlineChat(uid) {
    const cid = [currentUid, uid].sort().join('_');
    const area = document.getElementById(`inlineMessages-${uid}`);
    if (!area) return;
    db.collection('chats').doc(cid).collection('messages').orderBy('createdAt','asc').onSnapshot(snap => {
        area.innerHTML = '';
        snap.forEach(doc => {
            const m = doc.data();
            const isMine = m.senderId === currentUid;
            const time = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
            area.innerHTML += `<div class="msg-bubble ${isMine?'msg-sent':'msg-received'}" style="max-width:80%;"><div>${m.text}</div><div class="msg-time">${time}</div></div>`;
        });
        area.scrollTop = area.scrollHeight;
        db.collection('users').doc(currentUid).update({[`lastRead.${cid}`]: firebase.firestore.FieldValue.serverTimestamp()});
    });
}
async function sendInlineMessage(uid) {
    const input = document.getElementById(`inlineInput-${uid}`);
    const text = input.value.trim();
    if (!text || !uid) return;
    const cid = [currentUid, uid].sort().join('_');
    await db.collection('chats').doc(cid).collection('messages').add({
        text, senderId: currentUid, senderName: currentUser.name, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

// ==================== CHAT TELA CHEIA ====================
function openChatDirect(uid) {
    if (!currentUid || !currentUser.friends.includes(uid)) return showToast('Adicione como amigo.');
    document.getElementById('chatModal').classList.add('active');
    openChatInternal(uid);
}
function openChat(uid) { openChatDirect(uid); }
function closeChat() {
    document.getElementById('chatModal').classList.remove('active');
    if (chatsListener) chatsListener();
    currentChatUid = null;
}
function openChatInternal(uid) {
    currentChatUid = uid;
    db.collection('users').doc(uid).get().then(doc => {
        if (doc.exists) {
            document.getElementById('chatName').textContent = doc.data().name;
            document.getElementById('chatAvatar').src = doc.data().avatar;
        }
    });
    listenToChat(uid);
}
function listenToChat(uid) {
    const cid = [currentUid, uid].sort().join('_');
    const area = document.getElementById('chatMessages');
    if (chatsListener) chatsListener();
    chatsListener = db.collection('chats').doc(cid).collection('messages').orderBy('createdAt','asc').onSnapshot(snap => {
        area.innerHTML = '';
        snap.forEach(doc => {
            const m = doc.data();
            const isMine = m.senderId === currentUid;
            const time = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
            area.innerHTML += `<div class="msg-bubble ${isMine?'msg-sent':'msg-received'}"><div>${m.text}</div><div class="msg-time">${time}</div></div>`;
        });
        area.scrollTop = area.scrollHeight;
        db.collection('users').doc(currentUid).update({[`lastRead.${cid}`]: firebase.firestore.FieldValue.serverTimestamp()});
        if (snap.docChanges().some(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites)) {
            showNativeNotification('Nova mensagem', 'Você recebeu uma nova mensagem.');
        }
    });
    if (currentUser.chatBackground) document.getElementById('chatModal').querySelector('.chat-messages').style.backgroundImage = `url(${currentUser.chatBackground})`;
    else if (window._globalChatBg) document.getElementById('chatModal').querySelector('.chat-messages').style.backgroundImage = `url(${window._globalChatBg})`;
    else document.getElementById('chatModal').querySelector('.chat-messages').style.backgroundImage = '';
}
async function sendChatMessage() {
    const text = document.getElementById('chatMsgInput').value.trim();
    if (!text || !currentChatUid) return;
    const cid = [currentUid, currentChatUid].sort().join('_');
    await db.collection('chats').doc(cid).collection('messages').add({
        text, senderId: currentUid, senderName: currentUser.name, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chatMsgInput').value = '';
}

// ==================== GRUPOS ====================
function openCreateGroupModal() {
    openModal('createGroupModal');
    const checklist = document.getElementById('friendsChecklist');
    checklist.innerHTML = '<p>Carregando...</p>';
    const friends = currentUser.friends || [];
    Promise.all(friends.map(async uid => {
        try { const u = (await db.collection('users').doc(uid).get()).data(); return { uid, name: u.name || 'Usuário' }; }
        catch (e) { return null; }
    })).then(users => {
        const valid = users.filter(u => u !== null);
        checklist.innerHTML = valid.map(u => `<label><input type="checkbox" value="${u.uid}"> ${u.name}</label>`).join('<br>');
    });
}
async function createGroup() {
    const name = document.getElementById('groupNameInput').value.trim();
    if (!name) return showToast('Nome obrigatório.');
    const members = [currentUid];
    document.querySelectorAll('#friendsChecklist input:checked').forEach(cb => members.push(cb.value));
    await db.collection('groups').add({ name, members, createdBy: currentUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    showToast('Grupo criado!');
    closeModal('createGroupModal');
    openContactsModal();
}
function openGroupChat(groupId, groupName) {
    document.getElementById('groupChatName').textContent = groupName;
    document.getElementById('groupChatModal').dataset.groupId = groupId;
    const area = document.getElementById('groupChatArea');
    if (groupChatsListeners[groupId]) groupChatsListeners[groupId]();
    groupChatsListeners[groupId] = db.collection('groups').doc(groupId).collection('messages').orderBy('createdAt','asc').onSnapshot(snap => {
        area.innerHTML = '';
        snap.forEach(doc => {
            const m = doc.data();
            area.innerHTML += `<div class="msg-bubble ${m.senderId===currentUid?'msg-sent':'msg-received'}"><div><b>${m.senderName}</b></div><div>${m.text}</div></div>`;
        });
        area.scrollTop = area.scrollHeight;
        if (snap.docChanges().some(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites)) {
            showNativeNotification('Grupo', 'Nova mensagem no grupo.');
        }
    });
    openModal('groupChatModal');
}
async function sendGroupChatMsg() {
    const groupId = document.getElementById('groupChatModal').dataset.groupId;
    const text = document.getElementById('groupChatMsgInput').value.trim();
    if (!text || !groupId) return;
    await db.collection('groups').doc(groupId).collection('messages').add({
        text, senderId: currentUid, senderName: currentUser.name, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('groupChatMsgInput').value = '';
}
async function clearGroupChatHistory() {
    const groupId = document.getElementById('groupChatModal').dataset.groupId;
    if (!confirm('Limpar histórico?')) return;
    const snap = await db.collection('groups').doc(groupId).collection('messages').get();
    const batch = db.batch(); snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit(); showToast('Histórico limpo.');
}

// ==================== EXPLORAR / MENU ====================
async function openExploreModal() {
    openModal('exploreModal');
    const list = document.getElementById('exploreList');
    list.innerHTML = '<p>Carregando...</p>';
    const snap = await db.collection('users').get();
    const users = [];
    snap.forEach(doc => { if (doc.id !== currentUid) users.push({id: doc.id, ...doc.data()}); });
    list.innerHTML = users.map(u => `<div class="contact-item" onclick="openFriendProfile('${u.id}')"><img src="${u.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&q=80'}" class="contact-avatar"><div><b>${u.name || 'Usuário'}</b></div></div>`).join('');
}
function openMenuModal() { openModal('menuModal'); }

// ==================== FEEDBACK ====================
async function submitFeedback() {
    const text = document.getElementById('feedbackText').value.trim();
    if (!text) return showToast('Escreva seu feedback.');
    await db.collection('feedback').add({
        userId: currentUid, userName: currentUser.name, userEmail: currentUser.email,
        text: text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('feedbackText').value = '';
    closeModal('feedbackModal');
    showToast('Feedback enviado! Obrigado.');
}

// ==================== PAINEL ADMIN (COMPLETO) ====================
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    const tabs = ['users','posts','chats','turbinate','dev','feedback'];
    const idx = tabs.indexOf(tab);
    if (idx === -1) return;
    document.querySelectorAll('.admin-tab')[idx].classList.add('active');
    loadAdminTabContent(tab);
}
function loadAdminTabContent(tab) {
    const area = document.getElementById('adminContent');
    area.innerHTML = '<div style="text-align:center;padding:30px;">Carregando...</div>';
    if (tab === 'users') loadAdminUsers(area);
    else if (tab === 'posts') loadAdminPosts(area);
    else if (tab === 'chats') loadAdminChats(area);
    else if (tab === 'turbinate') loadAdminTurbinate(area);
    else if (tab === 'dev') loadAdminDev(area);
    else if (tab === 'feedback') loadAdminFeedback(area);
}
async function loadAdminUsers(area) {
    const users = await db.collection('users').get();
    area.innerHTML = '<h3>👥 Usuários</h3>';
    users.forEach(doc => {
        const u = doc.data();
        area.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #ccc;">
            <span>${u.name} ${u.isVIP?'👑':''} ${u.isVerified?'✅':''} ${u.isAdmin?'🛡️':''}</span>
            <div>
                <button class="btn-small btn-warning" onclick="toggleVIP('${doc.id}',${!u.isVIP})">${u.isVIP?'-VIP':'+VIP'}</button>
                <button class="btn-small btn-info" onclick="toggleVerified('${doc.id}',${!u.isVerified})">${u.isVerified?'-Verif':'+Verif'}</button>
                <button class="btn-small btn-edit" onclick="toggleAdmin('${doc.id}',${!u.isAdmin})">${u.isAdmin?'-Admin':'+Admin'}</button>
                <button class="btn-small btn-edit" onclick="editUser('${doc.id}')">Editar</button>
                <button class="btn-small btn-info" onclick="viewUserChats('${doc.id}')">Chats</button>
                <button class="btn-small btn-danger" onclick="deleteUserComplete('${doc.id}')">Excluir</button>
            </div></div>`;
    });
}
async function toggleVIP(uid, val) { await db.collection('users').doc(uid).update({ isVIP: val, hasCrown: val }); showToast(val?'VIP ativado!':'VIP removido.'); loadAdminTabContent('users'); }
async function toggleVerified(uid, val) { await db.collection('users').doc(uid).update({ isVerified: val }); showToast(val?'Verificado!':'Selo removido.'); loadAdminTabContent('users'); }
async function toggleAdmin(uid, val) { await db.collection('users').doc(uid).update({ isAdmin: val }); showToast(val?'Administrador concedido!':'Administrador removido.'); loadAdminTabContent('users'); }
async function editUser(uid) {
    const doc = await db.collection('users').doc(uid).get();
    const u = doc.data();
    const name = prompt('Nome:', u.name);
    const email = prompt('Email:', u.email);
    const password = prompt('Senha:', u.password);
    const avatar = prompt('Avatar URL:', u.avatar);
    const status = prompt('Status:', u.status);
    const quote = prompt('Frase:', u.quote);
    if (name !== null) { await db.collection('users').doc(uid).update({ name, email, password, avatar, status, quote }); showToast('Usuário atualizado.'); loadAdminTabContent('users'); }
}
async function deleteUserComplete(uid) {
    if (!confirm(`Excluir ${uid}?`)) return;
    const posts = await db.collection('posts').where('userId','==',uid).get();
    const batch = db.batch(); posts.forEach(doc => batch.delete(doc.ref)); batch.delete(db.collection('users').doc(uid));
    await batch.commit(); showToast('Usuário excluído.'); loadAdminTabContent('users');
}
async function viewUserChats(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    const userName = userDoc.exists ? userDoc.data().name : uid;
    const chatsSnap = await db.collection('chats').get();
    let chatList = '';
    chatsSnap.forEach(doc => { if (doc.id.includes(uid)) chatList += `Chat: ${doc.id.replace(/_/g, ' e ')}\n`; });
    alert(`Chats de ${userName}:\n\n${chatList || 'Nenhum chat encontrado.'}`);
}
async function loadAdminPosts(area) {
    const posts = await db.collection('posts').orderBy('createdAt','desc').limit(50).get();
    area.innerHTML = '<h3>📝 Posts</h3>';
    posts.forEach(doc => { const p = doc.data(); area.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #ccc;"><span><b>${p.name}</b>: ${p.quote?.substring(0,40)}</span><button class="btn-small btn-danger" onclick="deletePost('${doc.id}')">Excluir</button></div>`; });
}
async function deletePost(postId) { if (confirm('Excluir post?')) { await db.collection('posts').doc(postId).delete(); showToast('Post excluído.'); loadAdminTabContent('posts'); } }
async function loadAdminChats(area) {
    const chats = await db.collection('chats').get();
    area.innerHTML = '<h3>💬 Chats</h3>';
    chats.forEach(chat => { area.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #ccc;"><span>Chat: ${chat.id.replace(/_/g,' e ')}</span><button class="btn-small btn-danger" onclick="clearChatAdmin('${chat.id}')">Limpar</button></div>`; });
}
async function clearChatAdmin(chatId) {
    if (confirm('Limpar chat?')) { const snap = await db.collection('chats').doc(chatId).collection('messages').get(); const batch = db.batch(); snap.forEach(doc => batch.delete(doc.ref)); await batch.commit(); showToast('Chat limpo.'); loadAdminTabContent('chats'); }
}
function loadAdminTurbinate(area) {
    area.innerHTML = `
        <h3>✨ Turbinar Conta</h3>
        <label>Avatar (URL ou upload): <input type="file" id="turbAvatarFile" accept="image/*" onchange="handleAdminAvatarUpload(event)"></label>
        <input id="turbAvatar" value="${currentUser.avatar||''}" style="width:100%;margin-bottom:10px;">
        <label>Coroa: <select id="turbHasCrown"><option value="true" ${currentUser.hasCrown?'selected':''}>Sim</option><option value="false">Não</option></select></label>
        <label>Cor: <input type="color" id="turbCrownColor" value="${currentUser.crownColor||'#ffd700'}"></label>
        <label>Moldura: <input type="color" id="turbFrameColor" value="${currentUser.frameColor||'#ffd700'}"></label>
        <label>Estilo: <select id="turbFrameStyle"><option value="solid">Sólida</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option><option value="double">Dupla</option></select></label>
        <label>VIP: <select id="turbIsVIP"><option value="true" ${currentUser.isVIP?'selected':''}>Sim</option><option value="false">Não</option></select></label>
        <label>Fundo Chat: <input type="file" id="turbChatBgFile" onchange="handleChatBgUpload(event)"></label>
        <label>Fundo App: <input type="file" id="turbAppBgFile" onchange="handleAppBgUpload(event)"></label>
        <button class="btn-primary" onclick="saveTurbinate()">💾 Salvar</button>
    `;
}
function handleAdminAvatarUpload(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = e => document.getElementById('turbAvatar').value = e.target.result; reader.readAsDataURL(file); }
function handleChatBgUpload(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = e => window._chatBgData = e.target.result; reader.readAsDataURL(file); }
function handleAppBgUpload(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = e => window._appBgData = e.target.result; reader.readAsDataURL(file); }
async function saveTurbinate() {
    const data = { avatar: document.getElementById('turbAvatar').value.trim(), hasCrown: document.getElementById('turbHasCrown').value === 'true', crownColor: document.getElementById('turbCrownColor').value, frameColor: document.getElementById('turbFrameColor').value, frameStyle: document.getElementById('turbFrameStyle').value, isVIP: document.getElementById('turbIsVIP').value === 'true' };
    if (window._chatBgData) data.chatBackground = window._chatBgData;
    if (window._appBgData) data.appBackground = window._appBgData;
    await db.collection('users').doc(currentUid).update(data);
    window._chatBgData = null; window._appBgData = null;
    showToast('Turbinado!'); loadAdminTabContent('turbinate');
}
function loadAdminDev(area) {
    const docRef = db.collection('config').doc('global');
    docRef.get().then(doc => {
        const settings = doc.exists ? (doc.data().settings || {}) : {};
        area.innerHTML = `
            <h3>🛠️ Configurações Globais</h3>
            <div class="admin-form">
                <label>🎨 Cor Principal</label><input type="color" id="devPrimaryColor" value="${settings.primaryColor||'#8b1031'}">
                <label>🖼️ Fundo do App (URL)</label><input type="text" id="devAppBg" value="${settings.appBackground||''}">
                <label>💬 Fundo do Chat (URL)</label><input type="text" id="devChatBg" value="${settings.chatBackground||''}">
                <label>🧭 Ordem das Abas</label><input type="text" id="devTabOrder" value="${settings.tabOrder||'NOW,Textz,Exposição'}">
                <label>❌ Ocultar NOW</label><input type="checkbox" id="devHideNow" ${settings.hideNow?'checked':''}>
                <label>❌ Ocultar Textz</label><input type="checkbox" id="devHideTextz" ${settings.hideTextz?'checked':''}>
                <label>❌ Ocultar Exposição</label><input type="checkbox" id="devHideExhibition" ${settings.hideExhibition?'checked':''}>
                <label>📝 Limite posts/dia</label><input type="number" id="devMaxPosts" value="${settings.maxPostsPerDay||10}">
                <label>💎 Preço VIP (moedas)</label><input type="number" id="devVipCost" value="${settings.vipCost||200}">
                <button class="btn-primary" onclick="saveDevConfig()">💾 Salvar</button>
                <button class="btn-outline" onclick="resetDevConfig()">🔄 Restaurar</button>
            </div>`;
    });
}
async function saveDevConfig() {
    const settings = { primaryColor: document.getElementById('devPrimaryColor').value, appBackground: document.getElementById('devAppBg').value.trim(), chatBackground: document.getElementById('devChatBg').value.trim(), tabOrder: document.getElementById('devTabOrder').value.trim(), hideNow: document.getElementById('devHideNow').checked, hideTextz: document.getElementById('devHideTextz').checked, hideExhibition: document.getElementById('devHideExhibition').checked, maxPostsPerDay: parseInt(document.getElementById('devMaxPosts').value)||10, vipCost: parseInt(document.getElementById('devVipCost').value)||200 };
    await db.collection('config').doc('global').set({ settings }, { merge: true });
    showToast('Configurações salvas!');
}
async function resetDevConfig() { if(confirm('Restaurar?')) { await db.collection('config').doc('global').delete(); showToast('Restaurado.'); loadAdminTabContent('dev'); } }
async function loadAdminFeedback(area) {
    const snaps = await db.collection('feedback').orderBy('createdAt','desc').get();
    area.innerHTML = '<h3>📢 Feedbacks</h3>';
    if (snaps.empty) { area.innerHTML += '<p>Nenhum feedback.</p>'; return; }
    snaps.forEach(doc => { const f = doc.data(); const date = f.createdAt ? new Date(f.createdAt.toDate()).toLocaleString() : ''; area.innerHTML += `<div style="padding:10px;border-bottom:1px solid #ccc;"><b>${f.userName} (${f.userEmail})</b><br><span style="font-size:13px;color:#555;">${f.text}</span><br><small style="color:#888;">${date}</small></div>`; });
}

// ==================== INICIALIZAÇÃO ====================
function initApp() {
    loadGlobalConfig().then(() => {
        listenToMyProfile();
        if (activeTab === 'feed') loadStatusFeed();
        else if (activeTab === 'exhibition') setupExhibitionListener();
        else if (activeTab === 'chats') loadChatList();
        loadOnlineFriends();
    });
}

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
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.handlePostImageUpload = handlePostImageUpload;
window.handleVideoUrl = handleVideoUrl;
window.removeMedia = removeMedia;
window.focusLocation = focusLocation;
window.toggleLike = toggleLike;
window.openComments = openComments;
window.sharePost = sharePost;
window.openUserProfile = openUserProfile;
window.openProfileModal = openProfileModal;
window.handleProfileAvatarUpload = handleProfileAvatarUpload;
window.saveProfile = saveProfile;
window.buyVipWithCoins = buyVipWithCoins;
window.toggleFriendship = toggleFriendship;
window.openFriendRequestsModal = openFriendRequestsModal;
window.respondFriendRequest = respondFriendRequest;
window.openChat = openChat;
window.openChatDirect = openChatDirect;
window.closeChat = closeChat;
window.sendChatMessage = sendChatMessage;
window.openChatInline = openChatInline;
window.sendInlineMessage = sendInlineMessage;
window.openCreateGroupModal = openCreateGroupModal;
window.createGroup = createGroup;
window.openGroupChat = openGroupChat;
window.sendGroupChatMsg = sendGroupChatMsg;
window.clearGroupChatHistory = clearGroupChatHistory;
window.openContactsModal = openContactsModal;
window.openFriendProfile = openFriendProfile;
window.openMenuModal = openMenuModal;
window.openExploreModal = openExploreModal;
window.submitFeedback = submitFeedback;
window.switchAdminTab = switchAdminTab;
window.toggleVIP = toggleVIP;
window.toggleVerified = toggleVerified;
window.toggleAdmin = toggleAdmin;
window.editUser = editUser;
window.deleteUserComplete = deleteUserComplete;
window.viewUserChats = viewUserChats;
window.deletePost = deletePost;
window.clearChatAdmin = clearChatAdmin;
window.saveTurbinate = saveTurbinate;
window.handleAdminAvatarUpload = handleAdminAvatarUpload;
window.handleChatBgUpload = handleChatBgUpload;
window.handleAppBgUpload = handleAppBgUpload;
window.saveDevConfig = saveDevConfig;
window.resetDevConfig = resetDevConfig;
window.goToCarouselSlide = goToCarouselSlide;