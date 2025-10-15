import { useEffect, useState } from "react";
import { db, requestNotificationPermission } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

// Firestoreのイベント型を定義
type EventData = {
  id: string;
  time: string;
  title: string;
  body: string;
  url: string;
  sent: boolean;
  error?: string;
};

function App() {
  const [time, setTime] = useState("");
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [title, setTitle] = useState("⏰ イベント開始！");
  const [body, setBody] = useState("クリックしてコンテンツを開きます");
  const [token, setToken] = useState("");

  // ✅ Firestore一覧用ステート
  const [events, setEvents] = useState<EventData[]>([]); // ← 型を指定！ ← Firestore一覧用

  // 編集用ステート
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const handleRegister = async () => {
    if (!time) {
      alert("開始時刻を指定してください。");
      return;
    }

    const fcmToken = await requestNotificationPermission();
    if (!fcmToken) return;

    // datetime-local の値を JSTのままISO文字列にする
    const localTime = new Date(time);

    if (isNaN(localTime.getTime())) {
      alert("無効な日付形式です。");
      return;
    }

    // JSTに変換（9時間足す）
    const jstTime = new Date(localTime.getTime() + 9 * 60 * 60 * 1000);
    const isoJst = jstTime.toISOString(); // ← JST相当のUTC文字列

    await addDoc(collection(db, "events"), {
      token: fcmToken,
      time: isoJst,
      url,
      title,
      body,
      sent: false,
    });

    alert(`イベント登録しました！\n保存時刻: ${isoJst}`);
    setToken(fcmToken);
  };

  // ✅ Firestoreのリアルタイム監視
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // const data = snapshot.docs.map((doc) => ({
      //   id: doc.id,
      //   ...(doc.data() as Omit<EventData, "id">),
      // })) as EventData[]; // ← ここでキャスト！
      const data = snapshot.docs.map((doc) => {
        const d = doc.data() as Partial<EventData>;
        return {
          id: doc.id,
          time: d.time ?? "",
          title: d.title ?? "",
          body: d.body ?? "",
          url: d.url ?? "",
          sent: d.sent ?? false,
          error: d.error ?? "",
        };
      });
      setEvents(data);
    });
    return () => unsubscribe();
  }, []);

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

      <div>
        <label>通知タイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "80%" }}
        />
      </div>

      <div>
        <label>通知本文</label>
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: "80%" }}
        />
      </div>

      <button onClick={handleRegister}>通知を許可して登録</button>

      {token && (
        <p style={{ marginTop: 20, wordBreak: "break-all" }}>
          🔑 FCMトークン: {token}
        </p>
      )}

      {/* ✅ Firestore一覧 */}
      <h3 style={{ marginTop: 40 }}>登録済みイベント一覧</h3>
      <table border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>時刻</th>
            <th>タイトル</th>
            <th>本文</th>
            <th>URL</th>
            <th>送信済み</th>
            <th>エラー</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td>{ev.time}</td>
              <td>{ev.title}</td>
              <td>{ev.body}</td>
              <td>
                <a href={ev.url} target="_blank" rel="noopener noreferrer">
                  開く
                </a>
              </td>
              <td>{ev.sent ? "✅" : "⏳"}</td>
              <td>{ev.error || ""}</td>
              <td>
                <button
                  onClick={() => {
                    setEditingId(ev.id);
                    setEditTime(ev.time.slice(0, 16)); // datetime-local 用に整形
                    setEditUrl(ev.url);
                  }}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    marginRight: "4px",
                  }}
                >
                  編集
                </button>
                <button
                  onClick={async () => {
                    const ok = window.confirm(
                      `「${ev.title}」を削除しますか？`
                    );
                    if (!ok) return;
                    try {
                      await deleteDoc(doc(db, "events", ev.id));
                      alert("削除しました。");
                    } catch (err) {
                      console.error("削除エラー:", err);
                      alert("削除に失敗しました。");
                    }
                  }}
                  style={{
                    background: "#ff5555",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                  }}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editingId && (
        <div
          style={{
            marginTop: "20px",
            border: "1px solid #ccc",
            padding: "12px",
            borderRadius: "8px",
          }}
        >
          <h3>イベントを編集</h3>

          <div style={{ marginBottom: "8px" }}>
            <label>開始時刻</label>
            <input
              type="datetime-local"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label>URL</label>
            <input
              type="text"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              style={{ width: "80%" }}
            />
          </div>

          <button
            onClick={async () => {
              if (!editTime) {
                alert("開始時刻を指定してください。");
                return;
              }
              const newTime = new Date(editTime);
              const jst = new Date(newTime.getTime() + 9 * 60 * 60 * 1000);
              const isoJst = jst.toISOString();

              try {
                await updateDoc(doc(db, "events", editingId), {
                  time: isoJst,
                  url: editUrl,
                  sent: false, // 再送対象に戻す
                });
                alert("更新しました。");
                setEditingId(null);
                setEditTime("");
                setEditUrl("");
              } catch (err) {
                console.error("更新エラー:", err);
                alert("更新に失敗しました。");
              }
            }}
            style={{
              background: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
              marginRight: "8px",
            }}
          >
            保存
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setEditTime("");
              setEditUrl("");
            }}
            style={{
              background: "#ccc",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
            }}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
