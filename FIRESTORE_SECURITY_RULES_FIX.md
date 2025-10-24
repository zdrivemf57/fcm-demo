# Firestore Security Rules 設定ガイド

## 発生している問題

```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

## 原因

Firestoreのセキュリティルールが匿名ユーザーのアクセスを許可していないため、以下の操作が失敗しています：

1. **eventsコレクション**の読み書き
2. **users/{userId}/notifications**コレクションの読み書き
3. **データマイグレーション**の実行

## 解決方法

### Firebase Console での設定

1. **Firebase Console にアクセス**
   ```
   https://console.firebase.google.com/project/fcm-demo-fb
   ```

2. **Firestore Database を選択**
   - 左サイドバー → "Firestore Database"

3. **ルール タブを選択**
   - "データ" タブの隣にある "ルール" タブをクリック

4. **セキュリティルールを更新**

### 推奨セキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // eventsコレクション: 認証済みユーザー（匿名含む）のみアクセス可能
    match /events/{document} {
      allow read, write: if request.auth != null;
    }
    
    // ユーザー固有の通知コレクション: 本人のみアクセス可能
    match /users/{userId} {
      match /notifications/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // 将来の拡張用: プロファイル、トークンなど
      match /profile/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /tokens/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### セキュリティレベル別の設定

#### 🟢 **開発・テスト用（緩い設定）**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 全認証済みユーザーが全コレクションにアクセス可能
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### 🟡 **本番用（推奨設定）**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // eventsコレクション: 読み取りは全員、書き込みは認証済みのみ
    match /events/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // ユーザーデータ: 本人のみアクセス可能
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### 🔴 **厳格な本番用**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // eventsコレクション: 細かい権限制御
    match /events/{document} {
      allow read: if true;
      allow create: if request.auth != null 
                    && request.auth.uid == resource.data.userId;
      allow update: if request.auth != null 
                    && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null 
                    && request.auth.uid == resource.data.userId;
    }
    
    // ユーザーデータ: 本人のみ、フィールド検証付き
    match /users/{userId}/notifications/{notificationId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId
                         && isValidNotification();
    }
    
    // バリデーション関数
    function isValidNotification() {
      return request.resource.data.keys().hasAll(['title', 'body', 'createdAt'])
             && request.resource.data.title is string
             && request.resource.data.body is string;
    }
  }
}
```

## 設定手順

### 1. **開発・デバッグ用設定（まず最初に試す）**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**この設定により以下が可能になります：**
- ✅ 匿名ログインユーザーのFirestoreアクセス
- ✅ eventsコレクションの読み書き
- ✅ users/{userId}/notificationsコレクションの読み書き
- ✅ データマイグレーションの実行

### 2. **ルールの公開**

セキュリティルールを編集後：
1. **「公開」ボタンをクリック**
2. 確認ダイアログで **「公開」を選択**
3. **数秒待って反映されるのを確認**

### 3. **動作確認**

ブラウザでアプリをリロードし、以下を確認：
- ✅ コンソールエラーが消える
- ✅ 「登録されたイベントはありません」→ 実際のイベント一覧表示
- ✅ 通知履歴が表示される

## トラブルシューティング

### よくあるエラー

1. **`auth/configuration-not-found`**
   - Firebase Authentication が有効になっていない
   - Authentication → 匿名ログインを有効化

2. **`permission-denied`**
   - セキュリティルールが厳しすぎる
   - 上記の開発用設定を使用

3. **ルール変更が反映されない**
   - 「公開」ボタンを押し忘れ
   - ブラウザキャッシュをクリア

### デバッグ用

Firebase Console の **「ルールプレイグラウンド」** で動作テスト可能：
1. Firestore → ルール → "ルールプレイグラウンド"
2. 操作タイプ: `get`, `list`, `create`, `update`, `delete`
3. ドキュメントパス: `events/test-document`
4. 認証状態: `匿名ユーザー`

## 現在の状況

現在、以下のエラーが発生しています：
- `permission-denied` でFirestoreアクセスが拒否
- イベント一覧が表示されない
- 通知履歴が表示されない

**まず上記の開発用セキュリティルールを設定して、基本機能を動作させてください。**

その後、セキュリティ要件に応じてより厳格なルールに変更することをお勧めします。