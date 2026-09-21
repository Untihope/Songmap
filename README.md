# SongMap

思いつき → Quick Capture → Inbox → Mind Map / Fragment → Lyrics。
思考の出自を残す、日本語・Local-first の作詞ワークスペースです。

実装仕様は [SONGMAP_SPEC.md](SONGMAP_SPEC.md)。§0 と §52 を優先し、Phaseごとの変更・検証を [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md) に記録しています。

## 現在の状態

Phase A〜G の実装と検証を実施。Phase H はローカル検証まで実施し、**実 Supabase 接続と実アカウントでの2端末検証が未完了**です。順序を守り Phase I は未着手。V1完成とは扱いません。

- Quick Capture / Inbox変換 / Quick Add
- Node / Edge / Tags / Favorite / Focus / List
- Section / 安定IDの歌詞行 / Source追跡 / Fragment相互変換
- IndexedDB保存 / Undo・Redo / Trash / 復旧スナップショット
- Markdown・JSON書き出し / JSON新規取込み
- Desktop、Phone Portrait、Phone Landscape、Tablet向け表示
- PWAオフラインshell / Auth・同期adapter・競合処理の実装

## セットアップ

Node.js 22.12+ / npm（実行環境は Node 24.16）。

```sh
npm ci
npm run dev
```

表示先: http://127.0.0.1:5173

## 検証

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
npm run test:e2e
npm run test:pwa
```

- `npm run check`: lint → typecheck → test → build。失敗で停止。
- E2E はインストール済み Microsoft Edge を使用。別の環境では Playwright 設定の channel を変更。
- PWAテストは先に build し、production previewを使用。devサーバーのService Workerは無効。
- Unit/Integration は fake-indexeddb。同期は独立した2つのDBとテスト用Cloud Adapterで検証。

## クラウド設定

1. 自分の Supabase プロジェクトを用意し、[supabase/schema.sql](supabase/schema.sql) をSQL Editorで実行。
2. AuthでEmail/Passwordを有効化し、実際のサイトURLと確認後のリダイレクトURLを設定。
3. `.env.example` を `.env` にコピーし、次を設定。

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-OR-ANON-KEY
```

4. 開発サーバーを再起動。productionは環境変数を設定して再buildしHTTPS配信。
5. 設定 → アカウント作成 / ログイン。メール確認が有効なら確認後にログイン。
6. PCとスマホで同じサイト・同じアカウントを使用。

ブラウザに渡すのは公開用キーのみ。**service_role keyは設定しません。**
未設定ではGuest local modeで動作します。初回ログイン時、そのブラウザのGuestデータをログインしたアカウントへ同期します。

### 同期構造

- ローカル変更とsyncQueueを同一IndexedDB transactionで保存。
- queueはレコード別にまとめてpush。クラウドversionとCompare-and-swapで競合検出。
- SQL RPCは認証ユーザーをサーバー側で決定。RLSで自分の行だけ取得。直接書込みは禁止しRPCへ限定。
- mutation IDで同じ送信の再試行を識別。ackしたキューだけ削除し、送信中の新しい編集は残す。
- 変更後約1秒、オンライン復帰、再フォーカス、15秒間隔で同期。cloudは全件をページ取得し、未送信変更を上書きしない。
- 同一Node / Fragment / LyricsLineの競合は設定画面で「クラウド」「この端末」「両方」。歌詞の両方保持は隣接する行を作成。
- 閲覧時刻とviewportは端末内の状態。viewportは端末クラス別。

参照: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Vite PWA](https://vite-pwa-org.netlify.app/guide/)

### 実クラウド受入確認（未実施）

- SQL適用後、未ログインでテーブルを読めないこと。
- 2つの別アカウントで相手の行を読めず、RPCでも相手のデータを変更できないこと。
- 同じアカウントのPCで曲作成 → スマホで取得 → スマホで歌詞編集 → PCで取得。
- スマホをオフラインにして編集・再起動 → 復帰後の送信。
- 両端末が同じNodeをオフライン編集 → 競合表示 → 両方保持。
- 実iOS Safari / Android ChromeでPWAインストールとタッチ操作。

## 保存・復旧

IndexedDB `songmap` にdomainデータ、workspaceStates、syncQueue、trash、preferences、snapshots、syncMeta、conflictsを保存。
Domainの正本はIndexedDBで、LocalStorageを主要保存先にしません。Auth tokenもIndexedDBに保存。

テキストは650ms debounce、blur・画面非表示・Ctrl/Cmd+Sでflush。Node移動はdrag end時に保存。
保存中・失敗・オフラインを区別し、未保存入力がある場合のページ離脱を保護します。
強制終了直前の未コミット入力（最大約650ms）は保護しきれません。保存済みの未同期データは再起動後もキューに残ります。

Undo/Redoはセッション内最大50コマンド。主要データはsoft deleteでTrashから復元。
保存前の直近5回のDBスナップショットを保持し、設定から復旧できます。復旧は既存レコードを戻し、後から追加されたデータは残します。Undo可能です。
ブラウザのサイトデータ削除はローカルデータを消すため、JSONバックアップを利用してください。

## Export / Import

Workspace「書き出し」で1曲をMarkdown / JSONへ出力。
JSONはschemaVersion=1、全domain子要素、Source参照、soft-deletedデータを含みます。
設定からJSONを読み込むと、新しいIDを割り当てて別の曲として復元。形式・所属・参照を検証し、失敗時は全体rollbackします。
Markdownは人間向け出力で、取込みはV1対象外です。

## PWA

manifest、192/512pxアイコン、offline shell、更新確認を実装。
Quick Capture / Inbox / Continue shortcutsを定義。未保存中は更新操作を無効化。
PWAはlocalhostまたはHTTPSで使用してください。

## 構成

- `src/app`: shell / routes
- `src/domain`: モデル、変換、selectors、バックアップ
- `src/features`: songs / canvas / lyrics / inbox / fragments / safety / sync / pwa
- `src/data/local`: Dexie schema
- `src/data/repositories`: transaction、history、snapshot
- `src/data/cloud`: Supabase Adapter
- `src/data/sync`: クラウドに依存しない同期エンジン
- `src/state`: UI / 保存 / 同期状態
- `src/styles`: design tokens / responsive UI
- `src/tests`, `e2e`, `pwa-tests`: テスト
- `supabase`: SQL migration

## 残課題と制限

- **Phase H:** 実クラウドのSQL/RLS/AuthとPC⇄スマホの受入検証。接続情報未設定。
- **Phase I:** アクセシビリティ監査、全キーボード操作・検索の仕上げ、パネルresize/close/reopen・Zen、200 Node性能測定、アニメーション・全状態の仕上げ。
- デスクトップのNode→Lyricsドラッグは実装済みですが、継続的なdrop guideと詳細なブラウザ検証を追加予定。
- Section並べ替えはDesktopのドラッグ操作。Mobile向け並べ替え補助は残課題。
- Desktop Source追跡・二方向の導出表示は実装。曲カードのTag検索、Inbox Favorite、保存テンプレートの扱いは仕様との最終照合対象。
- 同じブラウザのローカルDBを別アカウントへ自動転用しません。別アカウントは別ブラウザプロファイルを使います。
- 実機iOS/Androidは未検証。ブラウザテストはEdgeのDesktop / Phoneエミュレーション。
- snapshotsは現時点で全domain読み取りを伴います。大規模データでの性能改善はPhase Iで検証。
- Phase 2 / 3（AI、音声、リアルタイム共同編集等）は未実装・対象外。

