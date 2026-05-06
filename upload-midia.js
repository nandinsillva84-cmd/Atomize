// ==================== upload-midia.js – YOU ====================
// Gerencia a seleção de arquivos (imagens e vídeos), previews,
// compressão de imagens grandes (base64 com limite de 1 MB por arquivo),
// e a função publishPost que salva o post no Firestore.

(function () {
  // ========== ARMAZENAMENTO TEMPORÁRIO (COMPARTILHADO COM publicar.js) ==========
  window.tempMedia = window.tempMedia || [];

  // ========== COMPRESSÃO DE IMAGEM ==========
  function compressBase64(base64, maxSizeMB) {
    maxSizeMB = maxSizeMB || 1;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;
        if (width > 1200) { height *= 1200 / width; width = 1200; }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        var quality = 0.8;
        var result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > maxSizeMB * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.src = base64;
    });
  }

  // ========== ADICIONAR MÍDIAS (CHAMADO POR handleMediaUpload) ==========
  function adicionarMidias(files, forceTipo) {
    var newMedia = [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var tipo = forceTipo || (file.type.startsWith('video/') ? 'video' : 'imagem');
      var imagensAtuais = window.tempMedia.filter(function (m) { return m.tipo === 'imagem'; }).length;
      var videosAtuais = window.tempMedia.filter(function (m) { return m.tipo === 'video'; }).length;

      if (tipo === 'imagem' && (imagensAtuais + newMedia.filter(function (m) { return m.tipo === 'imagem'; }).length) >= 10) {
        if (typeof showToast === 'function') showToast('Máximo de 10 imagens.');
        break;
      }
      if (tipo === 'video' && (videosAtuais + newMedia.filter(function (m) { return m.tipo === 'video'; }).length) >= 5) {
        if (typeof showToast === 'function') showToast('Máximo de 5 vídeos.');
        break;
      }
      if (file.size > 90 * 1024 * 1024) {
        if (typeof showToast === 'function') showToast('Arquivo muito grande. Máx. 90MB.');
        continue;
      }
      newMedia.push({ file: file, tipo: tipo });
    }

    var lidos = 0;
    var total = newMedia.length;
    if (total === 0) return;
    if (typeof showToast === 'function') showToast('Processando ' + total + ' arquivo(s)...');

    for (var j = 0; j < newMedia.length; j++) {
      (function (item) {
        var reader = new FileReader();
        reader.onload = async function (e) {
          var dataUrl = e.target.result;
          if (item.tipo === 'imagem' && dataUrl.length > 1 * 1024 * 1024) {
            dataUrl = await compressBase64(dataUrl, 1);
          }
          window.tempMedia.push({ dataUrl: dataUrl, tipo: item.tipo, file: item.file });
          lidos++;
          if (lidos === total) atualizarPreview();
        };
        reader.readAsDataURL(item.file);
      })(newMedia[j]);
    }
  }

  // ========== ABRIR SELETOR DE MÍDIA ==========
  window.openMediaPicker = function () {
    var input = document.getElementById('mediaUpload');
    if (input) input.click();
  };

  // ========== HANDLER DO INPUT DE MÍDIA ==========
  window.handleMediaUpload = function (event) {
    var files = event.target.files;
    if (!files || files.length === 0) return;
    adicionarMidias(files);
    event.target.value = '';
  };

  // ========== REMOVER MÍDIA (ÍNDICE OU TODAS) ==========
  window.removeMedia = function (index) {
    if (typeof index === 'number') {
      window.tempMedia.splice(index, 1);
      atualizarPreview();
    } else {
      window.tempMedia = [];
      var preview = document.getElementById('mediaPreview');
      if (preview) preview.style.display = 'none';
    }
  };

  // ========== ATUALIZAR PREVIEW NO MODAL ==========
  function atualizarPreview() {
    var preview = document.getElementById('mediaPreview');
    var content = document.getElementById('mediaContent');
    if (!preview || !content) return;

    if (window.tempMedia.length === 0) {
      preview.style.display = 'none';
      return;
    }

    preview.style.display = 'block';
    var html = '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    for (var i = 0; i < window.tempMedia.length; i++) {
      var m = window.tempMedia[i];
      html +=
        '<div style="position:relative;width:100px;height:100px;overflow:hidden;border-radius:8px;">' +
          (m.tipo === 'video'
            ? '<video src="' + m.dataUrl + '" style="width:100%;height:100%;object-fit:cover;" muted></video>'
            : '<img src="' + m.dataUrl + '" style="width:100%;height:100%;object-fit:cover;">') +
          '<button onclick="window.removeMedia(' + i + ')" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">✕</button>' +
        '</div>';
    }
    html += '</div>';
    content.innerHTML = html;
  }

  // ========== PUBLICAR POST (CHAMADO PELO BOTÃO "📨 Publicar") ==========
  window.publishPost = async function () {
    var isTextTab = document.getElementById('postTextSection').style.display !== 'none';
    var isMediaTab = document.getElementById('postMediaSection').style.display !== 'none';
    var quote = '';
    var mediaObjects = [];

    if (isTextTab) {
      var textarea = document.getElementById('newPostText');
      if (!textarea) {
        if (typeof showToast === 'function') showToast('Campo não encontrado.');
        return;
      }
      quote = textarea.value.trim();
      if (!quote) {
        if (typeof showToast === 'function') showToast('Escreva algo.');
        return;
      }
    } else if (isMediaTab) {
      var caption = document.getElementById('mediaCaption');
      quote = caption ? caption.value.trim() : '';
      if (window.tempMedia.length === 0) {
        if (typeof showToast === 'function') showToast('Selecione ao menos uma mídia.');
        return;
      }
      // Converte para array de objetos { tipo, dataUrl }
      mediaObjects = window.tempMedia.map(function (m) {
        return { tipo: m.tipo, dataUrl: m.dataUrl };
      });
    } else {
      if (typeof showToast === 'function') showToast('Selecione uma aba.');
      return;
    }

    // Obtém dados do usuário (userData deve estar global, definido em app.js)
    var uid = typeof userData !== 'undefined' ? userData.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) {
      if (typeof showToast === 'function') showToast('Você precisa estar logado.');
      return;
    }

    try {
      await db.collection('posts').add({
        userId: uid,
        name: (typeof userData !== 'undefined' ? userData.firstName + ' ' + userData.lastName : auth.currentUser.displayName || 'Usuário').trim(),
        avatar: typeof userData !== 'undefined' ? userData.avatar : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        status: typeof userData !== 'undefined' ? userData.status : '',
        quote: quote,
        tipo: mediaObjects.length > 0 ? (mediaObjects[0].tipo === 'video' ? 'video' : 'imagem') : 'texto',
        media: mediaObjects,
        likes: 0,
        likedBy: [],
        comments: 0,
        shares: 0,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      if (typeof showToast === 'function') showToast('Publicado!');

      // Fecha o modal e limpa mídia temporária
      if (typeof closePostModal === 'function') window.closePostModal();
      window.tempMedia = [];
      atualizarPreview();
      var captionInput = document.getElementById('mediaCaption');
      if (captionInput) captionInput.value = '';

      // Recarrega os feeds
      if (typeof loadNowFeed === 'function') loadNowFeed();
      if (typeof renderExhibitionTab === 'function') renderExhibitionTab();
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') showToast('Erro ao publicar.');
    }
  };

  console.log('📤 Upload de mídia (upload-midia.js) carregado.');
})();