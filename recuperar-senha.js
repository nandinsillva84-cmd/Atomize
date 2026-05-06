// ==================== recuperar-senha.js – YOU ====================
// Este módulo cuida do fluxo "Esqueci a senha?".
// Quando o usuário clica no link na tela de login, a função
// window.abrirRedefinicaoSenha() é chamada (definida aqui).
// Ela abre um modal para digitar o e‑mail e envia o link de
// redefinição do Firebase. Depois mostra uma mensagem de
// confirmação com opção de reenviar.

(function () {
  // Garante que o Firebase já esteja disponível
  function waitForReady(cb) {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      cb();
    } else {
      setTimeout(function () { waitForReady(cb); }, 100);
    }
  }

  waitForReady(function () {
    var auth = firebase.auth();

    // ========== FUNÇÃO PRINCIPAL (chamada pelo login.js) ==========
    window.abrirRedefinicaoSenha = function () {
      // Remove modal antigo se existir
      var oldModal = document.getElementById('resetPasswordModal');
      if (oldModal) oldModal.remove();

      // Cria o modal
      var modal = document.createElement('div');
      modal.id = 'resetPasswordModal';
      modal.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.7);z-index:2000;display:flex;' +
        'align-items:center;justify-content:center;';

      modal.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:24px;' +
        'max-width:340px;width:90%;text-align:center;">' +
          '<h3 style="color:#8b1031;margin-bottom:8px;">Redefinir senha</h3>' +
          '<p style="color:#555;font-size:14px;margin-bottom:16px;">' +
            'Digite seu e‑mail cadastrado para receber o link de redefinição.' +
          '</p>' +
          '<input type="email" id="resetEmail" placeholder="seu@email.com" ' +
            'style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;' +
            'margin-bottom:12px;font-size:14px;">' +
          '<p id="resetError" style="color:#e74c3c;font-size:12px;margin-bottom:8px;' +
            'display:none;"></p>' +
          '<button id="btnEnviarReset" style="background:#8b1031;color:#fff;' +
            'border:none;border-radius:24px;padding:12px 24px;font-size:15px;' +
            'cursor:pointer;width:100%;margin-bottom:8px;">Enviar link</button>' +
          '<button id="btnCancelarReset" style="background:none;border:none;' +
            'color:#888;font-size:13px;cursor:pointer;">Cancelar</button>' +
        '</div>';

      document.body.appendChild(modal);

      // Eventos
      document.getElementById('btnCancelarReset').addEventListener('click', function () {
        modal.remove();
      });

      document.getElementById('btnEnviarReset').addEventListener('click', async function () {
        var email = document.getElementById('resetEmail').value.trim();
        var errorP = document.getElementById('resetError');

        // Validação simples
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errorP.textContent = 'Informe um e‑mail válido.';
          errorP.style.display = 'block';
          return;
        }
        errorP.style.display = 'none';

        var btn = document.getElementById('btnEnviarReset');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Aguarde...';

        try {
          // Envia o e‑mail de redefinição via Firebase Auth
          await auth.sendPasswordResetEmail(email);
          modal.remove();
          mostrarConfirmacaoRedefinicao(email);
        } catch (e) {
          var msg = 'Erro ao enviar. Tente novamente.';
          if (e.code === 'auth/user-not-found') {
            msg = 'Não existe conta com este e‑mail.';
          } else if (e.code === 'auth/invalid-email') {
            msg = 'E‑mail inválido.';
          } else if (e.code === 'auth/too-many-requests') {
            msg = 'Muitas tentativas. Aguarde.';
          }
          errorP.textContent = msg;
          errorP.style.display = 'block';
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Enviar link';
        }
      });
    };

    // ========== CONFIRMAÇÃO DE ENVIO ==========
    function mostrarConfirmacaoRedefinicao(email) {
      var oldConfirm = document.getElementById('resetConfirmModal');
      if (oldConfirm) oldConfirm.remove();

      var confirmModal = document.createElement('div');
      confirmModal.id = 'resetConfirmModal';
      confirmModal.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.7);z-index:2000;display:flex;' +
        'align-items:center;justify-content:center;';

      confirmModal.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:24px;' +
        'max-width:340px;width:90%;text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:12px;">📨</div>' +
          '<h3 style="color:#8b1031;margin-bottom:8px;">Link enviado!</h3>' +
          '<p style="color:#555;font-size:14px;margin-bottom:4px;">' +
            'Enviamos um link para <strong>' + email + '</strong>.</p>' +
          '<p style="color:#888;font-size:12px;margin-bottom:16px;">' +
            'Verifique sua caixa de entrada e a pasta de spam.</p>' +
          '<button id="btnFecharConfirm" style="background:#8b1031;color:#fff;' +
            'border:none;border-radius:24px;padding:12px 24px;font-size:15px;' +
            'cursor:pointer;width:100%;">Entendi</button>' +
          '<button id="btnReenviarReset" style="background:none;' +
            'border:1px solid #8b1031;color:#8b1031;border-radius:24px;' +
            'padding:12px 24px;font-size:14px;cursor:pointer;width:100%;' +
            'margin-top:8px;">Reenviar link</button>' +
        '</div>';

      document.body.appendChild(confirmModal);

      document.getElementById('btnFecharConfirm').addEventListener('click', function () {
        confirmModal.remove();
      });

      document.getElementById('btnReenviarReset').addEventListener('click', async function () {
        var btn = document.getElementById('btnReenviarReset');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Aguarde...';
        try {
          await auth.sendPasswordResetEmail(email);
          if (typeof showToast === 'function') {
            showToast('✅ Link reenviado!', 'success');
          }
        } catch (e) {
          if (typeof showToast === 'function') {
            showToast('Erro ao reenviar. Aguarde.', 'error');
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Reenviar link';
        }
      });
    }

    console.log('🔑 Recuperação de senha carregada.');
  });
})();