# SongMap

思いつき → Inbox → Mind Map / Fragment → Lyrics の制作過程を残す、日本語・Local-firstの作詞ワークスペース。
実装基準: [SONGMAP_SPEC.md](SONGMAP_SPEC.md)。進捗: [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md)。

## セットアップ

Node.js 22.12+（検証:24.16）/ npm。

```sh
npm ci
npm run dev
```

## 検証・ビルド

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
npx playwright test
```

npm run check はlint/typecheck/test/buildを順に実行。ブラウザ検証はローカルのMicrosoft Edgeを使用。

## 構成

- src/app: routing / responsive shell
- src/domain: ライブラリに依存しないdomain型
- src/data/local: Dexie / IndexedDB（主要保存先）
- src/data/repositories: atomic local mutation と同期outbox
- src/state: UI状態。domainの正本はIndexedDB
- src/styles: dark-first / lightのデザイントークン
- src/tests, e2e: unit / integration / browser検証

全domainレコードは安定ID・revision・updatedAt・deletedAtを持つ。SourceはID参照で保持。
WorkspaceStateはdomainから分離し端末クラス別に保存。LocalStorageは主要保存先にしない。
同期キューはローカル変更と同一トランザクションで保存する。

## 環境変数・クラウド・PWA・入出力

Phase A時点では環境変数不要。クラウド接続・Auth・同期配信・PWAはPhase H、JSON import/exportとMarkdown exportはPhase Gで実装。
現在のGuestデータはこのブラウザにのみ保持され、別端末へは同期されない。

## 制限

開発途中。未実装Phaseと検証範囲は実装記録参照。ブラウザのサイトデータ削除はローカルデータを削除する。
Phase 2 / 3の機能はV1に追加しない。

