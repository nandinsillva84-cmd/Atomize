// ==================== chat-upload.js – YOU ====================
// Módulo complementar ao chat.js.
// Responsável pelo upload de imagens nas conversas privadas.
// Como o Firebase Storage não está disponível, as imagens são
// convertidas para base64 e comprimidas antes de serem enviadas
// como mensagem (campo imageUrl).
// Aceita arquivos de até 90 MB.
// Formatos aceitos: JPG, PNG, WebP, HEIC, GIF.
// A compressão reduz para no máximo 500 KB por imagem.

(function () {
  // ========== COMPRESSÃO DE IMAGEM (ESPECÍFICA PARA CHAT) ==========
  function compressChatImage(base64, maxSizeKB) {
    maxSizeKB = maxSizeKB || 500;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;

        // Redimensiona se a largura for maior que 800px
        if (width > 800) {
          height *= 800 / width;
          width = 800;
        }

        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        var quality = 0.7;
        var result = canvas.toDataURL('image/jpeg', quality);

        // Reduz a qualidade até o tamanho ficar abaixo do limite (em KB)
        while (result.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      };
      img.src = base64;
    });
  }

  // ========== UPLOAD DE IMAGEM NO CHAT ==========
  // Esta função é chamada pelo chat.js quando o usuário anexa
  // uma imagem (galeria ou câmera).
  // Parâmetros:
  //   contactId - ID do amigo com quem está conversando
  //   file      - Objeto File da imagem selecionada
  window.uploadImageAndSend = async function (contactId, file) {
    if (typeof showToast === 'function') {
      showToast('Enviando imagem...');
    }

    // Verifica tamanho máximo (90 MB)
    if (file.size > 90 * 1024 * 1024) {
      if (typeof showToast === 'function') {
        showToast('Arquivo muito grande. Máx. 90MB.');
      }
      return;
    }

    var reader = new FileReader();

    reader.onload = async function (e) {
      var dataUrl = e.target.result;

      // Comprime se for maior que 500 KB
      if (dataUrl.length > 500 * 1024) {
        try {
          dataUrl = await compressChatImage(dataUrl, 500);
        } catch (compressErr) {
          console.error('Erro ao comprimir imagem:', compressErr);
          // Continua com a imagem original se a compressão falhar
        }
      }

      // Envia a imagem como mensagem (a função sendMessage está no chat.js)
      if (typeof sendMessage === 'function') {
        sendMessage(contactId, '', dataUrl);
      } else {
        console.error('sendMessage não está definida. Verifique se chat.js foi carregado.');
        if (typeof showToast === 'function') {
          showToast('Erro ao enviar imagem.');
        }
      }
    };

    reader.onerror = function () {
      if (typeof showToast === 'function') {
        showToast('Erro ao ler a imagem.');
      }
    };

    // Lê o arquivo como Data URL (base64)
    reader.readAsDataURL(file);
  };

  console.log('📎 Upload de imagem para chat (chat-upload.js) carregado.');
})();