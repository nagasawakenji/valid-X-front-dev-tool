# valid_x frontend dev tool
このアプリケーションは、valid_x(URL:https://github.com/nagasawakenji/valid-X)の挙動をフロントエンド側から確認するための開発用ツールです。最低限の機能なので、ユーザー用のUIは全く別に開発する必要があります。


## 🧩 Architecture Overview
```
valid-x-frontend-dev-app/
├── public/                   # 静的アセット（アイコン・画像など）
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   └── app/                  # Next.js App Router 構成
│       ├── globals.css       # グローバルスタイル
│       ├── layout.js         # 全体レイアウト
│       ├── page.js           # ルート画面（エントリポイント）
│       ├── consume/          # Magic Link 消費（ログイン処理）
│       │   └── page.jsx
│       ├── follow/           # フォローAPI実行UI
│       │   └── page.jsx
│       ├── like/             # いいねAPI実行UI
│       │   └── page.jsx
│       ├── post/             # 投稿API実行UI
│       │   └── page.jsx
│       ├── refresh/          # アクセストークン更新UI
│       │   └── page.jsx
│       ├── reply/            # 返信API実行UI
│       │   └── page.jsx
│       ├── request/          # Magic Link リクエストUI
│       │   └── page.jsx
│       ├── search_user/      # ユーザー検索API実行UI
│       │   └── page.jsx
│       ├── signup/           # 新規登録UI
│       │   └── page.jsx
│       ├── timeline/         # タイムラインAPI実行UI
│       │   └── page.jsx
│       └── verify/           # メール検証API実行UI
│           └── page.jsx
├── next.config.mjs           # Next.js 設定
├── eslint.config.mjs         # Lint設定
├── postcss.config.mjs        # CSSビルド設定
├── package.json              # npm依存・スクリプト管理
├── package-lock.json
└── jsconfig.json             # パス補完設定
```


## 🪫 セットアップ方法

まずは、env.localにサーバー側のURLを設定してください。
```
NEXT_PUBLIC_API=https://localhost:8443
```

その後は、以下のコマンドで起動してください。  
(ここで、一度ブラウザでサーバーのurlにアクセスしないと、apiを実行することができないことに注意してください。)

```bash
npm run dev
```

その後はいかに記載してあるurlでアクセスすることでapiをフロント側から実行することができます。

## ⚙️ 主要ページ & 使用方法解説

### 👁️ 認証関連のapi

- http://localhost:3000/signup  
このページでは、ユーザー登録をすることができます。画面のUIに従って、入力をしてください。  
![](https://github.com/user-attachments/assets/0e4620bf-f3d4-480c-925a-26864a494035)

---
- http://localhost:3000/verify  
signupで入力をすると、サーバー側のログでトークンが表示されます。それを貼り付けて認証を行なってください。  
![Verify Tokenの欄に入手したトークンをコピペしてください](https://github.com/user-attachments/assets/16e322dc-0994-4f4a-b46b-84b08d61e495)

___
- http://localhost:3000/request  
verifyが成功すると、ユーザーとして登録が完了します。以降は、requestページで登録したメールアドレスを入力することで、ログインメールを送信することができます。
また、verify実行後はrequestを実行しなくてもメールが自動送信されます。    
(開発用に、サーバー側でトークンが出力されます。本番環境ではをログを必ず削除してください)
![](https://github.com/user-attachments/assets/cc844484-2f54-4a7d-a609-3f8439a79863)
___
- http://localhost:3000/consume  
入手したトークンを貼り付けてください。jwt認証用のアクセストークンが発行されます。
![](https://github.com/user-attachments/assets/eebf6774-26ce-4487-945a-c36eab3bff58)
___
- http://localhost:3000/refresh  
ログイン後に実行することで、アクセストークンの更新を行うことができます。
![](https://github.com/user-attachments/assets/2ccafbf9-65d0-4591-a28c-0d27fde14796)

### 🖼️ ポスト関連のapi

- http://localhost:3000/post  
ポストを投稿できます。
![](https://github.com/user-attachments/assets/9042cfee-8067-436e-a653-a14c2e672e6a)
___
- http://localhost:3000/repost  
tweetIdを指定することで、そのポストをリポストすることができます。
![](https://github.com/user-attachments/assets/d8ac95a3-801a-49cc-bed8-20e3ac108f15)
___
- http://localhost:3000/like  
repostと同様の方法で、いいねが実行できます。
![](https://github.com/user-attachments/assets/5541521f-01e3-474f-b553-206bb1550a1d)
___
- http://localhost:3000/timeline  
投稿されたポストを閲覧できます。limitで一度に取得するポストの個数を指定できます。また、Load Moreを押すと、新しいものから順に次のポストを取得できます。  
(tweetIdはこのページで取得して見てください
)
![](https://github.com/user-attachments/assets/2c92c3c8-e84e-42a1-a3e7-ed858648d3c8)
- http://localhost:3000/reply  
tweetIdで指定したポストに対して、返信をすることができます。
![](https://github.com/user-attachments/assets/ac5b9429-6d9c-461d-9a91-318d07ed41af)

### 🤝 ユーザーに関するapi
- http://localhost:3000/search_user  
display_name前方一致でユーザーを検索することができます。
![](https://github.com/user-attachments/assets/dad970e4-abf1-4304-a19c-ef9ddea6ec7d)
___
- http://localhost:3000/follow  
targetIdを指定することで、指定ユーザーをフォローすることができます。  
また、reload followers と reload following でそれぞれtargetIdで指定したユーザーのフォロワーとフォローをしているユーザーを表示することができます。
![](https://github.com/user-attachments/assets/08a7fea5-10cd-4925-9e3f-0ba0fc4d7615)