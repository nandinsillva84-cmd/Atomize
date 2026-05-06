// ==================== perfil-outro.js – YOU ====================
// Visualização do perfil de outro usuário.
// Abre um modal com: capa, avatar, nome, humor, status, pensamento do dia,
// localização, badge de membro desde, botões de ação (mensagem, seguir/deixar de seguir, etc.),
// últimos pensamentos (publicações), amigos em comum, nota privada, bloquear/compartilhar.

(function () {
  // ========== SANITIZAÇÃO ==========
  // Usa a função global window.esc, definida em sanitizador.js.
  // Fallback local por segurança.
  function esc(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ========== CRIAÇÃO DO MODAL ==========
  function createUserProfileModal() {
    var old = document.getElementById('userProfileModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'userProfileModal';
    modal.className = 'app-modal';
    modal.innerHTML =
      '<div class="modal-header modal-header-vinho" id="userProfileHeader">' +
        '<i class="fas fa-arrow-left modal-close" onclick="closeUserProfileModal()"></i>' +
        '<span id="userProfileTitle">Perfil</span>' +
      '</div>' +
      '<div class="modal-body modal-body-branco" style="padding:0; position:relative; overflow-y:auto;">' +
        // Capa
        '<div id="profileCover" style="height:120px; background-size:cover; background-position:center;"></div>' +
        // Área do avatar e informações principais
        '<div style="text-align:center; margin-top:-50px; position:relative; z-index:2;">' +
          '<div id="profileAvatarWrapper" style="display:inline-block; position:relative;">' +
            '<img id="profileAvatar" src="" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid var(--bg-header-top); background:#fff;">' +
            '<span id="profileOnlineIndicator" style="position:absolute; bottom:5px; right:5px; width:14px; height:14px; border-radius:50%; border:2px solid #fff; background:#ccc;"></span>' +
          '</div>' +
          '<h2 id="profileName" style="margin:8px 0 2px; font-size:20px; color:#222;"></h2>' +
          '<div id="profileHumor" style="font-size:24px; margin-bottom:4px;"></div>' +
          '<div id="profileStatus" style="font-size:13px; color:#87CEEB; margin-bottom:4px;"></div>' +
          '<div id="profileQuote" style="font-family:var(--font-serif); font-style:italic; font-size:16px; color:#111; display:flex; align-items:flex-start; gap:4px; justify-content:center;">' +
            '<span style="font-size:32px; color:#aaa; line-height:0.8;">"</span>' +
            '<span id="profileQuoteText"></span>' +
            '<span style="font-size:32px; color:#aaa; line-height:0.8; align-self:flex-end;">"</span>' +
          '</div>' +
          '<div id="profileLocation" style="font-size:12px; color:#888; margin:4px 0;"></div>' +
        '</div>' +
        // Badges
        '<div id="profileBadges" style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin:12px 16px;">' +
          '<span id="profileMemberSince" style="background:#f0f0f0; border-radius:20px; padding:4px 10px; font-size:11px;"></span>' +
        '</div>' +
        // Botões de ação
        '<div id="profileActions" style="display:flex; gap:8px; padding:0 16px; margin-bottom:12px; justify-content:center;"></div>' +
        // Últimos pensamentos
        '<div style="padding:0 16px; margin-bottom:12px;">' +
          '<div class="config-section"><h3>📜 Últimos pensamentos</h3><div id="profileRecentPosts" style="font-size:13px; color:#555;"></div></div>' +
        '</div>' +
        // Amigos em comum
        '<div style="padding:0 16px; margin-bottom:12px;">' +
          '<div class="config-section"><h3>👥 Amigos em comum</h3><div id="profileMutualFriends" style="display:flex; gap:8px; flex-wrap:wrap;"></div></div>' +
        '</div>' +
        // Bloquear / Compartilhar
        '<div style="padding:0 16px; margin-bottom:20px; display:flex; gap:10px; justify-content:center;">' +
          '<button class="btn-cancelar" onclick="bloquearUsuario()" style="font-size:12px;">🚫 Bloquear</button>' +
          '<button class="btn-cancelar" onclick="compartilharPerfil()" style="font-size:12px;">📋 Compartilhar</button>' +
        '</div>' +
        // Nota privada
        '<div style="padding:0 16px; margin-bottom:20px;">' +
          '<div class="config-section"><h3>📝 Sua nota privada</h3>' +
            '<textarea id="privateNoteInput" class="post-textarea" placeholder="Escreva uma nota pessoal sobre este usuário..." style="height:60px;"></textarea>' +
            '<button class="btn-primary" onclick="salvarNotaPrivada()" style="margin-top:8px;">💾 Salvar Nota</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('appMain').appendChild(modal);
  }

  // ========== ABRIR PERFIL ==========
  window.openUserProfile = async function (userId) {
    if (!userId) {
      if (typeof showToast === 'function') showToast('Usuário não identificado.');
      return;
    }
    if (typeof showToast === 'function') showToast('Carregando perfil...');

    try {
      // Tenta cache primeiro (ATHOM_CACHE.profile)
      var user = null;
      if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.profile) {
        user = ATHOM_CACHE.profile.get(userId);
      }

      if (!user) {
        var userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          if (typeof showToast === 'function') showToast('Usuário não encontrado.');
          return;
        }
        user = userDoc.data();
        user.id = userId;
        if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.profile) {
          ATHOM_CACHE.profile.set(userId, user);
        }
      }

      createUserProfileModal();

      // Preenche cabeçalho
      var safeFirstName = esc(user.firstName || (user.name ? user.name.split(' ')[0] : 'Perfil'));
      document.getElementById('userProfileTitle').textContent = safeFirstName;

      // Capa
      document.getElementById('profileCover').style.backgroundImage = 'url(' + (user.cover || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400') + ')';
      // Avatar
      document.getElementById('profileAvatar').src = user.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200';

      // Nome completo
      var safeFullName = esc(user.name || (user.firstName || '') + ' ' + (user.lastName || '').trim() || 'Usuário');
      document.getElementById('profileName').textContent = safeFullName;
      document.getElementById('profileHumor').textContent = esc(user.humor || '');
      document.getElementById('profileStatus').textContent = esc(user.status || '');
      document.getElementById('profileQuoteText').textContent = esc(user.quote || '');

      // Localização
      var safeLocation = user.localizacao ? '📍 ' + esc(user.localizacao) : '';
      document.getElementById('profileLocation').innerHTML = safeLocation;

      // Indicador online/offline
      var onlineIndicator = document.getElementById('profileOnlineIndicator');
      onlineIndicator.style.background = user.statusType === 'online' ? '#2ecc71' : '#ccc';

      // Membro desde
      var memberSinceText = '';
      if (user.createdAt) {
        var date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        memberSinceText = '📅 Membro desde ' + date.toLocaleDateString('pt-BR');
      }
      document.getElementById('profileMemberSince').textContent = memberSinceText;

      // ========== BOTÕES DE AÇÃO ==========
      var currentUid = auth.currentUser ? auth.currentUser.uid : null;
      var actionsDiv = document.getElementById('profileActions');
      actionsDiv.innerHTML = '';

      if (!currentUid) {
        actionsDiv.innerHTML = '<span style="color:#888;">Faça login para interagir</span>';
      } else if (currentUid === userId) {
        actionsDiv.innerHTML = '<span style="color:#888;">Este é você</span>';
      } else {
        // Verifica se já são amigos (consulta direta ao Firestore)
        try {
          var myDoc = await db.collection('users').doc(currentUid).get();
          var myFriends = myDoc.exists ? (myDoc.data().friends || []) : [];
          var isFriend = myFriends.indexOf(userId) !== -1;

          if (isFriend) {
            actionsDiv.innerHTML =
              '<button class="contact-action-btn" onclick="window.openChatWithUser(\'' + userId + '\')" style="background:var(--bg-header-top);color:#fff;">💬 Mensagem</button>' +
              '<button class="contact-action-btn unfollow" onclick="window.unfriendUser(\'' + userId + '\');window.closeUserProfileModal();">Deixar de seguir</button>';
          } else {
            // Verifica se há solicitação pendente enviada ou recebida
            var sentSnap = await db.collection('friendRequests')
              .where('from', '==', currentUid)
              .where('to', '==', userId)
              .where('status', '==', 'pending')
              .limit(1).get();
            var receivedSnap = await db.collection('friendRequests')
              .where('from', '==', userId)
              .where('to', '==', currentUid)
              .where('status', '==', 'pending')
              .limit(1).get();

            if (!sentSnap.empty) {
              actionsDiv.innerHTML = '<button class="contact-action-btn" disabled style="background:#e0e0e0;color:#888;">Solicitação enviada</button>';
            } else if (!receivedSnap.empty) {
              actionsDiv.innerHTML =
                '<button class="btn-aceitar" onclick="window.aceitarSolicitacaoRecebida(\'' + userId + '\');window.closeUserProfileModal();">✓ Aceitar</button>' +
                '<button class="btn-recusar" onclick="window.rejeitarSolicitacaoRecebida(\'' + userId + '\');window.closeUserProfileModal();">✕ Recusar</button>';
            } else {
              actionsDiv.innerHTML =
                '<button class="contact-action-btn" onclick="window.sendFriendRequest(\'' + userId + '\');window.closeUserProfileModal();" style="background:var(--text-cyan);color:#000;">+ Seguir</button>';
            }
          }
        } catch (e) {
          actionsDiv.innerHTML = '<span style="color:#888;">Erro ao verificar amizade.</span>';
        }
      }

      // ========== ÚLTIMOS PENSAMENTOS ==========
      var postsSnap = await db.collection('posts').where('userId', '==', userId).limit(5).get();
      var postagens = [];
      postsSnap.forEach(function (doc) {
        var p = doc.data();
        postagens.push({
          quote: p.quote || '',
          createdAt: p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt)) : null
        });
      });
      postagens.sort(function (a, b) {
        return (b.createdAt ? b.createdAt.getTime() : 0) - (a.createdAt ? a.createdAt.getTime() : 0);
      });

      var recentDiv = document.getElementById('profileRecentPosts');
      if (postagens.length === 0) {
        recentDiv.innerHTML = '<p style="color:#888;">Nenhum pensamento público ainda.</p>';
      } else {
        var recentHtml = '';
        for (var i = 0; i < Math.min(postagens.length, 5); i++) {
          var p = postagens[i];
          var time = p.createdAt ? p.createdAt.toLocaleString('pt-BR') : '';
          recentHtml += '<div class="recent-post-item">"' + esc(p.quote) + '" — ' + time + '</div>';
        }
        recentDiv.innerHTML = recentHtml;
      }

      // ========== AMIGOS EM COMUM ==========
      var mutualDiv = document.getElementById('profileMutualFriends');
      mutualDiv.innerHTML = '<p style="color:#888;width:100%;">Carregando...</p>';

      if (currentUid && currentUid !== userId) {
        try {
          var myDocForMutual = await db.collection('users').doc(currentUid).get();
          var myFriendsList = myDocForMutual.exists ? (myDocForMutual.data().friends || []) : [];
          var targetFriends = user.friends || [];

          var mutualIds = myFriendsList.filter(function (fid) {
            return targetFriends.indexOf(fid) !== -1;
          });

          if (mutualIds.length === 0) {
            mutualDiv.innerHTML = '<p style="color:#888;width:100%;">Nenhum amigo em comum.</p>';
          } else {
            var mutualDocs = await Promise.all(
              mutualIds.map(function (fid) { return db.collection('users').doc(fid).get(); })
            );
            var mutualHtml = '';
            for (var j = 0; j < mutualDocs.length; j++) {
              if (mutualDocs[j].exists) {
                var mu = mutualDocs[j].data();
                var safeMuName = esc(mu.firstName || (mu.name ? mu.name.split(' ')[0] : 'Usuário'));
                var safeMuAvatar = mu.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40';
                mutualHtml +=
                  '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;" onclick="openUserProfile(\'' + mutualDocs[j].id + '\')">' +
                    '<img src="' + safeMuAvatar + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);" title="' + safeMuName + '">' +
                    '<span style="font-size:10px;color:#555;">' + safeMuName + '</span>' +
                  '</div>';
              }
            }
            mutualDiv.innerHTML = mutualHtml;
          }
        } catch (e) {
          mutualDiv.innerHTML = '<p style="color:#888;">Erro ao carregar amigos em comum.</p>';
        }
      } else {
        mutualDiv.innerHTML = '<p style="color:#888;width:100%;">Este é você</p>';
      }

      // ========== NOTA PRIVADA ==========
      var savedNote = localStorage.getItem('you_note_' + userId);
      document.getElementById('privateNoteInput').value = savedNote || '';
      document.getElementById('userProfileModal').setAttribute('data-user-id', userId);

      // Abre o modal
      if (typeof openModal === 'function') {
        openModal('userProfileModal');
      }
    } catch (error) {
      console.error('Erro ao abrir perfil:', error);
      if (typeof showToast === 'function') showToast('Erro ao carregar perfil.');
    }
  };

  // ========== FECHAR ==========
  window.closeUserProfileModal = function () {
    if (typeof closeModal === 'function') closeModal('userProfileModal');
    var modal = document.getElementById('userProfileModal');
    if (modal) modal.remove();
  };

  // ========== AÇÕES MOCK ==========
  window.bloquearUsuario = function () {
    if (typeof showToast === 'function') showToast('Usuário bloqueado.');
  };
  window.compartilharPerfil = function () {
    if (typeof showToast === 'function') showToast('Link do perfil copiado! 📋');
  };

  // ========== NOTA PRIVADA ==========
  window.salvarNotaPrivada = function () {
    var note = document.getElementById('privateNoteInput') ? document.getElementById('privateNoteInput').value : '';
    var modal = document.getElementById('userProfileModal');
    var userId = modal ? modal.getAttribute('data-user-id') : null;
    if (userId) {
      localStorage.setItem('you_note_' + userId, note);
      if (typeof showToast === 'function') showToast('Nota salva com sucesso! 📝');
    }
  };

  console.log('👤 Perfil de outro usuário (perfil-outro.js) carregado.');
})();