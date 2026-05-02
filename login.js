// ==================== login.js – ATHOM (E‑mail/Senha + Redefinição + Verificação) ====================
(function () {
  function waitForReady(cb) {
    if (typeof firebase !== 'undefined' && firebase.auth && document.getElementById('loginScreen')) {
      cb();
    } else {
      setTimeout(() => waitForReady(cb), 100);
    }
  }

  waitForReady(function () {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const splash = document.getElementById('splashScreen');
    const loginScreen = document.getElementById('loginScreen');
    const appMain = document.getElementById('appMain');

    // ---------- TOAST ----------
    function showToast(msg, type = 'info') {
      let toast = document.getElementById('toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.className = `toast ${type}`;
      toast.classList.add('show');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function isOnline() { return navigator.onLine !== false; }

    // ---------- EXIBIÇÃO ----------
    function showLoginScreen() {
      if (splash) { splash.style.display = 'none'; splash.classList.add('hidden-splash'); }
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appMain) appMain.style.display = 'none';
    }

    function forceShowApp() {
      if (loginScreen) loginScreen.style.display = 'none';
      if (appMain) {
        appMain.style.display = 'flex';
        setTimeout(() => {
          if (typeof window.setActiveTab === 'function') window.setActiveTab('now');
        }, 200);
      }
    }

    if (splash) {
      setTimeout(() => {
        splash.classList.add('hidden-splash');
        splash.style.display = 'none';
        showLoginScreen();
      }, 4000);
    } else {
      showLoginScreen();
    }

    // ========== ABAS ==========
    window.switchLoginTab = function (tab) {
      document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
      if (tab === 'login') {
        document.querySelector('.login-tab:nth-child(1)').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
      } else {
        document.querySelector('.login-tab:nth-child(2)').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
      }
      clearFieldErrors();
    };

    // ========== VALIDAÇÃO ==========
    function showFieldError(inputId, message) {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.style.borderColor = '#e74c3c';
      input.style.background = '#fff5f5';
      const parent = input.parentElement;
      let errSpan = parent.querySelector('.field-error');
      if (!errSpan) {
        errSpan = document.createElement('span');
        errSpan.className = 'field-error';
        errSpan.style.cssText = 'display:block;font-size:11px;color:#e74c3c;margin-top:4px;text-align:left;';
        parent.appendChild(errSpan);
      }
      errSpan.textContent = message;
    }

    function clearFieldErrors() {
      document.querySelectorAll('.field-error').forEach(el => el.remove());
      document.querySelectorAll('input').forEach(inp => {
        inp.style.borderColor = '#ddd';
        inp.style.background = '#fff';
      });
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

    function addEnterListeners() {
      document.getElementById('loginEmail')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.fazerLogin(); });
      document.getElementById('loginPassword')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.fazerLogin(); });
      document.getElementById('regEmail')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.criarConta(); });
      document.getElementById('regPassword')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.criarConta(); });
    }
    addEnterListeners();

    // ========== ESQUECI A SENHA ==========
    const loginForm = document.getElementById('loginForm');
    if (loginForm && !document.getElementById('forgotPasswordLink')) {
      const forgotDiv = document.createElement('div');
      forgotDiv.style.cssText = 'text-align:right;margin-top:6px;';
      forgotDiv.id = 'forgotPasswordLink';
      forgotDiv.innerHTML = '<a href="#" style="color:#58d3f7;font-size:13px;text-decoration:none;" id="forgotPasswordBtn">Esqueci a senha?</a>';
      loginForm.appendChild(forgotDiv);
      document.getElementById('forgotPasswordBtn').addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalRedefinirSenha();
      });
    }

    function abrirModalRedefinirSenha() {
      const old = document.getElementById('resetPasswordModal');
      if (old) old.remove();

      const modal = document.createElement('div');
      modal.id = 'resetPasswordModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:24px;max-width:340px;width:90%;text-align:center;">
          <h3 style="color:#8b1031;margin-bottom:8px;">Redefinir senha</h3>
          <p style="color:#555;font-size:14px;margin-bottom:16px;">Digite seu e‑mail cadastrado para receber o link de redefinição.</p>
          <input type="email" id="resetEmail" placeholder="seu@email.com" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;font-size:14px;">
          <p id="resetError" style="color:#e74c3c;font-size:12px;margin-bottom:8px;display:none;"></p>
          <button id="btnEnviarReset" style="background:#8b1031;color:#fff;border:none;border-radius:24px;padding:12px 24px;font-size:15px;cursor:pointer;width:100%;margin-bottom:8px;">Enviar link</button>
          <button id="btnCancelarReset" style="background:none;border:none;color:#888;font-size:13px;cursor:pointer;">Cancelar</button>
        </div>`;
      document.body.appendChild(modal);

      document.getElementById('btnCancelarReset').addEventListener('click', () => modal.remove());
      document.getElementById('btnEnviarReset').addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value.trim();
        const errorP = document.getElementById('resetError');
        if (!email || !isValidEmail(email)) {
          errorP.textContent = 'Informe um e‑mail válido.';
          errorP.style.display = 'block';
          return;
        }
        errorP.style.display = 'none';
        const btn = document.getElementById('btnEnviarReset');
        setButtonLoading(btn, true);
        try {
          await auth.sendPasswordResetEmail(email);
          modal.remove();
          mostrarConfirmacaoRedefinicao(email);
        } catch (e) {
          let msg = 'Erro ao enviar. Tente novamente.';
          if (e.code === 'auth/user-not-found') msg = 'Não existe conta com este e‑mail.';
          else if (e.code === 'auth/invalid-email') msg = 'E‑mail inválido.';
          else if (e.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Aguarde.';
          errorP.textContent = msg;
          errorP.style.display = 'block';
        } finally {
          setButtonLoading(btn, false);
        }
      });
    }

    function mostrarConfirmacaoRedefinicao(email) {
      const old = document.getElementById('resetConfirmModal');
      if (old) old.remove();

      const modal = document.createElement('div');
      modal.id = 'resetConfirmModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:24px;max-width:340px;width:90%;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">📨</div>
          <h3 style="color:#8b1031;margin-bottom:8px;">Link enviado!</h3>
          <p style="color:#555;font-size:14px;margin-bottom:4px;">Enviamos um link para <strong>${email}</strong>.</p>
          <p style="color:#888;font-size:12px;margin-bottom:16px;">Verifique sua caixa de entrada e a pasta de spam.</p>
          <button id="btnFecharConfirm" style="background:#8b1031;color:#fff;border:none;border-radius:24px;padding:12px 24px;font-size:15px;cursor:pointer;width:100%;">Entendi</button>
          <button id="btnReenviarReset" style="background:none;border:1px solid #8b1031;color:#8b1031;border-radius:24px;padding:12px 24px;font-size:14px;cursor:pointer;width:100%;margin-top:8px;">Reenviar link</button>
        </div>`;
      document.body.appendChild(modal);

      document.getElementById('btnFecharConfirm').addEventListener('click', () => modal.remove());
      document.getElementById('btnReenviarReset').addEventListener('click', async () => {
        const btn = document.getElementById('btnReenviarReset');
        setButtonLoading(btn, true);
        try {
          await auth.sendPasswordResetEmail(email);
          showToast('✅ Link reenviado!', 'success');
        } catch (e) {
          showToast('Erro ao reenviar. Aguarde.', 'error');
        } finally {
          setButtonLoading(btn, false);
        }
      });
    }

    window.recuperarSenha = function () { abrirModalRedefinirSenha(); };

    // ========== LOGIN E-MAIL E SENHA ==========
    window.fazerLogin = async function () {
      clearFieldErrors();
      if (!isOnline()) { showToast('Sem conexão.', 'error'); return; }

      const emailInput = document.getElementById('loginEmail');
      const passInput = document.getElementById('loginPassword');
      if (!emailInput || !passInput) return showToast('Campos não encontrados.', 'error');

      const email = emailInput.value.trim();
      const pass = passInput.value.trim();

      let valid = true;
      if (!email) { showFieldError('loginEmail', 'Informe o e‑mail.'); valid = false; }
      else if (!isValidEmail(email)) { showFieldError('loginEmail', 'E‑mail inválido.'); valid = false; }
      if (!pass) { showFieldError('loginPassword', 'Informe a senha.'); valid = false; }
      if (!valid) return;

      const btn = document.querySelector('#loginForm .btn-main');
      setButtonLoading(btn, true);

      try {
        if (window.ATHOM_CACHE && ATHOM_CACHE.clearCurrentUser) ATHOM_CACHE.clearCurrentUser();
        const userCredential = await auth.signInWithEmailAndPassword(email, pass);

        if (!userCredential.user.emailVerified) {
          showToast('⚠️ Seu e‑mail ainda não foi verificado.', 'warn');
          try { await userCredential.user.sendEmailVerification(); } catch (e) {}
          mostrarTelaVerificacao(userCredential.user);
          return;
        }

        showToast('✅ Bem-vindo!', 'success');
        setTimeout(() => {
          if (appMain && appMain.style.display === 'none' && auth.currentUser) forceShowApp();
        }, 1500);
      } catch (e) {
        console.error('Erro login:', e);
        let msg = 'Erro ao fazer login.';
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

    // ========== CADASTRO E-MAIL E SENHA ==========
    window.criarConta = async function () {
      clearFieldErrors();
      if (!isOnline()) { showToast('Sem conexão.', 'error'); return; }

      const fnInput = document.getElementById('regFirstName');
      const lnInput = document.getElementById('regLastName');
      const emailInput = document.getElementById('regEmail');
      const passInput = document.getElementById('regPassword');
      if (!fnInput || !lnInput || !emailInput || !passInput) return showToast('Campos não encontrados.', 'error');

      const fn = fnInput.value.trim();
      const ln = lnInput.value.trim();
      const email = emailInput.value.trim();
      const pass = passInput.value.trim();

      let valid = true;
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

      const btn = document.querySelector('#registerForm .btn-main');
      setButtonLoading(btn, true);

      try {
        if (window.ATHOM_CACHE && ATHOM_CACHE.clearCurrentUser) ATHOM_CACHE.clearCurrentUser();
        const cred = await auth.createUserWithEmailAndPassword(email, pass);

        await db.collection('users').doc(cred.user.uid).set({
          email, firstName: fn, lastName: ln, name: `${fn} ${ln}`,
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
          status: '', quote: '', friends: [], statusType: 'online',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        try { await cred.user.sendEmailVerification(); } catch (e) {}
        showToast('✅ Conta criada! Verifique seu e‑mail.', 'success');
        mostrarTelaVerificacao(cred.user);
      } catch (e) {
        console.error('Erro cadastro:', e);
        let msg = 'Erro ao criar conta.';
        if (e.code === 'auth/email-already-in-use') msg = 'E‑mail já cadastrado.';
        else if (e.code === 'auth/invalid-email') msg = 'E‑mail inválido.';
        else if (e.code === 'auth/weak-password') msg = 'Senha muito fraca. Mínimo 6 caracteres.';
        else if (e.code === 'auth/network-request-failed') msg = 'Erro de rede.';
        showToast(msg, 'error');
      } finally {
        setButtonLoading(btn, false);
      }
    };

    function mostrarTelaVerificacao(user) {
      const old = document.getElementById('verificacaoOverlay');
      if (old) old.remove();

      const overlay = document.createElement('div');
      overlay.id = 'verificacaoOverlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:2000;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:30px 20px;text-align:center;max-width:320px;width:90%;">
          <div style="font-size:50px;margin-bottom:15px;">📨</div>
          <h3 style="color:#8b1031;margin-bottom:10px;">Verifique seu e‑mail</h3>
          <p style="color:#555;font-size:14px;margin-bottom:15px;">Enviamos uma mensagem para <strong>${user.email}</strong>. Clique no link recebido para ativar sua conta.</p>
          <button id="btnVerificarAgora" style="background:#8b1031;color:#fff;border:none;border-radius:20px;padding:12px 24px;font-size:14px;cursor:pointer;width:100%;margin-bottom:10px;">Já verifiquei</button>
          <button id="btnReenviarVerificacao" style="background:none;border:1px solid #8b1031;color:#8b1031;border-radius:20px;padding:12px 24px;font-size:14px;cursor:pointer;width:100%;">Reenviar e‑mail</button>
          <button id="btnVerificacaoSair" style="background:none;border:none;color:#888;font-size:12px;margin-top:10px;cursor:pointer;width:100%;">Sair</button>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#btnVerificarAgora').addEventListener('click', async () => {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          overlay.remove();
          showToast('✅ E‑mail verificado! Bem-vindo!', 'success');
          setTimeout(() => forceShowApp(), 1000);
        } else {
          showToast('Seu e‑mail ainda não foi verificado.', 'warn');
        }
      });
      overlay.querySelector('#btnReenviarVerificacao').addEventListener('click', async () => {
        try {
          await user.sendEmailVerification();
          showToast('✅ E‑mail de verificação reenviado!', 'success');
        } catch (e) { showToast('Erro ao reenviar.', 'error'); }
      });
      overlay.querySelector('#btnVerificacaoSair').addEventListener('click', async () => {
        await auth.signOut();
        overlay.remove();
        showLoginScreen();
      });
    }

    console.log('🔑 Login (e‑mail/senha) ativo.');
  });
})();