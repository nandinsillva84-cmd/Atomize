// ==================== app.js – YOU (Stubs completos para menu, contatos, etc.) ====================
(function () {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    setTimeout(arguments.callee, 200);
    return;
  }

  var auth = firebase.auth();
  var db = firebase.firestore();

  // ========== STUBS GLOBAIS (definidos antes de qualquer outro módulo) ==========
  window.showToast = window.showToast || function (msg) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3000);
  };

  window.openModal = window.openModal || function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  };

  window.closeModal = window.closeModal || function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  };

  // Stubs para todos os modais acessíveis pelo menu e barra inferior
  window.openContactsModal = function () {
    if (typeof window.openContactsModalReal === 'function') window.openContactsModalReal();
    else window.openModal('contactsModal');
  };
  window.closeContactsModal = function () { window.closeModal('contactsModal'); };

  window.openMenuModal = function () { window.openModal('menuModal'); };
  window.closeMenuModal = function () { window.closeModal('menuModal'); };

  window.openConfigModal = function () { window.openModal('configModal'); };
  window.closeConfigModal = function () { window.closeModal('configModal'); };

  window.openFeedbackModal = function () { window.openModal('feedbackModal'); };
  window.closeFeedbackModal = function () { window.closeModal('feedbackModal'); };

  window.openSobreModal = function () { window.openModal('sobreModal'); };
  window.closeSobreModal = function () { window.closeModal('sobreModal'); };

  window.openSolicitacoesModal = function () {
    if (typeof window.renderSolicitacoes === 'function') window.renderSolicitacoes();
    window.openModal('solicitacoesModal');
  };
  window.closeSolicitacoesModal = function () { window.closeModal('solicitacoesModal'); };

  window.openSearchModal = function () {
    if (typeof window._openSearchModal === 'function') window._openSearchModal();
    else window.openModal('searchModal');
  };
  window.closeSearchModal = function () {
    if (typeof window._closeSearchModal === 'function') window._closeSearchModal();
    else window.closeModal('searchModal');
  };

  window.openProfileModal = function () {
    if (typeof window._openProfileModal === 'function') window._openProfileModal();
    else window.openModal('profileModal');
  };
  window.closeProfileModal = function () {
    if (typeof window._closeProfileModal === 'function') window._closeProfileModal();
    else window.closeModal('profileModal');
  };

  // ========== DADOS DO USUÁRIO ==========
  window.userData = {
    uid: null, firstName: '', lastName: '',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    status: '', quote: '', cover: ''
  };

  // ========== ATUALIZAR CABEÇALHO ==========
  window.updateHeader = function () {
    var av = document.getElementById('headerAvatar');
    var nm = document.getElementById('headerName');
    var st = document.getElementById('headerStatus');
    var qt = document.getElementById('headerQuote');
    if (av) av.src = userData.avatar;
    if (nm) nm.textContent = (userData.firstName + ' ' + userData.lastName).trim() || 'Usuário';
    if (st) st.textContent = userData.status || '';
    if (qt) qt.textContent = userData.quote ? '"' + userData.quote + '"' : '';
  };

  // ========== CONTROLE DE ABAS ==========
  window.setActiveTab = function (tabName) {
    var tabs = document.querySelectorAll('.header-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
      if (tabs[i].getAttribute('data-tab') === tabName) {
        tabs[i].classList.add('active');
      }
    }

    if (tabName === 'now' && typeof loadNowFeed === 'function') loadNowFeed();
    else if (tabName === 'exhibition' && typeof renderExhibitionTab === 'function') renderExhibitionTab();
    else if (tabName === 'textz' && typeof window._textzOriginalSetActiveTab === 'function') {
      window._textzOriginalSetActiveTab(tabName);
    }
  };

  // ========== AUTENTICAÇÃO ==========
  auth.onAuthStateChanged(async function (user) {
    var loginScreen = document.getElementById('loginScreen');
    var appMain = document.getElementById('appMain');

    if (user) {
      userData.uid = user.uid;
      try {
        var doc = await db.collection('users').doc(user.uid).get();
        if (!doc.exists) {
          showToast('Conta não configurada. Faça login novamente.', 'error');
          await auth.signOut();
          return;
        }
        var d = doc.data();
        userData.firstName = d.firstName || '';
        userData.lastName = d.lastName || '';
        userData.avatar = d.avatar || userData.avatar;
        userData.status = d.status || '';
        userData.quote = d.quote || '';
        userData.cover = d.cover || '';
      } catch (e) {
        showToast('Erro ao carregar seu perfil.', 'error');
        await auth.signOut();
        return;
      }

      if (typeof setUserStatus === 'function') setUserStatus(user.uid, 'online');
      updateHeader();

      if (loginScreen) loginScreen.style.display = 'none';
      if (appMain) {
        appMain.style.display = 'flex';
        if (!window._appStarted) {
          window._appStarted = true;
          window.dispatchEvent(new CustomEvent('appStarted'));
          setActiveTab('now');
        }
      }

      // Painel Admin
      if (user.email === 'nandinsillva84@gmail.com') {
        setTimeout(function () {
          var menuList = document.querySelector('.menu-list');
          if (menuList && !document.getElementById('adminMenuItem')) {
            var item = document.createElement('div');
            item.id = 'adminMenuItem';
            item.className = 'menu-item';
            item.innerHTML = '<i class="fas fa-user-shield menu-icon"></i><span>Painel Admin</span>';
            item.addEventListener('click', function () {
              closeMenuModal();
              if (typeof openAdminPanel === 'function') openAdminPanel();
            });
            var sair = menuList.querySelector('.menu-item-sair');
            if (sair) menuList.insertBefore(item, sair);
            else menuList.appendChild(item);
          }
        }, 1000);
      }
    } else {
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appMain) appMain.style.display = 'none';
      window._appStarted = false;
    }
  });

  // ========== HEADER COMPACTO ==========
  var lastScrollY = 0;
  var mainFeed = document.getElementById('mainFeed');
  if (mainFeed) {
    mainFeed.addEventListener('scroll', function () {
      var header = document.getElementById('mainHeader');
      if (!header) return;
      if (mainFeed.scrollTop > lastScrollY && mainFeed.scrollTop > 50) {
        header.classList.add('compact-header');
      } else if (mainFeed.scrollTop < lastScrollY || mainFeed.scrollTop <= 50) {
        header.classList.remove('compact-header');
      }
      lastScrollY = mainFeed.scrollTop;
    });
  }

  console.log('📱 App YOU (stubs completos) carregado.');
})();