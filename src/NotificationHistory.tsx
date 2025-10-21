// src/components/NotificationHistory.jsx
import { useEffect, useState } from "react";
import {
  DocumentData,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

// 通知データ型
type Notification = {
  id: string;
  title: string;
  body: string;
  sentAt?: { toDate: () => Date };
};

// propsの型を明示
interface Props {
  userId: string;
}

export default function NotificationHistory({ userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Firestoreの /users/{userId}/notifications をリアルタイム監視
    const q = query(
      collection(db, "users", userId, "notifications"),
      orderBy("sentAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          title: data.title ?? "",
          body: data.body ?? "",
          sentAt: data.sentAt,
        };
      });
      setNotifications(list);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div className="container mt-4">
      <h5>通知履歴</h5>
      {notifications.length === 0 ? (
        <p>通知履歴はまだありません。</p>
      ) : (
        <ul className="list-group">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="list-group-item d-flex justify-content-between align-items-start"
            >
              <div>
                <div className="fw-bold">{n.title}</div>
                <div>{n.body}</div>
                <small className="text-muted">
                  {n.sentAt?.toDate
                    ? n.sentAt.toDate().toLocaleString()
                    : "未送信"}
                </small>
              </div>
              {!n.read && (
                <span className="badge bg-primary rounded-pill">New</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
