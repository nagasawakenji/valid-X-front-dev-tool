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