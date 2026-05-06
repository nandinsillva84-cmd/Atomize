// ==================== sanitizador.js – YOU ====================
window.esc = window.esc || function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

console.log('🛡️ Sanitizador XSS carregado.');