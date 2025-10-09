import { useState } from "react";
import { requestNotificationPermission } from "./firebase";

function App() {
  const [time, setTime] = useState("");
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [token, setToken] = useState("");

  const handleRegister = async () => {
    const fcmToken = await requestNotificationPermission();
    setToken(fcmToken || "");
    alert("イベント登録しました！（デモ）");
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
