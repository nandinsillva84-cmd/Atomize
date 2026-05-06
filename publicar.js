// ==================== publicar.js – YOU ====================
// Módulo de criação de posts (modal "Criar Publicação").
// É chamado quando o usuário toca no botão "+" na barra inferior.
// Estrutura do modal:
// - Abas "✍️ Texto" e "📁 Mídia"
// - Painel de emojis (😀😂😍🔥💯✨❤️👍😢😡🥺😎🤔💬📸🎵)
// - Campo de texto com contador de 280 caracteres
// - Barra de progresso dos caracteres
// - Botões de toolbar: 😊 Emojis, 📍 Localização, ⏰ Agendamento
// - Campos adicionais: localização (input de cidade), agendamento (datetime-local)
// - Para mídia: botão de upload, preview com miniaturas, botão de limpar
// - Botão final "📨 Publicar"

(function () {
  // ========== REFERÊNCIAS GLOBAIS ==========
  // openModal, closeModal, showToast, esc, etc.

  // ========== VARIÁVEL TEMPORÁRIA DE MÍDIA ==========
  // Será gerenciada pelo upload-midia.js
  // tempMedia é um array global de objetos { dataUrl, tipo, file }

  // ========== ABRIR MODAL ==========
  window.openPostModal = function () {
    if (typeof openModal === 'function') {
      openModal('postModal');
    }
  };

  // ========== FECHAR MODAL ==========
  window.closePostModal = function () {
    if (typeof closeModal === 'function') {
      closeModal('postModal');
    }
    // Limpa mídia temporária ao fechar
    if (typeof window.removeMedia === 'function') {
      window.removeMedia();
    }
  };

  // ========== ALTERNAR ABAS DO POST ==========
  window.switchPostTab = function (tab) {
    var tabs = document.querySelectorAll('.post-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
    }
    document.getElementById('postTextSection').style.display = 'none';
    document.getElementById('postMediaSection').style.display = 'none';

    if (tab === 'texto') {
      document.getElementById('postTextSection').style.display = 'block';
      document.querySelector('.post-tab:nth-child(1)').classList.add('active');
    } else {
      document.getElementById('postMediaSection').style.display = 'block';
      document.querySelector('.post-tab:nth-child(2)').classList.add('active');
    }
  };

  // ========== PAINEL DE EMOJIS ==========
  window.toggleEmojiPanel = function () {
    var panel = document.getElementById('emojiPanel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
    }
  };

  window.insertEmoji = function (emoji) {
    var ta = document.getElementById('newPostText');
    if (ta) {
      var start = ta.selectionStart;
      var end = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + emoji + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.focus();
      updateCharCounter();
    }
  };

  // ========== LOCALIZAÇÃO ==========
  window.toggleLocalizacao = function () {
    var f = document.getElementById('localizacaoField');
    if (f) {
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    }
  };

  // ========== AGENDAMENTO ==========
  window.toggleSchedule = function () {
    var f = document.getElementById('scheduleField');
    if (f) {
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    }
  };

  // ========== CONTADOR DE CARACTERES ==========
  function updateCharCounter() {
    var ta = document.getElementById('newPostText');
    var counter = document.getElementById('charCounterText');
    var bar = document.getElementById('charProgressBar');
    if (ta && counter) {
      var len = ta.value.length;
      counter.textContent = len + '/280';
      if (bar) {
        var percent = Math.min(len / 280 * 100, 100);
        bar.style.setProperty('--progress', percent + '%');
      }
    }
  }

  document.addEventListener('input', function (e) {
    if (e.target.id === 'newPostText') {
      updateCharCounter();
    }
  });

  // ========== INICIALIZAÇÃO ==========
  // (a função publishPost será definida em upload-midia.js, que depende deste módulo)
  console.log('📝 Publicar (publicar.js) carregado.');
})();