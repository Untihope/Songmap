# SongMap

思いつき → Quick Capture → Inbox → Mind Map / Fragment → Lyrics。
思考の出自を残す、日本語・Local-first の作詞ワークスペースです。

実装仕様は [SONGMAP_SPEC.md](SONGMAP_SPEC.md)。§0 と §52 を優先し、Phaseごとの変更・検証を [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md) に記録しています。

## 現在の状態

Phase A〜I の実装とローカル検証を実施。Phase H のアカウント作成・PC/スマホ同期はユーザーによる動作確認済みです。Cloudflare Pagesの公開・Supabaseのリダイレクト設定後、Phase Iの仕上げを実施しました。V1全体の残項目と実機検証の範囲は末尾に記載しています。

- Quick Capture / Inbox変換 / Quick Add
- Node / Edge / Tags / Favorite / Focus / List
- Section / 安定IDの歌詞行 / Source追跡 / Fragment相互変換
- IndexedDB保存 / Undo・Redo / Trash / 復旧スナップショット
- Markdown・JSON書き出し / JSON新規取込み
- Desktop、Phone Portrait、Phone Landscape、Tablet向け表示
- PWAオフラインshell / Auth・同期adapter・競合処理の実装
- 曲内のNode / Fragment / Lyrics / Tag横断検索、Source復帰時の枝展開
- Canvas / Focus / Lyrics / Zen、Desktopパネル幅・開閉の端末別保存
- キーボード・モーダルのフォーカス制御、Mobile Section並べ替え、reduced-motion対応

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

### 実クラウド受入確認

ユーザーからアカウント作成とPC⇄スマホ同期の成功報告あり。公開先は [Cloudflare Pages](https://songmap-7f1.pages.dev)。Phase Iの変更はローカルで検証済みで、公開版への再デプロイは別途必要です。

以下は詳細な実環境受入として残しています。

- SQL適用後、未ログインでテーブルを読めないこと。
- 2つの別アカウントで相手の行を読めず、RPCでも相手のデータを変更できないこと。
- 公開版での携帯回線・PC間の一連の制作フローを再確認。
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
編集時に最大30秒に1回、保存前のDBチェックポイントを作成し、直近5件を保持します。通常の保存は変更したレコードだけで履歴を記録し、毎回の全件読み取りを避けます。設定から復旧できます。復旧は既存レコードを戻し、後から追加されたデータは残します。Undo可能です。
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

## 操作の仕上げ

曲内の「検索」または Ctrl/Cmd+F で、Node・Fragment・Lyrics・Tagをまとめて検索できます。検索結果やSourceからNodeへ戻ると、必要な枝を開いて表示します。以降のテキスト編集で勝手に表示位置を移動しません。

「表示」でCanvas / Focus / Lyrics / Zenを切り替えます。Desktopではパネルの開閉と幅を調整でき、Phone / Tablet / Desktop別に保存します。閉じたパネルも「表示」から再び開けます。MobileのSectionメニューには「上へ」「下へ」があります。

| 操作 | キー |
| --- | --- |
| 保存 | Ctrl/Cmd+S |
| Undo / Redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z（入力欄ではブラウザ標準） |
| Node編集・操作 | Enter / / |
| 子 / 兄弟Node | Tab / Shift+Enter（MapまたはNodeにフォーカス時） |
| Node複製 | Ctrl/Cmd+D |
| Node削除 | Delete / Backspace（入力欄やボタン以外） |
| 全体表示 / パン | F / Space+ドラッグ |
| キャンセル・閉じる | Escape |

モーダル内でTabが循環し、閉じると元の操作位置へ戻ります。保存中の追加入力を直列化し、失敗後は最新の入力を再試行できます。書き出しと歌詞への送信は、編集中の保存完了を待ってから行います。

最終検証: lint / typecheck / unit・integration 26件 / build成功。Desktop・Phone E2E 19件成功（Desktop専用マウス計測のPhone実行1件は対象外）、production PWA offline E2E 1件成功。200 Node / 199 Edgeで実ドラッグ、drag-end保存、Lyricsへのドロップ、位置とSourceの保持を検証しています。

## 残課題と制限

- Phase Iの公開版への再デプロイと、公開後のPC/スマホでの最終確認は未実施。
- 実Supabaseでの別アカウント間RLS隔離、実端末の同時オフライン競合、iOS Safari / Android Chromeのインストール・タッチ操作は追加検証が必要。
- 曲カードのTag検索、Inbox Favorite、保存テンプレートの扱いは以前のPhaseからの仕様照合の残項目。今回のPhase IでV1全項目の完成とは扱いません。
- 同じブラウザのローカルDBを別アカウントへ自動転用しません。別アカウントは別ブラウザプロファイルを使います。
- ブラウザテストはEdgeのDesktop / Phoneエミュレーション。200 Node計測はこのPCでの機能・操作時間確認で、低性能端末のFPSを保証するものではありません。
- チェックポイント作成時は全domainを読み取ります。大量データの継続的な実機評価は残ります。
- Phase 2 / 3（AI、音声、リアルタイム共同編集等）は未実装・対象外。
