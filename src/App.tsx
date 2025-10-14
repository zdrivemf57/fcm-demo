import { useState } from "react";
import { db, requestNotificationPermission } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

function App() {
  const [time, setTime] = useState("");
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [token, setToken] = useState("");

  const handleRegister = async () => {
  const fcmToken = await requestNotificationPermission();
  if (!fcmToken) return;

  // datetime-local の値を JSTのままISO文字列にする
  const localTime = new Date(time);
  // 9時間を足す
  const jstTime = new Date(localTime.getTime() + 9 * 60 * 60 * 1000);
  const isoJst = jstTime.toISOString(); // ← JST相当のUTC文字列

  await addDoc(collection(db, "events"), {
    token: fcmToken,
    time: isoJst,
    url,
    sent: false,
  });

  alert(`イベント登録しました！\n保存時刻: ${isoJst}`);
  setToken(fcmToken);
};

  return (
    <div style={{ padding: 20 }}>
      <h2>イベント登録デモ</h2>
      <p>指定時刻に通知を送って、リンクを開きます。</p>

      <div>
        <label>開始時刻（ISO形式）</label>
        <input
          type="datetime-local"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div>
        <label>開くURL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: "80%" }}
        />
      </div>

      <button onClick={handleRegister}>通知を許可して登録</button>

      {token && (
        <p style={{ marginTop: 20, wordBreak: "break-all" }}>
          🔑 FCMトークン: {token}
        </p>
      )}
    </div>
  );
}

export default App;
