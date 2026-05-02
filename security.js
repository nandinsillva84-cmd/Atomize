// ==================== security.js – ATHOM ====================
(function() {
  async function hash(data) {
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  window.security = {
    hash: hash,
    encrypt: async (text) => text,
    decrypt: async (text) => text,
    initialize: async () => {},
    clear: () => {}
  };
})();