// ==================== exhibition.js – ATHOM (Cache de 30s + Exibição Instantânea) ====================
(function() {
  var style = document.createElement('style');
  style.textContent = `
    .exh-carousel-wrapper { position:relative; width:100%; padding-top:56.25%; overflow:hidden; border-radius:16px; margin-bottom:12px; background:#111; }
    .exh-carousel-track { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; transition:transform 0.4s ease; }
    .exh-slide { min-width:100%; height:100%; position:relative; }
    .exh-slide img, .exh-slide video { width:100%; height:100%; object-fit:cover; }
    .exh-actions { position:absolute; top:8px; right:8px; display:flex; gap:6px; z-index:10; }
    .exh-action-btn { background:rgba(0,0,0,0.5); border:none; color:#fff; font-size:14px; padding:4px 8px; border-radius:14px; cursor:pointer; }
    .exh-indicators { display:flex; justify-content:center; gap:6px; margin-top:8px; flex-wrap:wrap; max-height:60px; overflow-y:auto; }
    .exh-dot { width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.4); cursor:pointer; }
    .exh-dot.active { background:#fff; transform:scale(1.3); }
    .card { background:#fff; border-radius:16px; padding:14px; position:relative; margin-bottom:10px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
    .now-status-indicator { position:absolute; top:14px; right:14px; width:10px; height:10px; border-radius:50%; }
    .now-status-indicator.online { background:#2ecc71; }
    .now-status-indicator.offline { background:#ccc; }
    .now-action-btn { background:none; border:none; color:#888; font-size:13px; cursor:pointer; padding:2px 6px; border-radius:8px; }
    .now-action-btn:hover { background:#f5f5f5; }
    .exh-load-more { display:flex; justify-content:center; margin:12px 0; }
    .exh-load-more button { background:var(--bg-header-top); color:#fff; border:none; border-radius:20px; padding:10px 24px; font-size:14px; cursor:pointer; }
  `;
  document.head.appendChild(style);

  var carouselTimer = null, currentSlide = 0;
  var CACHE_KEY = 'athom_exhibition_cache';
  var CACHE_DURATION = 30 * 1000; // 30 segundos
  var MAX_POSTS = 5000;           // limite original

  function goToSlide(i) {
    var track = document.getElementById('exhTrack'); if (!track) return;
    track.style.transform = 'translateX(-' + i*100 + '%)'; currentSlide = i;
    document.querySelectorAll('.exh-dot').forEach(function(d, j) { d.classList.toggle('active', j===i); });
  }

  function startAutoplay() {
    clearInterval(carouselTimer);
    var slides = document.querySelectorAll('.exh-slide');
    if (slides.length <= 1) return;
    carouselTimer = setInterval(function() { currentSlide = (currentSlide + 1) % slides.length; goToSlide(currentSlide); }, 4000);
  }

  function log(msg) { console.log('[Exhibition]', msg); }

  // ========== CACHE ==========
  function salvarCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch(e) {}
  }
  function obterCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  window.renderExhibitionTab = async function() {
    var feed = document.getElementById('mainFeed');
    if (!feed) return;

    // 1. Exibe cache IMEDIATAMENTE se existir e estiver dentro dos 30s
    var cached = obterCache();
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      feed.innerHTML = '';
      montarCarrossel(cached.slidesData || []);
      montarCardsTexto(cached.textPosts || []);
      log('⚡ Exibido do cache (menos de 30s).');
      return; // não recarrega
    }

    // 2. Se o cache expirou (ou não existe), mostra "Carregando..." e busca tudo
    feed.innerHTML = '<p style="color:#333;text-align:center;">🎨 Carregando exposição...</p>';
    log('🔄 Cache expirado ou ausente. Buscando posts...');

    try {
      if (typeof db === 'undefined' || typeof auth === 'undefined' || !auth.currentUser) {
        feed.innerHTML = '<p style="color:#333;">⚠️ Você precisa estar logado para ver a exposição.</p>';
        return;
      }

      // Busca paginada (original)
      var allPosts = [];
      var lastDoc = null;
      var hasMore = true;
      var page = 0;
      var MAX_PAGES = Math.ceil(MAX_POSTS / 500); // até 10 páginas

      while (hasMore && page < MAX_PAGES) {
        var query = db.collection('posts')
          .orderBy('createdAt', 'desc')
          .limit(500);
        if (lastDoc) query = query.startAfter(lastDoc);
        var snap = await query.get();
        if (snap.empty) break;
        snap.forEach(function(doc) { allPosts.push({ id: doc.id, data: doc.data() }); });
        lastDoc = snap.docs[snap.docs.length - 1];
        hasMore = snap.docs.length === 500;
        page++;
      }

      log('📊 Total de posts carregados: ' + allPosts.length);

      // Processa posts
      var uids = new Set();
      allPosts.forEach(function(p) { uids.add(p.data.userId); });
      var profiles = {};
      await Promise.all(Array.from(uids).map(async function(uid) {
        try {
          var doc = await db.collection('users').doc(uid).get();
          if (doc.exists) profiles[uid] = doc.data();
        } catch(e) {}
      }));

      var slidesData = [], textPosts = [];
      allPosts.forEach(function(p) {
        var d = p.data;
        var postId = p.id;
        var profile = profiles[d.userId] || {};

        if (Array.isArray(d.media) && d.media.length > 0) {
          d.media.forEach(function(m) {
            slidesData.push({
              postId: postId, src: m.dataUrl, tipo: m.tipo || 'imagem',
              author: profile.name || d.name || 'Usuário',
              time: d.createdAt ? new Date(d.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '',
              likes: d.likes||0, comments: d.comments||0, shares: d.shares||0
            });
          });
        } else if (d.mediaUrl && typeof d.mediaUrl === 'string') {
          slidesData.push({
            postId: postId, src: d.mediaUrl,
            tipo: d.tipo === 'video' ? 'video' : 'imagem',
            author: profile.name || d.name || 'Usuário',
            time: d.createdAt ? new Date(d.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '',
            likes: d.likes||0, comments: d.comments||0, shares: d.shares||0
          });
        }

        if (d.quote && (!Array.isArray(d.media) || d.media.length === 0) && !d.mediaUrl) {
          textPosts.push({
            id: postId, userId: d.userId,
            userName: profile.name || d.name || 'Usuário',
            userAvatar: profile.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50',
            userActivity: profile.status || '',
            quote: d.quote,
            time: d.createdAt ? new Date(d.createdAt.toDate()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '',
            likes: d.likes||0, comments: d.comments||0, shares: d.shares||0,
            userOnline: profile.statusType === 'online'
          });
        }
      });

      // Atualiza cache com timestamp
      var cacheData = { slidesData, textPosts, timestamp: Date.now() };
      salvarCache(cacheData);

      // Renderiza
      feed.innerHTML = '';
      montarCarrossel(slidesData);
      montarCardsTexto(textPosts);
      log('✅ Exposição renderizada e cache atualizado.');

    } catch(e) {
      log('💥 ERRO: ' + e.message);
      feed.innerHTML = '<p style="color:#e74c3c;text-align:center;">Erro ao carregar exposição.</p>';
    }
  };

  function montarCarrossel(slidesData) {
    if (!slidesData || slidesData.length === 0) return;
    var feed = document.getElementById('mainFeed');
    var wrapper = document.createElement('div'); wrapper.className = 'exh-carousel-wrapper';
    var track = document.createElement('div'); track.className = 'exh-carousel-track'; track.id = 'exhTrack';
    slidesData.forEach(function(slide) {
      var div = document.createElement('div'); div.className = 'exh-slide';
      div.innerHTML = `
        ${slide.tipo==='video' ? '<video src="'+slide.src+'" muted loop playsinline></video>' : '<img src="'+slide.src+'" loading="lazy">'}
        <div class="exh-actions">
          <button class="exh-action-btn" onclick="event.stopPropagation();toggleLike('${slide.postId}')">❤️ ${slide.likes}</button>
          <button class="exh-action-btn" onclick="event.stopPropagation();openComments('${slide.postId}')">💬 ${slide.comments}</button>
          <button class="exh-action-btn" onclick="event.stopPropagation();repost('${slide.postId}')">🔄 ${slide.shares}</button>
        </div>`;
      track.appendChild(div);
    });
    wrapper.appendChild(track); feed.appendChild(wrapper);
    var indicators = document.createElement('div'); indicators.className = 'exh-indicators';
    slidesData.forEach(function(_, i) {
      var dot = document.createElement('span'); dot.className = 'exh-dot' + (i===0 ? ' active' : '');
      dot.onclick = function() { goToSlide(i); };
      indicators.appendChild(dot);
    });
    feed.appendChild(indicators);
    goToSlide(0); startAutoplay();
  }

  function montarCardsTexto(textPosts) {
    if (!textPosts || textPosts.length === 0) return;
    var feed = document.getElementById('mainFeed');
    textPosts.forEach(function(post) {
      var card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <span class="now-status-indicator ${post.userOnline ? 'online' : 'offline'}"></span>
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
          <img src="${post.userAvatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:15px;">${post.userName}</div>
            <div style="font-size:12px;color:var(--text-cyan);margin-top:2px;">${post.userActivity||''}</div>
            <div style="display:flex;align-items:flex-start;gap:4px;margin-top:8px;">
              <span style="font-family:serif;font-size:32px;color:#aaa;">"</span>
              <span style="font-family:serif;font-style:italic;font-size:17px;">${(post.quote||'').replace(/"/g,'')}</span>
              <span style="font-family:serif;font-size:32px;color:#aaa;align-self:flex-end;">"</span>
            </div>
          </div>
        </div>
        <hr style="border-top:1px solid #e0e0e0;">
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:14px;color:#888;">${post.time}</span>
          <div style="display:flex;gap:12px;">
            <button class="now-action-btn" onclick="toggleLike('${post.id}')">❤️ ${post.likes}</button>
            <button class="now-action-btn" onclick="openComments('${post.id}')">💬 ${post.comments}</button>
            <button class="now-action-btn" onclick="repost('${post.id}')">🔄 ${post.shares}</button>
          </div>
        </div>`;
      feed.appendChild(card);
    });
  }

  // Disparo ao clicar na aba
  function bindExhibitionTab() {
    var tab = document.querySelector('.header-tab[data-tab="exhibition"]');
    if (tab) tab.addEventListener('click', window.renderExhibitionTab);
    if (document.querySelector('.header-tab.active[data-tab="exhibition"]')) {
      window.renderExhibitionTab();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindExhibitionTab);
  } else {
    bindExhibitionTab();
  }
})();