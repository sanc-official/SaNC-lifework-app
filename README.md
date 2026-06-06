# SaNC Lifework Log

React学習を兼ねた生活ルーチン記録アプリです。

## 機能

- run / walking / indoor / rest の運動ログ
- 距離、時間、場所、歩数、雨の日代替メニューの記録
- 勉強した言語/技術と学習時間の記録
- 起床、就寝、体重、酒量、今日の一言の記録
- 直近7日の距離、運動時間、学習時間、平均歩数の集計
- SVGグラフ表示
- AI振り返り文の自動生成
- ChatGPTに貼るためのプロンプト生成
- localStorage保存

## 起動

```sh
npm install
npm run dev
```

## スマホで使う

### 近くのスマホで試す

Macとスマホを同じWi-Fiにつなぎ、Mac側で以下を実行します。

```sh
npm run dev -- --host 0.0.0.0
```

表示された `Network` のURLをスマホで開きます。

### ホーム画面に追加

iPhone:

1. SafariでアプリURLを開く
2. 共有ボタンを押す
3. `ホーム画面に追加` を選ぶ

Android:

1. ChromeでアプリURLを開く
2. メニューを開く
3. `ホーム画面に追加` または `アプリをインストール` を選ぶ

外出先でも使うなら、VercelやNetlifyにデプロイしてHTTPSのURLで使うのが前提です。

## 次の拡張候補

- Google Sheets連携
- OpenAI API連携
- 週次レビュー画面
- CSV / JSONエクスポート
- スマホ向け入力短縮モード

## GitHub Pagesで外から使う

このアプリは静的サイトとしてGitHub Pagesに公開できます。

### 初回だけやること

```sh
git init
git add package.json package-lock.json index.html vite.config.js src public README.md .gitignore .github
git commit -m "Initial SaNC Lifework Log app"
git branch -M main
git remote add origin https://github.com/<your-account>/<repo-name>.git
git push -u origin main
```

GitHub側で以下を設定します。

1. Repository の `Settings` を開く
2. `Pages` を開く
3. `Build and deployment` の `Source` を `GitHub Actions` にする
4. `Actions` の `Deploy to GitHub Pages` が成功するのを待つ

公開URLは通常この形式です。

```text
https://<your-account>.github.io/<repo-name>/
```

### スマホのホーム画面に追加

iPhone:

1. SafariでGitHub PagesのURLを開く
2. 共有ボタンを押す
3. `ホーム画面に追加` を選ぶ

Android:

1. ChromeでGitHub PagesのURLを開く
2. メニューを開く
3. `ホーム画面に追加` または `アプリをインストール` を選ぶ

### 注意

現時点の保存先はブラウザ内の `localStorage` です。

そのため、GitHub Pagesに公開してもMacとスマホのデータは自動同期されません。同期したい場合は、次の段階でGAS Web API + Google Sheets保存を追加します。
