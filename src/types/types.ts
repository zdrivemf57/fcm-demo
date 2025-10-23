// 共通の型定義
import type { Timestamp } from "firebase/firestore";

// ==========================================
// Firestore Collection Types
// ==========================================

// Firestoreに保存される生のイベントデータ
export interface EventDataFirestore {
  time: string; // ✅ Timestamp → string に変更
  title: string;
  body: string;
  url: string;
  sent: boolean;
  error?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId?: string;  // ユーザーIDを追加
}

// アプリケーションで使用するイベントデータ（Timestamp → string変換済み）
export interface EventData {
  id: string;
  time: string;  // ISO string format
  title: string;
  body: string;
  url: string;
  sent: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

// Firestoreに保存される通知データ
export interface NotificationFirestore {
  title: string;
  body: string;
  scheduledAt?: Timestamp;
  sentAt?: Timestamp;
  status: "scheduled" | "sent" | "failed";
  read: boolean;
  token?: string;
  createdAt: Timestamp;
}

// アプリケーション用の通知データ
export interface NotificationData {
  id: string;
  title: string;
  body: string;
  scheduledAt?: string;
  sentAt?: string;
  status: "scheduled" | "sent" | "failed";
  read: boolean;
  token?: string;
  createdAt: string;
}

// ==========================================
// Database Schema Types
// ==========================================

// データベース全体の構造
export interface FirestoreDatabase {
  events: EventDataFirestore;
  users: {
    [userId: string]: {
      notifications: NotificationFirestore;
      profile: UserProfile;
      tokens: FCMTokenData;
    };
  };
}

// ユーザープロファイル
export interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

// FCMトークンデータ
export interface FCMTokenData {
  token: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

// ==========================================
// Input/Form Types
// ==========================================

// イベント作成/編集用の入力データ
export interface EventInput {
  time: string;  // HTML datetime-local input value
  title: string;
  body: string;
  url: string;
}

// 通知作成用の入力データ
export interface NotificationInput {
  title: string;
  body: string;
  scheduledAt?: string;
}

// ==========================================
// Firebase Configuration
// ==========================================

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}

// ==========================================
// Utility Types
// ==========================================

// 通知許可の結果型
export type NotificationPermissionResult = "granted" | "denied" | "default";

// FCMトークンの型
export type FCMToken = string;

// ==========================================
// Component Props
// ==========================================

export interface EventListProps {
  events: EventData[];
  onEdit: (event: EventData) => void;
  onDelete: (id: string) => void;
}

export interface NotificationHistoryProps {
  userId: string;
}

// ==========================================
// Conversion Helper Types
// ==========================================

// Timestamp変換用のヘルパー型
export type WithTimestamps<T> = {
  [K in keyof T]: T[K] extends Timestamp ? string : T[K];
};

// Firestore文書からアプリケーション型への変換
export type FromFirestore<T> = WithTimestamps<T> & { id: string };

// アプリケーション型からFirestore文書への変換（IDを除外）
export type ToFirestore<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};