// ==================== admin-posts.js – YOU ====================
// Módulo complementar do Painel Admin.
// Responsável pelo modal "Posts do Usuário".
// Chamado quando o administrador clica no botão "📰 Posts" no card de um usuário.
// Exibe os últimos 50 posts do usuário selecionado, com:
// - Texto do post
// - Miniaturas das mídias (se houver)
// - Data/hora da publicação
// - Botão "🗑️ Excluir" para remover posts individualmente
// Após excluir um post, a lista é recarregada automaticamente.

(function () {
  // ========== REFERÊNCIAS GLOBAIS (DEVEM ESTAR CARREGADAS) ==========
  // db, auth, showToast, openModal, closeModal

  // ========== CRIA O MODAL (UMA ÚNICA VEZ) ==========
  function ensureUserPostsModal() {
    if (document.getElementById('userPostsModal')) return;

    var modal = document.createElement('div');
    modal.id = 'userPostsModal';
    modal.className = 'app-modal';
    modal.innerHTML =
      '<div class="modal-header modal-header-vinho">' +
        '<i class="fas fa-arrow-left modal-close" onclick="window._closeUserPostsModal()"></i>' +
        '<span>Posts do Usuário</span>' +
      '</div>' +
      '<div class="modal-body modal-body-branco" style="padding:12px; overflow-y:auto;" id="userPostsContent">' +
        '<p style="text-align:center;color:#888;">Carregando posts...</p>' +
      '</div>';

    document.getElementById('appMain').appendChild(modal);
  }

  // ========== ABRIR MODAL ==========
  window._viewUserPosts = async function (uid) {
    ensureUserPostsModal();
    if (typeof openModal === 'function') {
      openModal('userPostsModal');
    }

    var content = document.getElementById('userPostsContent');
    if (!content) return;
    content.innerHTML = '<p style="text-align:center;color:#888;">Carregando posts...</p>';

    try {
      // Busca os últimos 50 posts do usuário (ordenados por data decrescente)
      var snap = await db.collection('posts')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      if (snap.empty) {
        content.innerHTML = '<p style="text-align:center;color:#888;">Nenhum post encontrado.</p>';
        return;
      }

      // Monta o HTML com cada post
      var html = '';
      snap.forEach(function (doc) {
        var p = doc.data();
        var postId = doc.id;

        // Verifica se há mídia (array ou string)
        var hasMedia = (p.media && Array.isArray(p.media) && p.media.length > 0) || (p.mediaUrl && typeof p.mediaUrl === 'string');

        // Monta as miniaturas das mídias (se houver)
        var mediaHtml = '';
        if (hasMedia) {
          mediaHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">';

          // Se for array de mídia
          if (p.media && Array.isArray(p.media)) {
            for (var i = 0; i < p.media.length; i++) {
              var m = p.media[i];
              mediaHtml += '<img src="' + (m.url || m.dataUrl) + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">';
            }
          }

          // Se for string (URL única)
          if (p.mediaUrl && typeof p.mediaUrl === 'string' && (!p.media || p.media.length === 0)) {
            mediaHtml += '<img src="' + p.mediaUrl + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">';
          }

          mediaHtml += '</div>';
        }

        // Formata a data
        var postDate = '';
        if (p.createdAt && p.createdAt.toDate) {
          postDate = p.createdAt.toDate().toLocaleString('pt-BR');
        } else if (p.createdAt) {
          postDate = new Date(p.createdAt).toLocaleString('pt-BR');
        }

        html +=
          '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">' +
            // Texto do post
            '<div style="font-size:14px;margin-bottom:8px;">' + (p.quote || '<em>Sem texto</em>') + '</div>' +
            // Miniaturas das mídias
            mediaHtml +
            // Rodapé com data e botão de excluir
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<span style="font-size:11px;color:#888;">' + postDate + '</span>' +
              '<button onclick="window._admDeletePost(\'' + postId + '\', \'' + uid + '\')" style="background:#e74c3c;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;">🗑️ Excluir</button>' +
            '</div>' +
          '</div>';
      });

      content.innerHTML = html;

    } catch (e) {
      console.error('Erro ao carregar posts:', e);
      content.innerHTML = '<p style="color:#e74c3c;text-align:center;">Erro ao carregar posts.</p>';
    }
  };

  // ========== FECHAR MODAL ==========
  window._closeUserPostsModal = function () {
    if (typeof closeModal === 'function') {
      closeModal('userPostsModal');
    }
  };

  // ========== EXCLUIR POST ESPECÍFICO ==========
  window._admDeletePost = async function (postId, uid) {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    try {
      // Exclui o documento do post
      await db.collection('posts').doc(postId).delete();

      if (typeof showToast === 'function') {
        showToast('Post excluído!');
      }

      // Recarrega a lista de posts do usuário
      if (typeof window._viewUserPosts === 'function') {
        window._viewUserPosts(uid);
      }
    } catch (e) {
      console.error(e);
      if (typeof showToast === 'function') {
        showToast('Erro ao excluir post.');
      }
    }
  };

  console.log('📰 Admin Posts (admin-posts.js) carregado.');
})();