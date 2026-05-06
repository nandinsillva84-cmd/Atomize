// ==================== agora.js – YOU ====================
// Feed "Now": exibe os amigos do usuário com:
// - Avatar, nome e status (do perfil)
// - Pensamento do dia (quote) entre aspas
// - Linha de separação
// - Horário da última publicação do amigo
// - Reações (❤️ 💬 🔄) baseadas no último post
// - Fundo amarelo (#F5F0DC) se o último post tiver menos de 1 hora

(function () {
  // Sanitizador já está global como window.esc, mas mantemos fallback
  function esc(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Função principal chamada pela aba Now
  async function loadNowFeed() {
    var feed = document.getElementById('mainFeed');
    if (!feed) return;
    feed.innerHTML = '<p style="color:#333;text-align:center;padding:20px;">Carregando pensamentos...</p>';

    try {
      // Verifica se o Firebase e o usuário estão prontos
      if (typeof db === 'undefined' || !auth.currentUser) {
        feed.innerHTML = '<p style="color:#333;">Você precisa estar logado.</p>';
        return;
      }

      var currentUid = auth.currentUser.uid;

      // 1. Obtém a lista de amigos (busca direta do Firestore, sem cache)
      var userDoc = await db.collection('users').doc(currentUid).get();
      var friendIds = userDoc.exists ? (userDoc.data().friends || []) : [];

      if (friendIds.length === 0) {
        feed.innerHTML = '<p style="color:#555;text-align:center;">Nenhum amigo ainda.</p>';
        return;
      }

      var friendDocs = await Promise.all(
        friendIds.map(function (id) { return db.collection('users').doc(id).get(); })
      );
      var friends = [];
      for (var i = 0; i < friendDocs.length; i++) {
        if (friendDocs[i].exists) {
          friends.push({ id: friendDocs[i].id, data: friendDocs[i].data() });
        }
      }

      if (friends.length === 0) {
        feed.innerHTML = '<p style="color:#555;text-align:center;">Nenhum amigo encontrado.</p>';
        return;
      }

      // 2. Para cada amigo, busca o último post (tenta com índice, fallback sem)
      var getLatestPost = async function (friendId) {
        try {
          // Tenta com orderBy (índice)
          var snap = await db.collection('posts')
            .where('userId', '==', friendId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
          if (!snap.empty) {
            return { id: snap.docs[0].id, data: snap.docs[0].data() };
          }
        } catch (e) {
          // Fallback: busca todos e ordena no cliente
          var snapFallback = await db.collection('posts')
            .where('userId', '==', friendId)
            .get();
          if (!snapFallback.empty) {
            var posts = [];
            snapFallback.forEach(function (doc) {
              posts.push({ id: doc.id, data: doc.data() });
            });
            posts.sort(function (a, b) {
              var aTime = a.data.createdAt && a.data.createdAt.toDate ? a.data.createdAt.toDate().getTime() : 0;
              var bTime = b.data.createdAt && b.data.createdAt.toDate ? b.data.createdAt.toDate().getTime() : 0;
              return bTime - aTime;
            });
            return { id: posts[0].id, data: posts[0].data };
          }
        }
        return null;
      };

      var latestPosts = [];
      for (var j = 0; j < friends.length; j++) {
        latestPosts.push(await getLatestPost(friends[j].id));
      }

      // 3. Monta os cards
      feed.innerHTML = '';
      for (var k = 0; k < friends.length; k++) {
        var friend = friends[k];
        var latestPost = latestPosts[k];

        // Calcula horário e se é recente (menos de 1 hora)
        var postTime = null;
        var isRecent = false;
        if (latestPost && latestPost.data.createdAt) {
          postTime = latestPost.data.createdAt.toDate ? latestPost.data.createdAt.toDate() : new Date(latestPost.data.createdAt);
          isRecent = (Date.now() - postTime.getTime()) < 3600000;
        } else if (latestPost) {
          // Post sem timestamp? Assume recente
          postTime = new Date();
          isRecent = true;
        }

        // Cria o elemento do card
        var card = document.createElement('div');
        card.className = 'card now-card';
        if (isRecent) card.style.background = '#F5F0DC'; // fundo amarelo

        // Preenche o conteúdo do card
        var avatar = friend.data.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80';
        var name = esc(friend.data.name || 'Usuário');
        var status = friend.data.status ? esc(friend.data.status) : '';
        var quote = friend.data.quote ? esc(friend.data.quote) : '';
        var timeStr = postTime ? postTime.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '—';
        var likes = latestPost ? (latestPost.data.likes || 0) : 0;
        var comments = latestPost ? (latestPost.data.comments || 0) : 0;
        var shares = latestPost ? (latestPost.data.shares || 0) : 0;
        var postId = latestPost ? latestPost.id : '';

        card.innerHTML =
          '<span class="now-status-indicator ' + (friend.data.statusType === 'online' ? 'online' : 'offline') + '"></span>' +
          '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px;">' +
            '<img src="' + avatar + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);">' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:600;font-size:16px;">' + name + '</div>' +
              (status ? '<div style="font-size:13px;color:var(--text-cyan);margin-top:2px;">' + status + '</div>' : '') +
              (quote ?
                '<div style="display:flex;align-items:flex-start;gap:4px;margin-top:6px;">' +
                  '<span style="font-family:var(--font-serif);font-size:28px;color:#aaa;line-height:0.8;">"</span>' +
                  '<span style="font-family:var(--font-serif);font-style:italic;font-size:14px;color:#222;line-height:1.4;word-break:break-word;">' + quote + '</span>' +
                  '<span style="font-family:var(--font-serif);font-size:28px;color:#aaa;line-height:0.8;align-self:flex-end;">"</span>' +
                '</div>'
              : '') +
            '</div>' +
          '</div>' +
          '<hr style="border-top:1px solid #e0e0e0; margin:8px 0;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="font-size:12px;color:#888;">' + timeStr + '</span>' +
            '<div style="display:flex;gap:12px;">' +
              '<button class="now-action-btn" data-post-id="' + postId + '" data-action="like" onclick="toggleLike(\'' + postId + '\')">❤️ ' + likes + '</button>' +
              '<button class="now-action-btn" data-post-id="' + postId + '" data-action="comment" onclick="openComments(\'' + postId + '\')">💬 ' + comments + '</button>' +
              '<button class="now-action-btn" data-post-id="' + postId + '" data-action="repost" onclick="repost(\'' + postId + '\')">🔄 ' + shares + '</button>' +
            '</div>' +
          '</div>';

        feed.appendChild(card);
      }

    } catch (e) {
      feed.innerHTML = '<p style="color:#333;">Erro ao carregar.</p>';
      console.error(e);
    }
  }

  // Aguarda o app iniciar para vincular a aba
  function waitForApp(cb) {
    if (window._appStarted) cb();
    else setTimeout(function () { waitForApp(cb); }, 150);
  }

  waitForApp(function () {
    // Torna a função acessível globalmente
    window.loadNowFeed = loadNowFeed;

    // Vincula o clique na aba Now
    var nowTab = document.querySelector('.header-tab[data-tab="now"]');
    if (nowTab) nowTab.addEventListener('click', loadNowFeed);

    // Se a aba Now já estiver ativa ao carregar, exibe o feed
    if (document.querySelector('.header-tab.active[data-tab="now"]')) {
      loadNowFeed();
    }

    // Atualiza o feed quando a lista de amigos mudar
    window.addEventListener('friendshipUpdated', function () {
      if (document.querySelector('.header-tab.active[data-tab="now"]')) {
        loadNowFeed();
      }
    });
  });

  console.log('🕒 Feed Now (agora.js) carregado.');
})();