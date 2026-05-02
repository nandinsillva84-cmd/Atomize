// ==================== app.js – ATHOM (Completo + Atualizado) ====================
(function () {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    setTimeout(arguments.callee, 200);
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // ========== STUBS GLOBAIS ==========
  window.showToast = window.showToast || function (msg) {
    const toast = document.getElementById('toast');
    if (toast) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); }
  };
  window.openModal = window.openModal || function (id) { const el = document.getElementById(id); if (el) el.classList.add('active'); };
  window.closeModal = window.closeModal || function (id) { const el = document.getElementById(id); if (el) el.classList.remove('active'); };

  // ========== STUB PARA setActiveTab ==========
  let _pendingTab = 'now';
  if (!window.setActiveTab || window.setActiveTab.toString().includes('Stub')) {
    window.setActiveTab = function (tab) {
      console.warn('[Stub] setActiveTab aguardando login. Aba pendente:', tab);
      _pendingTab = tab;
    };
  }

  const userData = {
    uid: null, firstName: '', lastName: '',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', status: '', quote: ''
  };

  function updateHeader() {
    const av = document.getElementById('headerAvatar');
    const nm = document.getElementById('headerName');
    const st = document.getElementById('headerStatus');
    const qt = document.getElementById('headerQuote');
    if (av) av.src = userData.avatar;
    if (nm) nm.textContent = (userData.firstName + ' ' + userData.lastName).trim() || 'Usuário';
    if (st) st.textContent = userData.status || '';
    if (qt) qt.textContent = userData.quote ? `"${userData.quote}"` : '';
  }

  // ========== MÍDIA TEMPORÁRIA ==========
  let tempMedia = [];

  function adicionarMidias(files, forceTipo) {
    let newMedia = [];
    for (const file of files) {
      const tipo = forceTipo || (file.type.startsWith('video/') ? 'video' : 'imagem');
      const imagensAtuais = tempMedia.filter(m => m.tipo === 'imagem').length;
      const videosAtuais = tempMedia.filter(m => m.tipo === 'video').length;
      if (tipo === 'imagem' && imagensAtuais + newMedia.filter(m => m.tipo === 'imagem').length >= 10) {
        showToast('Máximo de 10 imagens.');
        break;
      }
      if (tipo === 'video' && videosAtuais + newMedia.filter(m => m.tipo === 'video').length >= 5) {
        showToast('Máximo de 5 vídeos.');
        break;
      }
      if (tipo === 'video' && file.size > 10 * 1024 * 1024) {
        showToast('Vídeo muito grande. Máx. 10MB.');
        continue;
      }
      newMedia.push({ file, tipo });
    }
    let lidos = 0;
    const total = newMedia.length;
    if (total === 0) return;
    showToast(`Processando ${total} arquivo(s)...`);
    newMedia.forEach((item) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        tempMedia.push({ dataUrl: e.target.result, tipo: item.tipo });
        lidos++;
        if (lidos === total) atualizarPreview();
      };
      reader.readAsDataURL(item.file);
    });
  }

  window.openMediaPicker = function() { document.getElementById('mediaUpload').click(); };
  window.handleMediaUpload = function(event) {
    const files = event.target.files;
    if (!files.length) return;
    adicionarMidias(files);
    event.target.value = '';
  };
  window.removeMedia = function(index) {
    if (typeof index === 'number') {
      tempMedia.splice(index, 1);
      atualizarPreview();
    } else {
      tempMedia = [];
      document.getElementById('mediaPreview').style.display = 'none';
    }
  };

  function atualizarPreview() {
    const preview = document.getElementById('mediaPreview');
    const content = document.getElementById('mediaContent');
    if (!preview || !content) return;
    if (tempMedia.length === 0) { preview.style.display = 'none'; return; }
    preview.style.display = 'block';
    let html = '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    tempMedia.forEach((m, i) => {
      html += `<div style="position:relative;width:100px;height:100px;overflow:hidden;border-radius:8px;">
        ${m.tipo === 'video' ? `<video src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover;" muted></video>` : `<img src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover;">`}
        <button onclick="removeMedia(${i})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">✕</button>
      </div>`;
    });
    html += '</div>';
    content.innerHTML = html;
  }

  // ========== AUTENTICAÇÃO ==========
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      if (window.ATHOM_CACHE && ATHOM_CACHE.clearCurrentUser) ATHOM_CACHE.clearCurrentUser();
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('appMain').style.display = 'none';
      return;
    }

    if (userData.uid && userData.uid !== user.uid) {
      if (window.ATHOM_CACHE && ATHOM_CACHE.clearCurrentUser) ATHOM_CACHE.clearCurrentUser();
      userData.uid = null; userData.firstName = ''; userData.lastName = '';
      userData.status = ''; userData.quote = '';
    }

    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        Object.assign(userData, doc.data(), { uid: user.uid });
      } else {
        const googleName = user.displayName || '';
        const nameParts = googleName.split(' ');
        userData.uid = user.uid;
        userData.firstName = nameParts[0] || '';
        userData.lastName = nameParts.slice(1).join(' ') || '';
        userData.email = user.email;
        userData.avatar = user.photoURL || userData.avatar;
        await db.collection('users').doc(user.uid).set(userData);
      }
    } catch (e) { userData.uid = user.uid; }
    updateHeader();

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appMain').style.display = 'flex';
    const header = document.getElementById('mainHeader');

    // ========== setActiveTab REAL ==========
    window.setActiveTab = function (tab) {
      document.querySelectorAll('.header-tab').forEach(t => t.classList.remove('active'));
      const at = document.querySelector(`.header-tab[data-tab="${tab}"]`);
      if (at) at.classList.add('active');
      document.body.classList.remove('tab-now', 'tab-exhibition', 'tab-textz');
      document.body.classList.add(`tab-${tab}`);
      if (header) header.classList.toggle('compact-header', tab !== 'now');
      if (tab === 'now' && typeof loadNowFeed === 'function') loadNowFeed();
      else if (tab === 'exhibition' && typeof renderExhibitionTab === 'function') renderExhibitionTab();
    };

    document.querySelectorAll('.header-tab').forEach(tab => tab.addEventListener('click', function () {
      window.setActiveTab(this.getAttribute('data-tab'));
    }));
    window.setActiveTab(_pendingTab || 'now');

    // ========== openProfileModal (SEGURO) ==========
    window.openProfileModal = async function () {
      document.getElementById('profileAvatarPreview').src = userData.avatar;
      document.getElementById('editFirstName').value = userData.firstName || '';
      document.getElementById('editLastName').value = userData.lastName || '';
      document.getElementById('editStatus').value = userData.status || '';
      document.getElementById('editQuote').value = userData.quote || '';
      openModal('profileModal');

      let historyContainer = document.getElementById('ownPostHistory');
      if (!historyContainer) {
        const modalBody = document.querySelector('#profileModal .modal-body');
        if (modalBody) {
          const section = document.createElement('div');
          section.innerHTML = `<div class="config-section" style="margin-top:16px;"><h3>🗂️ Meu Histórico de Publicações</h3><div id="ownPostHistory" style="font-size:13px; color:#555;"></div></div>`;
          modalBody.appendChild(section);
          historyContainer = document.getElementById('ownPostHistory');
        }
      }
      try {
        const uid = auth.currentUser.uid;
        const snap = await db.collection('posts').where('userId', '==', uid).limit(50).get();
        const posts = [];
        snap.forEach(doc => { const p = doc.data(); p.id = doc.id; p._date = p.createdAt?.toDate() || new Date(0); posts.push(p); });
        posts.sort((a, b) => b._date - a._date);
        const container = document.getElementById('ownPostHistory');
        if (!container) return;
        if (posts.length === 0) { container.innerHTML = '<p style="color:#888;">Nenhuma publicação ainda.</p>'; return; }
        const agora = new Date();
        container.innerHTML = posts.map(p => {
          const diasDesde = (agora - p._date) / (1000 * 60 * 60 * 24);
          const podeEditar = diasDesde < 7;
          const time = p._date.toLocaleString('pt-BR');
          return `<div style="display:flex; justify-content:space-between; align-items:flex-start; padding:8px 0; border-bottom:1px solid #eee;">
            <div style="flex:1;"><span style="font-style:italic;">"${p.quote || '(sem texto)'}"</span><span style="font-size:11px; color:#888; margin-left:8px;">— ${time}</span></div>
            ${podeEditar ? `<div style="display:flex; gap:4px; flex-shrink:0;">
              <button onclick="window.editarPost('${p.id}','${(p.quote||'').replace(/'/g,"\\'")}')" style="background:#f39c12;color:#fff;border:none;border-radius:12px;padding:4px 10px;font-size:11px;cursor:pointer;">✏️ Editar</button>
              <button onclick="window.excluirPost('${p.id}')" style="background:#e74c3c;color:#fff;border:none;border-radius:12px;padding:4px 10px;font-size:11px;cursor:pointer;">🗑️ Excluir</button>
            </div>` : '<span style="font-size:10px;color:#aaa;">+7 dias</span>'}
          </div>`;
        }).join('');
      } catch (e) { console.error(e); }
    };
    window.closeProfileModal = () => closeModal('profileModal');

    // ========== CHAT ==========
    window.openChatWithUser = function (userId) {
      if (typeof window.openChatDirect === 'function') return window.openChatDirect(userId);
      window.setActiveTab('textz');
      setTimeout(() => { const card = document.getElementById('contactCard_' + userId); if (card) card.click(); }, 600);
    };

    // ========== PERFIL ==========
    window.handleAvatarUpload = function (event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        userData.avatar = e.target.result;
        document.getElementById('profileAvatarPreview').src = e.target.result;
        document.getElementById('headerAvatar').src = e.target.result;
      };
      reader.readAsDataURL(file);
    };
    window.removeAvatar = () => {
      userData.avatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150';
      document.getElementById('profileAvatarPreview').src = userData.avatar;
      document.getElementById('headerAvatar').src = userData.avatar;
    };
    window.saveProfile = async () => {
      const fn = document.getElementById('editFirstName').value.trim();
      const ln = document.getElementById('editLastName').value.trim();
      if (!fn || !ln) return showToast('Preencha nome e sobrenome.');
      userData.firstName = fn; userData.lastName = ln;
      userData.status = document.getElementById('editStatus').value.trim();
      userData.quote = document.getElementById('editQuote').value.trim();
      try {
        await db.collection('users').doc(userData.uid).update({
          firstName: fn, lastName: ln, name: `${fn} ${ln}`,
          status: userData.status, quote: userData.quote, avatar: userData.avatar
        });
        updateHeader(); showToast('Perfil atualizado!'); closeProfileModal();
      } catch (e) { showToast('Erro ao salvar perfil.'); }
    };

    // ========== PUBLICADOR ==========
    window.switchPostTab = function (tab) {
      const tabs = document.querySelectorAll('.post-tab');
      tabs.forEach(t => t.classList.remove('active'));
      if (tab === 'texto') {
        tabs[0].classList.add('active');
        document.getElementById('postTextSection').style.display = 'block';
        document.getElementById('postMediaSection').style.display = 'none';
      } else {
        tabs[1].classList.add('active');
        document.getElementById('postTextSection').style.display = 'none';
        document.getElementById('postMediaSection').style.display = 'block';
      }
    };
    window.toggleEmojiPanel = () => {
      const p = document.getElementById('emojiPanel');
      if (p) p.style.display = p.style.display === 'none' ? 'grid' : 'none';
    };
    window.insertEmoji = (emoji) => {
      const ta = document.getElementById('newPostText');
      if (ta) ta.value += emoji;
    };
    window.closePostModal = () => {
      closeModal('postModal');
      tempMedia = [];
      atualizarPreview();
      const caption = document.getElementById('mediaCaption');
      if (caption) caption.value = '';
    };
    window.publishPost = async function () {
      const isTextTab = document.getElementById('postTextSection').style.display !== 'none';
      const isMediaTab = document.getElementById('postMediaSection').style.display !== 'none';
      let quote = '', media = [];
      if (isTextTab) {
        const textarea = document.getElementById('newPostText');
        if (!textarea) return showToast('Campo não encontrado.');
        quote = textarea.value.trim();
        if (!quote) return showToast('Escreva algo.');
      } else if (isMediaTab) {
        const caption = document.getElementById('mediaCaption');
        quote = caption ? caption.value.trim() : '';
        if (tempMedia.length === 0) return showToast('Selecione ao menos uma mídia.');
        media = tempMedia.map(m => ({ tipo: m.tipo, dataUrl: m.dataUrl }));
      } else { return showToast('Selecione uma aba.'); }
      try {
        await db.collection('posts').add({
          userId: userData.uid, name: `${userData.firstName} ${userData.lastName}`.trim(),
          avatar: userData.avatar, status: userData.status, quote: quote,
          tipo: media.length > 0 ? (media[0].tipo === 'video' ? 'video' : 'imagem') : 'texto',
          media: media, likes: 0, likedBy: [], comments: 0, shares: 0,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Publicado!');
        window.closePostModal();
        if (typeof loadNowFeed === 'function') loadNowFeed();
        if (typeof renderExhibitionTab === 'function') renderExhibitionTab();
      } catch (e) { showToast('Erro ao publicar.'); console.error(e); }
    };

    // ========== EDITAR / EXCLUIR POST ==========
    window.excluirPost = async function (postId) {
      if (!confirm('Excluir esta publicação?')) return;
      try {
        await db.collection('posts').doc(postId).delete();
        showToast('Excluído!');
        if (typeof loadNowFeed === 'function') loadNowFeed();
        if (typeof renderExhibitionTab === 'function') renderExhibitionTab();
        if (document.getElementById('profileModal')?.classList.contains('active')) window.openProfileModal();
      } catch (e) { showToast('Erro ao excluir.'); }
    };
    window.editarPost = async function (postId, oldText) {
      const newText = prompt('Editar post:', oldText);
      if (newText !== null && newText.trim() !== '') {
        await db.collection('posts').doc(postId).update({ quote: newText.trim() });
        showToast('Post editado!');
        if (document.getElementById('profileModal')?.classList.contains('active')) window.openProfileModal();
        if (typeof loadNowFeed === 'function') loadNowFeed();
        if (typeof renderExhibitionTab === 'function') renderExhibitionTab();
      }
    };

    // ========== BUSCA INTEGRADA ==========
    window.openSearchModal = function () {
      let modal = document.getElementById('searchModal');
      if (!modal) {
        modal = document.createElement('div'); modal.id = 'searchModal'; modal.className = 'app-modal';
        modal.innerHTML = `<div class="modal-header modal-header-vinho"><i class="fas fa-arrow-left modal-close" onclick="closeSearchModal()"></i><span>Buscar Usuários</span></div><div class="modal-body modal-body-branco" style="display:flex;flex-direction:column;"><div style="position:relative;margin-bottom:12px;"><i class="fas fa-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#aaa;"></i><input type="text" id="searchInput" class="input-field" placeholder="Digite um nome..." style="padding-left:40px;" autocomplete="off"><button id="clearSearchBtn" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#aaa;font-size:16px;cursor:pointer;display:none;">✕</button></div><div id="searchResults" style="flex:1;overflow-y:auto;"></div></div>`;
        document.getElementById('appMain').appendChild(modal);
      }
      openModal('searchModal');
      document.getElementById('searchInput').focus();
      performSearch();
    };
    window.closeSearchModal = () => closeModal('searchModal');
    window.performSearch = async function () {
      const input = document.getElementById('searchInput');
      const query = input?.value.trim() || '';
      const clearBtn = document.getElementById('clearSearchBtn');
      const resultsDiv = document.getElementById('searchResults');
      if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';
      if (!resultsDiv) return;
      if (query.length === 0) { resultsDiv.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Digite algo para buscar...</p>'; return; }
      resultsDiv.innerHTML = '<p style="text-align:center;color:#888;">Buscando...</p>';
      try {
        const currentUid = auth.currentUser.uid;
        const snap = await db.collection('users').orderBy('name').startAt(query).endAt(query + '\uf8ff').limit(30).get();
        const users = [];
        snap.forEach(doc => {
          if (doc.id === currentUid) return;
          const d = doc.data();
          users.push({ id: doc.id, name: d.name || `${d.firstName||''} ${d.lastName||''}`.trim() || 'Usuário', avatar: d.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100', status: d.status || '', statusType: d.statusType || 'offline' });
        });
        if (users.length === 0) { resultsDiv.innerHTML = '<p style="color:#888;text-align:center;">Nenhum usuário encontrado.</p>'; return; }
        const friendship = {};
        if (typeof getFriendshipStatus === 'function') users.forEach(u => { friendship[u.id] = getFriendshipStatus(u.id); });
        users.sort((a, b) => {
          const af = friendship[a.id]?.isFriend || false, bf = friendship[b.id]?.isFriend || false;
          if (af && !bf) return -1; if (!af && bf) return 1;
          return (a.statusType === 'online' ? -1 : 1) - (b.statusType === 'online' ? -1 : 1);
        });
        resultsDiv.innerHTML = users.map(u => {
          const f = friendship[u.id] || {};
          let btn = '';
          if (f.isFriend) btn = `<button class="contact-action-btn" onclick="window.openChatWithUser('${u.id}')" style="background:var(--bg-header-top);color:#fff;">💬 Conversar</button>`;
          else if (f.requestSent) btn = `<button class="contact-action-btn" disabled style="background:#e0e0e0;color:#888;">Solicitação enviada</button>`;
          else if (f.requestReceived) btn = `<button class="contact-action-btn" onclick="window.aceitarSolicitacaoRecebida('${u.id}')" style="background:#27ae60;color:#fff;">✓ Aceitar</button>`;
          else btn = `<button class="contact-action-btn" onclick="window.sendFriendRequest('${u.id}')" style="background:var(--text-cyan);color:#000;">+ Seguir</button>`;
          return `<div class="contact-card" style="margin-bottom:8px;">
            <div class="contact-main" style="cursor:pointer;" onclick="window.openUserProfile('${u.id}')">
              <div class="contact-avatar-wrapper"><img src="${u.avatar}" class="contact-avatar"><span class="online-indicator ${u.statusType==='online'?'online':'offline'}"></span></div>
              <div class="contact-info"><div class="contact-name">${u.name}</div><div class="contact-activity">${u.status||''}</div></div>
            </div><div style="display:flex;justify-content:flex-end;">${btn}</div></div>`;
        }).join('');
      } catch (e) { console.error(e); resultsDiv.innerHTML = '<p style="color:#e74c3c;text-align:center;">Erro ao buscar.</p>'; }
    };
    window.clearSearch = () => { const input = document.getElementById('searchInput'); if (input) { input.value = ''; input.focus(); } performSearch(); };

    // ========== OUTROS MODAIS ==========
    window.openContactsModal = function () {
      if (typeof window.openContactsModalReal === 'function') return window.openContactsModalReal();
      openModal('contactsModal');
    };
    window.closeContactsModal = () => closeModal('contactsModal');
    window.openMenuModal = () => openModal('menuModal');
    window.closeMenuModal = () => closeModal('menuModal');
    window.openSobreModal = function () { openModal('sobreModal'); };
    window.closeSobreModal = function () { closeModal('sobreModal'); };
    window.openConfigModal = function () {
      const c = document.getElementById('configContent');
      if (c) c.innerHTML = '<div class="config-section"><h3>🌐 Idioma</h3><select class="config-select" onchange="alterarIdioma(this.value)"><option value="pt">🇧🇷 PT</option><option value="en">🇺🇸 EN</option></select></div>';
      openModal('configModal');
    };
    window.closeConfigModal = () => closeModal('configModal');
    window.alterarIdioma = (lang) => showToast(`Idioma: ${lang}`);
    window.openFeedbackModal = function () { document.getElementById('feedbackText').value = ''; openModal('feedbackModal'); };
    window.closeFeedbackModal = () => closeModal('feedbackModal');
    window.enviarFeedback = function () {
      const t = document.getElementById('feedbackText');
      if (!t) return;
      const texto = t.value.trim();
      if (!texto) return showToast('Escreva algo antes de enviar.');
      try { if (typeof db !== 'undefined' && auth.currentUser) { db.collection('feedback').add({ userId: auth.currentUser.uid, text: texto, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {}); } } catch(e) {}
      showToast('Mensagem enviada! Obrigado 💜');
      closeFeedbackModal();
      t.value = '';
    };
    window.confirmarSair = () => { document.getElementById('confirmSairOverlay').style.display = 'flex'; };
    window.fecharDialogoSair = () => { document.getElementById('confirmSairOverlay').style.display = 'none'; };
    window.executarSair = async () => { await auth.signOut(); showToast('Você saiu da conta 👋'); };

    console.log('✅ ATHOM blindado e completo ativo.');
    window._appStarted = true;
  });
})();