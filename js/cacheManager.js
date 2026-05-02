// ==================== cacheManager.js – ATHOM (Cache particionado por UID + TTLs reduzidos) ====================
(function() {
  const PREFIX = 'athom_cache_';

  // ========== CONFIGURAÇÃO DE TTL (em ms) – reduzidos para maior frescor ==========
  const TTL = {
    user: 2 * 60 * 1000,        // 2 min (antes 5)
    friends: 3 * 60 * 1000,     // 3 min (antes 10)
    friendship: 2 * 60 * 1000,  // 2 min
    nowFeed: 1 * 60 * 1000,     // 1 min (antes 2)
    exhibition: 2 * 60 * 1000,  // 2 min
    chatList: 2 * 60 * 1000,    // 2 min
    chatMessages: 2 * 60 * 1000,// 2 min
    search: 1 * 60 * 1000,      // 1 min
    interactions: 1 * 60 * 1000,// 1 min
    avatar: 1 * 60 * 60 * 1000, // 1 hora (antes 24h)
    config: Infinity,           // permanente
    sentry: 5 * 60 * 1000       // 5 min (evita lixo infinito)
  };

  // ========== OBTÉM UID ATUAL (ou 'anon' se deslogado) ==========
  function getUID() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser.uid;
      }
    } catch(e) {}
    return 'anon';
  }

  // ========== FUNÇÕES GENÉRICAS COM ESCOPO DE USUÁRIO ==========
  function cacheGet(key, ttl) {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (ttl === Infinity || (Date.now() - data.timestamp < ttl)) {
        return data.value;
      }
    } catch (e) {}
    localStorage.removeItem(PREFIX + key);
    return null;
  }

  function cacheSet(key, value) {
    const entry = { value, timestamp: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  }

  function cacheRemove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  // Monta a chave incluindo o UID automaticamente para caches de usuário
  function userKey(category, extra) {
    const uid = getUID();
    return uid + '_' + category + (extra ? '_' + extra : '');
  }

  // ========== API PÚBLICA ==========
  window.ATHOM_CACHE = {
    // -- Perfil do usuário (escopo: uid) --
    user: {
      get: () => cacheGet(userKey('user'), TTL.user),
      set: (data) => cacheSet(userKey('user'), data),
      clear: () => cacheRemove(userKey('user'))
    },

    // -- Lista de amigos (escopo: uid) --
    friends: {
      get: () => cacheGet(userKey('friends'), TTL.friends),
      set: (list) => cacheSet(userKey('friends'), list),
      clear: () => cacheRemove(userKey('friends'))
    },

    // -- Status de amizade entre dois usuários (escopo: uid atual + userId) --
    friendship: {
      get: (userId) => cacheGet(userKey('friendship', userId), TTL.friendship),
      set: (userId, status) => cacheSet(userKey('friendship', userId), status),
      clear: (userId) => cacheRemove(userKey('friendship', userId))
    },

    // -- Feed da Now (escopo: uid) --
    nowFeed: {
      get: () => cacheGet(userKey('nowFeed'), TTL.nowFeed),
      set: (posts) => cacheSet(userKey('nowFeed'), posts),
      clear: () => cacheRemove(userKey('nowFeed'))
    },

    // -- Exposição (carrossel e posts) (escopo: uid) --
    exhibition: {
      carousel: {
        get: () => cacheGet(userKey('exhibition_carousel'), TTL.exhibition),
        set: (slides) => cacheSet(userKey('exhibition_carousel'), slides),
        clear: () => cacheRemove(userKey('exhibition_carousel'))
      },
      posts: {
        get: () => cacheGet(userKey('exhibition_posts'), TTL.exhibition),
        set: (posts) => cacheSet(userKey('exhibition_posts'), posts),
        clear: () => cacheRemove(userKey('exhibition_posts'))
      }
    },

    // -- Chat (escopo: uid) --
    chat: {
      list: {
        get: () => cacheGet(userKey('chatList'), TTL.chatList),
        set: (list) => cacheSet(userKey('chatList'), list),
        clear: () => cacheRemove(userKey('chatList'))
      },
      messages: {
        get: (chatId) => cacheGet(userKey('chatMsg', chatId), TTL.chatMessages),
        set: (chatId, msgs) => cacheSet(userKey('chatMsg', chatId), msgs),
        clear: (chatId) => cacheRemove(userKey('chatMsg', chatId))
      }
    },

    // -- Busca (global, mas depende do termo; não amarra ao uid) --
    search: {
      get: (query) => cacheGet('search_' + query.toLowerCase().trim(), TTL.search),
      set: (query, results) => cacheSet('search_' + query.toLowerCase().trim(), results),
      clear: () => {
        Object.keys(localStorage).filter(k => k.startsWith(PREFIX + 'search_')).forEach(k => localStorage.removeItem(k));
      }
    },

    // -- Interações (global por post) --
    interactions: {
      get: (postId) => cacheGet('interactions_' + postId, TTL.interactions),
      set: (postId, data) => cacheSet('interactions_' + postId, data),
      clear: (postId) => cacheRemove('interactions_' + postId)
    },

    // -- Avatar (global por userId) --
    avatar: {
      get: (userId) => cacheGet('avatar_' + userId, TTL.avatar),
      set: (userId, base64) => cacheSet('avatar_' + userId, base64),
      clear: (userId) => cacheRemove('avatar_' + userId)
    },

    // -- Configurações (global) --
    config: {
      get: () => cacheGet('config', TTL.config),
      set: (cfg) => cacheSet('config', cfg),
      clear: () => cacheRemove('config')
    },

    // -- Sentinela (global) --
    sentry: {
      get: () => {
        const raw = localStorage.getItem(PREFIX + 'sentry');
        return raw ? JSON.parse(raw) : [];
      },
      set: (logs) => localStorage.setItem(PREFIX + 'sentry', JSON.stringify(logs)),
      clear: () => cacheRemove('sentry')
    },

    // ========== LIMPEZA DO USUÁRIO ATUAL (chamado no logout) ==========
    clearCurrentUser: () => {
      const uid = getUID();
      if (uid === 'anon') return;
      const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX + uid + '_'));
      keys.forEach(k => localStorage.removeItem(k));
      console.log('🧹 Cache do usuário ' + uid + ' limpo.');
    },

    // ========== LIMPEZA GERAL (tudo) ==========
    clearAll: () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
      console.log('🗑️ Todo o cache ATHOM foi limpo.');
    },

    // ========== IDADE DO CACHE (chave sem prefixo) ==========
    age: (key) => {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      try {
        const data = JSON.parse(raw);
        return Date.now() - data.timestamp;
      } catch (e) { return null; }
    }
  };

  console.log('🗂️ CacheManager particionado por UID ativo.');
})();