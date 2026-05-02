// ==================== search.js – ATHOM (Busca Real no Firestore + Incremental) ====================
(function () {
  // Aguarda Firebase e auth
  function waitForReady(cb) {
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.auth && firebase.auth().currentUser) {
      cb();
    } else {
      setTimeout(() => waitForReady(cb), 200);
    }
  }

  waitForReady(() => {
    const db = firebase.firestore();
    const currentUid = firebase.auth().currentUser.uid;

    // Cria o modal apenas uma vez
    function createSearchModal() {
      const old = document.getElementById('searchModal');
      if (old) old.remove();

      const modal = document.createElement('div');
      modal.id = 'searchModal';
      modal.className = 'app-modal';
      modal.innerHTML = `
        <div class="modal-header modal-header-vinho">
          <i class="fas fa-arrow-left modal-close" onclick="closeSearchModal()"></i>
          <span>Buscar Usuários</span>
        </div>
        <div class="modal-body modal-body-branco" style="display:flex; flex-direction:column;">
          <div style="position:relative; margin-bottom:12px;">
            <i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#aaa;"></i>
            <input type="text" id="searchInput" class="input-field" placeholder="Digite um nome..." style="padding-left:40px;" oninput="performSearch()">
            <button id="clearSearchBtn" onclick="clearSearch()" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#aaa; font-size:16px; cursor:pointer; display:none;">✕</button>
          </div>
          <div id="searchResults" style="flex:1; overflow-y:auto;"></div>
        </div>`;
      document.getElementById('appMain').appendChild(modal);
    }

    // Abrir modal
    window.openSearchModal = function () {
      createSearchModal();
      window.openModal('searchModal');
      document.getElementById('searchInput').focus();
      performSearch();
    };

    // Fechar modal
    window.closeSearchModal = function () {
      window.closeModal('searchModal');
      const modal = document.getElementById('searchModal');
      if (modal) modal.remove();
    };

    // Busca real no Firestore
    window.performSearch = async function () {
      const input = document.getElementById('searchInput');
      const query = input.value.trim();
      const clearBtn = document.getElementById('clearSearchBtn');
      const resultsDiv = document.getElementById('searchResults');

      clearBtn.style.display = query.length > 0 ? 'block' : 'none';

      if (query.length === 0) {
        resultsDiv.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">Digite algo para buscar...</p>';
        return;
      }

      resultsDiv.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">Buscando...</p>';

      try {
        // Busca usuários cujo nome começa com o texto digitado
        const snap = await db.collection('users')
          .orderBy('name')
          .startAt(query)
          .endAt(query + '\uf8ff')
          .limit(30)
          .get();

        const users = [];
        snap.forEach(doc => {
          const data = doc.data();
          // Pula o próprio usuário
          if (doc.id === currentUid) return;
          users.push({
            id: doc.id,
            name: data.name || (data.firstName + ' ' + data.lastName).trim() || 'Usuário',
            avatar: data.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100',
            status: data.status || '',
            statusType: data.statusType || 'offline'
          });
        });

        // Para cada usuário, obtém o status de amizade
        const friendshipStatuses = {};
        if (typeof getFriendshipStatus === 'function') {
          users.forEach(u => {
            friendshipStatuses[u.id] = getFriendshipStatus(u.id);
          });
        }

        if (users.length === 0) {
          resultsDiv.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">Nenhum usuário encontrado 😕</p>';
          return;
        }

        // Ordena: amigos primeiro, depois online
        users.sort((a, b) => {
          const aFriend = friendshipStatuses[a.id]?.isFriend || false;
          const bFriend = friendshipStatuses[b.id]?.isFriend || false;
          if (aFriend && !bFriend) return -1;
          if (!aFriend && bFriend) return 1;
          const aOnline = a.statusType === 'online';
          const bOnline = b.statusType === 'online';
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return 0;
        });

        resultsDiv.innerHTML = users.map(user => createUserCard(user, friendshipStatuses[user.id])).join('');

      } catch (e) {
        console.error('Erro na busca:', e);
        resultsDiv.innerHTML = '<p style="color:#e74c3c; text-align:center; padding:20px;">Erro ao buscar. Tente novamente.</p>';
      }
    };

    // Criar card de usuário com ações reais
    function createUserCard(user, friendship) {
      const isFriend = friendship?.isFriend;
      const requestSent = friendship?.requestSent;
      const requestReceived = friendship?.requestReceived;
      let actionBtn = '';

      if (isFriend) {
        actionBtn = `<button class="contact-action-btn" onclick="window.openChatWithUser('${user.id}')" style="background:var(--bg-header-top); color:#fff;">💬 Conversar</button>`;
      } else if (requestSent) {
        actionBtn = `<button class="contact-action-btn" disabled style="background:#e0e0e0; color:#888;">Solicitação enviada</button>`;
      } else if (requestReceived) {
        actionBtn = `<button class="contact-action-btn" onclick="window.aceitarSolicitacaoRecebida('${user.id}')" style="background:#27ae60; color:#fff;">✓ Aceitar</button>`;
      } else {
        actionBtn = `<button class="contact-action-btn" onclick="window.sendFriendRequest('${user.id}')" style="background:var(--text-cyan); color:#000;">+ Seguir</button>`;
      }

      return `
        <div class="contact-card" style="margin-bottom:8px;">
          <div class="contact-main" style="cursor:pointer;" onclick="window.openUserProfile('${user.id}')">
            <div class="contact-avatar-wrapper">
              <img src="${user.avatar}" alt="${user.name}" class="contact-avatar">
              <span class="online-indicator ${user.statusType === 'online' ? 'online' : 'offline'}"></span>
            </div>
            <div class="contact-info">
              <div class="contact-name">${user.name}</div>
              <div class="contact-activity">${user.status || ''}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end;">${actionBtn}</div>
        </div>`;
    }

    // Limpar campo de busca
    window.clearSearch = function () {
      const input = document.getElementById('searchInput');
      input.value = '';
      document.getElementById('clearSearchBtn').style.display = 'none';
      performSearch();
      input.focus();
    };

    console.log('🔍 Busca real ativada.');
  });
})();