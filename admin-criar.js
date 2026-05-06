// ==================== admin-criar.js – YOU ====================
// Módulo complementar do Painel Admin.
// Responsável pelo modal "Criar Novo Usuário".
// Chamado quando o administrador clica no botão "+ Criar Usuário" no painel.
// Fornece campos para Nome, Sobrenome, E‑mail e Senha temporária.
// Utiliza Firebase Auth para criar a conta e Firestore para salvar os dados iniciais.
// Após a criação bem‑sucedida, recarrega automaticamente a lista do painel.

(function () {
  // ========== REFERÊNCIAS GLOBAIS (DEVEM ESTAR CARREGADAS) ==========
  // auth, db, showToast, openModal, closeModal

  // ========== CRIA O MODAL (UMA ÚNICA VEZ) ==========
  function ensureCreateUserModal() {
    if (document.getElementById('createUserModal')) return;

    var modal = document.createElement('div');
    modal.id = 'createUserModal';
    modal.className = 'app-modal';
    modal.innerHTML =
      '<div class="modal-header modal-header-vinho">' +
        '<i class="fas fa-arrow-left modal-close" onclick="window._closeCreateUserModal()"></i>' +
        '<span>Criar Novo Usuário</span>' +
      '</div>' +
      '<div class="modal-body modal-body-branco" style="padding:16px;">' +
        '<p style="font-size:13px;color:#888;margin-bottom:12px;">Crie uma conta básica. O usuário depois fará login e completará o perfil.</p>' +
        '<input type="text" id="newUserFirstName" class="input-field" placeholder="Nome">' +
        '<input type="text" id="newUserLastName" class="input-field" placeholder="Sobrenome">' +
        '<input type="email" id="newUserEmail" class="input-field" placeholder="E‑mail">' +
        '<input type="text" id="newUserPassword" class="input-field" placeholder="Senha temporária (mín. 6)">' +
        '<button class="btn-primary" onclick="window._admCreateUser()">Criar Conta</button>' +
        '<p id="createUserMsg" style="color:#e74c3c;font-size:12px;margin-top:8px;display:none;"></p>' +
      '</div>';

    document.getElementById('appMain').appendChild(modal);
  }

  // ========== ABRIR MODAL ==========
  window._openCreateUserModal = function () {
    ensureCreateUserModal();
    if (typeof openModal === 'function') {
      openModal('createUserModal');
    }
  };

  // ========== FECHAR MODAL ==========
  window._closeCreateUserModal = function () {
    if (typeof closeModal === 'function') {
      closeModal('createUserModal');
    }
  };

  // ========== CRIAR USUÁRIO ==========
  window._admCreateUser = async function () {
    // Obtém os valores dos campos
    var fn = document.getElementById('newUserFirstName').value.trim();
    var ln = document.getElementById('newUserLastName').value.trim();
    var email = document.getElementById('newUserEmail').value.trim();
    var pass = document.getElementById('newUserPassword').value.trim();
    var msgP = document.getElementById('createUserMsg');

    // Validação simples
    if (!fn || !ln || !email || pass.length < 6) {
      msgP.textContent = 'Preencha todos os campos com uma senha de no mínimo 6 caracteres.';
      msgP.style.display = 'block';
      return;
    }

    // Desabilita o botão para evitar duplo clique
    var btn = document.querySelector('#createUserModal .btn-primary');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Aguarde...';
    }

    try {
      // 1. Cria o usuário no Firebase Auth
      var cred = await auth.createUserWithEmailAndPassword(email, pass);

      // 2. Salva o documento inicial no Firestore
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
        statusType: 'offline',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 3. Feedback
      if (typeof showToast === 'function') {
        showToast('✅ Usuário criado!');
      }

      // 4. Fecha o modal
      window._closeCreateUserModal();

      // 5. Recarrega a lista do painel admin
      if (typeof window.openAdminPanel === 'function') {
        window.openAdminPanel();
      }
    } catch (e) {
      console.error(e);
      msgP.textContent = 'Erro: ' + (e.message || e.code);
      msgP.style.display = 'block';
    } finally {
      // Reabilita o botão
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Criar Conta';
      }
    }
  };

  console.log('👤 Admin Criar Usuário (admin-criar.js) carregado.');
})();