// src/components/NotificationHistory.jsx
import { useEffect, useState } from "react";
import type { NotificationData, NotificationHistoryProps } from "./types/types";
import { notificationOperations } from "./utils/firestore";

export default function NotificationHistory({ userId }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    if (!userId) return;

    // 型安全な通知監視を使用
    const unsubscribe = notificationOperations.onSnapshot(userId, (notifications) => {
      setNotifications(notifications);
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
                  {n.sentAt
                    ? new Date(n.sentAt).toLocaleString()
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
