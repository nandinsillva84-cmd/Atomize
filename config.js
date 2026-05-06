// ==================== config.js – YOU ====================
// Painel de configurações acessível pelo menu (☰ → Configurações).
// Permite ao usuário personalizar:
// - Tema de destaque (cor principal do app, com degradê no cabeçalho e rodapé)
// - Notificações push
// - Sons do app
// - Exibição da capa no perfil
// - Perfil público (sincronizado com Firestore)
// - Status online visível (sincronizado com Firestore)
// - Limpeza do cache local
// - Exportação dos dados pessoais em JSON

(function () {
  // ========== ESTADO LOCAL (PREFERÊNCIAS) ==========
  function getPref(key, defaultValue) {
    var val = localStorage.getItem('you_' + key);
    return val !== null ? val : defaultValue;
  }

  function setPref(key, value) {
    localStorage.setItem('you_' + key, value);
  }

  // ========== APLICAR TEMA (COR + DEGRADÊ COM VINHO) ==========
  function aplicarTema(cor) {
    // Aplica a cor pura nos elementos que usam variáveis CSS
    document.documentElement.style.setProperty('--bg-header-top', cor);
    document.documentElement.style.setProperty('--nav-bg', cor);

    // Aplica o degradê no cabeçalho (cor escolhida → vinho)
    var header = document.getElementById('mainHeader');
    if (header) {
      header.style.background = 'linear-gradient(180deg, ' + cor + ' 0%, #8b1031 100%)';
    }

    // Aplica o degradê no rodapé (cor escolhida → vinho)
    var footer = document.querySelector('.bottom-nav');
    if (footer) {
      footer.style.background = 'linear-gradient(0deg, ' + cor + ' 0%, #8b1031 100%)';
    }
  }

  // Aplica o tema salvo ao iniciar
  var temaSalvo = getPref('tema', '#8b1031');
  aplicarTema(temaSalvo);

  // ========== ABRIR MODAL ==========
  window.openConfigModal = function () {
    var container = document.getElementById('configContent');
    if (!container) return;

    // Carrega preferências atuais
    var temaAtual = getPref('tema', '#8b1031');
    var notificacoes = getPref('notificacoes', 'true') === 'true';
    var sons = getPref('sons', 'true') === 'true';
    var perfilPublico = getPref('perfilPublico', 'true') === 'true';
    var mostrarOnline = getPref('mostrarOnline', 'true') === 'true';
    var mostrarCapa = getPref('mostrarCapa', 'true') === 'true';

    container.innerHTML =
      '<div class="config-section">' +
        '<h3>🎨 Aparência</h3>' +
        '<div class="config-option">' +
          '<span>Tema de destaque</span>' +
          '<div class="color-options" style="display:flex;gap:8px;">' +
            '<span class="color-circle ' + (temaAtual === '#8b1031' ? 'selected' : '') + '" style="background:#8b1031" onclick="mudarTema(\'#8b1031\')"></span>' +
            '<span class="color-circle ' + (temaAtual === '#1a73e8' ? 'selected' : '') + '" style="background:#1a73e8" onclick="mudarTema(\'#1a73e8\')"></span>' +
            '<span class="color-circle ' + (temaAtual === '#2e7d32' ? 'selected' : '') + '" style="background:#2e7d32" onclick="mudarTema(\'#2e7d32\')"></span>' +
            '<span class="color-circle ' + (temaAtual === '#e65100' ? 'selected' : '') + '" style="background:#e65100" onclick="mudarTema(\'#e65100\')"></span>' +
            '<span class="color-circle ' + (temaAtual === '#6a1b9a' ? 'selected' : '') + '" style="background:#6a1b9a" onclick="mudarTema(\'#6a1b9a\')"></span>' +
            '<span class="color-circle ' + (temaAtual === '#00695c' ? 'selected' : '') + '" style="background:#00695c" onclick="mudarTema(\'#00695c\')"></span>' +
          '</div>' +
        '</div>' +
        '<div class="config-option">' +
          '<span>Mostrar capa no perfil</span>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox" ' + (mostrarCapa ? 'checked' : '') + ' onchange="toggleMostrarCapa(this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div class="config-section">' +
        '<h3>🔔 Notificações</h3>' +
        '<div class="config-option">' +
          '<span>Notificações push</span>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox" ' + (notificacoes ? 'checked' : '') + ' onchange="toggleNotificacoes(this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</div>' +
        '<div class="config-option">' +
          '<span>Sons do app</span>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox" ' + (sons ? 'checked' : '') + ' onchange="toggleSons(this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div class="config-section">' +
        '<h3>🔒 Privacidade</h3>' +
        '<div class="config-option">' +
          '<span>Perfil público</span>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox" ' + (perfilPublico ? 'checked' : '') + ' onchange="togglePerfilPublico(this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</div>' +
        '<div class="config-option">' +
          '<span>Mostrar status online</span>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox" ' + (mostrarOnline ? 'checked' : '') + ' onchange="toggleStatusOnline(this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div class="config-section">' +
        '<h3>🗂️ Dados e Cache</h3>' +
        '<button class="btn-cancelar" onclick="limparCache()" style="width:100%;margin-top:8px;">🧹 Limpar cache local</button>' +
        '<button class="btn-cancelar" onclick="exportarDados()" style="width:100%;margin-top:8px;">📤 Exportar meus dados</button>' +
        '<p style="font-size:11px;color:#888;text-align:center;margin-top:12px;">YOU v1.0.0 · Torrão Produção</p>' +
      '</div>';

    // Abre o modal
    if (typeof openModal === 'function') {
      openModal('configModal');
    }
  };

  // ========== FUNÇÕES DE CONFIGURAÇÃO ==========

  // Notificações push
  window.toggleNotificacoes = function (checked) {
    setPref('notificacoes', checked);
    if (checked && 'Notification' in window) {
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') {
          if (typeof showToast === 'function') showToast('Notificações ativadas!');
        } else {
          if (typeof showToast === 'function') showToast('Permissão negada. Ative nas configurações do navegador.');
          setPref('notificacoes', false);
          // Atualiza toggle visual
          var toggle = document.querySelector('#configContent input[onchange*="toggleNotificacoes"]');
          if (toggle) toggle.checked = false;
        }
      });
    } else {
      if (typeof showToast === 'function') showToast(checked ? 'Notificações ativadas' : 'Notificações desativadas');
    }
  };

  // Sons do app
  window.toggleSons = function (checked) {
    setPref('sons', checked);
    if (typeof showToast === 'function') showToast(checked ? 'Sons ativados' : 'Sons desativados');
  };

  // Mudar tema
  window.mudarTema = function (cor) {
    setPref('tema', cor);
    aplicarTema(cor);
    // Atualiza indicadores visuais (bolinhas)
    var circles = document.querySelectorAll('.color-circle');
    for (var i = 0; i < circles.length; i++) {
      circles[i].classList.toggle('selected', circles[i].style.background === cor);
    }
    if (typeof showToast === 'function') showToast('Tema atualizado! 🎨');
  };

  // Perfil público
  window.togglePerfilPublico = function (checked) {
    setPref('perfilPublico', checked);
    if (auth.currentUser) {
      db.collection('users').doc(auth.currentUser.uid).update({
        perfilPublico: checked
      }).catch(function () {});
    }
    if (typeof showToast === 'function') showToast(checked ? 'Perfil público' : 'Perfil privado');
  };

  // Status online
  window.toggleStatusOnline = function (checked) {
    setPref('mostrarOnline', checked);
    if (auth.currentUser) {
      db.collection('users').doc(auth.currentUser.uid).update({
        mostrarOnline: checked
      }).catch(function () {});
    }
    if (typeof showToast === 'function') showToast(checked ? 'Status online visível' : 'Status online oculto');
  };

  // Mostrar capa
  window.toggleMostrarCapa = function (checked) {
    setPref('mostrarCapa', checked);
    if (typeof showToast === 'function') showToast(checked ? 'Capa visível no perfil' : 'Capa ocultada');
  };

  // Limpar cache
  window.limparCache = function () {
    if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.clearAll) {
      ATHOM_CACHE.clearAll();
    }
    if (typeof showToast === 'function') showToast('Cache limpo! ✨');
  };

  // Exportar dados
  window.exportarDados = async function () {
    if (!auth.currentUser) {
      if (typeof showToast === 'function') showToast('Você precisa estar logado.');
      return;
    }
    try {
      var doc = await db.collection('users').doc(auth.currentUser.uid).get();
      if (!doc.exists) {
        if (typeof showToast === 'function') showToast('Dados não encontrados.');
        return;
      }
      var data = doc.data();
      delete data.password; // segurança
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'you_dados_' + auth.currentUser.uid + '.json';
      a.click();
      URL.revokeObjectURL(url);
      if (typeof showToast === 'function') showToast('Dados exportados!');
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('Erro ao exportar.');
    }
  };

  console.log('⚙️ Configurações (config.js) carregado.');
})();