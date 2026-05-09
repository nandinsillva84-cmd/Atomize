// notificacoes.js – YOU
// Gerencia permissão, token e mensagens em primeiro plano

(function () {
  'use strict';

  // Aguarda o Firebase e o usuário estarem prontos
  if (typeof firebase === 'undefined' || !auth || !db) {
    setTimeout(arguments.callee, 200);
    return;
  }

  const messaging = firebase.messaging();

  // ✅ SUA CHAVE VAPID PÚBLICA (copiada da sua tela do Firebase)
  const VAPID_KEY = 'BFJtU0iOnZzLa_jNf1hYczZLxP2zgMNO7eh8cGiaOHKkqQga9pSgRcMpxv2xLEnjMaTwbkgQr_TZB';

  // Salva o token no Firestore (coleção users/{uid}/tokens)
  async function salvarToken(userId, token) {
    try {
      await db.collection('users').doc(userId).collection('tokens').doc(token).set({
        token: token,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Token salvo no Firestore');
    } catch (error) {
      console.error('Erro ao salvar token:', error);
    }
  }

  // Solicita permissão e retorna o token
  async function solicitarPermissao() {
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        if (typeof showToast === 'function') showToast('Permissão de notificação negada');
        return null;
      }
      const token = await messaging.getToken({ vapidKey: VAPID_KEY });
      console.log('🔑 Token FCM:', token);
      return token;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      if (typeof showToast === 'function') showToast('Falha ao ativar notificações');
      return null;
    }
  }

  // Token renovado automaticamente
  messaging.onTokenRefresh(async () => {
    console.log('🔄 Token renovado');
    const novoToken = await messaging.getToken({ vapidKey: VAPID_KEY });
    if (auth.currentUser && novoToken) {
      await salvarToken(auth.currentUser.uid, novoToken);
    }
  });

  // Mensagem recebida com o app aberto (primeiro plano)
  messaging.onMessage((payload) => {
    console.log('📩 Mensagem em primeiro plano:', payload);
    const titulo = payload.notification?.title || 'YOU';
    const corpo = payload.notification?.body || '';
    if (typeof showToast === 'function') {
      showToast(`${titulo}: ${corpo}`);
    } else {
      alert(`${titulo}\n${corpo}`);
    }
    // Se quiser abrir o chat diretamente ao receber notificação:
    // const contactId = payload.data?.contactId;
    // if (contactId && typeof window.openChatWithUser === 'function') {
    //   window.openChatWithUser(contactId);
    // }
  });

  // Inicialização automática quando o usuário loga
  auth.onAuthStateChanged((user) => {
    if (user) {
      solicitarPermissao().then((token) => {
        if (token) salvarToken(user.uid, token);
      });
    }
  });

  // Função global para ativar manualmente (pode colocar um botão "Ativar notificações")
  window.ativarNotificacoes = async function () {
    if (!auth.currentUser) {
      if (typeof showToast === 'function') showToast('Faça login primeiro');
      return;
    }
    const token = await solicitarPermissao();
    if (token) await salvarToken(auth.currentUser.uid, token);
  };

  console.log('📢 Sistema de notificações YOU carregado');
})();