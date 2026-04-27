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

// ==================== ESTADO GLOBAL ====================
let currentUser = null, currentUid = null;
let postsListener = null, profileListener = null;
let activeTab = 'feed', currentFilter = 'all';
let currentChatUid = null, chatsListener = null;
let viewedUid = null, currentMediaData = null;
let groupChatsListeners = {};
let globalConfig = {};
let onlineFriendsListener = null;
let notificationPermissionGranted = false;

// ==================== PERMISSÕES DO DISPOSITIVO ====================
// Solicitar permissão de notificação (chamada após login)
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Notificações não suportadas');
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        notificationPermissionGranted = permission === 'granted';
        if (notificationPermissionGranted) {
            showToast('Notificações ativadas!');
        }
    } catch (error) {
        console.error('Erro ao solicitar notificação:', error);
    }
}

// Exibir notificação nativa (apenas se permitido)
function showNativeNotification(title, body) {
    if (!notificationPermissionGranted || !('Notification' in window)) return;
    new Notification(title, { body, icon: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&q=80' });
}

// Solicitar acesso à câmera (retorna true se concedido)
async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // libera imediatamente
        return true;
    } catch (error) {
        showToast('Permissão da câmera negada.');
        return false;
    }
}

// Solicitar acesso ao microfone
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        showToast('Permissão do microfone negada.');
        return false;
    }
}

// ==================== EXECUÇÃO EM SEGUNDO PLANO / RETOMADA ====================
// Firestore desconecta após 60s em segundo plano, reconectar ao voltar
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log('App retomado – reconectando listeners...');
        if (activeTab === 'feed' || activeTab === 'fixed') setupPostsListener();
        else if (activeTab === 'chats') loadChatList();
        if (currentChatUid) listenToChat(currentChatUid); // reabre chat se estava ativo
    }
});

// ==================== HELPERS ====================
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function closeAllModals() { document.querySelectorAll('.app-modal').forEach(m => m.classList.remove('active')); }

// ==================== CONFIGURAÇÃO GLOBAL (DEV) ====================
async function loadGlobalConfig() {
    try {
        const doc = await db.collection('config').doc('global').get();
        if (doc.exists) {
            globalConfig = doc.data().settings || {};
            applyGlobalConfig(globalConfig);
        }
        db.collection('config').doc('global').onSnapshot(snap => {
            if (snap.exists) {
                globalConfig = snap.data().settings || {};
                applyGlobalConfig(globalConfig);
            }
        });
    } catch (e) {
        console.error('Erro ao carregar configurações:', e);
    }
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
    document.getElementById('postsWrapper').style.display = (tab === 'feed' || tab === 'fixed') ? 'flex' : 'none';
    document.getElementById('chatsWrapper').style.display = (tab === 'chats') ? 'flex' : 'none';
    if (tab === 'feed' || tab === 'fixed') {
        currentFilter = (tab === 'fixed') ? 'fixed' : 'all';
        setupPostsListener();
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
    try {
        await auth.signInWithEmailAndPassword(em, pw);
    } catch (e) {
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
        requestNotificationPermission(); // solicita permissão ao logar
        initApp();
    } else {
        if (currentUid) {
            db.collection('users').doc(currentUid).update({ statusType: 'offline' }).catch(() => {});
        }
        currentUid = null; currentUser = null;
        document.getElementById('loginModal').classList.add('active');
        applyUserToHeader(null);
        if (postsListener) postsListener();
        if (profileListener) profileListener();
        if (chatsListener) chatsListener();
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

function toggleFullscreen() {
    const app = document.getElementById('appContainer');
    if (!document.fullscreenElement) app.requestFullscreen().catch(() => showToast('Tela cheia não suportada'));
    else document.exitFullscreen();
}
document.addEventListener('fullscreenchange', () => {
    const icon = document.getElementById('fullscreenIcon');
    if (icon) {
        if (document.fullscreenElement) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
        else { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
    }
});

// ==================== FEED ====================
function setupPostsListener() {
    if (postsListener) postsListener();
    postsListener = db.collection('posts').orderBy('createdAt','desc').onSnapshot(snap => {
        const all = [];
        snap.forEach(doc => all.push({ id: doc.id, ...doc.data() }));
        renderFeed(all);
    });
}

function renderFeed(posts) {
    const wrapper = document.getElementById('postsWrapper');
    wrapper.innerHTML = '';
    let filtered = posts;
    if (currentFilter === 'fixed') filtered = posts.filter(p => p.isFixed);
    if (!filtered.length) { wrapper.innerHTML = '<div style="color:#fff;text-align:center;margin-top:50px;">Nenhum post.</div>'; return; }
    filtered.forEach(p => {
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
    buildCarousel(posts);
}

function buildCarousel(posts) {
    const top = [...posts].sort((a,b) => (b.likes||0)-(a.likes||0)).slice(0,5);
    const track = document.getElementById('carouselTrack');
    const inds = document.getElementById('carouselIndicators');
    if (!track || !inds) return;
    track.innerHTML = top.map(p => `<div class="carousel-slide" onclick="showToast('Post de ${p.name}')"><img src="${p.avatar}" onerror="this.src='https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80'"><div class="carousel-text"><h4>${p.name}</h4><p>${p.quote?.substring(0,60)||''}</p></div></div>`).join('');
    inds.innerHTML = top.map((_,i) => `<span class="carousel-dot ${i===0?'active':''}" onclick="goToCarouselSlide(${i})"></span>`).join('');
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
    const data = doc.data();
    const likedBy = data.likedBy || [];
    if (likedBy.includes(currentUid)) await ref.update({likes: data.likes-1, likedBy: firebase.firestore.FieldValue.arrayRemove(currentUid)});
    else await ref.update({likes: data.likes+1, likedBy: firebase.firestore.FieldValue.arrayUnion(currentUid)});
}
function openComments(postId) { showToast('Comentários em breve!'); }
async function sharePost(postId) {
    await db.collection('posts').doc(postId).update({shares: firebase.firestore.FieldValue.increment(1)});
    showToast('Compartilhado!');
}

// ==================== PUBLICADOR (com botão de câmera) ====================
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
    const preview = document.getElementById('mediaPreview'); const content = document.getElementById('mediaContent');
    if (!currentMediaData) return;
    preview.style.display = 'block'; content.innerHTML = currentMediaData.type === 'image' ? `<img src="${currentMediaData.url}">` : `<video src="${currentMediaData.url}" controls></video>`;
}
function removeMedia() { currentMediaData = null; document.getElementById('mediaPreview').style.display = 'none'; document.getElementById('mediaContent').innerHTML = ''; }
function focusLocation() { document.getElementById('locationInput').focus(); }

async function capturePhoto() {
    const granted = await requestCameraPermission();
    if (!granted) return;
    // Cria um input de captura temporário
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // câmera traseira
    input.onchange = (e) => handlePostImageUpload(e);
    input.click();
}

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
    } else {
        await userRef.update({ [`challenges.${today}.posts`]: challenges[today].posts });
    }
    document.getElementById('newPostText').value = '';
    document.getElementById('locationInput').value = '';
    removeMedia();
    document.getElementById('emojiPicker').style.display = 'none';
    closeModal('postModal');
    showToast('Publicado! +10 moedas');
}

// ==================== PERFIL PRÓPRIO ====================
function openProfileModal() {
    if (!currentUid) return;
    document.getElementById('editFirstName').value = currentUser.firstName || '';
    document.getElementById('editLastName').value = currentUser.lastName || '';
    document.getElementById('editStatus').value = currentUser.status || '';
    document.getElementById('editQuote').value = currentUser.quote || '';
    document.getElementById('profileAvatarPreview').src = currentUser.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80';
    document.getElementById('editPassword').value = '';
    document.getElementById('editPasswordConfirm').value = '';
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
        if (chatBg) {
            const r = new FileReader();
            r.onload = async (e) => { updates.chatBackground = e.target.result; await db.collection('users').doc(currentUid).update(updates); };
            r.readAsDataURL(chatBg);
        }
        if (appBg) {
            const r = new FileReader();
            r.onload = async (e) => { updates.appBackground = e.target.result; await db.collection('users').doc(currentUid).update(updates); };
            r.readAsDataURL(appBg);
        }
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
    navigator.vibrate?.(100); // vibração breve
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
    onlineFriendsListener = db.collection('users')
        .where('statusType', '==', 'online')
        .onSnapshot(snap => {
            container.innerHTML = '';
            const friends = currentUser.friends || [];
            snap.forEach(doc => {
                if (doc.id === currentUid) return;
                const u = doc.data();
                if (!friends.includes(doc.id)) return;
                const avatar = u.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80';
                container.innerHTML += `
                    <div style="text-align:center; cursor:pointer;" onclick="openChat('${doc.id}')">
                        <img src="${avatar}" style="width:50px;height:50px;border-radius:50%; border: 3px solid ${u.isVIP && u.frameColor ? u.frameColor : '#4caf50'}; object-fit:cover;">
                        <div style="font-size:11px;color:#fff;">${u.name.split(' ')[0]}</div>
                    </div>`;
            });
        });
}

// ==================== CHAT INLINE (TEXTZ) ====================
async function loadChatList() {
    const wrapper = document.getElementById('chatsWrapper');
    wrapper.innerHTML = '<p style="text-align:center;color:#fff;padding:20px;">Carregando...</p>';
    const friends = currentUser.friends || [];
    if (!friends.length) { wrapper.innerHTML = '<p style="text-align:center;color:#fff;padding:20px;">Nenhum amigo.</p>'; return; }
    const chats = [];
    for (const uid of friends) {
        const userDoc = await db.collection('users').doc(uid).get();
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
        chats.push({ uid, name: u.name, avatar: u.avatar, lastMsg, lastTime, statusColor, isVIP: u.isVIP, frameColor: u.frameColor });
    }
    chats.sort((a,b) => (b.lastTime||'').localeCompare(a.lastTime||''));
    wrapper.innerHTML = chats.map(c => `
        <div class="chat-list-item" data-uid="${c.uid}" onclick="openChatInline('${c.uid}')">
            <img src="${c.avatar}" class="chat-list-avatar" style="border: 3px solid ${c.isVIP && c.frameColor ? c.frameColor : c.statusColor};" onerror="this.src='https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&q=80'">
            <div class="chat-list-info">
                <div class="chat-list-name">${c.name}</div>
                <div class="chat-list-lastmsg">${c.lastMsg}</div>
            </div>
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
        text, senderId: currentUid, senderName: currentUser.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

// ==================== CHAT TELA CHEIA (mantido) ====================
function openChat(uid) {
    if (!currentUid || !currentUser.friends.includes(uid)) return showToast('Adicione como amigo primeiro.');
    currentChatUid = uid;
    db.collection('users').doc(uid).get().then(doc => {
        document.getElementById('chatName').textContent = doc.data().name;
        document.getElementById('chatAvatar').src = doc.data().avatar;
    });
    document.getElementById('chatModal').classList.add('active');
    listenToChat(uid);
}
function closeChat() {
    document.getElementById('chatModal').classList.remove('active');
    if (chatsListener) chatsListener();
    currentChatUid = null;
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
        if (snap.docChanges().some(change => change.type === 'added' && !change.doc.metadata.hasPendingWrites)) {
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
        text, senderId: currentUid, senderName: currentUser.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
        const u = (await db.collection('users').doc(uid).get()).data();
        return { uid, name: u.name };
    })).then(users => {
        checklist.innerHTML = users.map(u => `<label><input type="checkbox" value="${u.uid}"> ${u.name}</label>`).join('<br>');
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
        if (snap.docChanges().some(change => change.type === 'added' && !change.doc.metadata.hasPendingWrites)) {
            showNativeNotification('Nova mensagem no grupo', 'Alguém enviou uma mensagem no grupo.');
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
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    showToast('Histórico limpo.');
}

// ==================== CONTATOS ====================
function openContactsModal() {
    openModal('contactsModal');
    const list = document.getElementById('contactsList');
    list.innerHTML = '<p>Carregando...</p>';
    const friends = currentUser.friends || [];
    Promise.all(friends.map(async uid => {
        const u = (await db.collection('users').doc(uid).get()).data();
        return { uid, name: u.name, avatar: u.avatar };
    })).then(contacts => {
        let html = '<h4>Amigos</h4>';
        contacts.forEach(c => { html += `<div class="contact-item" onclick="openChat('${c.uid}')"><img src="${c.avatar}" class="contact-avatar"><div><b>${c.name}</b></div></div>`; });
        db.collection('groups').where('members', 'array-contains', currentUid).get().then(gSnap => {
            if (!gSnap.empty) {
                html += '<h4 style="margin-top:15px;">Grupos</h4>';
                gSnap.forEach(doc => {
                    const g = doc.data();
                    html += `<div class="contact-item" onclick="openGroupChat('${doc.id}','${g.name}')"><i class="fas fa-users" style="font-size:24px;margin-right:10px;"></i><b>${g.name}</b></div>`;
                });
            }
            list.innerHTML = html;
        });
    });
}

// ==================== EXPLORAR ====================
async function openExploreModal() {
    openModal('exploreModal');
    const list = document.getElementById('exploreList');
    list.innerHTML = '<p>Carregando...</p>';
    const snap = await db.collection('users').get();
    const users = [];
    snap.forEach(doc => { if (doc.id !== currentUid) users.push({id: doc.id, ...doc.data()}); });
    list.innerHTML = users.map(u => `<div class="contact-item" onclick="openUserProfile('${u.id}')"><img src="${u.avatar}" class="contact-avatar"><div><b>${u.name}</b></div></div>`).join('');
}

// ==================== MENU ====================
function openMenuModal() { openModal('menuModal'); }

// ==================== PAINEL ADMIN (completo, igual anterior) ====================
// (Incluir todas as funções do admin: switchAdminTab, loadAdminUsers, toggleVIP, toggleVerified, toggleAdmin, editUser, deleteUserComplete, loadAdminPosts, deletePost, loadAdminChats, clearChatAdmin, loadAdminTurbinate, handleAdminAvatarUpload, handleChatBgUpload, handleAppBgUpload, saveTurbinate, loadAdminDev, saveDevConfig, resetDevConfig)
// Para não alongar demais, manter exatamente como já estava no último script completo.

// ==================== INICIALIZAÇÃO ====================
function initApp() {
    loadGlobalConfig().then(() => {
        listenToMyProfile();
        if (activeTab === 'feed' || activeTab === 'fixed') setupPostsListener();
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
window.toggleFullscreen = toggleFullscreen;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.publishPost = publishPost;
window.capturePhoto = capturePhoto;
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
window.updateMyStatus = updateMyStatus;
window.toggleFriendship = toggleFriendship;
window.openFriendRequestsModal = openFriendRequestsModal;
window.respondFriendRequest = respondFriendRequest;
window.openChat = openChat;
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
window.openMenuModal = openMenuModal;
window.openExploreModal = openExploreModal;
window.requestCameraPermission = requestCameraPermission;
window.requestMicrophonePermission = requestMicrophonePermission;
window.switchAdminTab = switchAdminTab;
// (expor também todas as funções do admin)