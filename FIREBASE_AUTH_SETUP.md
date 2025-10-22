# Firebase Authentication 設定エラー解決ガイド

## 発生していたエラー

```
Firebase: Error (auth/configuration-not-found)
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=... 400 (Bad Request)
```

## 問題の原因

Firebase プロジェクトで **Authentication サービスが有効になっていない** ことが原因でした。

- Firebase Console でプロジェクトを作成しただけでは、Authentication は自動的に有効になりません
- 匿名ログイン機能を使用するには、事前に Authentication の設定が必要

## 即座の解決策: 認証機能の一時無効化

通知履歴機能を一時的に無効にし、メイン機能（イベント登録・管理・FCM通知）は正常に動作するようにしました。

### 変更内容

```typescript
// Before: 匿名ログインを試行
if (!user) {
  const userCredential = await signInAnonymously(auth);
  console.log("🔐 匿名ログインしました:", userCredential.user.uid);
}

// After: 認証をスキップ
console.log("🔧 認証なしモードで初期化中...");
// データマイグレーションと通常機能は継続
```

### 現在利用可能な機能

✅ **正常動作する機能**
- イベント登録・編集・削除
- FCM通知の送信・受信
- リアルタイムイベント一覧表示
- Firestore データ操作

⏸️ **一時的に無効化された機能**
- 通知履歴表示（NotificationHistory）
- ユーザー固有のデータ管理

## Firebase Authentication の完全設定手順

将来的に通知履歴機能を有効にするための設定方法：

### 1. Firebase Console での設定

1. **Firebase Console にアクセス**
   ```
   https://console.firebase.google.com/
   ```

2. **プロジェクトを選択**
   - 現在のプロジェクト: `fcm-demo-fb`

3. **Authentication を有効化**
   ```
   左サイドバー → Authentication → 「使ってみる」をクリック
   ```

4. **匿名ログインを有効化**
   ```
   Authentication → Sign-in method タブ
   → 「匿名」を選択 → 「有効にする」トグルをON
   → 保存
   ```

### 2. コードでの再有効化

Authentication 設定完了後、以下のコードを有効化：

```typescript
// App.tsx で以下のコメントアウトを解除

// インポート部分
import { signInAnonymously } from "firebase/auth";
import NotificationHistory from "./NotificationHistory";

// 初期化部分
useEffect(() => {
  const initializeApp = async () => {
    try {
      // 匿名ログイン（通知履歴機能のため）
      if (!user) {
        const userCredential = await signInAnonymously(auth);
        console.log("🔐 匿名ログインしました:", userCredential.user.uid);
      }

      await migrateEventData();
      monitorTokenChanges();
    } catch (error) {
      console.error("アプリ初期化エラー:", error);
    }
  };

  if (user !== undefined) {
    initializeApp();
  }
}, [user]);

// 表示部分
{user ? (
  <NotificationHistory userId={user.uid} />
) : (
  <Card className="mt-4">
    <Card.Body className="text-center py-4">
      <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
      <span className="text-muted">初期化中...</span>
    </Card.Body>
  </Card>
)}
```

### 3. Firestore セキュリティルール

Authentication 有効化後、適切なセキュリティルールを設定：

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 認証済みユーザーのみアクセス可能
    match /events/{document} {
      allow read, write: if request.auth != null;
    }

    // ユーザー固有のnotificationsコレクション
    match /users/{userId}/notifications/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 段階的な機能有効化

### Phase 1: 現在（認証なし）
- ✅ イベント管理機能
- ✅ FCM通知機能
- ⏸️ 通知履歴機能

### Phase 2: Authentication設定後
- ✅ すべての機能が利用可能
- ✅ ユーザー固有の通知履歴
- ✅ セキュアなデータ管理

## トラブルシューティング

### よくあるエラーと対処法

1. **`auth/configuration-not-found`**
   - Firebase Console で Authentication を有効化
   - 数分待ってから再試行

2. **`auth/unauthorized-domain`**
   - Firebase Console → Authentication → Settings → 承認済みドメイン
   - `localhost` と本番ドメインを追加

3. **`auth/api-key-not-valid`**
   - `.env` ファイルの Firebase 設定を確認
   - Firebase Console で API キーを再生成

## 現在の状態

🟢 **アプリケーションは正常動作中**
- 認証エラーは解消
- メイン機能はすべて利用可能
- Firebase Authentication 設定完了後に通知履歴機能を追加可能

Firebase Console での Authentication 設定は、プロジェクトの管理者権限がある場合にのみ実行できます。設定完了後は、より豊富な機能を持つアプリケーションとして利用できるようになります。