import { useEffect, useState } from "react";
import {
  db,
  requestNotificationPermission,
  monitorTokenChanges,
  auth,
} from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import EventList from "./EventList";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { Bell } from "react-bootstrap-icons";
import NotificationHistory from "./NotificationHistory";

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
  const [time, setTime] = useState<string>("");
  const [url, setUrl] = useState<string>("https://...");
  const [title, setTitle] = useState<string>("⏰ イベント開始！");
  const [body, setBody] = useState<string>("クリックしてコンテンツを開きます");
  const [token, setToken] = useState<string>("");
  const [events, setEvents] = useState<EventData[]>([]);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  // 🔹 Firebase認証ユーザー取得
  const [user] = useAuthState(auth);

  // 🔹 Firestoreリアルタイム監視
  useEffect(() => {
    monitorTokenChanges();
    const q = query(collection(db, "events"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
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

  // ✅ ページ読み込み時に「現在時刻＋1分」を自動セット
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);

    // ✅ ローカル時刻を datetime-local 用にフォーマット
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");

    const localDatetime = `${year}-${month}-${day}T${hour}:${minute}`;
    setTime(localDatetime);
  }, []);

  // 🔹 イベント登録
const handleRegister = async (): Promise<void> => {
    if (!time) {
      alert("開始時刻を指定してください。");
      return;
    }
    const fcmToken = await requestNotificationPermission();
    if (!fcmToken) return;

    const utcTime = new Date(time).toISOString();

    // 同じトークンと時刻のイベントが存在しないかチェック
    const snapshot = await getDocs(
      query(
        collection(db, "events"),
        where("token", "==", fcmToken),
        where("time", "==", utcTime)
      )
    );

    if (!snapshot.empty) {
      alert("同じ時間のイベントがすでに登録されています。");
      return;
    }

    // Firestoreに登録
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

  // 🔹 編集開始
  const handleEdit = (event: EventData) => {
    const utcDate = new Date();
    // JST（UTC+9時間）+ 1分を加算
    const jstDate = new Date(
      utcDate.getTime() + 9 * 60 * 60 * 1000 + 60 * 1000
    );
    setEditingEvent({
      ...event,
      time: jstDate.toISOString().slice(0, 16),
    });
  };

  // 🔹 編集保存
  const handleSaveEdit = async (updated: EventData) => {
    const isoUtc = new Date(updated.time).toISOString();
    await updateDoc(doc(db, "events", updated.id), {
      time: isoUtc,
      title: updated.title,
      body: updated.body,
      url: updated.url,
      sent: false,
    });
    alert("更新しました。");
    setEditingEvent(null);
  };

  // 🔹 削除
  const handleDelete = async (id: string) => {
    const target = events.find((ev) => ev.id === id);
    if (!window.confirm(`「${target?.title || "イベント"}」を削除しますか？`))
      return;
    await deleteDoc(doc(db, "events", id));
    alert("削除しました。");
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="d-flex align-items-center mb-3">
            <Bell className="me-2 text-primary" size={22} />
            イベント登録デモ
          </Card.Title>
          <Card.Text className="text-muted mb-3">
            指定時刻に通知を送り、リンクを開きます。
          </Card.Text>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>開始時刻</Form.Label>
              <Form.Control
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>タイトル</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>本文</Form.Label>
              <Form.Control
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>URL</Form.Label>
              <Form.Control
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Form.Group>

            <Button variant="primary" onClick={handleRegister}>
              通知を許可して登録
            </Button>
          </Form>

          {token && (
            <p className="mt-3 small text-muted">
              🔑 FCMトークン: {token.slice(0, 50)}...
            </p>
          )}
        </Card.Body>
      </Card>

      <EventList events={events} onEdit={handleEdit} onDelete={handleDelete} />

      {user ? (
        <NotificationHistory userId={user.uid} />
      ) : (
        <p>ログインしてください。</p>
      )}

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
    </Container>
  );
}

export default App;
