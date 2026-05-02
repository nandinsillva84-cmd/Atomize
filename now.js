// ==================== now.js – ATHOM (Perfil dos Amigos) – VERSÃO ORIGINAL CORRETA ====================
(function () {
  async function loadNowFeed() {
    const feed = document.getElementById('mainFeed');
    if (!feed) return;
    feed.innerHTML = '<p style="color:#333;text-align:center;padding:20px;">Carregando pensamentos...</p>';

    try {
      if (typeof db === 'undefined' || !auth.currentUser) {
        feed.innerHTML = '<p style="color:#333;">Você precisa estar logado.</p>';
        return;
      }

      const currentUid = auth.currentUser.uid;
      const userDoc = await db.collection('users').doc(currentUid).get();
      const friendIds = userDoc.exists ? (userDoc.data().friends || []) : [];

      if (friendIds.length === 0) {
        feed.innerHTML = '<p style="color:#555;text-align:center;">Nenhum amigo ainda.</p>';
        return;
      }

      // Buscar perfil de cada amigo em paralelo
      const friendDocs = await Promise.all(
        friendIds.map(id => db.collection('users').doc(id).get())
      );

      const friends = friendDocs
        .filter(doc => doc.exists)
        .map(doc => ({ id: doc.id, ...doc.data() }));

      if (friends.length === 0) {
        feed.innerHTML = '<p style="color:#555;text-align:center;">Nenhum amigo encontrado.</p>';
        return;
      }

      feed.innerHTML = '';
      friends.forEach(friend => {
        const card = document.createElement('div');
        card.className = 'card now-card';
        const online = friend.statusType === 'online';
        card.innerHTML = `
          <span class="now-status-indicator ${online ? 'online' : 'offline'}"></span>
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px;">
            <img src="${friend.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80'}" 
                 style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:16px;color:#1A1A1A;">${friend.name || (friend.firstName+' '+friend.lastName) || 'Usuário'}</div>
              <div style="font-size:13px;color:var(--text-cyan);margin-top:2px;">${friend.status || ''}</div>
              ${friend.quote ? `
              <div style="display:flex;align-items:flex-start;gap:4px;margin-top:6px;">
                <span style="font-family:var(--font-serif);font-size:28px;color:#aaa;line-height:0.8;">"</span>
                <span style="font-family:var(--font-serif);font-style:italic;font-size:14px;color:#222;line-height:1.4;word-break:break-word;">${friend.quote.replace(/"/g,'')}</span>
                <span style="font-family:var(--font-serif);font-size:28px;color:#aaa;line-height:0.8;align-self:flex-end;">"</span>
              </div>` : ''}
            </div>
          </div>`;
        feed.appendChild(card);
      });

    } catch (e) {
      feed.innerHTML = '<p style="color:#333;">Erro ao carregar.</p>';
      console.error(e);
    }
  }

  function waitForApp(cb) { if (window._appStarted) cb(); else setTimeout(() => waitForApp(cb), 150); }
  waitForApp(() => {
    window.loadNowFeed = loadNowFeed;
    const nowTab = document.querySelector('.header-tab[data-tab="now"]');
    if (nowTab) nowTab.addEventListener('click', loadNowFeed);
    if (document.querySelector('.header-tab.active[data-tab="now"]')) loadNowFeed();
    window.addEventListener('friendshipUpdated', () => {
      if (document.querySelector('.header-tab.active[data-tab="now"]')) loadNowFeed();
    });
  });
})();