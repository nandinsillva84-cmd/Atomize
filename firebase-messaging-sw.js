// firebase-messaging-sw.js – YOU (com cache offline + notificações push)

// Versão do cache – altere sempre que atualizar os arquivos
const CACHE_NAME = 'you-cache-v1';
const ASSETS_TO_CACHE = [
  '/',                        // página inicial
  '/index.html',
  '/main.css',
  '/db.js',
  '/app.js',
  '/sanitizador.js',
  '/ui-toast.js',
  '/ui-modal.js',
  '/login.js',
  '/chat.js',
  '/agora.js',
  '/exposicao.js',
  '/perfil-outro.js',
  '/perfil-meu.js',
  '/interacoes.js',
  '/amigos.js',
  '/contatos.js',
  '/busca.js',
  '/solicitacoes.js',
  '/publicar.js',
  '/upload-midia.js',
  '/notificacoes.js',
  '/manifest.json',
  '/imageminicio.png'
  // adicione outros arquivos que queira disponíveis offline
];

// Instalação: pré‑cacheia os arquivos essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// Estratégia de cache: Cache First, com fallback para rede
self.addEventListener('fetch', event => {
  // Ignora requisições para o Firestore / Firebase (não podem ser cacheadas)
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => cachedResponse || fetch(event.request))
  );
});

// ── Firebase Messaging (mantido igual) ──
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAApYxcRCdKCa5X4B5Mqe_tCVafjTbU6bM",
  authDomain: "chatbox-f7578.firebaseapp.com",
  projectId: "chatbox-f7578",
  storageBucket: "chatbox-f7578.appspot.com",
  messagingSenderId: "136199002752",
  appId: "1:136199002752:web:e36cbea04d75877eb0e465"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const titulo = payload.notification?.title || 'YOU – Nova mensagem';
  const opcoes = {
    body: payload.notification?.body || '',
    icon: '/imageminicio.png',
    badge: '/imageminicio.png',
    data: payload.data || {}
  };
  self.registration.showNotification(titulo, opcoes);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
