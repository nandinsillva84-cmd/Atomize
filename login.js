// ==================== login.js – YOU (Revisado, compatível com novos módulos) ====================
(function () {
  function waitForReady(cb) {
    if (typeof firebase !== 'undefined' && firebase.auth && document.getElementById('loginScreen')) {
      cb();
    } else {
      setTimeout(function () { waitForReady(cb); }, 100);
    }
  }

  waitForReady(function () {
    var auth = firebase.auth();
    var db = firebase.firestore();
    var splash = document.getElementById('splashScreen');
    var loginScreen = document.getElementById('loginScreen');
    var appMain = document.getElementById('appMain');

    // ---------- TOAST ----------
    function showToast(msg, type) {
      type = type || 'info';
      if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
        return;
      }
      var toast = document.getElementById('toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.className = 'toast ' + type;
      toast.classList.add('show');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3500);
    }

    function isOnline() { return navigator.onLine !== false; }

    // ---------- EXIBIÇÃO ----------
    function showLoginScreen() {
      if (splash) { splash.style.display = 'none'; splash.classList.add('hidden-splash'); }
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appMain) appMain.style.display = 'none';
      // Aplica a animação do lápis, se os elementos existirem
      if (typeof startLogoAnimation === 'function') startLogoAnimation();
    }

    function forceShowApp() {
      if (loginScreen) loginScreen.style.display = 'none';
      if (appMain) {
        appMain.style.display = 'flex';
        setTimeout(function () {
          if (typeof window.setActiveTab === 'function') window.setActiveTab('now');
        }, 200);
      }
    }

    // ========== SPLASH DE 6 SEGUNDOS ==========
    if (splash) {
      setTimeout(function () {
        splash.classList.add('hidden-splash');
        splash.style.display = 'none';
        showLoginScreen();
      }, 6000);
    } else {
      showLoginScreen();
    }

    // ========== LEMBRAR DADOS ==========
    function salvarDadosLembrados(email, senha) {
      var lembrar = document.getElementById('lembrarDados');
      if (lembrar && lembrar.checked) {
        localStorage.setItem('you_lembrar_email', email);
        localStorage.setItem('you_lembrar_senha', senha);
        localStorage.setItem('you_lembrar_ativo', 'true');
      } else {
        localStorage.removeItem('you_lembrar_email');
        localStorage.removeItem('you_lembrar_senha');
        localStorage.setItem('you_lembrar_ativo', 'false');
      }
    }

    function carregarDadosLembrados() {
      var ativo = localStorage.getItem('you_lembrar_ativo') === 'true';
      var email = localStorage.getItem('you_lembrar_email') || '';
      var senha = localStorage.getItem('you_lembrar_senha') || '';
      var emailInput = document.getElementById('loginEmail');
      var passInput = document.getElementById('loginPassword');
      var checkbox = document.getElementById('lembrarDados');
      if (emailInput && passInput && checkbox) {
        if (ativo) {
          emailInput.value = email;
          passInput.value = senha;
          checkbox.checked = true;
        } else {
          emailInput.value = '';
          passInput.value = '';
          checkbox.checked = false;
        }
      }
    }

    // ========== OLHINHO NA SENHA ==========
    function setupPasswordToggle(inputId) {
      var input = document.getElementById(inputId);
      if (!input) return;
      var parent = input.parentElement;
      if (parent.querySelector('.password-toggle')) return; // já existe
      var eyeIcon = document.createElement('span');
      eyeIcon.className = 'password-toggle';
      eyeIcon.innerHTML = '<i class="far fa-eye"></i>';
      eyeIcon.style.cssText = 'position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; color:#aaa; font-size:16px; z-index:2;';
      eyeIcon.addEventListener('click', function () {
        if (input.type === 'password') {
          input.type = 'text';
          eyeIcon.innerHTML = '<i class="far fa-eye-slash"></i>';
        } else {
          input.type = 'password';
          eyeIcon.innerHTML = '<i class="far fa-eye"></i>';
        }
      });
      parent.style.position = 'relative';
      parent.appendChild(eyeIcon);
    }

    setTimeout(function () {
      setupPasswordToggle('loginPassword');
      setupPasswordToggle('regPassword');
    }, 500);

    // ========== CHECKBOX "LEMBRAR" ==========
    function adicionarCheckboxLembrar() {
      var loginForm = document.getElementById('loginForm');
      if (!loginForm || document.getElementById('lembrarContainer')) return;
      var container = document.createElement('div');
      container.id = 'lembrarContainer';
      container.style.cssText = 'display:flex; align-items:center; gap:8px; margin:12px 0; font-size:13px; color:#888;';
      container.innerHTML = '<input type="checkbox" id="lembrarDados" style="width:16px; height:16px;"> <label for="lembrarDados" style="cursor:pointer;">Lembrar e-mail e senha</label>';
      var btnMain = loginForm.querySelector('.btn-main');
      if (btnMain) loginForm.insertBefore(container, btnMain);
      else loginForm.appendChild(container);
    }
    adicionarCheckboxLembrar();
    carregarDadosLembrados();

    // ========== ESQUECI A SENHA (CORRIGIDO) ==========
    var loginFormEl = document.getElementById('loginForm');
    if (loginFormEl && !document.getElementById('forgotPasswordLink')) {
      var forgotDiv = document.createElement('div');
      forgotDiv.style.cssText = 'text-align:right;margin-top:6px;';
      forgotDiv.id = 'forgotPasswordLink';
      forgotDiv.innerHTML = '<a href="#" style="color:#58d3f7;font-size:13px;text-decoration:none;" id="forgotPasswordBtn">Esqueci a senha?</a>';
      loginFormEl.appendChild(forgotDiv);
      document.getElementById('forgotPasswordBtn').addEventListener('click', function (e) {
        e.preventDefault();
        // Compatível com recuperar-senha.js (novo módulo)
        if (typeof window.abrirRedefinicaoSenha === 'function') {
          window.abrirRedefinicaoSenha();
        } else if (typeof window.abrirModalRedefinirSenha === 'function') {
          window.abrirModalRedefinirSenha();
        } else {
          showToast('Redefinição de senha indisponível.', 'error');
        }
      });
    }

    // ========== LOGIN ==========
    window.fazerLogin = async function () {
      clearFieldErrors();
      if (!isOnline()) { showToast('Sem conexão.', 'error'); return; }

      var emailInput = document.getElementById('loginEmail');
      var passInput = document.getElementById('loginPassword');
      if (!emailInput || !passInput) return showToast('Campos não encontrados.', 'error');

      var email = emailInput.value.trim();
      var pass = passInput.value.trim();

      var valid = true;
      if (!email) { showFieldError('loginEmail', 'Informe o e‑mail.'); valid = false; }
      else if (!isValidEmail(email)) { showFieldError('loginEmail', 'E‑mail inválido.'); valid = false; }
      if (!pass) { showFieldError('loginPassword', 'Informe a senha.'); valid = false; }
      if (!valid) return;

      var btn = document.querySelector('#loginForm .btn-main');
      setButtonLoading(btn, true);

      try {
        // Limpa cache do usuário anterior (compatível com ATHOM_CACHE ou YOU_CACHE)
        if (window.ATHOM_CACHE && window.ATHOM_CACHE.clearCurrentUser) ATHOM_CACHE.clearCurrentUser();
        if (window.YOU_CACHE && window.YOU_CACHE.clearCurrentUser) YOU_CACHE.clearCurrentUser();
        await auth.signInWithEmailAndPassword(email, pass);

        salvarDadosLembrados(email, pass);

        showToast('✅ Bem-vindo!', 'success');
        setTimeout(function () {
          if (appMain && appMain.style.display === 'none' && auth.currentUser) forceShowApp();
        }, 1500);
      } catch (e) {
        console.error('Erro login:', e);
        var msg = 'Erro ao fazer login.';
        if (e.code === 'auth/wrong-password') msg = 'Senha incorreta.';
        else if (e.code === 'auth/user-not-found') msg = 'Usuário não encontrado.';
        else if (e.code === 'auth/invalid-email') msg = 'E‑mail inválido.';
        else if (e.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Aguarde.';
        else if (e.code === 'auth/network-request-failed') msg = 'Erro de rede.';
        showToast(msg, 'error');
      } finally {
        setButtonLoading(btn, false);
      }
    };

    // ========== CADASTRO (COM ROLLBACK) ==========
    window.criarConta = async function () {
      clearFieldErrors();
      if (!isOnline()) { showToast('Sem conexão.', 'error'); return; }

      var fnInput = document.getElementById('regFirstName');
      var lnInput = document.getElementById('regLastName');
      var emailInput = document.getElementById('regEmail');
      var passInput = document.getElementById('regPassword');
      if (!fnInput || !lnInput || !emailInput || !passInput) return showToast('Campos não encontrados.', 'error');

      var fn = fnInput.value.trim();
      var ln = lnInput.value.trim();
      var email = emailInput.value.trim();
      var pass = passInput.value.trim();

      var valid = true;
      if (!fn) { showFieldError('regFirstName', 'Informe seu nome.'); valid = false; }
      else if (fn.length < 2) { showFieldError('regFirstName', 'Mínimo 2 caracteres.'); valid = false; }
      else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(fn)) { showFieldError('regFirstName', 'Caracteres inválidos.'); valid = false; }
      if (!ln) { showFieldError('regLastName', 'Informe seu sobrenome.'); valid = false; }
      else if (ln.length < 2) { showFieldError('regLastName', 'Mínimo 2 caracteres.'); valid = false; }
      else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(ln)) { showFieldError('regLastName', 'Caracteres inválidos.'); valid = false; }
      if (!email) { showFieldError('regEmail', 'Informe seu e‑mail.'); valid = false; }
      else if (!isValidEmail(email)) { showFieldError('regEmail', 'E‑mail inválido.'); valid = false; }
      if (!pass) { showFieldError('regPassword', 'Crie uma senha.'); valid = false; }
      else if (pass.length < 6) { showFieldError('regPassword', 'Mínimo 6 caracteres.'); valid = false; }
      if (!valid) return;

      var btn = document.querySelector('#registerForm .btn-main');
      setButtonLoading(btn, true);

      try {
        if (window.ATHOM_CACHE && window.ATHOM_CACHE.clearCurrentUser) ATHOM_CACHE.clearCurrentUser();
        if (window.YOU_CACHE && window.YOU_CACHE.clearCurrentUser) YOU_CACHE.clearCurrentUser();
        var cred = await auth.createUserWithEmailAndPassword(email, pass);

        try {
          await db.collection('users').doc(cred.user.uid).set({
            email: email,
            firstName: fn,
            lastName: ln,
            name: fn + ' ' + ln,
            nameLower: (fn + ' ' + ln).toLowerCase().trim(),
            avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
            status: '',
            quote: '',
            friends: [],
            statusType: 'online',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch (firestoreError) {
          console.error('Erro ao salvar perfil no Firestore:', firestoreError);
          await cred.user.delete().catch(function () {});
          showToast('Erro ao salvar dados do usuário. Tente novamente.', 'error');
          setButtonLoading(btn, false);
          return;
        }

        showToast('✅ Conta criada! Bem-vindo!', 'success');
        salvarDadosLembrados(email, pass);
        setTimeout(function () {
          if (appMain && appMain.style.display === 'none' && auth.currentUser) forceShowApp();
        }, 1000);
      } catch (e) {
        console.error('Erro cadastro:', e);
        if (auth.currentUser) {
          try { await auth.signOut(); } catch (_) {}
        }
        var msg = 'Erro ao criar conta.';
        if (e.code === 'auth/email-already-in-use') msg = 'E‑mail já cadastrado.';
        else if (e.code === 'auth/invalid-email') msg = 'E‑mail inválido.';
        else if (e.code === 'auth/weak-password') msg = 'Senha muito fraca. Mínimo 6 caracteres.';
        else if (e.code === 'auth/network-request-failed') msg = 'Erro de rede.';
        showToast(msg, 'error');
      } finally {
        setButtonLoading(btn, false);
      }
    };

    // ========== VALIDAÇÃO ==========
    function showFieldError(inputId, message) {
      var input = document.getElementById(inputId);
      if (!input) return;
      input.style.borderColor = '#e74c3c';
      input.style.background = '#fff5f5';
      var parent = input.parentElement;
      var errSpan = parent.querySelector('.field-error');
      if (!errSpan) {
        errSpan = document.createElement('span');
        errSpan.className = 'field-error';
        errSpan.style.cssText = 'display:block;font-size:11px;color:#e74c3c;margin-top:4px;text-align:left;';
        parent.appendChild(errSpan);
      }
      errSpan.textContent = message;
    }

    function clearFieldErrors() {
      var errors = document.querySelectorAll('.field-error');
      for (var i = 0; i < errors.length; i++) { errors[i].remove(); }
      var inputs = document.querySelectorAll('input');
      for (var j = 0; j < inputs.length; j++) {
        inputs[j].style.borderColor = '#ddd';
        inputs[j].style.background = '#fff';
      }
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setButtonLoading(btn, isLoading) {
      if (!btn) return;
      if (isLoading) {
        btn.disabled = true;
        btn._originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Aguarde...';
      } else {
        btn.disabled = false;
        if (btn._originalText) btn.innerHTML = btn._originalText;
      }
    }

    // ========== ABAS ==========
    window.switchLoginTab = function (tab) {
      var tabs = document.querySelectorAll('.login-tab');
      for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
      var forms = document.querySelectorAll('.login-form');
      for (var j = 0; j < forms.length; j++) { forms[j].classList.remove('active'); }
      if (tab === 'login') {
        document.querySelector('.login-tab:nth-child(1)').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
      } else {
        document.querySelector('.login-tab:nth-child(2)').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
      }
      clearFieldErrors();
      // Aplica a animação do lápis ao trocar de aba
      if (typeof startLogoAnimation === 'function') startLogoAnimation();
    };

    // ========== ENTER SUBMIT ==========
    document.getElementById('loginEmail')?.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.fazerLogin(); });
    document.getElementById('loginPassword')?.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.fazerLogin(); });
    document.getElementById('regEmail')?.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.criarConta(); });
    document.getElementById('regPassword')?.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.criarConta(); });

    // Inicialização
    console.log('🔑 Login YOU revisado ativo.');
  });
})();