importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAjup5uMWOZc-8vNQDMUD5LTtb4k5URmiU",
  authDomain: "fcm-demo-fb.firebaseapp.com",
  projectId: "fcm-demo-fb",
  messagingSenderId: "40283909889",
  appId: "1:40283909889:web:a86b5ceafd69365b147500",
});

const messaging = firebase.messaging();

// 通知を受け取る（バックグラウンド時）
messaging.onBackgroundMessage((payload) => {
  console.log("📩 バックグラウンド通知を受信:", payload);
  const { title, body } = payload.notification;
  const url = payload?.fcmOptions?.link || payload?.data?.url;

  self.registration.showNotification(title, {
    body,
    icon: "/pwa-192x192.png",
    data: { url }, // ← 通知クリック時に参照できる
  });
});

// ✅ 通知クリック時の処理を追加
self.addEventListener("notificationclick", (event) => {
  console.log("🖱 通知がクリックされました:", event.notification.data);
  event.notification.close();

  const urlToOpen = event.notification.data?.url;

  if (urlToOpen) {
    // すでに開いているタブがあればフォーカス、なければ新規タブを開く
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
