// ==================== cache.js – YOU ====================

// Sistema de cache local (localStorage) com TTL (tempo de vida) de 1 segundo.
// Isso significa que os dados são armazenados por apenas 1 segundo,
// forçando o app a buscar informações frescas do Firestore quase sempre.
// A exceção é "config", que dura para sempre (Infinity).

(function() {
  // Prefixo para todas as chaves do cache (evita conflitos com outros sites)
  var PREFIX = 'you_cache_';

  // Tempo de vida de cada categoria (em milissegundos)
  var TTL = {
    user:         1000,  // 1 segundo
    friends:      1000,
    friendship:   1000,
    nowFeed:      1000,
    exhibition:   1000,
    chatList:     1000,
    chatMessages: 1000,
    search:       1000,
    interactions: 1000,
    avatar:       1000,
    profile:      1000,
    sentry:       1000,
    config:       Infinity  // nunca expira
  };

  // Obtém o UID do usuário atual, ou 'anon' se não estiver logado
  function getUID() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser.uid;
      }
    } catch(e) {}
    return 'anon';
  }

  // Limpa entradas expiradas (mais de 10 minutos de idade) para liberar espaço
  function cleanExpiredEntries() {
    var now = Date.now();
    var keysToRemove = [];
    
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf(PREFIX) !== 0) continue;
      
      // Não limpa config (permanente)
      if (key.indexOf('_config') !== -1 || key === PREFIX + 'config') continue;
      
      try {
        var raw = localStorage.getItem(key);
        if (!raw) {
          keysToRemove.push(key);
          continue;
        }
        var data = JSON.parse(raw);
        // Remove se tiver mais de 10 minutos
        if (data.timestamp && (now - data.timestamp) > 10 * 60 * 1000) {
          keysToRemove.push(key);
        }
      } catch (e) {
        // Dados corrompidos, remove
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(function(k) {
      try { localStorage.removeItem(k); } catch(_) {}
    });
    
    if (keysToRemove.length > 0) {
      console.log('[YOU Cache] ' + keysToRemove.length + ' entradas expiradas removidas.');
    }
  }

  // Obtém um valor do cache. Se expirado ou não existir, retorna null.
  function cacheGet(key, ttl) {
    var raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      // Se o TTL for Infinity ou a idade for menor que o TTL, retorna o valor
      if (ttl === Infinity || (Date.now() - data.timestamp) < ttl) {
        return data.value;
      }
    } catch (e) {}
    // Se expirado ou inválido, remove e retorna null
    localStorage.removeItem(PREFIX + key);
    return null;
  }

  // Salva um valor no cache, com timestamp atual.
  // Se o localStorage estiver cheio, tenta limpar entradas expiradas.
  function cacheSet(key, value) {
    var entry = { value: value, timestamp: Date.now() };
    var fullKey = PREFIX + key;
    
    try {
      localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch (e) {
      // Se o erro for de cota excedida
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('[YOU Cache] localStorage cheio. Limpando...');
        
        // Primeira tentativa: limpa entradas expiradas
        cleanExpiredEntries();
        
        try {
          localStorage.setItem(fullKey, JSON.stringify(entry));
          console.log('[YOU Cache] Salvo após limpeza.');
          return;
        } catch (retryErr) {
          // Segunda tentativa: limpa TUDO menos config
          console.warn('[YOU Cache] Limpeza agressiva necessária.');
          var keysToKeep = [PREFIX + 'config'];
          
          for (var i = localStorage.length - 1; i >= 0; i--) {
            var k = localStorage.key(i);
            if (k && k.indexOf(PREFIX) === 0 && keysToKeep.indexOf(k) === -1) {
              try { localStorage.removeItem(k); } catch(_) {}
            }
          }
          
          try {
            localStorage.setItem(fullKey, JSON.stringify(entry));
            console.log('[YOU Cache] Salvo após limpeza agressiva.');
          } catch (finalErr) {
            console.error('[YOU Cache] Impossível salvar:', finalErr);
          }
        }
      } else {
        console.error('[YOU Cache] Erro ao salvar:', e);
      }
    }
  }

  // Remove uma chave específica do cache
  function cacheRemove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  // Monta a chave incluindo o UID automaticamente (para isolar usuários)
  function userKey(category, extra) {
    var uid = getUID();
    return uid + '_' + category + (extra ? '_' + extra : '');
  }

  // API pública: ATHOM_CACHE ainda é o nome global por compatibilidade
  window.ATHOM_CACHE = {
    // Perfil do usuário logado
    user: {
      get: function() { return cacheGet(userKey('user'), TTL.user); },
      set: function(data) { cacheSet(userKey('user'), data); },
      clear: function() { cacheRemove(userKey('user')); }
    },

    // Perfil de outro usuário (usa o userId na chave)
    profile: {
      get: function(userId) { return cacheGet('profile_' + userId, TTL.profile); },
      set: function(userId, data) { cacheSet('profile_' + userId, data); },
      clear: function(userId) { cacheRemove('profile_' + userId); }
    },

    // Lista de amigos do usuário atual
    friends: {
      get: function() { return cacheGet(userKey('friends'), TTL.friends); },
      set: function(list) { cacheSet(userKey('friends'), list); },
      clear: function() { cacheRemove(userKey('friends')); }
    },

    // Status de amizade entre o usuário atual e outro
    friendship: {
      get: function(userId) { return cacheGet(userKey('friendship', userId), TTL.friendship); },
      set: function(userId, status) { cacheSet(userKey('friendship', userId), status); },
      clear: function(userId) { cacheRemove(userKey('friendship', userId)); }
    },

    // Feed Now
    nowFeed: {
      get: function() { return cacheGet(userKey('nowFeed'), TTL.nowFeed); },
      set: function(posts) { cacheSet(userKey('nowFeed'), posts); },
      clear: function() { cacheRemove(userKey('nowFeed')); }
    },

    // Exposição (carrossel e posts)
    exhibition: {
      carousel: {
        get: function() { return cacheGet(userKey('exhibition_carousel'), TTL.exhibition); },
        set: function(slides) { cacheSet(userKey('exhibition_carousel'), slides); },
        clear: function() { cacheRemove(userKey('exhibition_carousel')); }
      },
      posts: {
        get: function() { return cacheGet(userKey('exhibition_posts'), TTL.exhibition); },
        set: function(posts) { cacheSet(userKey('exhibition_posts'), posts); },
        clear: function() { cacheRemove(userKey('exhibition_posts')); }
      }
    },

    // Chat
    chat: {
      list: {
        get: function() { return cacheGet(userKey('chatList'), TTL.chatList); },
        set: function(list) { cacheSet(userKey('chatList'), list); },
        clear: function() { cacheRemove(userKey('chatList')); }
      },
      messages: {
        get: function(chatId) { return cacheGet(userKey('chatMsg', chatId), TTL.chatMessages); },
        set: function(chatId, msgs) { cacheSet(userKey('chatMsg', chatId), msgs); },
        clear: function(chatId) { cacheRemove(userKey('chatMsg', chatId)); }
      }
    },

    // Busca
    search: {
      get: function(query) { return cacheGet('search_' + query.toLowerCase().trim(), TTL.search); },
      set: function(query, results) { cacheSet('search_' + query.toLowerCase().trim(), results); },
      clear: function() {
        Object.keys(localStorage).filter(function(k) {
          return k.indexOf(PREFIX + 'search_') === 0;
        }).forEach(function(k) { localStorage.removeItem(k); });
      }
    },

    // Interações
    interactions: {
      get: function(postId) { return cacheGet('interactions_' + postId, TTL.interactions); },
      set: function(postId, data) { cacheSet('interactions_' + postId, data); },
      clear: function(postId) { cacheRemove('interactions_' + postId); }
    },

    // Avatar (base64)
    avatar: {
      get: function(userId) { return cacheGet('avatar_' + userId, TTL.avatar); },
      set: function(userId, base64) { cacheSet('avatar_' + userId, base64); },
      clear: function(userId) { cacheRemove('avatar_' + userId); }
    },

    // Configurações (permanente)
    config: {
      get: function() { return cacheGet('config', TTL.config); },
      set: function(cfg) { cacheSet('config', cfg); },
      clear: function() { cacheRemove('config'); }
    },

    // Sentinela
    sentry: {
      get: function() {
        var raw = localStorage.getItem(PREFIX + 'sentry');
        return raw ? JSON.parse(raw) : [];
      },
      set: function(logs) { localStorage.setItem(PREFIX + 'sentry', JSON.stringify(logs)); },
      clear: function() { cacheRemove('sentry'); }
    },

    // Limpa todo o cache do usuário atual
    clearCurrentUser: function() {
      var uid = getUID();
      if (uid === 'anon') return;
      var keys = Object.keys(localStorage).filter(function(k) {
        return k.indexOf(PREFIX + uid + '_') === 0;
      });
      keys.forEach(function(k) { localStorage.removeItem(k); });
      console.log('🧹 Cache do usuário ' + uid + ' limpo.');
    },

    // Limpa TUDO (exceto config)
    clearAll: function() {
      var keys = Object.keys(localStorage).filter(function(k) {
        return k.indexOf(PREFIX) === 0;
      });
      keys.forEach(function(k) { localStorage.removeItem(k); });
      console.log('🗑️ Todo o cache YOU foi limpo.');
    },

    // Retorna a idade de uma chave (em ms)
    age: function(key) {
      var raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      try {
        var data = JSON.parse(raw);
        return Date.now() - data.timestamp;
      } catch (e) { return null; }
    }
  };

  console.log('🗂️ Cache com TTL de 1s carregado.');
})();