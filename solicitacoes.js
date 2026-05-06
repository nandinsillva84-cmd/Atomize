// ==================== solicitacoes.js – YOU ====================
// Módulo que lista as solicitações de amizade pendentes.
// É chamado quando o usuário acessa "Solicitações" no menu.
// Exibe cada pessoa que quer te seguir com:
// - Avatar e indicador online/offline
// - Nome
// - Botões "✓ Aceitar" e "✕ Recusar"
// Após aceitar ou recusar, a lista é recarregada automaticamente.

(function () {
  // ========== SANITIZAÇÃO ==========
  function esc(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ========== FUNÇÃO PRINCIPAL ==========
  window.renderSolicitacoes = async function () {
    var list = document.getElementById('solicitacoesList');
    if (!list) return;
    list.innerHTML = '<p style="text-align:center;padding:20px;">Carregando solicitações...</p>';

    try {
      // Verifica se o usuário está logado
      if (!auth.currentUser) {
        list.innerHTML = '<p style="text-align:center;">Você precisa estar logado.</p>';
        return;
      }

      // Busca as solicitações pendentes direcionadas ao usuário atual
      var snap = await db.collection('friendRequests')
        .where('to', '==', auth.currentUser.uid)
        .where('status', '==', 'pending')
        .get();

      if (snap.empty) {
        list.innerHTML = '<p style="text-align:center;padding:20px;">Nenhuma solicitação pendente.</p>';
        return;
      }

      // Monta array com os dados da solicitação
      var requests = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        requests.push({ id: doc.id, from: d.from });
      });

      // Busca os perfis de quem enviou as solicitações
      var userDocs = await Promise.all(
        requests.map(function (req) { return db.collection('users').doc(req.from).get(); })
      );

      // Renderiza um card para cada solicitação
      var html = '';
      for (var i = 0; i < requests.length; i++) {
        var req = requests[i];
        var userDoc = userDocs[i];
        var user = userDoc.exists ? userDoc.data() : {};
        var name = esc(user.name || (user.firstName || '') + ' ' + (user.lastName || '').trim() || 'Usuário');
        var avatar = user.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80';
        var online = user.statusType === 'online';

        html +=
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;background:#fff;border-radius:16px;padding:14px;box-shadow:0 2px 6px rgba(0,0,0,0.06);">' +
            // Avatar com indicador online
            '<div style="position:relative;flex-shrink:0;">' +
              '<img src="' + avatar + '" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--bg-header-top);">' +
              '<span style="position:absolute;bottom:2px;right:2px;width:10px;height:10px;border-radius:50%;border:2px solid #fff;background:' + (online ? '#2ecc71' : '#ccc') + ';"></span>' +
            '</div>' +
            // Nome e texto
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:600;font-size:14px;">' + name + '</div>' +
              '<div style="font-size:12px;color:#888;">Quer te seguir</div>' +
            '</div>' +
            // Botões de ação
            '<div style="display:flex;gap:8px;">' +
              '<button class="btn-aceitar" onclick="window.aceitarSolicitacaoRecebida(\'' + req.from + '\'); setTimeout(function(){ window.renderSolicitacoes(); }, 500);">✓ Aceitar</button>' +
              '<button class="btn-recusar" onclick="window.rejeitarSolicitacaoRecebida(\'' + req.from + '\'); setTimeout(function(){ window.renderSolicitacoes(); }, 500);">✕ Recusar</button>' +
            '</div>' +
          '</div>';
      }

      list.innerHTML = html;

    } catch (e) {
      list.innerHTML = '<p style="text-align:center;color:#e74c3c;">Erro ao carregar.</p>';
      console.error(e);
    }
  };

  console.log('🔔 Solicitações (solicitacoes.js) carregado.');
})();