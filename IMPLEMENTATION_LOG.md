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
