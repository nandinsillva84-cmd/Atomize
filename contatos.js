// ==================== contatos.js – YOU ====================
(function () {
  // Sanitização
  function esc(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Função chamada pelo botão da barra inferior
  window.openContactsModalReal = function () {
    window.openModal('contactsModal');
    renderContacts();
  };

  async function renderContacts() {
    var list = document.getElementById('contactsList');
    if (!list) return;
    list.innerHTML = '<p style="text-align:center;padding:20px;">Carregando contatos...</p>';

    try {
      if (typeof db === 'undefined' || !auth.currentUser) {
        list.innerHTML = '<p style="text-align:center;">Você precisa estar logado.</p>';
        return;
      }

      var currentUid = auth.currentUser.uid;
      var userDoc = await db.collection('users').doc(currentUid).get();
      var friendIds = userDoc.exists ? (userDoc.data().friends || []) : [];

      if (friendIds.length === 0) {
        list.innerHTML = '<p style="text-align:center;padding:20px;">Nenhum amigo ainda.</p>';
        return;
      }

      var friendDocs = await Promise.all(friendIds.map(function (id) {
        return db.collection('users').doc(id).get();
      }));

      var friends = [];
      for (var i = 0; i < friendDocs.length; i++) {
        if (friendDocs[i].exists) {
          friends.push({ id: friendDocs[i].id, data: friendDocs[i].data() });
        }
      }

      if (friends.length === 0) {
        list.innerHTML = '<p style="text-align:center;padding:20px;">Nenhum amigo encontrado.</p>';
        return;
      }

      // Renderiza os cards com botões
      var html = '';
      for (var j = 0; j < friends.length; j++) {
        var f = friends[j];
        var d = f.data;
        var name = esc(d.name || (d.firstName + ' ' + d.lastName).trim() || 'Usuário');
        var status = esc(d.status || '');
        var avatar = d.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80';
        var online = d.statusType === 'online';

        html +=
          '<div class="contact-card">' +
            '<div class="contact-main" style="cursor:pointer;" onclick="window.openUserProfile(\'' + f.id + '\')">' +
              '<div class="contact-avatar-wrapper">' +
                '<img src="' + avatar + '" class="contact-avatar" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);">' +
                '<span class="online-indicator ' + (online ? 'online' : 'offline') + '" style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;border-radius:50%;border:2px solid #fff;background:' + (online ? '#4CAF50' : '#aaa') + ';"></span>' +
              '</div>' +
              '<div class="contact-info" style="flex:1;min-width:0;">' +
                '<div class="contact-name">' + name + '</div>' +
                '<div class="contact-activity" style="font-size:12px;color:var(--text-cyan);">' + status + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="contact-actions" style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px;">' +
              '<button class="contact-action-btn" onclick="event.stopPropagation();window.openChatWithUser(\'' + f.id + '\')" style="background:var(--bg-header-top);color:#fff;">💬</button>' +
              '<button class="contact-action-btn unfollow" onclick="event.stopPropagation();window.unfriendUser(\'' + f.id + '\');renderContacts();">Deixar de seguir</button>' +
            '</div>' +
          '</div>';
      }

      list.innerHTML = html;

    } catch (e) {
      list.innerHTML = '<p style="text-align:center;color:#e74c3c;">Erro ao carregar contatos.</p>';
      console.error(e);
    }
  }

  // Atualiza ao abrir o modal se houver mudanças
  window.addEventListener('friendshipUpdated', function () {
    var modal = document.getElementById('contactsModal');
    if (modal && modal.classList.contains('active')) {
      renderContacts();
    }
  });

  console.log('📇 Contatos carregado.');
})();