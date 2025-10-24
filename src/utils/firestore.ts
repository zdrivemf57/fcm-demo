// Firestore操作の型安全なヘルパー関数

import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import type {
  EventData,
  EventDataFirestore,
  EventInput,
  NotificationData,
  NotificationFirestore,
  NotificationInput,
  ToFirestore
} from "../types/types";

// ==========================================
// Timestamp Conversion Helpers
// ==========================================

// Timestampを文字列に変換（安全版）
export const timestampToString = (timestamp: any): string => {
  if (!timestamp) return "";

  // Firestoreの Timestamp オブジェクトかチェック
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }

  // 既に文字列の場合
  if (typeof timestamp === 'string') {
    return timestamp;
  }

  // Date オブジェクトの場合
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // seconds プロパティを持つオブジェクト（Firestore の Timestamp 形式）
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000).toISOString();
  }

  console.warn('未知のタイムスタンプ形式:', timestamp);
  return "";
};

// 文字列をTimestampに変換
export const stringToTimestamp = (dateString: string): Timestamp => {
  return Timestamp.fromDate(new Date(dateString));
};

// 日時文字列を標準ISO形式にフォーマット
export const formatToISOString = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString(); // 2025-10-23T02:54:00.006Z形式
};

// 文字列をフォーマット後にTimestampに変換
export const stringToFormattedTimestamp = (dateString: string): Timestamp => {
  const formattedString = formatToISOString(dateString);
  return Timestamp.fromDate(new Date(formattedString));
};

// ==========================================
// Document Conversion Helpers
// ==========================================

// FirestoreドキュメントをEventDataに変換（安全版）
export const convertEventFromFirestore = (
  doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): EventData => {
  const data = doc.data();

  if (!data) {
    console.warn('ドキュメントデータが空です:', doc.id);
    // デフォルトのEventDataを返す
    return {
      id: doc.id,
      time: "",
      title: "",
      body: "",
      url: "",
      sent: false,
      createdAt: "",
      updatedAt: "",
    };
  }

  return {
    id: doc.id,
    time: data.time || "", // 既に文字列なのでそのまま使用
    title: data.title || "",
    body: data.body || "",
    url: data.url || "",
    sent: data.sent || false,
    token: data.token,
    error: data.error,
    createdAt: timestampToString(data.createdAt),
    updatedAt: timestampToString(data.updatedAt),
    userId: data.userId
  };
};

// EventInputをFirestore用データに変換（安全版）
export const convertEventToFirestore = (
  input: EventInput,
  userId?: string,
  token?: string
): ToFirestore<EventDataFirestore> => {
  const now = Timestamp.now();
  const formattedTimeString = formatToISOString(input.time);
  console.log('📅 フォーマット済み時刻:', formattedTimeString);

  return {
    time: formattedTimeString,
    title: input.title,
    body: input.body,
    url: input.url,
    sent: false,
    token: token || "", // FCMトークンを保存
    createdAt: now,
    updatedAt: now,
    userId
  };
};

// FirestoreドキュメントをNotificationDataに変換（安全版）
export const convertNotificationFromFirestore = (
  doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): NotificationData => {
  const data = doc.data();

  if (!data) {
    console.warn('通知ドキュメントデータが空です:', doc.id);
    return {
      id: doc.id,
      title: "",
      body: "",
      scheduledAt: "",
      sentAt: "",
      status: "scheduled",
      read: false,
      createdAt: ""
    };
  }

  return {
    id: doc.id,
    title: data.title || "",
    body: data.body || "",
    scheduledAt: timestampToString(data.scheduledAt),
    sentAt: timestampToString(data.sentAt),
    status: data.status || "scheduled",
    read: data.read || false,
    token: data.token,
    // createdAt がない場合は sentAt を使用、それもない場合は空文字
    createdAt: timestampToString(data.createdAt) || timestampToString(data.sentAt) || ""
  };
};

// ==========================================
// Data Migration Helpers
// ==========================================

// 既存データのマイグレーション（createdAt/updatedAtフィールドが存在しない場合）
export const migrateEventData = async (): Promise<void> => {
  try {
    const eventsRef = collection(db, "events");
    const snapshot = await getDocs(eventsRef);

    const batch = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const needsUpdate = !data.createdAt || !data.updatedAt;

      if (needsUpdate) {
        const now = Timestamp.now();
        const updateData: any = {};

        if (!data.createdAt) updateData.createdAt = now;
        if (!data.updatedAt) updateData.updatedAt = now;

        batch.push(updateDoc(doc(db, "events", docSnap.id), updateData));
      }
    }

    if (batch.length > 0) {
      await Promise.all(batch);
      console.log(`✅ ${batch.length}件のイベントデータをマイグレーションしました`);
    }
  } catch (error) {
    console.error("❌ データマイグレーションエラー:", error);
  }
};

// ==========================================
// Type-Safe Firestore Operations
// ==========================================

// イベント操作
export const eventOperations = {
  // イベント作成
  async create(eventInput: EventInput, userId?: string, token?: string): Promise<string> {
    const eventData = convertEventToFirestore(eventInput, userId, token);
    const docRef = await addDoc(collection(db, "events"), eventData);
    return docRef.id;
  },

  // イベント更新
  async update(id: string, updates: Partial<EventInput>): Promise<void> {
    console.log('🔍 受信した更新データ:', updates);

    const updateData: Partial<EventDataFirestore> = {
      updatedAt: Timestamp.now()
    };

    // 型安全なフィールドコピー
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.body !== undefined) updateData.body = updates.body;
    if (updates.url !== undefined) updateData.url = updates.url;
    if (updates.sent !== undefined) updateData.sent = updates.sent;

    // time フィールドは特別処理（フォーマット変換）
    if (updates.time) {
      updateData.time = formatToISOString(updates.time);
    }

    console.log('🔄 更新時のデータ:', updateData);
    console.log('📝 Firestoreに送信されるフィールド数:', Object.keys(updateData).length);
    await updateDoc(doc(db, "events", id), updateData);
  },

  // イベント削除
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, "events", id));
  },

  // イベント取得（単体）
  async getById(id: string): Promise<EventData | null> {
    const docSnap = await getDoc(doc(db, "events", id));
    return docSnap.exists() ? convertEventFromFirestore(docSnap) : null;
  },

  // イベント一覧取得
  async getAll(): Promise<EventData[]> {
    const q = query(collection(db, "events"), orderBy("time", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(convertEventFromFirestore);
  },

  // ユーザー別イベント取得
  async getByUser(userId: string): Promise<EventData[]> {
    const q = query(
      collection(db, "events"),
      where("userId", "==", userId),
      orderBy("time", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(convertEventFromFirestore);
  },

  // リアルタイム監視
  onSnapshot(callback: (events: EventData[]) => void): () => void {
    const q = query(collection(db, "events"), orderBy("time", "desc"));
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(convertEventFromFirestore);
      callback(events);
    });
  }
};

// 通知操作
export const notificationOperations = {
  // 通知作成
  async create(userId: string, notificationInput: NotificationInput): Promise<string> {
    const now = Timestamp.now();
    const notificationData: NotificationFirestore = {
      ...notificationInput,
      scheduledAt: notificationInput.scheduledAt
        ? stringToTimestamp(notificationInput.scheduledAt)
        : undefined,
      status: "scheduled",
      read: false,
      createdAt: now
    };

    const docRef = await addDoc(
      collection(db, "users", userId, "notifications"),
      notificationData
    );
    return docRef.id;
  },

  // 通知更新
  async update(userId: string, notificationId: string, updates: Partial<NotificationInput>): Promise<void> {
    const updateData: Partial<NotificationFirestore> = {};

    // 文字列フィールドのコピー
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.body !== undefined) updateData.body = updates.body;

    // scheduledAt フィールドの変換
    if (updates.scheduledAt) {
      updateData.scheduledAt = stringToTimestamp(updates.scheduledAt);
    }

    await updateDoc(
      doc(db, "users", userId, "notifications", notificationId),
      updateData
    );
  },

  // 既読状態更新
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await updateDoc(
      doc(db, "users", userId, "notifications", notificationId),
      { read: true }
    );
  },

  // ユーザーの通知取得
  async getByUser(userId: string): Promise<NotificationData[]> {
    const q = query(
      collection(db, "users", userId, "notifications"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(convertNotificationFromFirestore);
  },

  // 通知のリアルタイム監視
  onSnapshot(userId: string, callback: (notifications: NotificationData[]) => void): () => void {
    const q = query(
      collection(db, "users", userId, "notifications"),
      orderBy("sentAt", "desc")
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(convertNotificationFromFirestore);
      callback(notifications);
    }, (error) => {
      console.error("通知監視エラー:", error);
    });
  }
};

// ==========================================
// Generic Firestore Helpers
// ==========================================

// 型安全なコレクション参照取得
export const getTypedCollection = (path: string) => {
  return collection(db, path);
};

// 型安全なドキュメント参照取得
export const getTypedDoc = (path: string, id: string) => {
  return doc(db, path, id);
};