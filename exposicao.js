// ==================== exposicao.js – YOU (Feed Exposição com fundo personalizado) ====================
(function() {
  'use strict';

  // ---------- ESTILOS ----------
  var style = document.createElement('style');
  style.textContent =
    '.exh-carousel-wrapper{position:relative;width:100%;padding-top:56.25%;overflow:hidden;border-radius:16px;margin-bottom:12px;background:#111;}' +
    '.exh-carousel-track{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;transition:transform 0.4s ease;}' +
    '.exh-slide{min-width:100%;height:100%;position:relative;}' +
    '.exh-slide img,.exh-slide video{width:100%;height:100%;object-fit:cover;}' +
    '.exh-actions{position:absolute;top:8px;right:8px;display:flex;gap:6px;z-index:10;}' +
    '.exh-action-btn{background:rgba(0,0,0,0.5);border:none;color:#fff;font-size:14px;padding:4px 8px;border-radius:14px;cursor:pointer;}' +
    '.exh-indicators{display:flex;justify-content:center;gap:6px;margin-top:8px;flex-wrap:wrap;max-height:60px;overflow-y:auto;}' +
    '.exh-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.4);cursor:pointer;}' +
    '.exh-dot.active{background:#fff;transform:scale(1.3);}' +
    '.exh-load-more{display:flex;justify-content:center;margin:12px 0;}' +
    '.exh-load-more button{background:var(--bg-header-top);color:#fff;border:none;border-radius:20px;padding:10px 24px;font-size:14px;cursor:pointer;}' +
    '.media-signature{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.8));padding:24px 16px 16px;color:#fff;font-size:14px;font-weight:500;display:flex;align-items:center;gap:10px;opacity:0;transition:opacity 0.3s;pointer-events:none;z-index:5;}' +
    '.media-signature.show{opacity:1;}' +
    '.media-signature .sig-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.8);flex-shrink:0;}' +
    '.media-signature .sig-text{flex:1;}' +
    '.media-signature .sig-name{font-weight:600;}' +
    '.media-signature .sig-label{font-size:12px;}' +
    '.sig-caption{color:#fff;font-size:12px;margin-top:2px;}';
  document.head.appendChild(style);

  // ---------- SANITIZAÇÃO ----------
  function esc(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ---------- PAGINAÇÃO ----------
  var PAGE_SIZE = 50;
  var lastDoc = null;
  var isLoading = false;
  var hasMore = true;
  var allLoadedSlides = [];
  var allLoadedTextPosts = [];
  var loadedPostIds = {};

  // ---------- CARROSSEL ----------
  var carouselTimer = null, currentSlide = 0;
  var touchStartX = 0, touchEndX = 0;

  function stopCarousel() {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }

  function goToSlide(i) {
    var track = document.getElementById('exhTrack');
    if (!track) return;
    track.style.transform = 'translateX(-' + i * 100 + '%)';
    currentSlide = i;
    var dots = document.querySelectorAll('.exh-dot');
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle('active', d === i);
    }
    // Esconde a assinatura ao trocar de slide
    var signatures = document.querySelectorAll('.media-signature');
    for (var s = 0; s < signatures.length; s++) {
      signatures[s].classList.remove('show');
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

  // ========== RENDERIZAR ABA EXIBIÇÃO ==========
  async function renderExhibitionTab() {
    stopCarousel();
    var feed = document.getElementById('mainFeed');
    if (!feed) return;

    // Aplica fundo personalizado da aba Exposição
    if (typeof window.applyFeedBackground === 'function') {
      await window.applyFeedBackground('exhibition');
    }

    var cached = (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.exhibition?.posts)
      ? ATHOM_CACHE.exhibition.posts.get()
      : null;

    if (cached && cached.timestamp && (Date.now() - cached.timestamp < 2000)) {
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

    lastDoc = null;
    hasMore = true;
    isLoading = false;
    allLoadedSlides = [];
    allLoadedTextPosts = [];
    loadedPostIds = {};

    feed.innerHTML = '<p style="color:#fff;text-align:center;">🎨 Carregando exposição...</p>';
    await carregarMaisPosts(false);
  }

  async function carregarMaisPosts(append) {
    if (isLoading || (!hasMore && append)) return;
    isLoading = true;
    var feed = document.getElementById('mainFeed');
    if (!append && feed) feed.innerHTML = '<p style="color:#fff;text-align:center;">🎨 Carregando exposição...</p>';

    try {
      if (!auth.currentUser) {
        if (feed) feed.innerHTML = '<p style="color:#fff;">⚠️ Você precisa estar logado para ver a exposição.</p>';
        isLoading = false;
        return;
      }

      var query = db.collection('posts').orderBy('createdAt', 'desc').limit(PAGE_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);

      var snap = await query.get();
      if (snap.empty) {
        hasMore = false;
        if (!append && feed) feed.innerHTML = '<p style="color:#fff;text-align:center;">Nenhum post encontrado.</p>';
        isLoading = false;
        return;
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      hasMore = snap.docs.length === PAGE_SIZE;

      var newPosts = [];
      snap.forEach(function (doc) { newPosts.push({ id: doc.id, data: doc.data() }); });

      var uidSet = new Set(newPosts.map(function (p) { return p.data.userId; }));
      var profiles = {};
      await Promise.all(Array.from(uidSet).map(async function (uid) {
        try {
          var cached = ATHOM_CACHE?.profile?.get(uid);
          if (cached) { profiles[uid] = cached; return; }
          var doc = await db.collection('users').doc(uid).get();
          if (doc.exists) { profiles[uid] = doc.data(); ATHOM_CACHE?.profile?.set(uid, doc.data()); }
        } catch (e) {}
      }));

      var newSlides = [];
      var newTextPosts = [];

      newPosts.forEach(function (p) {
        var d = p.data;
        var postId = p.id;
        var profile = profiles[d.userId] || {};

        if (!loadedPostIds[postId + '_slide']) {
          if (Array.isArray(d.media) && d.media.length > 0) {
            d.media.forEach(function (m) {
              newSlides.push({
                postId: postId,
                src: m.url || m.dataUrl || '',
                tipo: m.tipo || 'imagem',
                likes: d.likes || 0, comments: d.comments || 0, shares: d.shares || 0,
                author: profile.name || d.name || 'Usuário',
                authorAvatar: profile.avatar || '',
                authorStatus: profile.status || '',
                caption: d.quote || ''     // ✅ Legenda adicionada
              });
              loadedPostIds[postId + '_slide'] = true;
            });
          } else if (d.mediaUrl) {
            newSlides.push({
              postId: postId,
              src: d.mediaUrl,
              tipo: d.tipo === 'video' ? 'video' : 'imagem',
              likes: d.likes || 0, comments: d.comments || 0, shares: d.shares || 0,
              author: profile.name || d.name || 'Usuário',
              authorAvatar: profile.avatar || '',
              authorStatus: profile.status || '',
              caption: d.quote || ''       // ✅ Legenda adicionada
            });
            loadedPostIds[postId + '_slide'] = true;
          }
        }

        if (d.quote && !d.mediaUrl && (!Array.isArray(d.media) || d.media.length === 0)) {
          if (!loadedPostIds[postId]) {
            newTextPosts.push({
              id: postId, userId: d.userId,
              userName: profile.name || d.name || 'Usuário',
              userAvatar: profile.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50',
              userActivity: profile.status || '',
              quote: d.quote,
              time: d.createdAt?.toDate?.()?.toLocaleTimeString?.([], {hour:'2-digit',minute:'2-digit'}) || '',
              likes: d.likes || 0, comments: d.comments || 0, shares: d.shares || 0,
              userOnline: profile.statusType === 'online'
            });
            loadedPostIds[postId] = true;
          }
        }
      });

      allLoadedSlides = allLoadedSlides.concat(newSlides);
      allLoadedTextPosts = allLoadedTextPosts.concat(newTextPosts);

      ATHOM_CACHE?.exhibition?.posts?.set({
        slidesData: allLoadedSlides,
        textPosts: allLoadedTextPosts,
        timestamp: Date.now(),
        hasMore: hasMore
      });

      if (!append) {
        feed.innerHTML = '';
        montarCarrossel(allLoadedSlides);
        montarCardsTexto(allLoadedTextPosts);
      } else {
        if (allLoadedSlides.length && !document.getElementById('exhTrack')) montarCarrossel(allLoadedSlides);
        if (newTextPosts.length) {
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
      console.error('[Exhibition]', e);
      if (!append && feed) feed.innerHTML = '<p style="color:#fff;text-align:center;">Erro ao carregar exposição.</p>';
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

  window.carregarMaisExhibition = function() { carregarMaisPosts(true); };

  // ---------- MONTAR CARROSSEL ----------
  function montarCarrossel(slidesData) {
    if (!slidesData.length) return;
    var feed = document.getElementById('mainFeed');
    if (!feed) return;
    var oldCarousel = document.getElementById('exhTrack')?.parentElement;
    if (oldCarousel) oldCarousel.remove();
    var oldIndicators = document.querySelector('.exh-indicators');
    if (oldIndicators) oldIndicators.remove();

    var wrapper = document.createElement('div');
    wrapper.className = 'exh-carousel-wrapper';
    wrapper.innerHTML = '<div class="exh-carousel-track" id="exhTrack">' +
      slidesData.map(function (slide, i) {
        return '<div class="exh-slide">' +
          (slide.tipo === 'video'
            ? '<video src="' + slide.src + '" muted loop playsinline></video>'
            : '<img src="' + slide.src + '" loading="lazy">') +
          '<div class="exh-actions">' +
            '<button class="exh-action-btn" data-post-id="' + slide.postId + '" data-action="like" onclick="event.stopPropagation();toggleLike(\'' + slide.postId + '\')">❤️ ' + slide.likes + '</button>' +
            '<button class="exh-action-btn" data-post-id="' + slide.postId + '" data-action="comment" onclick="event.stopPropagation();openComments(\'' + slide.postId + '\')">💬 ' + slide.comments + '</button>' +
            '<button class="exh-action-btn" data-post-id="' + slide.postId + '" data-action="repost" onclick="event.stopPropagation();repost(\'' + slide.postId + '\')">🔄 ' + slide.shares + '</button>' +
          '</div>' +
          '<div class="media-signature" id="sig-' + i + '">' +
            '<img class="sig-avatar" src="' + (slide.authorAvatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40') + '">' +
            '<div class="sig-text">' +
              '<div class="sig-name">' + esc(slide.author) + '</div>' +
              (slide.authorStatus ? '<div class="sig-label" style="color:var(--text-cyan);">' + esc(slide.authorStatus) + '</div>' : '') +
              (slide.caption ? '<div class="sig-caption">' + esc(slide.caption) + '</div>' : '') +  // ✅ Legenda exibida
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
    feed.insertBefore(wrapper, feed.firstChild);

    // Indicadores
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

    // Swipe manual
    var track = document.getElementById('exhTrack');
    if (track) {
      wrapper.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
      });
      wrapper.addEventListener('touchend', function (e) {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
      });

      // Clica na mídia → mostra assinatura
      var mediaElements = wrapper.querySelectorAll('img, video');
      for (var m = 0; m < mediaElements.length; m++) {
        mediaElements[m].addEventListener('click', function (e) {
          var slide = e.target.closest('.exh-slide');
          if (!slide) return;
          var sig = slide.querySelector('.media-signature');
          if (sig) {
            var allSigs = document.querySelectorAll('.media-signature.show');
            for (var s = 0; s < allSigs.length; s++) {
              allSigs[s].classList.remove('show');
            }
            sig.classList.add('show');
            clearTimeout(sig._timer);
            sig._timer = setTimeout(function () { sig.classList.remove('show'); }, 3000);
          }
        });
      }
    }

    goToSlide(0);
    startAutoplay();
  }

  function handleSwipe() {
    var diff = touchEndX - touchStartX;
    var slides = document.querySelectorAll('.exh-slide');
    if (slides.length <= 1) return;
    if (Math.abs(diff) > 40) {
      stopCarousel();
      if (diff < 0) {
        currentSlide = (currentSlide + 1) % slides.length;
      } else {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
      }
      goToSlide(currentSlide);
      startAutoplay();
    }
  }

  function montarCardsTexto(textPosts) {
    if (!textPosts.length) return;
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
          '<span style="font-size:14px;color:#888;">' + esc(post.time) + '</span>' +
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

    var originalSetActiveTab = window.setActiveTab;
    window.setActiveTab = function (tabName) {
      if (tabName !== 'exhibition') stopCarousel();
      originalSetActiveTab(tabName);
    };

    if (document.querySelector('.header-tab.active[data-tab="exhibition"]')) {
      renderExhibitionTab();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindExhibitionTab);
  } else {
    bindExhibitionTab();
  }

  window.renderExhibitionTab = renderExhibitionTab;
})();