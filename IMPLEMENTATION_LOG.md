# 実装記録

仕様の優先順位: SONGMAP_SPEC.md §0 → §52 → 各機能要件。各Phaseの4検証と主要操作を完了してから次へ進む。

## 初期調査
- 2026-09-22: 仕様書のみ。既存コード、依存関係、Git履歴なし。
- Node 24.16.0 / npm 11.13.0。新規Gitリポジトリを作成。
- V1以外のAI、音声、共同編集等は対象外。

## Phase A — Foundation
- React / Vite / strict TypeScript、CSS変数、4画面幅のshell、routing。
- 全domainモデル、device別workspace state、Dexie tables、repository、atomic outbox。
- テスト環境、永続化・rollback・revision・soft delete/restoreのテスト。
- 検証: lint / typecheck / test（4件）/ build 成功。Edge Desktop / Phone のナビ・テーマ・横はみ出し検証2件成功。
- 残課題: Phase B以降の機能と端末別実機検証。

## Phase B — Song Core
- Home / Continue / Songs検索・分類 / New Song・4テンプレート。曲の変更・複製・ピン・アーカイブ・削除復元。
- テンプレート生成と複製はatomic、IDとSource参照を再割当。テキストは650ms debounceとblur時保存。
- 検証: lint / typecheck / test（6件）/ build成功。Desktop / Phone E2E 4件成功。
- 修正: 複製EdgeのID、モバイルメニューと通知の重なり。
- 残課題: Canvas以降の制作操作（次Phase）。

## Phase C — Canvas
- XYFlow adapter、Node/Edge CRUD、pan/zoom/fit/minimap/multi-select、drag-end保存。
- Type/Status/Tags/Favorite、Focus、filter、collapse、端末別viewport。
- 検証: lint / typecheck / test（8件）/ build成功。Desktop / Phone E2E 6件成功。
- 残課題: Lyricsへの受け渡し（Phase D）、専用Mobile操作（Phase F）。

## Phase D — Lyrics
- Section CRUD/collapse/duplicate/drag reorder、安定IDの行編集・Enter分割/Backspace結合。
- Node→Lyrics（送信/drag）、送信先と位置指定、Map維持、Source→Node。
- 検証: lint / typecheck / test（10件）/ build成功。Desktop / Phone E2E 8件成功。
- 修正: 非表示Canvasの寸法維持、歌詞編集後の表示更新。
- 残課題: Fragmentとの相互変換（Phase E）。

## Phase E — Fragments / Inbox
- Home/global Quick Capture、Inbox→Node/Fragment/New Song、Quick Add。
- Fragment CRUD/tags/favorite/status、Node↔Fragment、Lyrics→Fragment、Fragment→LyricsとSource追跡。
- 検証: lint / typecheck / test（14件）/ build成功。Desktop / Phone E2E 10件成功。
- 修正: 非表示Nodeのpointer interception。Capture→Inbox→Fragment→Lyricsの全経路を確認。
- 残課題: Mobile専用List/Bottom Navigation/long press（Phase F）。

## Phase F — Mobile
- 専用Bottom Navigation、Listの検索/type/tag/status、Source復帰、固定Bottom Sheet。
- touch pan/pinch、長押し、Quick Add、横向きMap+Lyrics、safe-area/dvh対応。
- 検証: lint / typecheck / test（14件）/ build成功。Desktop / Phone E2E 12件、横向き844×390確認。Mobileスクリーンショット目視確認。
- 残課題: iOS Safari / Android Chromeの実機タッチ検証（エミュレーションのみ）。

## Phase G — Safety
- Session Undo/Redo（50 commands）、Trash、直近5 snapshotsの復旧。
- JSON schema/参照整合検証、衝突しない新IDでatomic import、完全JSON/Markdown export。
- 検証: lint / typecheck / test（17件）/ build成功。Desktop / Phone E2E 14件成功。
- 保存中/保存済み/失敗/オフライン表示、未保存離脱防止、visibility change時flush。
- 残課題: 実クラウドキュー配信（Phase H）。強制終了時の直前650ms入力は未コミットの可能性あり。

## Phase H — PWA / Sync（進行中）
- PWA shell/manifest/更新確認、Supabase Auth/Repository/RLS/CAS RPC、durable outbox/再送/競合。
- 実クラウドの接続情報なし。実環境のSQL適用・2端末アカウント検証は未実施。

### Phase H ローカル検証結果
- lint / typecheck / test（20件）/ build成功。PWA precache生成。
- Desktop / Phone E2E 14件成功。本番Service Workerで完全オフライン編集・reload保持のE2E 1件成功。
- 閲覧時刻の変更を同期対象から除外し、閲覧だけで競合しないよう修正。
- 追加検証: 送信中の追加入力と異なるレコードのmerge成功。最終 test 22件・E2E 14件・PWA E2E 1件、lint/typecheck/build 全成功。
- 実Supabase接続・RLS・Auth・実2端末の検証は未完了。Phase Hを完了扱いにせず、Phase Iは未着手。
- Phase Iに向けた仕様照合の残項目はREADMEに明記。

## Phase H — ユーザー環境での確認（追記）

- ユーザーがSupabase SQLを適用し、環境設定とアカウント作成の動作を確認。
- ユーザーからPCとスマホの同期成功の報告あり。
- Cloudflare Pages公開とSupabase Redirect URL設定を実施後、Phase Iへの進行指示を受領。
- 上記はユーザー報告による確認。別アカウント間RLS隔離や実機での同時オフライン競合まで検証済みとは扱わない。

## Phase I — Polish（2026-09-23）

### 変更
- 控えめな160〜180msの表示・選択アニメーションとreduced-motion対応。
- Ctrl/Cmd+Fによる曲内横断検索（Nodes / Fragments / Lyrics / Tags）、結果の表示・フォーカス移動。
- Native dialogによるQuick Capture / Quick Add / Send / Source / Searchの背景操作抑制、Tab循環、Escape、フォーカス復帰。
- Tabの子Node、Shift+Enterの同じ親を持つ兄弟Node、/で編集・操作、入力中のEscape、操作ボタンでは文字編集ショートカットを奪わない。
- Desktopのパネル幅・開閉、Canvas / Focus / Lyrics / Zen、端末クラス別設定とviewportのマージ保存。
- Source復帰時の祖先展開・強調。通常編集のたびに再センタリングしていた不具合を修正。
- Mobile Sectionの「上へ / 下へ」と画面内の操作メニュー、主要アイコンのタッチ領域・フォーカス表示。
- Map / Lyrics / Inbox / Fragment / Searchの空・読込表示、画面エラー時の再読み込み導線。
- 共通テキストバッファで保存中の追加入力を直列化。保存失敗時は最新下書きを維持し再試行。変換・書出しはflush完了を待つ。
- Repositoryはトランザクション内の変更だけを記録してUndoを維持。全件読み取りは最大30秒に1回の復旧チェックポイント（直近5件）へ限定。
- Canvasの状態購読・Node memo・Edge参照検索を改善。ReactFlowの寸法変更を保持。Nodeドラッグ中の歌詞ドロップ先表示と元位置保持。
- 設定・アカウント・同期の読み込みを分割。入口JS約283.75kB（gzip90.60kB）。ビルドの500kB警告なし。

### 検証
- npm run check: lint / typecheck / test（26件）/ build 全成功。
- Desktop / Phone E2E: 19件成功、Desktop専用マウス計測のPhone実行1件は対象外。
- 本番PWA: 完全オフラインで起動・作成・編集・reload保持のE2E 1件成功。
- 200 Node / 199 Edge: JSON取込みから表示まで1,455ms、20ステップのマウスドラッグと保存完了まで673ms（当該PCの最終実行、ブラウザ自動操作込み）。ドラッグ途中はDB座標不変、終了時保存、歌詞へdrop後も元座標維持、reload保持を確認。FPS測定値ではない。
- 検索4分類、折りたたみSource復帰、編集時viewport維持、Section順序変更、Zen/パネル復元、キーボード入力・モーダルフォーカスをDesktop/Phoneで確認。
- DesktopとPhoneの最終スクリーンショットを目視確認。横向き844×390と横はみ出し検査も既存E2Eで成功。
- 修正途中に検出した初期フォーカス・JavaScriptの改行解釈・寸法保持の問題は解消後、全チェックを再実行。

### 残課題
- 今回はローカル実装と検証。Cloudflare公開版への反映は未実施。
- 実iOS/Androidのタッチ・PWA、公開後の携帯回線同期、別アカウントRLS隔離と実機同時オフライン競合は別途受入確認。
- 以前から残るInbox Favorite・曲カードTag検索・保存テンプレートの仕様照合はREADMEに明記。Phase Iの検証成功をV1全体の完了とは混同しない。
