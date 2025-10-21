// 共通の型定義

export interface EventData {
  id: string;
  time: string;
  title: string;
  body: string;
  url: string;
  sent: boolean;
  error?: string;
}

// Firebase設定の型定義
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}

// 通知許可の結果型
export type NotificationPermissionResult = "granted" | "denied" | "default";

// FCMトークンの型
export type FCMToken = string;

// イベントのプロパティ型定義
export interface EventListProps {
  events: EventData[];
  onEdit: (event: EventData) => void;
  onDelete: (id: string) => void;
}