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
