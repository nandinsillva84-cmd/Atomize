// ==================== ui-spinner.js – YOU ====================
window.showSpinner = window.showSpinner || function(container) {
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';
};

console.log('⏳ Spinner carregado.');