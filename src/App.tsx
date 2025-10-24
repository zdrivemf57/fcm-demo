import { useEffect, useState } from "react";
import {
  requestNotificationPermission,
  monitorTokenChanges,
  auth,
  messaging,
} from "./firebase";
import { onMessage } from "firebase/messaging";
import { signInAnonymously } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import EventList from "./EventList";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import { Bell } from "react-bootstrap-icons";
import type { EventData, EventInput } from "./types/types";
import { eventOperations, migrateEventData } from "./utils/firestore";
import NotificationHistory from "./NotificationHistory";

function App() {
  const [time, setTime] = useState("");
  const [url, setUrl] = useState("https://...");
  const [title, setTitle] = useState("⏰ イベント開始！");
  const [body, setBody] = useState("クリックしてコンテンツを開きます");
  const [token, setToken] = useState("");
  const [events, setEvents] = useState<EventData[]>([]);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  // 🔹 Firebase認証ユーザー取得
  const [user] = useAuthState(auth);

  // � 初回レンダリング時に匿名ログインを試行
  useEffect(() => {
    const signIn = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
          console.log("✅ 匿名ログイン成功");
        }
      } catch (error) {
        console.error("匿名ログイン失敗:", error);
      }
    };
    signIn();
  }, []);

  // 🔹 Firestoreリアルタイム監視とメッセージ受信
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🔧 認証状態確認済み - 初期化中...");

        // 認証済みユーザーのみデータマイグレーションを実行
        if (user) {
          console.log("👤 認証済みユーザーでデータマイグレーション実行");
          await migrateEventData();
        } else {
          console.log("⏳ 認証待機中 - データマイグレーションをスキップ");
        }

        // 通常の初期化処理
        monitorTokenChanges();

        console.log("✅ 初期化完了");
      } catch (error) {
        console.error("アプリ初期化エラー:", error);
      }
    };

    // 認証状態が確定してから初期化実行
    if (user !== undefined) {
      initializeApp();
    }

    // 型安全なリアルタイム監視を使用（認証済みの場合のみ）
    let unsubscribe: (() => void) | undefined;
    if (user) {
      console.log("📡 認証済みユーザーでイベント監視開始");
      unsubscribe = eventOperations.onSnapshot((events) => {
        console.log("📊 イベント監視 - 受信データ件数:", events.length);
        setEvents(events);
      });
    } else {
      console.log("⏳ 未認証のためイベント監視をスキップ");
      setEvents([]); // 未認証時は空配列
    }

    // フォアグラウンドでのメッセージ受信処理
    const unsubscribeMessage = onMessage(messaging, (payload) => {
      console.log("📩 フォアグラウンド通知を受信:", payload);

      try {
        const { title, body } = payload.notification || {};
        const url = payload?.fcmOptions?.link || payload?.data?.url;

        if (title && body) {
          // ブラウザ通知を表示
          if (Notification.permission === "granted") {
            const notification = new Notification(title, {
              body,
              icon: "/pwa-192x192.png",
              data: { url },
            });

            // 通知クリック時の処理
            notification.onclick = () => {
              if (url) {
                window.open(url, "_blank");
              }
              notification.close();
            };
          }
        }
      } catch (error) {
        console.error("フォアグラウンド通知処理エラー:", error);
      }
    });

    return () => {
      if (unsubscribe) {
        console.log("🔌 イベント監視を停止");
        unsubscribe();
      }
      unsubscribeMessage();
    };
  }, [user]); // ユーザー状態変化を監視

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

    try {
      const eventInput: EventInput = {
        time: utcTime,
        title: title.trim(),
        body: body.trim(),
        url: url.trim(),
      };

      // 型安全なイベント作成（FCMトークンも保存）
      const eventId = await eventOperations.create(eventInput, user?.uid, fcmToken);

      alert(`イベント登録しました！\nID: ${eventId}\n保存時刻: ${utcTime}`);
      setToken(fcmToken);
    } catch (error) {
      console.error("イベント登録エラー:", error);
      alert("イベントの登録に失敗しました");
    }
  };

  // 🔹 編集開始
  const handleEdit = (event: EventData): void => {
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
  const handleSaveEdit = async (updated: EventData): Promise<void> => {
    try {
      const eventInput: Partial<EventInput> = {
        time: new Date(updated.time).toISOString(),
        title: updated.title,
        body: updated.body,
        url: updated.url,
        sent: false
      };

      console.log('📝 App.tsx - 送信するイベントデータ:', eventInput);
      await eventOperations.update(updated.id, eventInput);
      alert("更新しました。");
      setEditingEvent(null);
    } catch (error) {
      console.error("更新エラー:", error);
      alert("更新に失敗しました");
    }
  };

  // 🔹 削除
  const handleDelete = async (id: string): Promise<void> => {
    const target = events.find((ev) => ev.id === id);
    if (!window.confirm(`「${target?.title || "イベント"}」を削除しますか？`))
      return;

    try {
      await eventOperations.delete(id);
      alert("削除しました。");
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました");
    }
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

      {/* 通知履歴機能は Firebase Authentication 設定後に有効化 */}
      {user ? (
        <div>
          <Card className="mt-4 mb-3">
            <Card.Body>
              <Card.Title className="h6 mb-2">🔐 ユーザー情報</Card.Title>
              <div className="small text-muted">
              <div><strong>User ID:</strong> {user.uid}</div>
              <div><strong>匿名ユーザー:</strong> {user.isAnonymous ? "はい" : "いいえ"}</div>
              <div><strong>メール:</strong> {user.email || "未設定"}</div>
            </div>
            </Card.Body>
          </Card>
          <NotificationHistory userId={user.uid} />
        </div>
      ) : (
        <Card className="mt-4">
          <Card.Body className="text-center py-4">
            <div
              className="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></div>
            <span className="text-muted">🔐 ログイン中です...</span>
          </Card.Body>
        </Card>
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
