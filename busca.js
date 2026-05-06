// ==================== busca.js – YOU ====================
// Busca de usuários (case‑insensitive) com debounce para mobile.
// Usa o campo nameLower (índice) ou fallback pelo campo name.
// Exibe resultados com avatar, nome, status, indicador online/offline e botão de ação:
// - 💬 Conversar (se já for amigo)
// - Solicitação enviada (se já houver pedido pendente)
// - ✓ Aceitar (se houver solicitação recebida)
// - + Seguir (se não houver relação)

(function () {
  // Aguarda Firebase e usuário prontos
  function waitForReady(cb) {
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.auth && firebase.auth().currentUser) {
      cb();
    } else {
      setTimeout(function () { waitForReady(cb); }, 200);
    }
  }

  waitForReady(function () {
    var db = firebase.firestore();
    var currentUid = firebase.auth().currentUser.uid;

    // ========== CONTROLE DE DEBOUNCE ==========
    var searchTimeout = null;
    var DEBOUNCE_MS = 300; // aguarda 300ms após parar de digitar

    // ========== CRIA O MODAL DE BUSCA ==========
    function createSearchModal() {
      var old = document.getElementById('searchModal');
      if (old) old.remove();

      var modal = document.createElement('div');
      modal.id = 'searchModal';
      modal.className = 'app-modal';
      modal.innerHTML =
        '<div class="modal-header modal-header-vinho">' +
          '<i class="fas fa-arrow-left modal-close" onclick="closeSearchModal()"></i>' +
          '<span>Buscar Usuários</span>' +
        '</div>' +
        '<div class="modal-body modal-body-branco" style="display:flex; flex-direction:column;">' +
          '<div style="position:relative; margin-bottom:12px;">' +
            '<i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#aaa;"></i>' +
            '<input type="search" id="searchInput" class="input-field" placeholder="Digite um nome..." style="padding-left:40px;" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
            '<button id="clearSearchBtn" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#aaa; font-size:16px; cursor:pointer; display:none;">✕</button>' +
          '</div>' +
          '<div id="searchResults" style="flex:1; overflow-y:auto;"></div>' +
        '</div>';

      document.getElementById('appMain').appendChild(modal);

      // Eventos do campo de busca
      var input = document.getElementById('searchInput');
      var clearBtn = document.getElementById('clearSearchBtn');

      input.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        var query = this.value.trim();
        clearBtn.style.display = query.length > 0 ? 'block' : 'none';
        searchTimeout = setTimeout(function () {
          performSearch(query);
        }, DEBOUNCE_MS);
      });

      clearBtn.addEventListener('click', function () {
        input.value = '';
        clearBtn.style.display = 'none';
        clearTimeout(searchTimeout);
        performSearch('');
        input.focus();
      });
    }

    // ========== ABRIR MODAL ==========
    window.openSearchModal = function () {
      createSearchModal();
      if (typeof openModal === 'function') openModal('searchModal');
      var input = document.getElementById('searchInput');
      if (input) input.focus();
      performSearch('');
    };

    // ========== FECHAR MODAL ==========
    window.closeSearchModal = function () {
      if (typeof closeModal === 'function') closeModal('searchModal');
      var modal = document.getElementById('searchModal');
      if (modal) modal.remove();
    };

    // ========== EXECUTAR BUSCA ==========
    window.performSearch = async function (query) {
      var resultsDiv = document.getElementById('searchResults');
      if (!resultsDiv) return;

      if (!query || query.trim() === '') {
        resultsDiv.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Digite algo para buscar usuários.</p>';
        return;
      }

      resultsDiv.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Buscando...</p>';

      try {
        var normalized = query.toLowerCase().trim();
        var users = [];

        // Tenta com nameLower (índice)
        try {
          var snap = await db.collection('users')
            .orderBy('nameLower')
            .startAt(normalized)
            .endAt(normalized + '\uf8ff')
            .limit(30)
            .get();

          snap.forEach(function (doc) {
            if (doc.id !== currentUid) {
              users.push({ id: doc.id, data: doc.data() });
            }
          });
        } catch (indexErr) {
          console.warn('[Busca] Índice nameLower ausente, usando fallback com name.');
          // Fallback: ordena por name (case‑sensitive)
          var snapFallback = await db.collection('users')
            .orderBy('name')
            .startAt(query)
            .endAt(query + '\uf8ff')
            .limit(30)
            .get();

          snapFallback.forEach(function (doc) {
            if (doc.id !== currentUid) {
              users.push({ id: doc.id, data: doc.data() });
            }
          });
        }

        if (users.length === 0) {
          resultsDiv.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Nenhum usuário encontrado.</p>';
          return;
        }

        // Status de amizade (opcional, sem bloquear)
        var friendshipStatuses = {};
        if (typeof getFriendshipStatus === 'function') {
          for (var i = 0; i < users.length; i++) {
            friendshipStatuses[users[i].id] = getFriendshipStatus(users[i].id);
          }
        }

        // Renderiza resultados
        var html = '';
        for (var j = 0; j < users.length; j++) {
          var user = users[j];
          var d = user.data;
          var name = esc(d.name || (d.firstName || '') + ' ' + (d.lastName || '').trim() || 'Usuário');
          var avatar = d.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100';
          var online = d.statusType === 'online';
          var fs = friendshipStatuses[user.id] || {};
          var actionBtn = '';

          if (fs.isFriend) {
            actionBtn = '<button class="contact-action-btn" onclick="window.openChatWithUser(\'' + user.id + '\')" style="background:var(--bg-header-top);color:#fff;">💬 Conversar</button>';
          } else if (fs.requestSent) {
            actionBtn = '<button class="contact-action-btn" disabled style="background:#e0e0e0;color:#888;">Solicitação enviada</button>';
          } else if (fs.requestReceived) {
            actionBtn = '<button class="contact-action-btn" onclick="window.aceitarSolicitacaoRecebida(\'' + user.id + '\')" style="background:#27ae60;color:#fff;">✓ Aceitar</button>';
          } else {
            actionBtn = '<button class="contact-action-btn" onclick="window.sendFriendRequest(\'' + user.id + '\')" style="background:var(--text-cyan);color:#000;">+ Seguir</button>';
          }

          html +=
            '<div class="contact-card" style="margin-bottom:8px;">' +
              '<div class="contact-main" style="cursor:pointer;" onclick="window.openUserProfile(\'' + user.id + '\')">' +
                '<div class="contact-avatar-wrapper">' +
                  '<img src="' + avatar + '" alt="' + name + '" class="contact-avatar">' +
                  '<span class="online-indicator ' + (online ? 'online' : 'offline') + '"></span>' +
                '</div>' +
                '<div class="contact-info">' +
                  '<div class="contact-name">' + name + '</div>' +
                  '<div class="contact-activity">' + esc(d.status || '') + '</div>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;justify-content:flex-end;">' + actionBtn + '</div>' +
            '</div>';
        }

        resultsDiv.innerHTML = html;

      } catch (e) {
        console.error('Erro na busca:', e);
        resultsDiv.innerHTML = '<p style="color:#e74c3c;text-align:center;padding:20px;">Erro ao buscar. Tente novamente.</p>';
      }
    };

    // ========== LIMPAR BUSCA ==========
    window.clearSearch = function () {
      var input = document.getElementById('searchInput');
      if (input) {
        input.value = '';
        document.getElementById('clearSearchBtn').style.display = 'none';
        performSearch('');
        input.focus();
      }
    };

    // ========== SANITIZAÇÃO ==========
    function esc(str) {
      if (typeof window.esc === 'function') return window.esc(str);
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    console.log('🔍 Busca (busca.js) carregada.');
  });
})();