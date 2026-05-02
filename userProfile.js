// ==================== userProfile.js – ATHOM (Perfil de Outros Usuários) ====================
(function() {
  // ========== CRIAÇÃO DO MODAL ==========
  function createUserProfileModal() {
    const old = document.getElementById('userProfileModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'userProfileModal';
    modal.className = 'app-modal';
    modal.innerHTML = `
      <div class="modal-header modal-header-vinho" id="userProfileHeader">
        <i class="fas fa-arrow-left modal-close" onclick="closeUserProfileModal()"></i>
        <span id="userProfileTitle">Perfil</span>
      </div>
      <div class="modal-body modal-body-branco" style="padding:0; position:relative; overflow-y:auto;">
        <div id="profileCover" style="height:120px; background-size:cover; background-position:center;"></div>
        <div style="text-align:center; margin-top:-50px; position:relative; z-index:2;">
          <div id="profileAvatarWrapper" style="display:inline-block; position:relative;">
            <img id="profileAvatar" src="" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid var(--bg-header-top); background:#fff;">
            <span id="profileOnlineIndicator" style="position:absolute; bottom:5px; right:5px; width:14px; height:14px; border-radius:50%; border:2px solid #fff; background:#ccc;"></span>
          </div>
          <h2 id="profileName" style="margin:8px 0 2px; font-size:20px; color:#222;"></h2>
          <div id="profileHumor" style="font-size:24px; margin-bottom:4px;"></div>
          <div id="profileStatus" style="font-size:13px; color:#87CEEB; margin-bottom:4px;"></div>
          <div id="profileQuote" style="font-family:var(--font-serif); font-style:italic; font-size:16px; color:#111; display:flex; align-items:flex-start; gap:4px; justify-content:center;">
            <span style="font-size:32px; color:#aaa; line-height:0.8;">“</span>
            <span id="profileQuoteText"></span>
            <span style="font-size:32px; color:#aaa; line-height:0.8; align-self:flex-end;">”</span>
          </div>
          <div id="profileLocation" style="font-size:12px; color:#888; margin:4px 0;"></div>
        </div>

        <div id="profileBadges" style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin:12px 16px;">
          <span id="profileMemberSince" style="background:#f0f0f0; border-radius:20px; padding:4px 10px; font-size:11px;"></span>
        </div>

        <div id="profileActions" style="display:flex; gap:8px; padding:0 16px; margin-bottom:12px; justify-content:center;"></div>

        <div style="padding:0 16px; margin-bottom:12px;">
          <div class="config-section">
            <h3>📜 Últimos pensamentos</h3>
            <div id="profileRecentPosts" style="font-size:13px; color:#555;"></div>
          </div>
        </div>

        <div style="padding:0 16px; margin-bottom:12px;">
          <div class="config-section">
            <h3>👥 Amigos em comum</h3>
            <div id="profileMutualFriends" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
          </div>
        </div>

        <div style="padding:0 16px; margin-bottom:20px; display:flex; gap:10px; justify-content:center;">
          <button class="btn-cancelar" onclick="bloquearUsuario()" style="font-size:12px;">🚫 Bloquear</button>
          <button class="btn-cancelar" onclick="compartilharPerfil()" style="font-size:12px;">📋 Compartilhar</button>
        </div>

        <div style="padding:0 16px; margin-bottom:20px;">
          <div class="config-section">
            <h3>📝 Sua nota privada</h3>
            <textarea id="privateNoteInput" class="post-textarea" placeholder="Escreva uma nota pessoal sobre este usuário..." style="height:60px;"></textarea>
            <button class="btn-primary" onclick="salvarNotaPrivada()" style="margin-top:8px;">💾 Salvar Nota</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('appMain').appendChild(modal);
  }

  // ========== ABRIR PERFIL (com cache) ==========
  window.openUserProfile = async function(userId) {
    if (!userId) return showToast('Usuário não identificado.');
    showToast('Carregando perfil...');

    try {
      // Tenta cache (5 min)
      let user = null;
      if (typeof ATHOM_CACHE !== 'undefined') {
        user = ATHOM_CACHE.user.get('profile_' + userId);
      }

      if (!user) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          showToast('Usuário não encontrado.');
          return;
        }
        user = userDoc.data();
        user.id = userId;
        if (typeof ATHOM_CACHE !== 'undefined') {
          ATHOM_CACHE.user.set('profile_' + userId, user);
        }
      }

      createUserProfileModal();

      document.getElementById('userProfileTitle').textContent = (user.firstName || user.name?.split(' ')[0] || 'Perfil');
      document.getElementById('profileCover').style.backgroundImage = `url(${user.cover || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400'})`;
      document.getElementById('profileAvatar').src = user.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200';
      document.getElementById('profileName').textContent = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuário';
      document.getElementById('profileHumor').textContent = user.humor || '';
      document.getElementById('profileStatus').textContent = user.status || '';
      document.getElementById('profileQuoteText').textContent = user.quote || '';
      document.getElementById('profileLocation').innerHTML = user.localizacao ? `📍 ${user.localizacao}` : '';
      document.getElementById('profileOnlineIndicator').className = `online-indicator ${user.statusType === 'online' ? 'online' : 'offline'}`;

      // Membro desde
      let memberSinceText = '';
      if (user.createdAt) {
        const date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        memberSinceText = `📅 Membro desde ${date.toLocaleDateString('pt-BR')}`;
      }
      document.getElementById('profileMemberSince').textContent = memberSinceText;

      // Ações de amizade
      const actionsDiv = document.getElementById('profileActions');
      actionsDiv.innerHTML = '';
      const currentUid = auth.currentUser?.uid;

      if (currentUid && currentUid !== userId) {
        let isFriend = false, requestSent = false, requestReceived = false;
        if (typeof getFriendshipStatus === 'function') {
          const status = getFriendshipStatus(userId);
          isFriend = status.isFriend;
          requestSent = status.requestSent;
          requestReceived = status.requestReceived;
        }

        if (isFriend) {
          actionsDiv.innerHTML += `<button class="contact-action-btn" onclick="openChatWithUser('${userId}')" style="background:var(--bg-header-top); color:#fff;">💬 Mensagem</button>`;
          actionsDiv.innerHTML += `<button class="contact-action-btn unfollow" onclick="unfriendUser('${userId}'); closeUserProfileModal();">Deixar de seguir</button>`;
        } else if (requestSent) {
          actionsDiv.innerHTML += `<button class="contact-action-btn" disabled style="background:#e0e0e0; color:#888;">Solicitação enviada</button>`;
        } else if (requestReceived) {
          actionsDiv.innerHTML += `<button class="btn-aceitar" onclick="aceitarSolicitacaoRecebida('${userId}'); closeUserProfileModal();">✓ Aceitar</button>`;
          actionsDiv.innerHTML += `<button class="btn-recusar" onclick="rejeitarSolicitacaoRecebida('${userId}'); closeUserProfileModal();">✕ Recusar</button>`;
        } else {
          actionsDiv.innerHTML += `<button class="contact-action-btn" onclick="sendFriendRequest('${userId}'); closeUserProfileModal();" style="background:var(--text-cyan); color:#000;">+ Seguir</button>`;
        }
      } else if (currentUid === userId) {
        actionsDiv.innerHTML = `<span style="color:#888;">Este é você</span>`;
      }

      // Últimos pensamentos (sem índice composto)
      const postsSnap = await db.collection('posts')
        .where('userId', '==', userId)
        .limit(5)
        .get();

      let postagens = [];
      postsSnap.forEach(doc => {
        const p = doc.data();
        postagens.push({
          quote: p.quote || '',
          createdAt: p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt)) : null
        });
      });
      postagens.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

      const recentDiv = document.getElementById('profileRecentPosts');
      if (postagens.length === 0) {
        recentDiv.innerHTML = '<p style="color:#888;">Nenhum pensamento público ainda.</p>';
      } else {
        recentDiv.innerHTML = postagens.slice(0, 5).map(p => {
          const time = p.createdAt ? p.createdAt.toLocaleString('pt-BR') : '';
          return `<div class="recent-post-item">"${p.quote}" — ${time}</div>`;
        }).join('');
      }

      // Amigos em comum
      const mutualDiv = document.getElementById('profileMutualFriends');
      mutualDiv.innerHTML = '<p style="color:#888; width:100%;">Carregando...</p>';

      if (currentUid && currentUid !== userId) {
        try {
          const myDoc = await db.collection('users').doc(currentUid).get();
          const myFriends = myDoc.exists ? (myDoc.data().friends || []) : [];
          const targetFriends = user.friends || [];

          const mutualIds = myFriends.filter(fid => targetFriends.includes(fid));

          if (mutualIds.length === 0) {
            mutualDiv.innerHTML = '<p style="color:#888; width:100%;">Nenhum amigo em comum.</p>';
          } else {
            const mutualDocs = await Promise.all(
              mutualIds.map(fid => db.collection('users').doc(fid).get())
            );
            mutualDiv.innerHTML = mutualDocs
              .filter(doc => doc.exists)
              .map(doc => {
                const mu = doc.data();
                return `<div style="display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer;" onclick="openUserProfile('${doc.id}')">
                  <img src="${mu.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40'}" 
                       style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid var(--bg-header-top);" 
                       title="${mu.name || (mu.firstName + ' ' + mu.lastName)}">
                  <span style="font-size:10px; color:#555;">${mu.firstName || mu.name?.split(' ')[0]}</span>
                </div>`;
              }).join('');
          }
        } catch (e) {
          mutualDiv.innerHTML = '<p style="color:#888;">Erro ao carregar amigos em comum.</p>';
        }
      } else {
        mutualDiv.innerHTML = '<p style="color:#888; width:100%;">Este é você</p>';
      }

      // Nota privada
      const savedNote = localStorage.getItem(`athom_note_${userId}`);
      document.getElementById('privateNoteInput').value = savedNote || '';
      document.getElementById('userProfileModal').setAttribute('data-user-id', userId);

      openModal('userProfileModal');
    } catch (error) {
      console.error('Erro ao abrir perfil:', error);
      showToast('Erro ao carregar perfil.');
    }
  };

  // ========== FECHAR ==========
  window.closeUserProfileModal = function() {
    closeModal('userProfileModal');
    const modal = document.getElementById('userProfileModal');
    if (modal) modal.remove();
  };

  // ========== AÇÕES MOCK ==========
  window.bloquearUsuario = () => showToast('Usuário bloqueado (mock).');
  window.compartilharPerfil = () => showToast('Link do perfil copiado! 📋');

  // ========== NOTA PRIVADA ==========
  window.salvarNotaPrivada = function() {
    const note = document.getElementById('privateNoteInput')?.value;
    const modal = document.getElementById('userProfileModal');
    const userId = modal?.getAttribute('data-user-id');
    if (userId) {
      localStorage.setItem(`athom_note_${userId}`, note);
      showToast('Nota salva com sucesso! 📝');
    }
  };

  // ========== HELPERS DE AMIZADE ==========
  window.aceitarSolicitacaoRecebida = async function(fromUid) {
    if (typeof acceptFriendRequest !== 'function') return showToast('Função indisponível.');
    const snap = await db.collection('friendRequests')
      .where('from', '==', fromUid)
      .where('to', '==', auth.currentUser.uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (!snap.empty) {
      await acceptFriendRequest(snap.docs[0].id);
    } else {
      showToast('Solicitação não encontrada.');
    }
  };

  window.rejeitarSolicitacaoRecebida = async function(fromUid) {
    if (typeof rejectFriendRequest !== 'function') return showToast('Função indisponível.');
    const snap = await db.collection('friendRequests')
      .where('from', '==', fromUid)
      .where('to', '==', auth.currentUser.uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (!snap.empty) {
      await rejectFriendRequest(snap.docs[0].id);
    } else {
      showToast('Solicitação não encontrada.');
    }
  };

  console.log('👤 Perfil de usuário com cache e amigos em comum ativo.');
})();