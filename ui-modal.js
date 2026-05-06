// ==================== ui-modal.js – YOU ====================
window.openModal = window.openModal || function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
};

window.closeModal = window.closeModal || function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
};

console.log('📦 Modais carregados.');