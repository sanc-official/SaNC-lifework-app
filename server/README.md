# 同期サーバー（Cloudflare Workers + D1）セットアップ

自分専用のAPIとデータベースを **無料** で持つ構成です。
GAS連携の代わりにこちらを使うと、サーバー管理（OS更新・スリープなし）が不要で、
自分のURL (`https://sanc-lifework-api.<あなた>.workers.dev`) でデータを共有できます。

## 仕組み

```
スマホ/PC のアプリ ──HTTP──> Cloudflare Worker ──> D1 (SQLite)
```

- D1 に「1日1行」で記録
- `GET` で全件取得、`POST {entries:[...]}` で日付キーにupsert
- 同じ日付は更新日時が新しい方を優先（マージはアプリ側で実施）
- 削除はソフト削除（`deleted = 1`）。行は残る
- CORS対応済みなので GitHub Pages から直接呼べる

## 必要なもの

- Cloudflare アカウント（無料）… https://dash.cloudflare.com/sign-up
- Node.js（このリポジトリが動く環境ならOK）

## セットアップ手順

すべて `server/` ディレクトリ内で実行します。

```sh
cd server
npm install
```

### 1. Cloudflare にログイン

```sh
npx wrangler login
```

ブラウザが開くので許可します。

### 2. D1 データベースを作成

```sh
npx wrangler d1 create sanc-lifework
```

出力される `database_id = "..."` をコピーし、
[`wrangler.toml`](./wrangler.toml) の `database_id` を置き換えます。

### 3. テーブルを作成

本番DBにスキーマを流し込みます。

```sh
npm run db:init
```

（ローカルで試すときは `npm run db:init:local`）

### 4. デプロイ

```sh
npm run deploy
```

成功すると次のようなURLが表示されます。

```
https://sanc-lifework-api.<あなたのサブドメイン>.workers.dev
```

これがあなた専用のAPI URLです。

### 5. アプリに登録

1. アプリ右上の ⚙️（設定）を開く
2. URL欄に上記の `workers.dev` URL を貼り付け
3. **保存して同期** を押す

「同期済み」になれば成功です。

## ローカル開発

```sh
npm run dev
```

`http://localhost:8787` でローカルのWorker + ローカルD1が起動します。
動作確認:

```sh
curl http://localhost:8787
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"entries":[{"date":"2026-06-06","oneLine":"test","updatedAt":"2026-06-06T00:00:00Z"}]}'
```

## コードを更新したとき

`src/index.js` や `schema.sql` を変えたら再デプロイ:

```sh
npm run deploy
# スキーマを変えた場合は npm run db:init も
```

URLは変わりません。

## 無料枠の目安

Cloudflare Workers 無料プラン: 1日あたり 100,000 リクエスト。
D1 無料枠: 5GB ストレージ / 1日あたり 500万行読み取り。
個人の生活ログ用途なら使い切ることはまずありません。

## トラブルシュート

- **デプロイで `database_id` エラー** … `wrangler.toml` の id がプレースホルダのまま。手順2を確認。
- **アプリが「同期エラー」** … URL末尾に余計なパスが付いていないか確認（ルート `/` で動作）。
- **CORSエラー** … Worker側で対応済み。古いキャッシュの可能性があるので再デプロイ＋リロード。
