// public/sw.js

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