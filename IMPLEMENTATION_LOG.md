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
