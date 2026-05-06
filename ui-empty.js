// ==================== ui-empty.js – YOU ====================
window.showEmptyState = window.showEmptyState || function(container, message, emoji = '📭') {
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center; padding:30px; color:#888;">
      <div style="font-size:40px; margin-bottom:10px;">${emoji}</div>
      <p style="font-size:14px;">${message}</p>
    </div>`;
};

console.log('📋 Estados vazios carregados.');