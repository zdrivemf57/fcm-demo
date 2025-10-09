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
  self.registration.showNotification(title, {
    body,
    icon: "/pwa-192x192.png", // 任意のアイコン
  });
});
