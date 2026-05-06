// ==================== interacoes.js – YOU ====================
// Controla todas as interações sociais do app:
// - Curtir (❤️)
// - Republicar (🔄)
// - Comentar (💬)
//
// Usa atualização otimista: o número no botão muda na hora,
// sem esperar o Firestore. Se algo falhar, reverte.
// Também gerencia o modal de comentários.

(function () {
  // ========== VARIÁVEL PARA O POST ATUAL NOS COMENTÁRIOS ==========
  var activePostId = null;

  // ========== SANITIZAÇÃO (usada nos comentários) ==========
  // A função esc() já foi definida globalmente pelo sanitizador.js.
  // Mas garantimos um fallback local por segurança.
  function esc(str) {
    if (typeof window.esc === 'function') {
      return window.esc(str);
    }
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ========== ATUALIZA O TEXTO DO BOTÃO NA TELA ==========
  // Procura um botão com os atributos data-post-id e data-action
  // e atualiza o conteúdo (ex.: "❤️ 5" → "❤️ 6")
  function updateButtonUI(postId, action, value) {
    var btn = document.querySelector('[data-post-id="' + postId + '"][data-action="' + action + '"]');
    if (btn) {
      var icons = { like: '❤️', repost: '🔄', comment: '💬' };
      btn.innerHTML = (icons[action] || '') + ' ' + value;
    }
  }

  // ========== LIKE (CURTIR) ==========
  window.toggleLike = async function (postId) {
    // 1. Verifica se o usuário está logado
    var uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if (!uid) {
      if (typeof showToast === 'function') showToast('Faça login primeiro.');
      return;
    }

    var postRef = db.collection('posts').doc(postId);

    // 2. Lê o estado atual do post (likes e likedBy)
    var currentLikes, isLiked;
    try {
      var snap = await postRef.get();
      if (!snap.exists) return;
      var data = snap.data();
      currentLikes = data.likes || 0;
      // Verifica se o UID do usuário está na lista de quem curtiu
      isLiked = (data.likedBy || []).indexOf(uid) !== -1;
    } catch (e) {
      if (typeof showToast === 'function') showToast('Erro ao carregar.');
      return;
    }

    // 3. Atualização otimista (muda o número na tela imediatamente)
    var newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
    updateButtonUI(postId, 'like', newLikes);

    // 4. Persistência no Firestore (em segundo plano)
    try {
      await db.runTransaction(async function (transaction) {
        var doc = await transaction.get(postRef);
        if (!doc.exists) return;
        var likedBy = doc.data().likedBy || [];
        var hasLiked = likedBy.indexOf(uid) !== -1;

        // Se já curtiu, remove o like; senão, adiciona
        if (hasLiked) {
          transaction.update(postRef, {
            likedBy: firebase.firestore.FieldValue.arrayRemove(uid),
            likes: firebase.firestore.FieldValue.increment(-1)
          });
        } else {
          transaction.update(postRef, {
            likedBy: firebase.firestore.FieldValue.arrayUnion(uid),
            likes: firebase.firestore.FieldValue.increment(1)
          });
        }
      });
    } catch (e) {
      // 5. Se falhar, reverte a atualização otimista
      updateButtonUI(postId, 'like', currentLikes);
      console.error('Erro no like:', e);
      if (typeof showToast === 'function') showToast('Erro ao processar like.');
    }
  };

  // ========== REPOST (REPUBLICAR) ==========
  window.repost = async function (postId) {
    // 1. Verifica login
    var uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if (!uid) {
      if (typeof showToast === 'function') showToast('Faça login para republicar.');
      return;
    }

    var postRef = db.collection('posts').doc(postId);

    // 2. Lê o número atual de republicações
    var currentShares;
    try {
      var snap = await postRef.get();
      if (!snap.exists) return;
      currentShares = snap.data().shares || 0;
    } catch (e) {
      return;
    }

    // 3. Atualização otimista
    updateButtonUI(postId, 'repost', currentShares + 1);

    // 4. Persistência
    try {
      await postRef.update({
        shares: firebase.firestore.FieldValue.increment(1)
      });
    } catch (e) {
      // 5. Reverte se falhar
      updateButtonUI(postId, 'repost', currentShares);
      console.error('Erro ao repostar:', e);
      if (typeof showToast === 'function') showToast('Erro ao repostar.');
    }
  };

  // ========== ABRIR COMENTÁRIOS ==========
  window.openComments = async function (postId) {
    activePostId = postId;

    // Busca comentários existentes no Firestore (subcoleção)
    var ref = db.collection('posts').doc(postId).collection('comments');
    var snap = await ref.orderBy('createdAt', 'asc').get();

    // Salva temporariamente para renderização
    window._tempComments = [];
    snap.forEach(function (doc) {
      var d = doc.data();
      window._tempComments.push({
        id: doc.id,
        userId: d.userId,
        userName: d.userName || 'Usuário',
        text: d.text || '',
        createdAt: d.createdAt ? d.createdAt.toDate() : null
      });
    });

    renderComments();

    // Abre o modal de comentários
    if (typeof openModal === 'function') {
      openModal('commentsModal');
    }
  };

  // ========== FECHAR COMENTÁRIOS ==========
  window.closeComments = function () {
    if (typeof closeModal === 'function') {
      closeModal('commentsModal');
    }
    activePostId = null;
  };

  // ========== RENDERIZAR LISTA DE COMENTÁRIOS ==========
  function renderComments() {
    var container = document.getElementById('commentsList');
    if (!container) return;

    var comments = window._tempComments || [];

    if (comments.length === 0) {
      container.innerHTML = '<p style="color:#888;text-align:center;">Nenhum comentário ainda.</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      var time = c.createdAt ? c.createdAt.toLocaleTimeString() : '';
      html +=
        '<div style="margin-bottom:8px;">' +
          '<strong>' + esc(c.userName) + '</strong> ' +
          '<span style="color:#888;font-size:12px;">' + time + '</span><br>' +
          esc(c.text) +
        '</div>';
    }

    container.innerHTML = html;
  }

  // ========== ENVIAR COMENTÁRIO ==========
  window.submitComment = async function () {
    if (!activePostId) return;

    var input = document.getElementById('commentInput');
    if (!input) return;

    var text = input.value.trim();
    if (!text) return;

    var user = firebase.auth().currentUser;
    if (!user) {
      if (typeof showToast === 'function') showToast('Faça login.');
      return;
    }

    var comment = {
      userId: user.uid,
      userName: user.displayName || (user.email ? user.email.split('@')[0] : 'Anônimo'),
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // Salva na subcoleção "comments" do post
      await db.collection('posts').doc(activePostId).collection('comments').add(comment);

      // Incrementa o contador de comentários no post principal
      await db.collection('posts').doc(activePostId).update({
        comments: firebase.firestore.FieldValue.increment(1)
      });

      // Limpa o campo
      input.value = '';

      // Recarrega a lista de comentários
      window.openComments(activePostId);

      // Atualiza o botão de comentário na tela (se existir)
      updateButtonUI(activePostId, 'comment', (window._tempComments || []).length);
    } catch (e) {
      console.error('Erro ao comentar:', e);
      if (typeof showToast === 'function') showToast('Erro ao comentar.');
    }
  };

  // ========== COMPATIBILIDADE ==========
  window.initInteractions = function () {};

  console.log('💬 Interações (likes, comentários, reposts) carregadas.');
})();