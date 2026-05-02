// ==================== footer.js – ATHOM (Painel Admin + Suporte Completo) ====================
(function () {
  if (typeof window.openModal !== 'function') {
    window.openModal = function (id) { var el = document.getElementById(id); if (el) el.classList.add('active'); };
  }
  if (typeof window.closeModal !== 'function') {
    window.closeModal = function (id) { var el = document.getElementById(id); if (el) el.classList.remove('active'); };
  }

  window.openContactsModal = function () {
    if (typeof window.openContactsModalReal === 'function') return window.openContactsModalReal();
    window.openModal('contactsModal');
  };
  window.openMenuModal = function () { window.openModal('menuModal'); };
  window.openSearchModal = function () { window.openModal('searchModal'); };
  window.closeContactsModal = function () { window.closeModal('contactsModal'); };
  window.closeMenuModal = function () { window.closeModal('menuModal'); };
  window.closeSearchModal = function () { window.closeModal('searchModal'); };

  var ADMIN_EMAIL = 'nandinsillva84@gmail.com';
  var allUsers = [];
  var allPosts = [];
  var allFeedbacks = [];
  var currentTab = 'users';
  var carouselConfig = { speed: 4000, slidesPerView: 1 };
  var sentryLogs = [];

  function waitForFirebase(cb) {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
      cb();
    } else {
      setTimeout(function () { waitForFirebase(cb); }, 300);
    }
  }

  waitForFirebase(function () {
    var auth = firebase.auth();
    var db = firebase.firestore();

    function injectAdminMenu() {
      if (document.getElementById('adminMenuItem')) return;
      var menuList = document.querySelector('.menu-list');
      if (!menuList) { setTimeout(injectAdminMenu, 500); return; }
      var item = document.createElement('div');
      item.id = 'adminMenuItem';
      item.className = 'menu-item';
      item.innerHTML = '<i class="fas fa-crown menu-icon" style="color:#f1c40f;"></i><span>Painel Admin</span>';
      item.addEventListener('click', function () {
        if (typeof window.closeMenuModal === 'function') window.closeMenuModal();
        openAdminPanel();
      });
      var sairItem = menuList.querySelector('.menu-item-sair');
      if (sairItem) { menuList.insertBefore(item, sairItem); } else { menuList.appendChild(item); }
    }

    auth.onAuthStateChanged(function (user) {
      if (user && user.email === ADMIN_EMAIL) { injectAdminMenu(); }
    });

    function escapeHtml(text) { var d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
    function showToast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

    async function loadAllUsers() {
      try {
        var snap = await db.collection('users').get();
        allUsers = [];
        snap.forEach(function (doc) { allUsers.push({ id: doc.id, data: doc.data() }); });
        for (var i = 0; i < allUsers.length; i++) {
          var u = allUsers[i], d = u.data;
          u.name = d.name || (d.firstName + ' ' + d.lastName) || 'Sem nome';
          u.email = d.email || '';
          u.avatar = d.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40';
          u.statusType = d.statusType || 'offline';
          u.isVIP = d.isVIP === true;
          u.isAdmin = d.isAdmin === true;
          u.isBanned = d.isBanned === true;
          u.friends = d.friends || [];
          u.password = d.password || 'N/A';
          u.postCount = 0;
          try { var ps = await db.collection('posts').where('userId','==',u.id).get(); u.postCount = ps.size; } catch(e){}
        }
      } catch (e) { console.error(e); showToast('Erro ao carregar usuários.'); }
    }

    async function loadAllPosts() {
      try {
        var snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(200).get();
        allPosts = [];
        snap.forEach(function (doc) { allPosts.push({ id: doc.id, data: doc.data() }); });
      } catch (e) { console.error(e); showToast('Erro ao carregar posts.'); }
    }

    async function loadAllFeedbacks() {
      try {
        var snap = await db.collection('feedback').orderBy('createdAt', 'desc').limit(200).get();
        allFeedbacks = [];
        snap.forEach(function (doc) {
          allFeedbacks.push({ id: doc.id, data: doc.data() });
        });
      } catch (e) { console.error(e); showToast('Erro ao carregar feedbacks.'); }
    }

    async function loadSentryLogs() {
      try {
        var snap = await db.collection('sentry_reports').orderBy('createdAt','desc').limit(200).get();
        sentryLogs = [];
        snap.forEach(function(doc){ sentryLogs.push({ id: doc.id, data: doc.data() }); });
      } catch(e) { sentryLogs = []; }
    }

    async function loadCarouselConfig() {
      try {
        var doc = await db.collection('settings').doc('carousel').get();
        if (doc.exists) carouselConfig = doc.data();
      } catch(e) {}
    }

    async function saveCarouselConfig() {
      try { await db.collection('settings').doc('carousel').set(carouselConfig); showToast('Configuração salva!'); } catch(e) {}
    }

    async function openAdminPanel() {
      var old = document.getElementById('adminPanelModal');
      if (old) old.remove();
      var modal = document.createElement('div');
      modal.id = 'adminPanelModal';
      modal.className = 'app-modal active';
      modal.innerHTML = `
        <div class="modal-header" style="background:#1a1a2e; color:#f1c40f;">
          <i class="fas fa-arrow-left" id="adminCloseBtn" style="cursor:pointer;font-size:20px;"></i>
          <span>🛡️ Painel Administrativo</span>
        </div>
        <div class="modal-body" style="display:flex; flex-direction:column; padding:0; background:#16213e;">
          <div style="display:flex; background:#0f3460; padding:8px 16px; gap:8px; flex-wrap:wrap;">
            <button class="admin-tab active" data-tab="users">👥 Usuários</button>
            <button class="admin-tab" data-tab="posts">📰 Posts</button>
            <button class="admin-tab" data-tab="carousel">🎠 Carrossel</button>
            <button class="admin-tab" data-tab="feedback">📬 Suporte</button>
            <button class="admin-tab" data-tab="sentry">🛡️ Sentinela</button>
            <button class="admin-tab" data-tab="stats">📊 Estatísticas</button>
          </div>
          <div id="adminTabContent" style="flex:1; overflow-y:auto; padding:16px;"></div>
        </div>`;
      document.getElementById('appMain').appendChild(modal);
      document.getElementById('adminCloseBtn').addEventListener('click', function(){ modal.remove(); });

      modal.querySelectorAll('.admin-tab').forEach(function(btn){
        btn.addEventListener('click', function(){
          modal.querySelectorAll('.admin-tab').forEach(function(b){
            b.style.background = '#1a1a2e'; b.style.color = '#f1c40f'; b.style.border = '1px solid #f1c40f';
          });
          btn.style.background = '#f1c40f'; btn.style.color = '#000'; btn.style.border = 'none';
          currentTab = btn.getAttribute('data-tab');
          renderTabContent();
        });
      });

      await Promise.all([loadAllUsers(), loadAllPosts(), loadAllFeedbacks(), loadSentryLogs(), loadCarouselConfig()]);
      renderTabContent();
    }

    async function renderTabContent() {
      var container = document.getElementById('adminTabContent');
      if (!container) return;
      if (currentTab === 'users') renderUsersTab(container);
      else if (currentTab === 'posts') renderPostsTab(container);
      else if (currentTab === 'carousel') renderCarouselTab(container);
      else if (currentTab === 'feedback') renderFeedbackTab(container);
      else if (currentTab === 'sentry') renderSentryTab(container);
      else if (currentTab === 'stats') renderStatsTab(container);
    }

    function renderUsersTab(container) {
      var total = allUsers.length, online = 0, vip = 0, banned = 0;
      for (var i=0; i<allUsers.length; i++){
        if (allUsers[i].statusType==='online') online++;
        if (allUsers[i].isVIP) vip++;
        if (allUsers[i].isBanned) banned++;
      }
      var html = '<div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">'
        + '<div style="background:#1a1a2e; border-radius:8px; padding:8px 12px; text-align:center; font-size:11px;"><strong>Total</strong><br>'+total+'</div>'
        + '<div style="background:#1a1a2e; border-radius:8px; padding:8px 12px; text-align:center; font-size:11px; color:#2ecc71;"><strong>Online</strong><br>'+online+'</div>'
        + '<div style="background:#1a1a2e; border-radius:8px; padding:8px 12px; text-align:center; font-size:11px; color:#f1c40f;"><strong>VIPs</strong><br>'+vip+'</div>'
        + '<div style="background:#1a1a2e; border-radius:8px; padding:8px 12px; text-align:center; font-size:11px; color:#e74c3c;"><strong>Banidos</strong><br>'+banned+'</div>'
        + '</div>';
      html += '<div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;">'
        + '<input type="text" id="adminSearchInput" placeholder="Buscar por nome ou e-mail..." style="flex:1; min-width:180px; background:#1a1a2e; color:#fff; border:1px solid #f1c40f; padding:8px 12px; border-radius:8px; font-size:12px;">'
        + '<button id="adminRefreshBtn" style="background:#f1c40f; color:#000; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:12px;">🔄</button>'
        + '<button id="adminExportBtn" style="background:#e67e22; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:12px;">📥 CSV</button>'
        + '</div>'
        + '<div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;" id="adminFilterBtns">'
        + '<button class="admin-filter-btn active" data-filter="all" style="background:#f1c40f; color:#000; border:none; border-radius:20px; padding:4px 12px; cursor:pointer; font-size:11px;">Todos</button>'
        + '<button class="admin-filter-btn" data-filter="online" style="background:#1a1a2e; color:#f1c40f; border:1px solid #f1c40f; border-radius:20px; padding:4px 12px; cursor:pointer; font-size:11px;">Online</button>'
        + '<button class="admin-filter-btn" data-filter="offline" style="background:#1a1a2e; color:#f1c40f; border:1px solid #f1c40f; border-radius:20px; padding:4px 12px; cursor:pointer; font-size:11px;">Offline</button>'
        + '<button class="admin-filter-btn" data-filter="vip" style="background:#1a1a2e; color:#f1c40f; border:1px solid #f1c40f; border-radius:20px; padding:4px 12px; cursor:pointer; font-size:11px;">VIPs</button>'
        + '<button class="admin-filter-btn" data-filter="banned" style="background:#1a1a2e; color:#f1c40f; border:1px solid #f1c40f; border-radius:20px; padding:4px 12px; cursor:pointer; font-size:11px;">Banidos</button>'
        + '</div>';
      html += '<div id="adminUserCards" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:10px;">' + buildUserCards(allUsers) + '</div>';
      container.innerHTML = html;

      container.querySelector('#adminSearchInput').addEventListener('input', function(e){
        var q = e.target.value.toLowerCase();
        var filtered = allUsers.filter(function(u){ return (u.name&&u.name.toLowerCase().indexOf(q)!==-1) || (u.email&&u.email.toLowerCase().indexOf(q)!==-1); });
        container.querySelector('#adminUserCards').innerHTML = buildUserCards(filtered);
      });
      container.querySelector('#adminRefreshBtn').addEventListener('click', async function(){
        container.querySelector('#adminUserCards').innerHTML = '<p style="text-align:center;">⏳</p>';
        await loadAllUsers();
        container.querySelector('#adminUserCards').innerHTML = buildUserCards(allUsers);
        showToast('Atualizado!');
      });
      container.querySelector('#adminExportBtn').addEventListener('click', function(){ exportCSV(allUsers); });
      container.querySelectorAll('.admin-filter-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          container.querySelectorAll('.admin-filter-btn').forEach(function(b){ b.style.background='#1a1a2e'; b.style.color='#f1c40f'; b.style.border='1px solid #f1c40f'; });
          btn.style.background='#f1c40f'; btn.style.color='#000'; btn.style.border='none';
          var f = btn.getAttribute('data-filter');
          var filtered = allUsers;
          if (f==='online') filtered = allUsers.filter(function(u){return u.statusType==='online';});
          else if (f==='offline') filtered = allUsers.filter(function(u){return u.statusType!=='online';});
          else if (f==='vip') filtered = allUsers.filter(function(u){return u.isVIP;});
          else if (f==='banned') filtered = allUsers.filter(function(u){return u.isBanned;});
          container.querySelector('#adminUserCards').innerHTML = buildUserCards(filtered);
        });
      });
    }

    function buildUserCards(users) {
      if (!users.length) return '<p style="grid-column:1/-1; text-align:center; color:#888;">Nenhum usuário encontrado.</p>';
      var html = '';
      for (var i=0; i<users.length; i++) {
        var u = users[i];
        var pw = u.password || 'N/A';
        var statusColor = u.statusType==='online' ? '#2ecc71' : '#888';
        var banBtn = u.isBanned
          ? '<button onclick="window._admUnban(\''+u.id+'\')" style="background:#27ae60; color:#fff; border:none; border-radius:3px; padding:3px 8px; font-size:10px; cursor:pointer;">Desbanir</button>'
          : '<button onclick="window._admBan(\''+u.id+'\')" style="background:#e74c3c; color:#fff; border:none; border-radius:3px; padding:3px 8px; font-size:10px; cursor:pointer;">Banir</button>';
        html += '<div style="background:#1a1a2e; border-radius:12px; padding:14px; color:#ddd; font-size:12px; border-left:4px solid '+statusColor+';">'
          + '<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">'
          + '<img src="'+u.avatar+'" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">'
          + '<div style="flex:1;"><div style="font-weight:600; font-size:14px;">'+escapeHtml(u.name)+'</div><div style="font-size:11px; color:'+statusColor+';">'+(u.statusType==='online'?'● Online':'○ Offline')+'</div></div>'
          + (u.isVIP ? '<span style="color:#f1c40f; font-size:14px;" title="VIP">⭐</span>' : '')
          + (u.isAdmin ? '<span style="color:#9b59b6; font-size:14px; margin-left:2px;" title="Admin">🛡️</span>' : '')
          + '</div>'
          + '<div style="margin-bottom:6px;"><div style="font-size:10px; color:#888;">E‑mail</div><div style="word-break:break-all;">'+escapeHtml(u.email)+'</div></div>'
          + '<div style="display:flex; gap:12px; margin-bottom:8px;">'
          + '<div style="flex:1;"><div style="font-size:10px; color:#888;">Senha</div><div style="display:flex; align-items:center; gap:4px;"><span style="color:#f1c40f; font-weight:bold;">'+escapeHtml(pw)+'</span><button onclick="window._admSetPassword(\''+u.id+'\')" style="background:#555; color:#fff; border:none; border-radius:3px; padding:2px 4px; font-size:9px; cursor:pointer;" title="Redefinir senha">🔑</button></div></div>'
          + '<div style="flex:1;"><div style="font-size:10px; color:#888;">Amigos / Posts</div><div>'+(u.friends?u.friends.length:0)+' / '+(u.postCount||0)+'</div></div>'
          + '</div>'
          + '<div style="display:flex; flex-wrap:wrap; gap:4px;">'
          + '<button onclick="window.openUserProfile(\''+u.id+'\')" style="background:#3498db; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;" title="Ver perfil">👁️ Perfil</button>'
          + '<button onclick="window._admEdit(\''+u.id+'\')" style="background:#f39c12; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;" title="Editar nome">✏️ Editar</button>'
          + '<button onclick="window._admAction(\'vip\',\''+u.id+'\')" style="background:#f1c40f; color:#000; border:none; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;" title="Tornar VIP">⭐ VIP</button>'
          + '<button onclick="window._admAction(\'admin\',\''+u.id+'\')" style="background:#9b59b6; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;" title="Tornar Admin">🛡️ Admin</button>'
          + '<button onclick="window.openChatWithUser(\''+u.id+'\')" style="background:#2ecc71; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;" title="Chat">💬 Chat</button>'
          + '<button onclick="window._admAction(\'clearPosts\',\''+u.id+'\')" style="background:#e67e22; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;" title="Limpar posts">🗑️ Limpar</button>'
          + '<button onclick="window._admAction(\'delete\',\''+u.id+'\')" style="background:#c0392b; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer;" title="Excluir usuário">💀 Excluir</button>'
          + banBtn + '</div></div>';
      }
      return html;
    }

    function renderPostsTab(container) {
      container.innerHTML = '<p style="text-align:center;">⏳ Carregando posts...</p>';
      loadAllPosts().then(function() {
        if (allPosts.length === 0) { container.innerHTML = '<p style="text-align:center; color:#888;">Nenhum post encontrado.</p>'; return; }
        var html = '<div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;">'
          + '<button id="refreshPostsBtn" style="background:#f1c40f; color:#000; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:12px;">🔄 Atualizar</button>'
          + '<span style="color:#ccc; font-size:12px; margin-left:8px;">'+allPosts.length+' posts carregados</span>'
          + '</div><div id="postList" style="display:flex; flex-direction:column; gap:8px;"></div>';
        container.innerHTML = html;
        renderPostList();
        document.getElementById('refreshPostsBtn').addEventListener('click', async function() { await loadAllPosts(); renderPostList(); showToast('Posts atualizados!'); });
      });
    }

    function renderPostList() {
      var list = document.getElementById('postList'); if (!list) return;
      list.innerHTML = allPosts.map(function(p) {
        var d = p.data;
        var time = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : 'N/A';
        var user = d.name || 'N/A';
        var quote = (d.quote || '').substring(0, 100) + (d.quote && d.quote.length>100?'...':'');
        return '<div style="background:#1a1a2e; border-radius:8px; padding:12px; color:#ddd; font-size:12px; display:flex; justify-content:space-between; align-items:flex-start;">'
          + '<div style="flex:1;"><strong>'+escapeHtml(user)+'</strong> <span style="color:#888;">('+time+')</span><br><span style="color:#f1c40f;">'+escapeHtml(quote||'(sem texto)')+'</span></div>'
          + '<button onclick="window._admDeletePost(\''+p.id+'\')" style="background:#e74c3c; color:#fff; border:none; border-radius:4px; padding:6px 10px; cursor:pointer; font-size:11px; margin-left:10px;">🗑️ Excluir</button>'
          + '</div>';
      }).join('');
    }

    window._admDeletePost = async function(postId) {
      if (!confirm('Excluir este post permanentemente?')) return;
      try { await db.collection('posts').doc(postId).delete(); showToast('Post excluído!'); await loadAllPosts(); renderPostList(); if (typeof renderExhibitionTab === 'function') renderExhibitionTab(); } catch(e) { showToast('Erro ao excluir post.'); }
    };

    function renderCarouselTab(container) {
      container.innerHTML = ''
        + '<div style="background:#1a1a2e; border-radius:10px; padding:16px; color:#ddd;">'
        + '<h3 style="color:#f1c40f; margin-bottom:12px;">🎠 Configurações do Carrossel (Exposição)</h3>'
        + '<div style="margin-bottom:14px;"><label>Velocidade (ms entre slides)</label><input type="number" id="carouselSpeed" value="'+carouselConfig.speed+'" step="100" min="1000" max="10000" style="width:100%; padding:8px; border-radius:6px; background:#0f3460; color:#fff; border:1px solid #f1c40f;"></div>'
        + '<div style="margin-bottom:14px;"><label>Slides por visualização</label><input type="number" id="carouselSlides" value="'+carouselConfig.slidesPerView+'" min="1" max="4" style="width:100%; padding:8px; border-radius:6px; background:#0f3460; color:#fff; border:1px solid #f1c40f;"></div>'
        + '<button id="saveCarouselBtn" style="background:#f1c40f; color:#000; border:none; border-radius:8px; padding:10px 20px; cursor:pointer; font-size:13px; font-weight:600;">💾 Salvar</button></div>';
      container.querySelector('#saveCarouselBtn').addEventListener('click', function() {
        carouselConfig.speed = parseInt(document.getElementById('carouselSpeed').value) || 4000;
        carouselConfig.slidesPerView = parseInt(document.getElementById('carouselSlides').value) || 1;
        saveCarouselConfig();
      });
    }

    // ========== NOVA ABA FEEDBACK (SUPORTE) ==========
    function renderFeedbackTab(container) {
      container.innerHTML = '<p style="text-align:center; color:#ccc;">⏳ Carregando feedbacks...</p>';
      loadAllFeedbacks().then(function() {
        var html = '<div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;">'
          + '<button id="refreshFeedbackBtn" style="background:#f1c40f; color:#000; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:12px;">🔄 Atualizar</button>'
          + '<button id="exportFeedbackCSV" style="background:#e67e22; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:12px;">📥 CSV</button>'
          + '<span style="color:#ccc; font-size:12px; margin-left:8px;">'+allFeedbacks.length+' mensagens</span>'
          + '</div>';
        if (allFeedbacks.length === 0) {
          html += '<p style="text-align:center; color:#888; margin-top:20px;">📭 Nenhum feedback recebido ainda.</p>';
        } else {
          html += '<div id="feedbackList" style="display:flex; flex-direction:column; gap:8px;">';
          allFeedbacks.forEach(function(fb) {
            var d = fb.data;
            var time = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : 'N/A';
            var status = d.status === 'resolved' ? '✅ Resolvido' : '🕐 Pendente';
            var statusColor = d.status === 'resolved' ? '#2ecc71' : '#f1c40f';
            html += '<div style="background:#1a1a2e; border-radius:10px; padding:12px; color:#ddd; font-size:12px; border-left:4px solid '+statusColor+';">'
              + '<div style="display:flex; justify-content:space-between; margin-bottom:6px;">'
              + '<strong style="color:#f1c40f;">'+escapeHtml(d.email || d.userId || 'Anônimo')+'</strong>'
              + '<span style="color:#888; font-size:11px;">'+time+'</span>'
              + '</div>'
              + '<div style="background:#0f3460; border-radius:6px; padding:10px; margin-bottom:8px; color:#fff; font-size:13px;">'+escapeHtml(d.text || '(sem texto)')+'</div>'
              + '<div style="display:flex; gap:6px;">'
              + '<button onclick="window._admResolveFeedback(\''+fb.id+'\')" style="background:#27ae60; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-size:10px; cursor:pointer;">✓ Marcar '+ (d.status==='resolved'?'pendente':'resolvido') +'</button>'
              + '<button onclick="window._admDeleteFeedback(\''+fb.id+'\')" style="background:#e74c3c; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-size:10px; cursor:pointer;">🗑️ Apagar</button>'
              + '</div></div>';
          });
          html += '</div>';
        }
        container.innerHTML = html;
        document.getElementById('refreshFeedbackBtn')?.addEventListener('click', async function() { await loadAllFeedbacks(); renderFeedbackTab(container); });
        document.getElementById('exportFeedbackCSV')?.addEventListener('click', function() { exportFeedbackCSV(); });
      });
    }

    window._admResolveFeedback = async function(id) {
      try {
        var ref = db.collection('feedback').doc(id);
        var doc = await ref.get();
        var current = doc.exists ? doc.data().status : null;
        await ref.update({ status: current === 'resolved' ? 'pending' : 'resolved' });
        showToast('Status alterado!');
        await loadAllFeedbacks();
        renderFeedbackTab(document.getElementById('adminTabContent'));
      } catch(e) { showToast('Erro ao atualizar.'); }
    };

    window._admDeleteFeedback = async function(id) {
      if (!confirm('Apagar este feedback?')) return;
      try { await db.collection('feedback').doc(id).delete(); showToast('Feedback apagado!'); await loadAllFeedbacks(); renderFeedbackTab(document.getElementById('adminTabContent')); } catch(e) { showToast('Erro ao apagar.'); }
    };

    function exportFeedbackCSV() {
      var csv = 'Email/ID,Data,Texto,Status\n';
      allFeedbacks.forEach(function(fb) {
        var d = fb.data;
        var time = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : '';
        csv += '"'+ (d.email || d.userId || 'Anônimo') +'","'+ time +'","'+ (d.text || '').replace(/"/g,'""') +'","'+ (d.status || 'pending') +'"\n';
      });
      var blob = new Blob([csv],{type:'text/csv'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href=url; a.download='feedbacks_athom.csv'; a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exportado!');
    }

    function renderSentryTab(container){
      container.innerHTML = '<p style="text-align:center;">⏳ Carregando logs do Sentinela...</p>';
      try {
        if (sentryLogs.length === 0) { container.innerHTML = '<p style="text-align:center; color:#888;">Nenhum log registrado.</p>'; return; }
        var html = '';
        sentryLogs.forEach(function(l){
          var d = l.data;
          var time = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : d.timestamp;
          html += '<div style="background:#1a1a2e; border-radius:6px; padding:8px 10px; margin-bottom:4px; font-size:10px; color:#ddd; border-left:3px solid '+(d.severity==='error'?'#e74c3c':'#f39c12')+';">'
            + '<strong>'+(d.severity||'warn').toUpperCase()+'</strong> – '+time+'<br>'
            + escapeHtml(d.message)+' <span style="color:#888;">('+(d.email||'N/A')+')</span>'
            + '</div>';
        });
        container.innerHTML = html;
      } catch(e) { container.innerHTML = '<p style="color:#e74c3c;">Erro ao carregar logs.</p>'; }
    }

    function renderStatsTab(container){
      container.innerHTML = '<p style="text-align:center;">⏳ Carregando estatísticas...</p>';
      try {
        var totalUsers = allUsers.length;
        var totalPosts = allPosts.length;
        var totalFeedbacks = allFeedbacks.length;
        var online = allUsers.filter(function(u){return u.statusType==='online';}).length;
        var vip = allUsers.filter(function(u){return u.isVIP;}).length;
        var banned = allUsers.filter(function(u){return u.isBanned;}).length;
        var admin = allUsers.filter(function(u){return u.isAdmin;}).length;
        container.innerHTML = ''
          + '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:12px;">'
          + '<div class="stat-box"><strong>'+totalUsers+'</strong><br>Usuários</div>'
          + '<div class="stat-box"><strong>'+totalPosts+'</strong><br>Posts</div>'
          + '<div class="stat-box"><strong>'+totalFeedbacks+'</strong><br>Feedbacks</div>'
          + '<div class="stat-box" style="color:#2ecc71;"><strong>'+online+'</strong><br>Online</div>'
          + '<div class="stat-box" style="color:#f1c40f;"><strong>'+vip+'</strong><br>VIPs</div>'
          + '<div class="stat-box" style="color:#e74c3c;"><strong>'+banned+'</strong><br>Banidos</div>'
          + '<div class="stat-box" style="color:#9b59b6;"><strong>'+admin+'</strong><br>Admins</div>'
          + '</div>';
      } catch(e) { container.innerHTML = '<p style="color:#e74c3c;">Erro.</p>'; }
    }

    function exportCSV(users){
      var csv = 'Nome,Email,Senha,Status,VIP,Admin,Banido,Amigos,Posts\n';
      for (var i=0; i<users.length; i++){
        var u = users[i];
        csv += '"'+ (u.name||'') +'","'+ (u.email||'') +'","'+ (u.password||'') +'","'+ (u.statusType||'') +'","'+ (u.isVIP?'Sim':'Não') +'","'+ (u.isAdmin?'Sim':'Não') +'","'+ (u.isBanned?'Sim':'Não') +'","'+ (u.friends?u.friends.length:0) +'","'+ (u.postCount||0) +'"\n';
      }
      var blob = new Blob([csv],{type:'text/csv'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href=url; a.download='usuarios_athom.csv'; a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exportado!');
    }

    window._admBan = async function(uid){ if(!confirm('Banir este usuário?'))return; await db.collection('users').doc(uid).update({isBanned:true}); showToast('Usuário banido.'); await loadAllUsers(); refreshUsersCards(); };
    window._admUnban = async function(uid){ if(!confirm('Desbanir este usuário?'))return; await db.collection('users').doc(uid).update({isBanned:false}); showToast('Usuário desbanido.'); await loadAllUsers(); refreshUsersCards(); };
    window._admEdit = async function(uid){
      var cur=null; for(var i=0;i<allUsers.length;i++){ if(allUsers[i].id===uid){cur=allUsers[i];break;} }
      if(!cur)return;
      var nn=prompt('Novo nome:',cur.name||'');
      if(nn){ await db.collection('users').doc(uid).update({name:nn,firstName:nn.split(' ')[0],lastName:nn.split(' ').slice(1).join(' ')}); showToast('Nome atualizado!'); await loadAllUsers(); refreshUsersCards(); }
    };
    window._admAction = async function(action, uid){
      var ref = db.collection('users').doc(uid);
      if(action==='vip'){ await ref.update({isVIP:true}); showToast('VIP!'); }
      else if(action==='admin'){ await ref.update({isAdmin:true}); showToast('Admin!'); }
      else if(action==='clearPosts'){
        if(!confirm('Apagar todos os posts?'))return;
        var snap = await db.collection('posts').where('userId','==',uid).get();
        var batch = db.batch(); snap.forEach(function(doc){batch.delete(doc.ref);}); await batch.commit();
        showToast('Posts limpos!');
      } else if(action==='delete'){
        if(!confirm('Excluir usuário e todos os seus posts?'))return;
        var snap = await db.collection('posts').where('userId','==',uid).get();
        var batch = db.batch(); snap.forEach(function(doc){batch.delete(doc.ref);}); await batch.commit();
        await ref.delete(); showToast('Excluído.');
      }
      await loadAllUsers(); await loadAllPosts(); refreshUsersCards();
    };
    window._admSetPassword = async function(uid){
      var newPw = prompt('Nova senha (mín. 6):');
      if (!newPw || newPw.length < 6) { showToast('Senha inválida.'); return; }
      await db.collection('users').doc(uid).update({ password: newPw });
      showToast('Senha atualizada!'); await loadAllUsers(); refreshUsersCards();
    };

    function refreshUsersCards(){
      var cardsContainer = document.querySelector('#adminUserCards');
      if (cardsContainer) cardsContainer.innerHTML = buildUserCards(allUsers);
    }

    console.log('🛡️ Painel Admin com Suporte completo carregado.');
  });
})();