# E2Eテスト実行方法

## 前提

- Playwrightのブラウザがインストールされていること
  - `npx playwright install`

## 実行

1. 別ターミナルでローカルサーバを起動する
   - 例: `npx http-server -p 8080` など
2. `npm run test:e2e` を実行する

サーバが起動していない場合は `http://localhost:8080` に接続できずテストが失敗します。

baseURL は `playwright.config.cjs` の `http://localhost:8080` を利用します。
