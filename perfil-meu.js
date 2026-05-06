// ==================== perfil-meu.js – YOU ====================
// Módulo de edição do próprio perfil.
// Gerencia o modal "Meu Perfil" com:
// - Upload de avatar (base64 com compressão, máx. 90 MB)
// - Upload de capa (base64 com compressão, máx. 90 MB)
// - Campos de texto: Nome, Sobrenome, Status, Pensamento do dia
// - Botão "💾 Salvar Perfil" (atualiza Firestore e cache)
// - Botão "👁️ Visualizar como amigo" (abre perfil-outro.js)
// - Botão "Remover foto" (volta ao avatar padrão)

(function () {
  // ========== REFERÊNCIAS GLOBAIS ==========
  // db, auth, showToast, openModal, closeModal, esc, openUserProfile
  // userData deve estar definido em app.js (ou acessível globalmente)

  // ========== COMPRESSÃO DE IMAGEM ==========
  function compressBase64(base64, maxSizeMB) {
    maxSizeMB = maxSizeMB || 1;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;
        // Redimensiona se for muito grande
        if (width > 1200) {
          height *= 1200 / width;
          width = 1200;
        }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        var quality = 0.8;
        var result = canvas.toDataURL('image/jpeg', quality);
        // Reduz qualidade até caber no limite
        while (result.length > maxSizeMB * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.src = base64;
    });
  }

  // ========== ABRIR MODAL DE PERFIL ==========
  window.openProfileModal = function () {
    // Preenche campos com dados atuais (userData deve existir)
    if (typeof userData !== 'undefined') {
      document.getElementById('editFirstName').value = userData.firstName || '';
      document.getElementById('editLastName').value = userData.lastName || '';
      document.getElementById('editStatus').value = userData.status || '';
      document.getElementById('editQuote').value = userData.quote || '';
      document.getElementById('profileAvatarPreview').src = userData.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150';

      // Capa
      var coverPreview = document.getElementById('profileCoverPreview');
      if (coverPreview) {
        coverPreview.style.backgroundImage = userData.cover ? 'url(' + userData.cover + ')' : '';
      }
    }

    // Limpa inputs de arquivo
    var coverInput = document.getElementById('coverUpload');
    if (coverInput) coverInput.value = '';
    var avatarInput = document.getElementById('avatarUpload');
    if (avatarInput) avatarInput.value = '';

    // Adiciona botão "Visualizar como amigo" se não existir
    var viewBtn = document.getElementById('viewOwnProfileBtn');
    if (!viewBtn) {
      viewBtn = document.createElement('button');
      viewBtn.id = 'viewOwnProfileBtn';
      viewBtn.className = 'btn-cancelar';
      viewBtn.textContent = '👁️ Visualizar como amigo';
      viewBtn.style.cssText = 'margin-top:10px; width:100%;';
      viewBtn.addEventListener('click', function () {
        if (typeof closeModal === 'function') closeModal('profileModal');
        if (typeof openUserProfile === 'function' && typeof userData !== 'undefined') {
          openUserProfile(userData.uid);
        }
      });
      var saveBtn = document.querySelector('#profileModal .btn-primary');
      if (saveBtn) {
        saveBtn.after(viewBtn);
      }
    }

    // Abre o modal
    if (typeof openModal === 'function') {
      openModal('profileModal');
    }
  };

  // ========== FECHAR MODAL ==========
  window.closeProfileModal = function () {
    if (typeof closeModal === 'function') {
      closeModal('profileModal');
    }
  };

  // ========== UPLOAD DE AVATAR (PREVIEW) ==========
  window.handleAvatarUpload = function (event) {
    var file = event.target.files[0];
    if (!file) return;
    if (file.size > 90 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast('Arquivo muito grande. Máx. 90MB.');
      return;
    }
    var reader = new FileReader();
    reader.onload = async function (e) {
      var dataUrl = e.target.result;
      // Comprime se maior que 1MB
      if (dataUrl.length > 1 * 1024 * 1024) {
        dataUrl = await compressBase64(dataUrl, 1);
      }
      // Atualiza preview e userData global
      if (typeof userData !== 'undefined') {
        userData.avatar = dataUrl;
      }
      var preview = document.getElementById('profileAvatarPreview');
      if (preview) preview.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // ========== REMOVER AVATAR ==========
  window.removeAvatar = function () {
    var defaultAvatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150';
    if (typeof userData !== 'undefined') {
      userData.avatar = defaultAvatar;
    }
    var preview = document.getElementById('profileAvatarPreview');
    if (preview) preview.src = defaultAvatar;
    var avatarInput = document.getElementById('avatarUpload');
    if (avatarInput) avatarInput.value = '';
  };

  // ========== UPLOAD DE CAPA (PREVIEW) ==========
  window.previewCover = function (event) {
    var file = event.target.files[0];
    if (!file) return;
    if (file.size > 90 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast('Arquivo muito grande. Máx. 90MB.');
      return;
    }
    var reader = new FileReader();
    reader.onload = async function (e) {
      var dataUrl = e.target.result;
      if (dataUrl.length > 1 * 1024 * 1024) {
        dataUrl = await compressBase64(dataUrl, 1);
      }
      // Atualiza preview e userData global
      if (typeof userData !== 'undefined') {
        userData.cover = dataUrl;
      }
      var coverPreview = document.getElementById('profileCoverPreview');
      if (coverPreview) {
        coverPreview.style.backgroundImage = 'url(' + dataUrl + ')';
      }
    };
    reader.readAsDataURL(file);
  };

  // ========== SALVAR PERFIL ==========
  window.saveProfile = async function () {
    var fn = document.getElementById('editFirstName').value.trim();
    var ln = document.getElementById('editLastName').value.trim();
    var st = document.getElementById('editStatus').value.trim();
    var qt = document.getElementById('editQuote').value.trim();

    if (!fn || !ln) {
      if (typeof showToast === 'function') showToast('Preencha nome e sobrenome.');
      return;
    }

    // Atualiza userData global
    if (typeof userData !== 'undefined') {
      userData.firstName = fn;
      userData.lastName = ln;
      userData.status = st;
      userData.quote = qt;
    }

    try {
      // Atualiza o documento no Firestore
      await db.collection('users').doc(auth.currentUser.uid).update({
        firstName: fn,
        lastName: ln,
        status: st,
        quote: qt,
        avatar: userData ? userData.avatar : '',
        cover: userData ? userData.cover : '',
        name: fn + ' ' + ln,
        nameLower: (fn + ' ' + ln).toLowerCase().trim()
      });

      if (typeof showToast === 'function') showToast('Perfil salvo com sucesso! ✅');

      // Atualiza o cabeçalho (se a função existir)
      if (typeof updateHeader === 'function') {
        updateHeader();
      }

      // Limpa cache para forçar atualização visual
      if (typeof ATHOM_CACHE !== 'undefined' && ATHOM_CACHE.clearCurrentUser) {
        ATHOM_CACHE.clearCurrentUser();
      }

      // Fecha o modal
      window.closeProfileModal();
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') {
        showToast('Erro ao salvar: ' + (e.message || 'desconhecido'));
      }
    }
  };

  console.log('👤 Perfil próprio (perfil-meu.js) carregado.');
})();