import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { getFirestore, query, where, getDocs, updateDoc, doc, collection, } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ← これを追加

// Firebase設定
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
// Firebaseサービス取得
export const messaging = getMessaging(app);
// Firestore取得
export const db = getFirestore(app);
// Firebase Authentication取得
export const auth = getAuth(app); // ← これを追加！

// 通知許可とトークン取得
export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    console.log("🔑 通知トークン:", token);
    return token;
  } else {
    alert("通知が許可されませんでした");
  }
}

// ✅ トークンの自動更新監視（Firebase v9以降の方法）
export async function monitorTokenChanges() {
  try {
    // 現在のトークンを取得
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (!currentToken) {
      console.warn("⚠️ トークンがまだ取得されていません");
      return;
    }

    console.log("🔄 現在のトークン:", currentToken);

    // Firestore内の既存トークンを取得
    const q = query(collection(db, "events"), where("token", "!=", currentToken));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.token && data.token !== currentToken) {
        await updateDoc(doc(db, "events", docSnap.id), { token: currentToken });
        console.log(`✅ Firestoreのトークンを更新しました: ${docSnap.id}`);
      }
    }
  } catch (err) {
    console.error("❌ トークン監視エラー:", err);
  }
}
