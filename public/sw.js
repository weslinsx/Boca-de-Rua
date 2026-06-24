// public/sw.js

const CACHE_NAME = "bdr-imagens-externas-v1";

// 1. Ciclo de Vida: Instalação
self.addEventListener('install', (event) => {
  // Força o Service Worker a se tornar ativo imediatamente
  self.skipWaiting();
});

// 2. Ciclo de Vida: Ativação e Limpeza de Cache Antigo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptação de Requisições (Cache First para Imagens)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Intercepta apenas se for uma requisição GET para imagens
  const isImage = request.destination === 'image' || 
                  /\.(png|jpg|jpeg|webp|gif|svg|avif)(\?.*)?$/i.test(request.url);

  if (request.method === 'GET' && isImage) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          // Armazena no cache se a resposta for válida ou opaca (cross-origin)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => null); // Silencia erros de fetch offline
      })
    );
  }
});

// --- GERENCIAMENTO DE NOTIFICAÇÕES (PRESERVADO) ---

self.addEventListener('push', function (event) {
  let data = { title: 'Novo Pedido!', body: 'Você recebeu um novo pedido no Boca de Rua.', icon: '/icon.png' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: '/badge.png', // Ícone pequeno que fica na barra de status
    vibrate: [200, 100, 200, 100, 200, 100, 400], // Padrão de vibração pesado
    sound: '/sons/alerta-novo-pedido.mp3', // 🎯 O caminho do seu áudio
    data: {
      url: data.url || '/parceiro'
    },
    // Propriedades cruciais para o Android dar alta prioridade:
    tag: 'novo-pedido', // Evita empilhar infinitas notificações
    renotify: true,
    requireInteraction: true // A notificação não some até o usuário clicar
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Ação ao clicar na notificação
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // Tenta pegar a URL de destino dos dados da notificação, senão usa o padrão
  let urlToOpen = '/parceiro';
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }

  event.waitUntil(clients.openWindow(urlToOpen));
});