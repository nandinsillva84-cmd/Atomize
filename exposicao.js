// ==================== exposicao.js – YOU ====================
// Feed "Exposição": feed público com as últimas publicações de TODOS os usuários.
// Inclui:
// - Carrossel de mídias (fotos/vídeos) com navegação e autoplay
// - Cards de texto com avatar, nome, status, conteúdo, hora e reações
// - Paginação com cursor (50 posts por vez)
// - Cache local (ATHOM_CACHE.exhibition)
// - Timer do carrossel pausado ao trocar de aba
// - Proteção XSS em todos os dados exibidos
// - Botões de interação com data-post-id e data-action

(function () {
  // ========== INJEÇÃO DE ESTILOS (APENAS DESTA ABA) ==========
  var style = document.createElement('style');
  style.textContent =
    '.exh-carousel-wrapper { position:relative; width:100%; padding-top:56.25%; overflow:hidden; border-radius:16px; margin-bottom:12px; background:#111; }' +
    '.exh-carousel-track { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; transition:transform 0.4s ease; }' +
    '.exh-slide { min-width:100%; height:100%; position:relative; }' +
    '.exh-slide img, .exh-slide video { width:100%; height:100%; object-fit:cover; }' +
    '.exh-actions { position:absolute; top:8px; right:8px; display:flex; gap:6px; z-index:10; }' +
    '.exh-action-btn { background:rgba(0,0,0,0.5); border:none; color:#fff; font-size:14px; padding:4px 8px; border-radius:14px; cursor:pointer; }' +
    '.exh-indicators { display:flex; justify-content:center; gap:6px; margin-top:8px; flex-wrap:wrap; max-height:60px; overflow-y:auto; }' +
    '.exh-dot { width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.4); cursor:pointer; }' +
    '.exh-dot.active { background:#fff; transform:scale(1.3); }' +
    '.exh-load-more { display:flex; justify-content:center; margin:12px 0; }' +
    '.exh-load-more button { background:var(--bg-header-top); color:#fff; border:none; border-radius:20px; padding:10px 24px; font-size:14px; cursor:pointer; }';
  document.head.appendChild(style);

  // ========== SANITIZAÇÃO ==========
  function esc(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ========== VARIÁVEIS DE PAGINAÇÃO ==========
  var PAGE_SIZE = 50;
  var lastDoc = null;
  var isLoading = false;
  var hasMore = true;
  var allLoadedSlides = [];
  var allLoadedTextPosts = [];
  var loadedPostIds = {};

  // ========== VARIÁVEIS DO CARROSSEL ==========
  var carouselTimer = null;
  var currentSlide = 0;

  function stopCarousel() {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }

  function goToSlide(i) {
    var track = document.getElementById('exhTrack');
    if (!track) return;
    track.style.transform = 'translateX(-' + (i * 100) + '%)';
    currentSlide = i;
    var dots = document.querySelectorAll('.exh-dot');
    for (var j = 0; j < dots.length; j++) {
      dots[j].classList.toggle('active', j === i);
    }
  }

  function startAutoplay() {
    stopCarousel();
    var slides = document.querySelectorAll('.exh-slide');
    if (slides.length <= 1) return;
    carouselTimer = setInterval(function () {
      currentSlide = (currentSlide + 1) % slides.length;
      goToSlide(currentSlide);
    }, 4000);
  }

  // ========== FUNÇÃO PRINCIPAL (chamada pela aba Exposição) ==========
  async function renderExhibitionTab() {
    stopCarousel();
    var feed = document.getElementById('mainFeed');
    if (!feed) return;

    // Tenta cache primeiro
    var cached = null;
    if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.exhibition && ATHOM_CACHE.exhibition.posts) {
      cached = ATHOM_CACHE.exhibition.posts.get();
    }

    if (cached && cached.timestamp && (Date.now() - cached.timestamp < 2000)) { // 2 segundos (TTL pequeno)
      feed.innerHTML = '';
      allLoadedSlides = cached.slidesData || [];
      allLoadedTextPosts = cached.textPosts || [];
      loadedPostIds = {};
      for (var i = 0; i < allLoadedSlides.length; i++) {
        loadedPostIds[allLoadedSlides[i].postId + '_slide'] = true;
      }
      for (var j = 0; j < allLoadedTextPosts.length; j++) {
        loadedPostIds[allLoadedTextPosts[j].id] = true;
      }
      montarCarrossel(allLoadedSlides);
      montarCardsTexto(allLoadedTextPosts);
      if (cached.hasMore) adicionarBotaoCarregarMais();
      return;
    }

    // Reseta estado
    lastDoc = null;
    hasMore = true;
    isLoading = false;
    allLoadedSlides = [];
    allLoadedTextPosts = [];
    loadedPostIds = {};

    feed.innerHTML = '<p style="color:#333;text-align:center;">🎨 Carregando exposição...</p>';
    await carregarMaisPosts(false);
  }

  // ========== CARREGAR MAIS POSTS (PAGINAÇÃO) ==========
  async function carregarMaisPosts(append) {
    if (isLoading || (!hasMore && append)) return;
    isLoading = true;
    var feed = document.getElementById('mainFeed');
    if (!append && feed) feed.innerHTML = '<p style="color:#333;text-align:center;">🎨 Carregando exposição...</p>';

    try {
      if (!auth.currentUser) {
        if (feed) feed.innerHTML = '<p style="color:#333;">⚠️ Você precisa estar logado para ver a exposição.</p>';
        isLoading = false;
        return;
      }

      var query = db.collection('posts').orderBy('createdAt', 'desc').limit(PAGE_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);

      var snap = await query.get();
      if (snap.empty) {
        hasMore = false;
        if (!append && feed) feed.innerHTML = '<p style="color:#888;text-align:center;">Nenhum post encontrado.</p>';
        isLoading = false;
        return;
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      hasMore = snap.docs.length === PAGE_SIZE;

      // Processa documentos
      var newPosts = [];
      snap.forEach(function (doc) {
        newPosts.push({ id: doc.id, data: doc.data() });
      });

      // Busca perfis únicos
      var uidSet = {};
      for (var i = 0; i < newPosts.length; i++) {
        uidSet[newPosts[i].data.userId] = true;
      }
      var uids = Object.keys(uidSet);
      var profiles = {};
      await Promise.all(uids.map(async function (uid) {
        try {
          var cachedProfile = null;
          if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.profile) {
            cachedProfile = ATHOM_CACHE.profile.get(uid);
          }
          if (cachedProfile) {
            profiles[uid] = cachedProfile;
            return;
          }
          var doc = await db.collection('users').doc(uid).get();
          if (doc.exists) {
            profiles[uid] = doc.data();
            if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.profile) {
              ATHOM_CACHE.profile.set(uid, doc.data());
            }
          }
        } catch (e) {}
      }));

      // Separa slides (mídia) e posts de texto
      var newSlides = [];
      var newTextPosts = [];

      for (var j = 0; j < newPosts.length; j++) {
        var p = newPosts[j];
        var d = p.data;
        var postId = p.id;
        var profile = profiles[d.userId] || {};

        // Posts com mídia viram slides
        if (Array.isArray(d.media) && d.media.length > 0) {
          for (var k = 0; k < d.media.length; k++) {
            var m = d.media[k];
            if (!loadedPostIds[postId + '_slide']) {
              newSlides.push({
                postId: postId,
                src: m.url || m.dataUrl || '',
                tipo: m.tipo || 'imagem',
                likes: d.likes || 0,
                comments: d.comments || 0,
                shares: d.shares || 0
              });
              loadedPostIds[postId + '_slide'] = true;
            }
          }
        } else if (d.mediaUrl) {
          if (!loadedPostIds[postId + '_slide']) {
            newSlides.push({
              postId: postId,
              src: d.mediaUrl,
              tipo: d.tipo === 'video' ? 'video' : 'imagem',
              likes: d.likes || 0,
              comments: d.comments || 0,
              shares: d.shares || 0
            });
            loadedPostIds[postId + '_slide'] = true;
          }
        }

        // Posts de texto
        if (d.quote && !d.mediaUrl && (!Array.isArray(d.media) || d.media.length === 0)) {
          if (!loadedPostIds[postId]) {
            newTextPosts.push({
              id: postId,
              userId: d.userId,
              userName: profile.name || d.name || 'Usuário',
              userAvatar: profile.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50',
              userActivity: profile.status || '',
              quote: d.quote,
              time: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : new Date(),
              likes: d.likes || 0,
              comments: d.comments || 0,
              shares: d.shares || 0,
              userOnline: profile.statusType === 'online'
            });
            loadedPostIds[postId] = true;
          }
        }
      }

      // Acumula
      allLoadedSlides = allLoadedSlides.concat(newSlides);
      allLoadedTextPosts = allLoadedTextPosts.concat(newTextPosts);

      // Atualiza cache
      if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.exhibition && ATHOM_CACHE.exhibition.posts) {
        ATHOM_CACHE.exhibition.posts.set({
          slidesData: allLoadedSlides,
          textPosts: allLoadedTextPosts,
          timestamp: Date.now(),
          hasMore: hasMore
        });
      }

      // Renderiza
      if (!append) {
        feed.innerHTML = '';
        montarCarrossel(allLoadedSlides);
        montarCardsTexto(allLoadedTextPosts);
      } else {
        if (allLoadedSlides.length > 0 && !document.getElementById('exhTrack')) {
          montarCarrossel(allLoadedSlides);
        }
        if (newTextPosts.length > 0) {
          var loadMoreBtn = feed.querySelector('.exh-load-more');
          if (loadMoreBtn) loadMoreBtn.remove();
          montarCardsTexto(newTextPosts);
        }
      }

      if (hasMore) adicionarBotaoCarregarMais();
      else {
        var existingBtn = feed.querySelector('.exh-load-more');
        if (existingBtn) existingBtn.remove();
      }

    } catch (e) {
      console.error('[Exposição] Erro:', e);
      if (!append && feed) feed.innerHTML = '<p style="color:#e74c3c;text-align:center;">Erro ao carregar exposição.</p>';
    } finally {
      isLoading = false;
    }
  }

  function adicionarBotaoCarregarMais() {
    var feed = document.getElementById('mainFeed');
    if (!feed) return;
    var existente = feed.querySelector('.exh-load-more');
    if (existente) existente.remove();
    var div = document.createElement('div');
    div.className = 'exh-load-more';
    div.innerHTML = '<button onclick="window.carregarMaisExhibition()">📥 Carregar mais</button>';
    feed.appendChild(div);
  }

  window.carregarMaisExhibition = function () {
    carregarMaisPosts(true);
  };

  // ========== MONTAR CARROSSEL ==========
  function montarCarrossel(slidesData) {
    if (!slidesData || slidesData.length === 0) return;
    var feed = document.getElementById('mainFeed');
    if (!feed) return;

    // Remove carrossel anterior
    var oldCarousel = feed.querySelector('.exh-carousel-wrapper');
    if (oldCarousel) oldCarousel.remove();
    var oldIndicators = feed.querySelector('.exh-indicators');
    if (oldIndicators) oldIndicators.remove();

    var wrapper = document.createElement('div');
    wrapper.className = 'exh-carousel-wrapper';
    wrapper.innerHTML = '<div class="exh-carousel-track" id="exhTrack">' +
      slidesData.map(function (slide) {
        return '<div class="exh-slide">' +
          (slide.tipo === 'video' ? '<video src="' + slide.src + '" muted loop playsinline></video>' : '<img src="' + slide.src + '" loading="lazy">') +
          '<div class="exh-actions">' +
            '<button class="exh-action-btn" data-post-id="' + slide.postId + '" data-action="like" onclick="event.stopPropagation();toggleLike(\'' + slide.postId + '\')">❤️ ' + slide.likes + '</button>' +
            '<button class="exh-action-btn" data-post-id="' + slide.postId + '" data-action="comment" onclick="event.stopPropagation();openComments(\'' + slide.postId + '\')">💬 ' + slide.comments + '</button>' +
            '<button class="exh-action-btn" data-post-id="' + slide.postId + '" data-action="repost" onclick="event.stopPropagation();repost(\'' + slide.postId + '\')">🔄 ' + slide.shares + '</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
    feed.insertBefore(wrapper, feed.firstChild);

    // Indicadores (bolinhas)
    var indicators = document.createElement('div');
    indicators.className = 'exh-indicators';
    for (var i = 0; i < slidesData.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'exh-dot' + (i === 0 ? ' active' : '');
      (function (index) {
        dot.onclick = function () { goToSlide(index); };
      })(i);
      indicators.appendChild(dot);
    }
    feed.insertBefore(indicators, feed.children[1]);

    goToSlide(0);
    startAutoplay();
  }

  // ========== MONTAR CARDS DE TEXTO ==========
  function montarCardsTexto(textPosts) {
    if (!textPosts || textPosts.length === 0) return;
    var feed = document.getElementById('mainFeed');
    if (!feed) return;

    for (var i = 0; i < textPosts.length; i++) {
      var post = textPosts[i];
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML =
        '<span class="now-status-indicator ' + (post.userOnline ? 'online' : 'offline') + '"></span>' +
        '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">' +
          '<img src="' + esc(post.userAvatar) + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);">' +
          '<div style="flex:1;">' +
            '<div style="font-weight:600;font-size:15px;">' + esc(post.userName) + '</div>' +
            '<div style="font-size:12px;color:var(--text-cyan);margin-top:2px;">' + esc(post.userActivity) + '</div>' +
            '<div style="display:flex;align-items:flex-start;gap:4px;margin-top:8px;">' +
              '<span style="font-family:serif;font-size:32px;color:#aaa;">"</span>' +
              '<span style="font-family:serif;font-style:italic;font-size:17px;">' + esc(post.quote) + '</span>' +
              '<span style="font-family:serif;font-size:32px;color:#aaa;align-self:flex-end;">"</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<hr style="border-top:1px solid #e0e0e0;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<span style="font-size:14px;color:#888;">' + esc(post.time.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})) + '</span>' +
          '<div style="display:flex;gap:12px;">' +
            '<button class="now-action-btn" data-post-id="' + post.id + '" data-action="like" onclick="toggleLike(\'' + post.id + '\')">❤️ ' + post.likes + '</button>' +
            '<button class="now-action-btn" data-post-id="' + post.id + '" data-action="comment" onclick="openComments(\'' + post.id + '\')">💬 ' + post.comments + '</button>' +
            '<button class="now-action-btn" data-post-id="' + post.id + '" data-action="repost" onclick="repost(\'' + post.id + '\')">🔄 ' + post.shares + '</button>' +
          '</div>' +
        '</div>';
      feed.appendChild(card);
    }
  }

  // ========== VINCULAR ABA ==========
  function bindExhibitionTab() {
    var tab = document.querySelector('.header-tab[data-tab="exhibition"]');
    if (tab) tab.addEventListener('click', renderExhibitionTab);

    // Pausa carrossel ao trocar de aba
    var originalSetActiveTab = window.setActiveTab;
    window.setActiveTab = function (tabName) {
      if (tabName !== 'exhibition') stopCarousel();
      originalSetActiveTab(tabName);
    };

    // Se já estiver na aba, carrega
    if (document.querySelector('.header-tab.active[data-tab="exhibition"]')) {
      renderExhibitionTab();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindExhibitionTab);
  } else {
    bindExhibitionTab();
  }

  // Exporta a função principal
  window.renderExhibitionTab = renderExhibitionTab;

  console.log('🎨 Feed Exposição (exposicao.js) carregado.');
})();