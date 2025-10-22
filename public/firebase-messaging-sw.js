importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

try {
  firebase.initializeApp({
    apiKey: "AIzaSyAjup5uMWOZc-8vNQDMUD5LTtb4k5URmiU",
    authDomain: "fcm-demo-fb.firebaseapp.com",
    projectId: "fcm-demo-fb",
    messagingSenderId: "40283909889",
    appId: "1:40283909889:web:a86b5ceafd69365b147500",
  });

  const messaging = firebase.messaging();

  // エラーハンドリングを追加
  self.addEventListener('error', (event) => {
    console.error('Service Worker Error:', event.error);
  });

  self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker Unhandled Promise Rejection:', event.reason);
    event.preventDefault(); // エラーログを抑制
  });

  // 通知を受け取る（バックグラウンド時）
  messaging.onBackgroundMessage((payload) => {
    console.log("📩 バックグラウンド通知を受信:", payload);
    
    try {
      const { title, body } = payload.notification || {};
      const url = payload?.fcmOptions?.link || payload?.data?.url || "/";

      if (title && body) {
        return self.registration.showNotification(title, {
          body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          data: { url },
          requireInteraction: false, // 自動的に閉じることを許可
          silent: false
        });
      }
    } catch (error) {
      console.error("バックグラウンド通知表示エラー:", error);
    }
  });

} catch (error) {
  console.error('Firebase Service Worker 初期化エラー:', error);
}

// ✅ 通知クリック時の処理を追加（改善版）
self.addEventListener("notificationclick", (event) => {
  console.log("🖱 通知がクリックされました:", event.notification.data);
  event.notification.close();

  const urlToOpen = event.notification.data?.url;

  if (urlToOpen) {
    // より安全な非同期処理
    event.waitUntil(
      (async () => {
        try {
          const clientList = await clients.matchAll({ 
            type: "window", 
            includeUncontrolled: true 
          });
          
          // 既存のタブを探してフォーカス
          for (const client of clientList) {
            if (client.url === urlToOpen && "focus" in client) {
              return await client.focus();
            }
          }
          
          // 新しいタブを開く
          if (clients.openWindow) {
            return await clients.openWindow(urlToOpen);
          }
        } catch (error) {
          console.error("通知クリック処理エラー:", error);
          // フォールバック：常に新しいタブを開く
          if (clients.openWindow) {
            return await clients.openWindow(urlToOpen);
          }
        }
      })()
    );
  }
});
