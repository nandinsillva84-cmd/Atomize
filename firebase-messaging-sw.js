// firebase-messaging-sw.js – YOU
// Service Worker para notificações push (segundo plano)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 🔥 Configuração REAL do projeto (copiada do db.js)
firebase.initializeApp({
  apiKey: "AIzaSyAApYxcRCdKCa5X4B5Mqe_tCVafjTbU6bM",
  authDomain: "chatbox-f7578.firebaseapp.com",
  projectId: "chatbox-f7578",
  storageBucket: "chatbox-f7578.appspot.com",
  messagingSenderId: "136199002752",
  appId: "1:136199002752:web:e36cbea04d75877eb0e465"
});

const messaging = firebase.messaging();

// Quando o app está fechado ou em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Notificação em segundo plano:', payload);
  const titulo = payload.notification?.title || 'YOU – Nova mensagem';
  const opcoes = {
    body: payload.notification?.body || '',
    icon: '/imageminicio.png',   // ícone 512x512 que você já tem
    badge: '/icone-48.png',
    data: payload.data || {}
  };
  self.registration.showNotification(titulo, opcoes);
});

// Clique na notificação (abre o app)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});