// ==================== admin.js – YOU ====================
// Painel Administrativo completo.
// Acessível apenas pelo e‑mail do dono (nandinsillva84@gmail.com) através do menu.
// Funcionalidades:
// - Listar todos os usuários em cards (avatar, nome, e‑mail, status, posts)
// - Badges de Admin e Banido
// - Botões: Resetar senha, Tornar/Remover Admin, Banir/Desbanir, Excluir perfil
// - Modal para visualizar e excluir posts do usuário (admin-posts.js)
// - Modal para criar novo usuário (admin-criar.js)

(function () {
  // ========== CRIA O MODAL PRINCIPAL ==========
  function ensureAdminModal() {
    if (document.getElementById('adminModal')) return;
    var modal = document.createElement('div');
    modal.id = 'adminModal';
    modal.className = 'app-modal';
    modal.innerHTML =
      '<div class="modal-header modal-header-vinho">' +
        '<i class="fas fa-arrow-left modal-close" onclick="closeAdminModal()"></i>' +
        '<span>Painel Admin</span>' +
      '</div>' +
      '<div class="modal-body modal-body-branco" style="padding:12px; overflow-y:auto;" id="adminPanelContent">' +
        '<p style="text-align:center;color:#888;">Carregando...</p>' +
      '</div>';
    document.getElementById('appMain').appendChild(modal);
  }

  // ========== ABRIR / FECHAR ==========
  window.openAdminPanel = async function () {
    ensureAdminModal();
    if (typeof openModal === 'function') openModal('adminModal');
    await loadAllUsers();
    renderCards();
  };

  window.closeAdminModal = function () {
    if (typeof closeModal === 'function') closeModal('adminModal');
  };

  // ========== ARMAZENAMENTO LOCAL ==========
  var allUsers = [];

  // ========== CARREGAR USUÁRIOS ==========
  async function loadAllUsers() {
    var container = document.getElementById('adminPanelContent');
    if (container) container.innerHTML = '<p style="text-align:center;color:#888;">Carregando usuários...</p>';

    try {
      var snap = await db.collection('users').get();
      allUsers = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        allUsers.push({
          id: doc.id,
          name: d.name || (d.firstName || '') + ' ' + (d.lastName || '').trim() || 'Sem nome',
          email: d.email || '',
          avatar: d.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80',
          statusType: d.statusType || 'offline',
          isAdmin: d.isAdmin || false,
          isBanned: d.isBanned || false,
          postCount: '...',
          friends: d.friends || []
        });
      });

      // Conta posts em paralelo
      await Promise.all(allUsers.map(async function (u) {
        try {
          var ps = await db.collection('posts').where('userId', '==', u.id).get();
          u.postCount = ps.size;
        } catch (e) {
          u.postCount = '?';
        }
      }));
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('Erro ao carregar usuários.');
    }
  }

  // ========== RENDERIZAR CARDS ==========
  function renderCards() {
    var container = document.getElementById('adminPanelContent');
    if (!container) return;

    var html =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<p style="font-weight:600;color:#222;">👥 ' + allUsers.length + ' usuários</p>' +
        '<button onclick="openCreateUserModal()" style="background:#8b1031;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;cursor:pointer;">+ Criar Usuário</button>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">';

    for (var i = 0; i < allUsers.length; i++) {
      var u = allUsers[i];
      var online = u.statusType === 'online';
      var statusDot = online ? '#2ecc71' : '#ccc';
      var statusText = online ? 'Online' : 'Offline';

      html +=
        '<div style="background:#fff; border-radius:16px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
          // Linha principal: avatar + info
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' +
            '<div style="position:relative;flex-shrink:0;">' +
              '<img src="' + u.avatar + '" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);">' +
              '<span style="position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;background:' + statusDot + ';"></span>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:700;font-size:15px;color:#111;">' + escapeHtml(u.name) + '</div>' +
              '<div style="font-size:12px;color:#888;">' + escapeHtml(u.email) + '</div>' +
              '<div style="font-size:11px;color:' + (online ? '#2ecc71' : '#888') + ';margin-top:2px;">' + statusText + ' · ' + u.postCount + ' posts</div>' +
            '</div>' +
          '</div>' +
          // Badges
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">' +
            (u.isAdmin ? '<span style="background:#1a73e8;color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;">👑 Admin</span>' : '') +
            (u.isBanned ? '<span style="background:#e74c3c;color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;">🚫 Banido</span>' : '') +
          '</div>' +
          // Botões de ação
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
            '<button onclick="viewUserPosts(\'' + u.id + '\')" style="background:#8b1031;color:#fff;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;">📰 Posts</button>' +
            '<button onclick="window._admResetPassword(\'' + u.id + '\')" style="background:#1a73e8;color:#fff;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;">🔑 Reset Senha</button>' +
            '<button onclick="window._admToggleAdmin(\'' + u.id + '\', ' + (!u.isAdmin) + ')" style="background:' + (u.isAdmin ? '#555' : '#1a73e8') + ';color:#fff;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;">' + (u.isAdmin ? '👤 Remover Admin' : '👑 Tornar Admin') + '</button>' +
            '<button onclick="window._admToggleBan(\'' + u.id + '\', ' + (!u.isBanned) + ')" style="background:#e65100;color:#fff;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;">' + (u.isBanned ? '🔓 Desbanir' : '🚫 Banir') + '</button>' +
            '<button onclick="deleteUserProfile(\'' + u.id + '\')" style="background:#e74c3c;color:#fff;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;">🗑️ Excluir</button>' +
          '</div>' +
        '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // ========== FUNÇÕES ADMINISTRATIVAS ==========

  // Resetar senha
  window._admResetPassword = async function (uid) {
    var user = null;
    for (var i = 0; i < allUsers.length; i++) {
      if (allUsers[i].id === uid) { user = allUsers[i]; break; }
    }
    if (!user || !user.email) {
      if (typeof showToast === 'function') showToast('E‑mail não encontrado.');
      return;
    }
    try {
      await auth.sendPasswordResetEmail(user.email);
      if (typeof showToast === 'function') showToast('Redefinição enviada para ' + user.email);
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('Erro ao enviar.');
    }
  };

  // Tornar/Remover Admin
  window._admToggleAdmin = async function (uid, makeAdmin) {
    try {
      await db.collection('users').doc(uid).update({ isAdmin: makeAdmin });
      if (typeof showToast === 'function') showToast(makeAdmin ? 'Agora é administrador' : 'Admin removido');
      await loadAllUsers();
      renderCards();
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('Erro.');
    }
  };

  // Banir/Desbanir
  window._admToggleBan = async function (uid, ban) {
    try {
      await db.collection('users').doc(uid).update({ isBanned: ban });
      if (typeof showToast === 'function') showToast(ban ? 'Usuário banido' : 'Usuário desbanido');
      await loadAllUsers();
      renderCards();
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('Erro.');
    }
  };

  // ========== EXCLUIR PERFIL COMPLETO ==========
  window.deleteUserProfile = async function (uid) {
    if (!confirm('Tem certeza que deseja EXCLUIR este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      // 1. Remove todos os posts do usuário
      var postsSnap = await db.collection('posts').where('userId', '==', uid).get();
      var batch = db.batch();
      postsSnap.forEach(function (doc) { batch.delete(doc.ref); });

      // 2. Remove solicitações de amizade relacionadas
      var reqsOut = await db.collection('friendRequests').where('from', '==', uid).get();
      var reqsIn = await db.collection('friendRequests').where('to', '==', uid).get();
      reqsOut.forEach(function (doc) { batch.delete(doc.ref); });
      reqsIn.forEach(function (doc) { batch.delete(doc.ref); });

      // 3. Remove o documento do usuário
      batch.delete(db.collection('users').doc(uid));
      await batch.commit();

      // Tenta remover do Auth via Cloud Function (se existir)
      try {
        var deleteUserFn = firebase.functions().httpsCallable('deleteUser');
        await deleteUserFn({ uid: uid });
      } catch (cfErr) {
        console.warn('Cloud Function deleteUser não disponível. Usuário removido apenas do Firestore.');
      }

      if (typeof showToast === 'function') showToast('Usuário excluído!');
      await loadAllUsers();
      renderCards();
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('Erro ao excluir usuário.');
    }
  };

  // ========== VER POSTS DO USUÁRIO (DELEGA PARA admin-posts.js) ==========
  window.viewUserPosts = function (uid) {
    if (typeof window._viewUserPosts === 'function') {
      window._viewUserPosts(uid);
    } else {
      if (typeof showToast === 'function') showToast('Módulo de posts do admin não carregado.');
    }
  };

  // ========== CRIAR USUÁRIO (DELEGA PARA admin-criar.js) ==========
  window.openCreateUserModal = function () {
    if (typeof window._openCreateUserModal === 'function') {
      window._openCreateUserModal();
    } else {
      if (typeof showToast === 'function') showToast('Módulo de criação de usuário não carregado.');
    }
  };

  // ========== ESCAPE HTML ==========
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  console.log('🛡️ Painel Admin (admin.js) carregado.');
})();