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
import EventList from "./EventList";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

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
    const now = new Date(); // UTC基準のタイムスタンプ

  console.log(
    "🔍 Checking events - JST:",
    now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    "→ UTC:",
    now.toISOString()
  );


  const [time, setTime] = useState("");
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [title, setTitle] = useState("⏰ イベント開始！");
  const [body, setBody] = useState("クリックしてコンテンツを開きます");
  const [token, setToken] = useState("");

  // ✅ Firestore一覧用ステート
  const [events, setEvents] = useState<EventData[]>([]); // ← 型を指定！ ← Firestore一覧用

  // 編集用ステート
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // 🔹 イベント登録
  const handleRegister = async () => {
    if (!time) {
      alert("開始時刻を指定してください。");
      return;
    }

    const fcmToken = await requestNotificationPermission();
    if (!fcmToken) return;

    // datetime-localの値をUTCとして保存（標準的なベストプラクティス）
    const localTime = new Date(time);

    if (isNaN(localTime.getTime())) {
      alert("無効な日付形式です。");
      return;
    }

    const utcTime = localTime.toISOString(); // UTC時刻で保存

    await addDoc(collection(db, "events"), {
      token: fcmToken,
      time: utcTime,
      url,
      title,
      body,
      sent: false,
    });

    alert(`イベント登録しました！\n保存時刻: ${utcTime}`);
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

  // 🔹 削除機能
  const handleDelete = async (id: string) => {
    const target = events.find((ev) => ev.id === id);
    const ok = window.confirm(
      `「${target?.title || "イベント"}」を削除しますか？`
    );
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "events", id));
      alert("削除しました。");
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました。");
    }
  };

  // 🔹 編集機能
  const handleEdit = (event: EventData) => {
    // UTC → JST に変換してモーダル表示
    const utcDate = new Date(event.time);
    const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);

    setEditingEvent({
      ...event,
      time: jstDate.toISOString().slice(0, 16), // datetime-local 用に調整
    });
  };

  // 🔹 編集保存処理
  const handleSaveEdit = async (updated: EventData) => {
  try {
    // datetime-local の値をそのまま UTC に変換
    const isoUtc = new Date(updated.time).toISOString();

    await updateDoc(doc(db, "events", updated.id), {
      time: isoUtc, // ← UTC (Z付き) で保存される
      title: updated.title,
      body: updated.body,
      url: updated.url,
      sent: false,
    });

    alert("更新しました。");
    setEditingEvent(null);
  } catch (err) {
    console.error("更新エラー:", err);
    alert("更新に失敗しました。");
  }
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
      <EventList events={events} onEdit={handleEdit} onDelete={handleDelete} />
      {/* 編集モーダル */}
      <Modal
        show={!!editingEvent}
        onHide={() => setEditingEvent(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>イベントを編集</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingEvent && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>開始時刻</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={editingEvent.time.slice(0, 16)}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, time: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>タイトル</Form.Label>
                <Form.Control
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, title: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>本文</Form.Label>
                <Form.Control
                  type="text"
                  value={editingEvent.body}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, body: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>URL</Form.Label>
                <Form.Control
                  type="text"
                  value={editingEvent.url}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, url: e.target.value })
                  }
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingEvent(null)}>
            キャンセル
          </Button>
          <Button
            variant="success"
            onClick={() => handleSaveEdit(editingEvent!)}
          >
            保存
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
