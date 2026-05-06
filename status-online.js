// ==================== status-online.js – YOU ====================

// Controla o status online/offline do usuário.
// - Ao logar: marca "online" no Firestore.
// - Ao perder internet: marca "offline".
// - Ao recuperar internet: marca "online".
// - Ao fechar a aba/janela: tenta marcar "offline" via REST API (keepalive).

(function() {
  // Função que atualiza o campo "statusType" do usuário no Firestore
  async function setUserStatus(uid, statusType) {
    if (!uid) return;
    try {
      await db.collection('users').doc(uid).update({ statusType: statusType });
    } catch (e) {
      // Silencioso – evita quebrar o app se falhar
    }
  }

  // Quando a janela/aba for fechada, tenta marcar como offline
  // Usa fetch com keepalive porque o navegador pode fechar antes de completar
  window.addEventListener('beforeunload', function() {
    if (auth.currentUser) {
      var uid = auth.currentUser.uid;
      fetch('https://firestore.googleapis.com/v1/projects/chatbox-f7578/databases/(default)/documents/users/' + uid + '?updateMask.fieldPaths=statusType', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { statusType: { stringValue: 'offline' } } }),
        keepalive: true
      }).catch(function() {});
    }
  });

  // Detecta quando a internet volta e marca como online
  window.addEventListener('online', function() {
    if (auth.currentUser) {
      setUserStatus(auth.currentUser.uid, 'online');
    }
  });

  // Detecta quando a internet cai e marca como offline
  window.addEventListener('offline', function() {
    if (auth.currentUser) {
      setUserStatus(auth.currentUser.uid, 'offline');
    }
  });

  // Exporta a função para ser chamada pelo app.js no login/logout
  window.setUserStatus = setUserStatus;

  console.log('🟢 Status online/offline carregado.');
})();