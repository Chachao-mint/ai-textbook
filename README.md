# AI教科書 📖

AIの概念から実務まで学べる、モバイル対応の教科書PWAアプリです。

## 特徴

- 📱 **モバイルファースト PWA**：スマホのホーム画面にインストール可能
- 🌓 **ダーク/ライトモード**
- 📚 **全12章**：AIの基礎から実務・事業化まで
- 🔄 **週次自動更新**：最新ニュース章が毎週月曜に自動更新
- 💾 **オフライン対応**：Service Worker で一度読んだら電波なしでも読める
- 🔍 **全文検索**・章ごとの読了管理
- ⌨️ **キーボード／スワイプ** で章を移動

## 章構成

| # | 章 | 内容 |
|---|---|---|
| 0 | はじめに | この教科書の全体像と使い方 |
| 1 | AIの大きな仕組み | LLM・Transformer・トークン・埋め込み・RAG |
| 2 | 主要AIモデルを比較する | Claude／GPT／Gemini の強みと使い分け |
| 3 | AIのAPIとは何か | API基礎・料金・コスト最適化・セキュリティ |
| 4 | AIの用途カタログ | 文章／画像／音声／コード／分析の実例 |
| 5 | AI活用の注意点とリスク | ハルシネーション／著作権／EU AI Act等 |
| 6 | AIスモールビジネスの始め方 | 個人／中小でAI事業を立ち上げる実践ステップ |
| 7 | フィジカルAI | ヒューマノイド／NVIDIA GR00T／世界モデル |
| 8 | AI SaaS | Vertical AI SaaS／課金モデル／採用事例 |
| 9 | エージェントAI | Claude Agent SDK／Computer Use／マルチエージェント |
| 10 | 最新ニュース | **週次で自動更新** |
| 11 | 用語集 | 押さえておきたいAI用語リファレンス |

## ローカルでの起動

```bash
cd /Users/kazuki_chayano/AI教科書
python3 -m http.server 5173
```

ブラウザで http://localhost:5173 を開きます。

Claude Code 内では Preview の `ai-textbook` サーバーとしても起動できます（`.claude/launch.json` で定義済み）。

## スマホで使う

1. 上記サーバーを起動
2. Mac の IP アドレスを確認（`ipconfig getifaddr en0`）
3. スマホの Safari / Chrome で `http://<IP>:5173` にアクセス
4. 共有メニューから「ホーム画面に追加」→ ネイティブアプリ風に起動

## ファイル構成

```
AI教科書/
├─ index.html           # アプリ本体
├─ manifest.json        # PWAマニフェスト
├─ sw.js                # Service Worker（オフライン対応）
├─ css/style.css        # スタイル
├─ js/app.js            # アプリロジック
├─ content/
│  ├─ chapters.json     # 固定章のコンテンツ（章0〜9, 11）
│  └─ news.json         # 最新ニュース章（週次更新対象）
├─ icons/               # PWAアイコン
├─ .claude/launch.json  # Preview起動設定
└─ README.md
```

## 週次更新の仕組み

Claude Code の Scheduled Task として `ai-textbook-weekly-update` が登録されています。

- **実行タイミング**：毎週月曜 AM 8:26
- **実行内容**：
  1. WebSearch で過去7日のAI業界ニュースを検索
  2. WebFetch で一次ソースを確認
  3. `content/news.json` を書き換え（`lastUpdated` 含む）
  4. 完了通知

アプリは `news.json` を network-first 戦略で読むため、更新されたら次回アクセス時に自動反映されます。

### 手動で更新したい場合

Claude Code で次のプロンプトを送るだけで更新できます:

```
AI教科書の最新ニュースを更新して
```

または Scheduled Task の「Run now」ボタンからも実行できます。

## コンテンツを編集する

- **固定章を直したい** → `content/chapters.json` を編集
- **ニュース章を直したい** → `content/news.json` を編集
- **UI を変えたい** → `css/style.css` / `js/app.js` / `index.html`

編集後はブラウザをリロードするだけで反映されます（Service Worker のキャッシュが効いているときは、ブラウザの「ハードリロード」または開発者ツールから unregister）。

## 技術スタック

- 素の HTML / CSS / JavaScript（フレームワーク不使用）
- Service Worker によるオフラインキャッシュ
- Web App Manifest による PWA 化
- LocalStorage による進捗・テーマ保存

依存ゼロ。ビルドツールなし。軽量。
