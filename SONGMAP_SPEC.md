# SongMap Web App — Codex 実装指示書

**Document:** SONGMAP_SPEC.md  
**Status:** Implementation Ready  
**Primary target:** Responsive Web App / PWA  
**Language:** UI は日本語を第一言語とし、内部識別子は英語  
**Purpose:** 作詞のための思考整理・マインドマップ・歌詞編集・アイデア捕捉を一つのワークスペースに統合する

---

# 0. Codexへの最上位指示

この仕様書を、実装上の最優先ソースとして扱うこと。

実装中に仕様が曖昧な場合は、以下の優先順位で判断する。

1. ユーザーの思考・創作フローを止めない
2. 入力開始までの操作数を減らす
3. データ消失を防ぐ
4. Desktop / Mobile それぞれに適したUXを維持する
5. UIを過密にしない
6. 将来拡張可能なデータ構造を維持する
7. 装飾より操作性を優先する。ただし見た目の完成度も妥協しない

独自判断で一般的な業務SaaS風UIへ変更しないこと。

本アプリは「汎用マインドマップ」ではなく、**歌詞が生まれるまでの思考過程を保存・整理し、最終的な歌詞へ収束させる創作ツール**である。

---

# 1. プロダクト概要

## 1.1 プロダクト名

仮称: **SongMap**

名称は後から変更可能とするため、コード内に文字列をハードコードしすぎない。

## 1.2 解決したい問題

作詞中には以下の情報が断片的に生まれる。

- 曲の中心テーマ
- 感情
- 情景
- キーワード
- 比喩
- ストーリー
- 過去と現在などの対比
- サビ候補
- 1行だけ浮かんだフレーズ
- まだ所属する曲が決まっていない思いつき
- 完成歌詞

一般的なメモ帳では関係性が失われ、一般的なマインドマップでは完成歌詞との連携が弱い。

SongMapでは以下の流れを一つのアプリ内で扱う。

```text
思いつき
  ↓
Quick Capture
  ↓
Inbox
  ↓
Song / Project
  ↓
Node / Fragment
  ↓
Mind Map
  ↓
Lyrics
  ↓
Finished Song
```

また、可能な限り以下の出自を保持する。

```text
Node
 ↓
Fragment
 ↓
Lyrics Line
```

完成した歌詞から「この一行がどの思考・断片から生まれたか」を遡れる状態を目指す。

---

# 2. UX原則

## 2.1 Capture First

最重要原則。

ユーザーに最初から整理を要求しない。

思いついた瞬間は以下だけで保存できること。

```text
入力
↓
Enter / 保存
```

Node Type、Tag、Status、所属曲などは後から設定可能。

## 2.2 操作を止めない

以下を避ける。

- 不要な画面遷移
- モーダルの乱発
- 保存ボタンを押さないと進めない設計
- 新規作成時の必須フォーム
- 毎回の分類要求
- ドラッグ操作後の確認ダイアログ

## 2.3 Progressive Organization

情報は以下の順で徐々に整理される。

```text
Raw idea
↓
Fragment / Free Node
↓
Structured Node
↓
Candidate
↓
Adopted
↓
Lyrics
```

## 2.4 Context Preservation

ユーザーが「Map → Lyricsへ送る」操作をしても、勝手にLyrics画面へ移動しない。

現在の思考コンテキストを維持する。

## 2.5 Local-first

編集操作はクラウド応答を待たない。

```text
操作
↓
ローカル保存
↓
即UI反映
↓
バックグラウンド同期
```

## 2.6 Desktop / Mobileを別UXとして設計

Desktop UIを単純に縮小してMobileにしない。

Desktop:
- 広げる
- 関連を見る
- 構造化する
- MapとLyricsを同時表示する

Mobile:
- 捕まえる
- 1つの対象に集中する
- Bottom Sheetで編集する
- Quick Captureを最短で実行する

---

# 3. 対応環境

## 3.1 必須

- Desktop Chrome系ブラウザ
- Desktop Edge
- Android Chrome
- iOS Safari
- PWAインストール
- タッチ操作
- マウス
- キーボード

## 3.2 レスポンシブ区分

具体的なpx値は実装時に調整可能だが、UIモードは以下の4段階を持つ。

```text
Phone Portrait
Phone Landscape
Tablet
Desktop
```

### Phone Portrait

1画面 = 1機能。

### Phone Landscape

Map + Lyrics の2ペイン表示を許可。

### Tablet

Desktopに近いレイアウト。

### Desktop

左Sidebar + Center Canvas + Right Lyrics の3領域。

---

# 4. 推奨技術構成

ライブラリの固定バージョンは指定しない。導入時点で互換性のある安定版を使用する。

## Frontend

- React
- TypeScript
- Vite
- PWA対応
- CSS VariablesによるDesign Token管理

## State

推奨:
- Zustand相当の軽量Store
- UI StateとDomain Stateを分離

## Canvas

推奨:
- XYFlow / React Flow系

必要要件:
- custom node
- edge
- pan
- zoom
- selection
- multi-selection
- viewport control
- minimap
- custom connection
- node drag

ライブラリ依存部分はadapter層を設け、Domain Modelと直接密結合させない。

## IndexedDB

推奨:
- Dexie等のIndexedDB wrapper

LocalStorageを主要データ保存先に使用しない。

## Drag & Drop

通常DOM UIについてはdnd-kit相当を推奨。

## Cloud

V1ではクラウド同期を必須とする。

推奨初期実装:
- Supabase相当の Auth + Database

ただし、クラウド依存をRepository / Sync Adapterで抽象化し、将来バックエンド変更可能にする。

## Styling

特定コンポーネントライブラリに見た目を支配させない。

Radix系Primitiveの利用は可。

既製SaaSテンプレートをそのまま使用しない。

---

# 5. アプリ情報設計

主要画面:

```text
Home
├ Inbox
├ Songs
│ ├ New Song
│ └ Song Workspace
│    ├ Map
│    ├ Lyrics
│    ├ Fragments
│    └ List
├ Templates
└ Settings
```

---

# 6. Home

## 6.1 Desktop

概念レイアウト:

```text
┌───────────────────────────────────────────────────────────────┐
│ SongMap                                      Search Theme Gear │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  CONTINUE                                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Last edited song                                        │  │
│  │ Mood / node count / fragment count / edited time        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  QUICK CAPTURE                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 思いついた言葉をそのまま書く…                       ＋ │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  SONGS                                          + New Song    │
│  [card] [card] [card]                                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 6.2 Mobile

```text
┌─────────────────────────┐
│ SongMap             ⚙   │
├─────────────────────────┤
│ Continue                │
│ [Last Song Card]        │
│                         │
│ QUICK CAPTURE           │
│ [思いついたこと…      ]  │
│                    ＋   │
│                         │
│ Inbox                  8│
│                         │
│ Songs                   │
│ Song A                  │
│ Song B                  │
│ Song C                  │
├─────────────────────────┤
│ Home   Inbox   Songs    │
└─────────────────────────┘
```

## 6.3 Continue

最後に開いたSongを1タップで再開できる。

表示:
- title
- mood
- node count
- fragment count
- last edited

## 6.4 Quick Capture

Projectを選ばずに入力可能。

Enterまたは保存でInboxItemを作成。

分類を要求しない。

---

# 7. Songs一覧

## 7.1 表示分類

```text
Pinned
Recent
All
Archive
Trash
```

## 7.2 Song Card

必要最低限の情報のみ。

- title
- mood
- node count
- fragment count
- lyrics progress
- updatedAt

カードにBPMやKey等を大量表示しない。

## 7.3 Card Menu

```text
Open
Rename
Duplicate
Pin / Unpin
Save as Template
Export
Archive
Delete
```

## 7.4 Search

対象:

- Song title
- Theme
- Mood
- Tag

将来Lyrics全文検索へ拡張。

---

# 8. New Song

巨大フォーム禁止。

初期UI:

```text
New Song

Title
[ Untitled Song ]

Template

● Blank
○ Emotional
○ Storytelling
○ Anime / Rock

Create
```

Title未入力可。

未入力の場合:

```text
Untitled YYYY-MM-DD
```

等の一意な仮名を自動付与。

以下は後から設定:

- theme
- moods
- bpm
- key
- references

---

# 9. Template

## Blank

中心Nodeのみ。

## Emotional

概念例:

```text
          Emotion
             │
Past ── Central Theme ── Present
             │
           Scene
             │
        Symbol / Metaphor
```

## Storytelling

```text
Character
Situation
Conflict
Change
Conclusion
```

## Anime / Rock

```text
World
Character
Obstacle
Decision
Keyword
Climax
```

Lyrics section初期値:

```text
A
B
Chorus
A2
B2
Bridge
Last Chorus
```

Templateは初期構造を生成するだけで、以後ユーザーを拘束しない。

---

# 10. Desktop Song Workspace

## 10.1 基本構造

```text
┌───────────────────────────────────────────────────────────────────┐
│ Top Bar                                                           │
├───────────────┬────────────────────────────────┬──────────────────┤
│ Left Sidebar  │        Mind Map Canvas         │ Lyrics Panel     │
│               │                                │                  │
│               │                                │                  │
├───────────────┴────────────────────────────────┴──────────────────┤
│ Bottom Utility Bar                                                │
└───────────────────────────────────────────────────────────────────┘
```

中央Canvasを主役とする。

初期幅目安:
- Left Sidebar: 15〜20%
- Canvas: 55〜65%
- Lyrics: 25〜30%

Left Sidebar / Lyrics Panel は:
- resize
- minimize
- close
- reopen

可能。

## 10.2 Top Bar

左:
- app logo/name
- back to songs
- editable song title

右:
- save status
- undo
- redo
- search
- view mode
- theme
- export
- settings

Save Status:

```text
保存中…
保存済み ✓
同期中…
オフライン
同期エラー
```

## 10.3 Left Sidebar

Sections:

### Project

- title
- theme
- mood
- bpm
- key

### Nodes

```text
All
Theme
Emotion
Scene
Keyword
Phrase
Structure
Free
```

クリックでCanvas上の対象以外を淡くする。

### Tags

タグ一覧 + 件数。

複数タグフィルター可能。

### Favorites

Favorite Node / Fragmentを一覧。

クリックで対象へ移動。

---

# 11. Mind Map Canvas

## 11.1 Canvas基本操作

Desktop:

- empty area drag: pan
- Space + drag: pan
- wheel: scroll / pan
- Ctrl/Cmd + wheel: zoom
- node drag: move node
- click: select
- Shift + click: multi-select
- drag selection box: multi-select
- double click empty area: create node
- Delete: soft delete selected
- Esc: cancel / deselect

## 11.2 Node高速追加

空白ダブルクリック:

```text
[何を考えてる？]
```

Enterで即生成。

Typeは`free`。

## 11.3 Keyboard

必須:

| 操作 | Key |
|---|---|
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Shift + Z |
| Search | Ctrl/Cmd + F |
| Save now | Ctrl/Cmd + S |
| Delete | Delete / Backspace |
| Edit selected node | Enter |
| Add child | Tab |
| Add sibling | Shift + Enter |
| Quick command | / |
| Duplicate | Ctrl/Cmd + D |
| Multi select | Shift |
| Fit View | F |
| Cancel | Esc |
| Pan | Space + Drag |

ブラウザ標準動作と衝突する場合、Workspaceがフォーカスされている時のみ奪う。

## 11.4 Node Quick Action

選択時に過密にならない小UIを表示。

Actions:
- Add Child
- Connect
- Favorite
- Send to Lyrics
- More

## 11.5 Quick Command

Node選択中`/`:

```text
Change Type
Add Tag
Favorite
Send to Lyrics
Send to Fragment
Set Status
Duplicate
Delete
```

---

# 12. Node Visual

## 12.1 通常表示

```text
╭────────────────────────╮
│ ♥ 世界から離れた感覚     │
│ #孤独 #夜               │
╰────────────────────────╯
```

## 12.2 種類

- theme
- emotion
- scene
- keyword
- phrase
- structure
- free

色のみで意味を伝えない。

Icon / shape / labelも併用する。

## 12.3 Status表現

- raw: normal
- candidate: subtle marker
- adopted: stronger border
- hold: dotted / muted
- rejected: reduced opacity

文字可読性は維持。

## 12.4 選択

明確なfocus ring。

派手なglow乱用禁止。

---

# 13. Edge

通常接続ではrelation typeを要求しない。

Default:

```text
related
```

選択時のみ詳細設定可能。

Relations:

```text
related
cause
contrast
rephrase
chronology
foreshadow
payoff
custom
```

customの場合`customLabel`を使用。

例:

```text
Past self
   │
 contrast
   ↓
Present self
```

---

# 14. Focus Mode

選択Nodeの関連範囲だけを強調。

その他Nodeは薄くする。

完全に非表示にはしない設定を初期値とする。

対象深度は1〜3程度で変更可能な設計にしてもよい。

---

# 15. View Modes

Desktop:

```text
Canvas
Focus
Lyrics
Zen
```

### Canvas
通常。

### Focus
選択Branch中心。

### Lyrics
Lyrics幅を大きく。

### Zen
不要UIを隠す。

ZenはMap / Lyrics双方で利用可能。

---

# 16. Lyrics Panel

単一巨大textareaにしない。

構造:

```text
LyricsDocument
 └ LyricsSection[]
    └ LyricsLine[]
```

UI上は普通の文章編集に見えること。

## 16.1 Section

- name
- order
- collapsed

初期候補:

```text
Intro
A
B
Chorus
A2
B2
Bridge
Last Chorus
Outro
```

名称は自由。

英語構成も可能。

## 16.2 Section操作

- collapse
- rename
- reorder by drag
- duplicate
- delete
- add new section

## 16.3 Lyrics Line

内部では1行ごとに安定IDを持つ。

ただしユーザーにLine概念を意識させない。

Lineは以下を持てる:

- text
- order
- sourceNodeIds
- sourceFragmentIds

将来:
- char count
- mora count
- rhyme analysis

の追加を想定。

## 16.4 Source Link

Nodeから送られたLineは:

```text
↗ 世界の歯車から外れた夜
```

のようにSource indicatorを持てる。

クリック:
- Mapへ対象Nodeを中央表示
- 一時ハイライト

Node側ではDerived Queryで:

```text
Used in: Chorus
```

等を表示。

データ重複を避ける。

---

# 17. Map → Lyrics

DesktopではDrag & Drop対応。

NodeをLyrics sectionへDrag。

Drop targetを視覚表示。

Drop後:
- LyricsLine作成
- sourceNodeIdsに元Nodeを保存
- Map表示を維持

別手段としてNode Menuから`Send to Lyrics`も必須。

---

# 18. Fragment

FragmentはNodeと別概念。

Node:
> 構造化された思考

Fragment:
> まだ構造化されていない言葉・フレーズ

例:

```text
午前二時
冷めたコーヒー
誰にも見つからない場所
自由だったんじゃなくて、誰にも見つからなかっただけ
```

Fragmentは:
- favorite
- tags
- status
- sourceNodeId
を持てる。

## 18.1 Fragment Box

Desktop Lyrics Panel下部または独立Panel。

Node → Fragment
Fragment → Lyrics
Lyrics → Fragment

を可能にする。

Lyricsから外した惜しいLineを削除せずFragmentへ戻せる。

---

# 19. Mobile Workspace

Bottom Navigation:

```text
MAP
LYRICS
FRAGMENTS
LIST
```

画面上部:
- back
- song title
- save/sync status
- menu

---

# 20. Mobile Map

Canvasほぼ全画面。

Touch:

- one finger empty drag: pan
- pinch: zoom
- tap node: select
- drag node: move
- long press node: quick actions
- long press empty: add node

ダブルタップを主要操作にしない。

## 20.1 Selected Node Action Bar

画面下部:

```text
+子
接続
★
→歌詞
…
```

Node周囲へ大量ボタンを表示しない。

---

# 21. Mobile Node Editor

Bottom Sheetを使用。

```text
Edit Node

Text
Type
Tags
Status
Notes

Favorite
Send to Lyrics
```

Bottom Sheetは:
- compact
- medium
- fullscreen

程度の3状態を持てる。

モーダルよりBottom Sheet優先。

---

# 22. Quick Add

**Song内専用。**

主にMapで使用。

フロー:

```text
Tap +
↓
Text input
↓
Optional Type
↓
Save
```

Type未指定なら`free`。

入力開始まで最大2アクション。

---

# 23. Quick Capture

**App全体機能。Project未選択でも使用可能。**

フロー:

```text
Open Quick Capture
↓
Input text
↓
Save
↓
InboxItem
```

所属Songを要求しない。

Mobileでは特に強く目立たせる。

可能ならPWA Shortcut:

```text
Quick Capture
Continue Last Song
Inbox
```

を実装。

---

# 24. Inbox

Project未所属のアイデア置き場。

表示例:

```text
Today

自由だったんじゃなくて、
誰にも見つからなかっただけ

00:42
```

操作:

```text
Move to Song
Convert to Node
Convert to Fragment
Create New Song
Favorite
Delete
```

変換後は通常Inbox一覧から除外。

履歴としてconvertedAt等は保持可能。

---

# 25. Mobile Lyrics

1画面をLyricsに使う。

```text
▼ Aメロ
深夜二時の窓際で
世界の音を聞いていた

▶ Bメロ

▼ CHORUS
世界の歯車から外れた夜
```

Section折りたたみ可。

元NodeがあるLineはSourceへ戻れる。

---

# 26. Mobile Map → Lyrics

画面をまたいだDrag & Dropを主要操作にしない。

Node Action:

```text
Send to Lyrics
```

Bottom Sheet:

```text
Section
○ A
○ B
● Chorus
○ Last Chorus

Position
● End
○ Choose position

Add
```

追加後Mapを維持。

Snackbar:

```text
Chorusへ追加しました
```

---

# 27. Mobile Fragments

カード / list型。

Swipeは補助操作として利用可。

推奨:
- left swipe: Send to Lyrics
- right swipe: Send to Map

削除はSwipeへ割り当てない。

誤操作防止のためMenuから実行。

---

# 28. Mobile List

すべてのNodeを検索・整理する画面。

上部:
- search
- type filter
- tag filter
- status filter

Node tap:
- Mapへ移動
- node center
- temporary highlight

---

# 29. Search

Project内Global Search対象:

- Nodes
- Fragments
- Lyrics
- Tags

結果は種類別にGroup。

例:

```text
NODES
...

LYRICS
...

FRAGMENTS
...
```

結果クリックで該当箇所へ遷移。

---

# 30. Domain Model

TypeScript interface相当の意味構造を以下とする。

実装時は必要に応じてDB用型とDomain型を分離してよい。

## 30.1 Project

```ts
type ProjectStatus =
  | "idea"
  | "writing"
  | "revising"
  | "completed"
  | "archived";

interface Project {
  id: string;
  ownerId?: string;
  title: string;
  theme?: string;
  moods: string[];
  bpm?: number;
  key?: string;
  status: ProjectStatus;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  revision: number;
  deletedAt?: string;
}
```

## 30.2 Node

```ts
type NodeType =
  | "theme"
  | "emotion"
  | "scene"
  | "keyword"
  | "phrase"
  | "structure"
  | "free";

type NodeStatus =
  | "raw"
  | "candidate"
  | "adopted"
  | "hold"
  | "rejected";

interface SongNode {
  id: string;
  projectId: string;
  text: string;
  note?: string;
  type: NodeType;
  status: NodeStatus;
  importance?: number;
  position: {
    x: number;
    y: number;
  };
  width?: number;
  collapsed: boolean;
  favorite: boolean;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt?: string;
}
```

## 30.3 Edge

```ts
type RelationType =
  | "related"
  | "cause"
  | "contrast"
  | "rephrase"
  | "chronology"
  | "foreshadow"
  | "payoff"
  | "custom";

interface SongEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  customLabel?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt?: string;
}
```

## 30.4 Tag

```ts
interface Tag {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

## 30.5 Fragment

```ts
interface Fragment {
  id: string;
  projectId: string;
  text: string;
  note?: string;
  favorite: boolean;
  tagIds: string[];
  status: NodeStatus;
  sourceNodeId?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt?: string;
}
```

## 30.6 Lyrics Section

```ts
interface LyricsSection {
  id: string;
  projectId: string;
  name: string;
  order: number;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt?: string;
}
```

## 30.7 Lyrics Line

```ts
interface LyricsLine {
  id: string;
  sectionId: string;
  text: string;
  order: number;
  sourceNodeIds: string[];
  sourceFragmentIds: string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt?: string;
}
```

## 30.8 Inbox Item

```ts
type InboxSource =
  | "home"
  | "quickCapture"
  | "mobileShortcut"
  | "project";

type InboxStatus =
  | "raw"
  | "converted"
  | "archived";

interface InboxItem {
  id: string;
  ownerId?: string;
  text: string;
  note?: string;
  status: InboxStatus;
  source: InboxSource;
  createdAt: string;
  updatedAt: string;
  convertedAt?: string;
  convertedToType?: "node" | "fragment" | "project";
  convertedToId?: string;
  revision: number;
  deletedAt?: string;
}
```

## 30.9 Reference

```ts
type ReferenceType =
  | "song"
  | "lyrics"
  | "video"
  | "image"
  | "text"
  | "other";

interface ProjectReference {
  id: string;
  projectId: string;
  title: string;
  type: ReferenceType;
  url?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 30.10 Workspace State

Domain Dataと分離。

```ts
interface WorkspaceState {
  projectId: string;
  deviceClass: "phone" | "tablet" | "desktop";
  zoom?: number;
  viewportX?: number;
  viewportY?: number;
  sidebarWidth?: number;
  lyricsPanelWidth?: number;
  sidebarCollapsed?: boolean;
  lyricsCollapsed?: boolean;
  selectedNodeId?: string;
  activeView?: "canvas" | "focus" | "lyrics" | "zen";
}
```

WorkspaceStateは同期対象にしてもよいが、端末種別ごとに別状態を維持する。

---

# 31. Data Ownership

Project配下:

```text
Project
├ Nodes
├ Edges
├ Tags
├ Fragments
├ LyricsSections
├ LyricsLines
└ References
```

InboxItemはProjectに所属しない。

WorkspaceStateはProject Domainから分離。

---

# 32. Local Persistence

IndexedDBをPrimary Local Storeとして使用。

最低限のtables / stores:

```text
projects
nodes
edges
tags
fragments
lyricsSections
lyricsLines
inboxItems
references
workspaceStates
syncQueue
trash
```

## 32.1 Autosave

Text入力:
- debounce 500〜1000ms目安

Node move:
- drag end時

Panel resize:
- resize endまたはdebounce

Section reorder:
- drop時

## 32.2 Save Now

Ctrl/Cmd+S:
- 即Local persistence
- pending cloud sync enqueue

保存UIに安心感を与える。

---

# 33. Cloud Sync

## 33.1 アカウント

Guest:
- Local only
- account不要

Signed-in:
- Local-first
- Cloud sync
- cross-device

スマホ⇄PC利用にはSigned-inが必要。

## 33.2 Sync Flow

```text
User mutation
↓
Local DB transaction
↓
UI update
↓
SyncQueue enqueue
↓
Cloud push
↓
Ack
↓
queue remove
```

Cloudから変更取得後:
- revision比較
- local merge
- UI update

## 33.3 Offline

Offline時:
- すべての主要編集を継続可能
- syncQueueへ積む
- online復帰後送信

UI:
```text
オフライン
変更はこの端末に保存済み
```

---

# 34. Conflict Handling

各同期対象に:

```text
revision
updatedAt
```

を持つ。

異なるレコードの変更は普通にmerge。

同一Node / Fragment / LyricsLineを異なる端末で変更した場合だけ競合。

V1では以下で十分:

```text
Cloud version
Local version

現在を採用
この端末を採用
両方残す
```

Lyrics Lineで`両方残す`の場合、隣接2Lineとして保持してよい。

Google Docs級のリアルタイム共同編集はV1対象外。

---

# 35. Undo / Redo

Cloud historyとは別にSession Command Historyを持つ。

Undoable commands:

```text
CreateNode
MoveNode
EditNode
DeleteNode
CreateEdge
DeleteEdge
EditEdge
CreateFragment
EditFragment
MoveFragment
EditLyricsLine
CreateLyricsLine
DeleteLyricsLine
MoveSection
RenameSection
```

履歴サイズは適切に制限。

ドラッグ中の中間座標をすべて履歴化しない。

1 drag = 1 command。

---

# 36. Delete / Trash

主要Domain DataはSoft Delete。

```text
deletedAt
```

削除直後Snackbar:

```text
削除しました    元に戻す
```

Trashから復元可能。

完全削除は明示操作のみ。

---

# 37. Recovery

V1:
- Autosave
- Undo/Redo
- Trash
- Crash Recovery Snapshot

を実装。

高度なVersion HistoryはPhase 2。

Crash / reload後に未同期Local dataを失わない。

---

# 38. Export

## 38.1 Markdown

1 Songを人間可読MarkdownとしてExport。

構造例:

```md
# Song Title

## Song Profile

Theme:
Mood:
BPM:
Key:

## Mind Map

### Theme Node

- child
- child

## Fragments

- fragment
- fragment

## Lyrics

### A

...

### Chorus

...
```

Edge relationの表現がTreeで表せない場合、別`Relationships` sectionを出してよい。

## 38.2 JSON

完全バックアップ。

含める:

```text
project
nodes
edges
tags
fragments
lyricsSections
lyricsLines
references
```

可能であればschemaVersionを含める。

```json
{
  "schemaVersion": 1
}
```

## 38.3 Import

V1:
- JSON Import必須

Phase 2:
- Markdown Import

Import時ID collisionを安全に処理。

---

# 39. PWA

必須:

- installable
- offline shell
- local data usable offline
- icons / manifest
- service worker
- update flow

可能ならApp Shortcut:

```text
Quick Capture
Continue Last Song
Inbox
```

Quick Capture shortcutはMobileの重要機能。

---

# 40. Design System

## 40.1 Visual Direction

キーワード:

- quiet
- premium
- creative
- focused
- dark-first
- music-production-like
- not corporate
- not toy-like

## 40.2 Dark Theme

Main themeはDark。

概念値:

```text
Canvas: near #111318
Panel: near #171A21
Raised: near #1E222B
```

正確な値はDesign Tokenで決定。

真っ黒`#000`を広範囲に使わない。

## 40.3 Light Theme

同等機能を提供。

## 40.4 Accent

初期案:
- blue violet系

Accentは1系統を中心にし、状態色以外で多色乱用しない。

## 40.5 Border / Shadow

影を強くしない。

階層:
- surface color difference
- subtle border
- minimal shadow

で表現。

## 40.6 Radius

目安:
- controls: 8px
- cards/nodes: 8〜12px

過剰なpill化を避ける。

## 40.7 Typography

日本語可読性最優先。

Fallback例:

```css
font-family:
  Inter,
  "Noto Sans JP",
  system-ui,
  sans-serif;
```

Web font unavailableでも崩れない。

Lyrics areaは本文より僅かにletter-spacingを広くしてもよい。

---

# 41. Motion

Micro interactionのみ。

目安:
- 150〜220ms
- subtle easing
- weak spring

対象:
- node appear
- panel open
- bottom sheet
- save status
- drag insertion guide
- selected highlight

派手なbounceや長いtransition禁止。

`prefers-reduced-motion`対応。

---

# 42. Accessibility

最低限:

- keyboard navigation
- focus-visible
- sufficient contrast
- icon-only buttonsへaria-label
- touch target適正サイズ
- color-only state禁止
- reduced motion
- semantic heading / landmark

---

# 43. Performance Requirements

以下を初期目標とする。

- 200 Nodes程度で日常操作が快適
- pan/zoom中に不要な全体再renderを避ける
- node drag中にDB writeしない
- lyrics typingでMap全体再renderしない
- selectorを細分化
- expensive derived dataをmemoize

将来1000 Nodesへの拡張を阻害しない構造にする。

---

# 44. Error Handling

ユーザー向けエラーは短く明確に。

例:

```text
同期できませんでした
変更はこの端末に保存されています
```

クラウドエラーで編集をブロックしない。

Export失敗:
- retry可能
- local dataを変更しない

Import失敗:
- transaction rollback
- partial import禁止

---

# 45. MVP — V1必須機能

以下すべてを満たした状態をV1完成とする。

## Shell / Navigation

- Home
- Songs
- Inbox
- Song Workspace
- Settings
- responsive navigation

## Song

- create
- open
- rename
- duplicate
- pin
- archive
- soft delete
- restore

## Mind Map

- Node CRUD
- Edge CRUD
- free positioning
- pan
- zoom
- fit
- minimap
- multi-select
- Node Type
- Node Status
- Tags
- Favorite
- collapse
- Focus mode

## Lyrics

- Section CRUD
- Section reorder
- Section collapse
- Line editing
- stable Line IDs
- Node → Lyrics
- Fragment → Lyrics
- Source Link

## Fragments

- CRUD
- Favorite
- Tags
- Node → Fragment
- Lyrics → Fragment
- Fragment → Lyrics

## Inbox

- Global Quick Capture
- Inbox list
- Inbox → Node
- Inbox → Fragment
- Inbox → New Song

## Mobile

- dedicated mobile navigation
- touch Map
- Bottom Sheet Node Editor
- Quick Add
- Quick Capture
- Mobile Lyrics
- Mobile Fragments
- Mobile List
- Send to Lyrics workflow

## Persistence

- IndexedDB
- Autosave
- Undo / Redo
- Trash
- recovery

## Sync

- Guest local mode
- Account mode
- cross-device cloud sync
- offline queue
- basic conflict handling

## Export / Import

- Markdown Export
- JSON Export
- JSON Import

## PWA

- installable
- offline app shell
- local offline editing

## Appearance

- Dark
- Light
- responsive
- polished micro interactions

---

# 46. Phase 2

V1完了後のみ着手。

- Advanced Version History
- Markdown Import
- Custom Template creation
- char count
- Japanese mora count
- rhyme assistance
- richer reference management
- project-wide advanced search
- user-customizable node colors
- alternate canvas layouts
- relation graph analysis
- node grouping / frames

---

# 47. Phase 3 / Experimental

明示的な追加要求があるまで実装しない。

- AI lyric assistance
- AI node generation
- AI summarization
- AI clustering
- audio playback
- DAW integration
- Spotify integration
- real-time collaboration
- CRDT
- shared projects
- comments
- public publishing

AIをV1に勝手に追加しない。

---

# 48. Non-goals

V1で以下を目指さない。

- DAW
- 楽譜エディタ
- 音声録音ソフト
- MIDI編集
- 完全なNotion代替
- 汎用ホワイトボード
- チーム向けPMツール
- SNS
- 公開作品投稿サイト

SongMapの主目的は**個人の作詞と思考整理**。

---

# 49. UI実装で避けること

以下は禁止または極力避ける。

- 常時大量のtoolbar
- 画面中央の頻繁なmodal
- 保存確認連発
- New Songで大量必須項目
- Desktop UIをMobileへ縮小
- ノードに大量情報を常時表示
- すべてをカード化
- 過度なglassmorphism
- 過度なgradient
- 大量のaccent color
- 何を押せるか分からない極端なminimalism
- hover前提のMobile UI
- Swipeで即削除
- Cloud障害による編集停止

---

# 50. テスト要件

## Unit

最低限:

- Inbox → Node conversion
- Inbox → Fragment conversion
- Node → Lyrics source link
- Fragment → Lyrics source link
- Markdown serialization
- JSON export/import
- soft delete / restore
- revision increment
- filter selectors

## Integration

- create project → create node → lyricsへ送る
- quick capture → inbox → projectへ移動
- offline edit → reconnect → sync
- desktop edit → mobile fetch
- conflict detection

## E2E

重要シナリオ:

### Scenario A

```text
Home
→ Quick Capture
→ Inbox
→ Existing Song
→ Convert to Fragment
→ Send to Lyrics
```

### Scenario B

```text
New Song
→ Double click Canvas
→ Create Free Node
→ Change to Emotion
→ Add child
→ Drag child
→ Send phrase to Chorus
```

### Scenario C

```text
Mobile
→ Open Last Song
→ Quick Add
→ Create Node
→ Send to Lyrics
→ Edit Chorus
→ Close App
→ Desktop Open
→ Same change exists
```

---

# 51. V1 Acceptance Criteria

V1は「画面が存在する」だけでは完成扱いにしない。

以下を満たすこと。

## Capture

- App起動後2アクション以内でQuick Capture入力開始可能
- Song内2アクション以内でQuick Add入力開始可能
- Offlineでも保存できる

## Map

- Node操作で明確な引っかかりがない
- Zoom/Panが自然
- Node追加が高速
- Nodeが増えてもCanvasが主役

## Lyrics

- 普通の文章入力感覚を壊さない
- Section操作が直感的
- Source追跡が動く

## Mobile

- Desktopの縮小版に見えない
- 親指操作中心
- Map / Lyrics / Fragmentの移動が簡単

## Save

- 保存状態が常に理解できる
- reloadしてもデータが残る
- offlineでもデータが残る
- sync失敗時もLocal dataが残る

## Cross Device

- 同一アカウントでDesktop/MobileのSongが同期される
- 通常編集では競合ダイアログが頻発しない

## Appearance

- Dark Themeが完成形として成立
- hover / focus / selected / disabled / error stateが定義済み
- loading skeleton等が最低限存在
- placeholderだらけの開発UIで終わらない

---

# 52. 実装順序

Codexは原則この順で進める。

## Phase A — Foundation

1. Project setup
2. TypeScript strict
3. Design tokens
4. routing
5. responsive shell
6. IndexedDB repository
7. domain models
8. basic test environment

## Phase B — Song Core

1. Home
2. Songs list
3. New Song
4. Project CRUD
5. local persistence

## Phase C — Canvas

1. Canvas integration
2. Node CRUD
3. Edge CRUD
4. pan/zoom
5. selection
6. Node Type/Status
7. tags
8. favorite
9. focus/filter

## Phase D — Lyrics

1. Lyrics sections
2. stable lyric lines
3. editor
4. reorder
5. source linkage
6. Map → Lyrics

## Phase E — Fragments / Inbox

1. Fragment
2. Fragment Box
3. Quick Add
4. Global Quick Capture
5. Inbox
6. conversions

## Phase F — Mobile

1. mobile navigation
2. touch canvas
3. bottom sheets
4. quick actions
5. mobile lyrics
6. mobile fragments
7. mobile list

## Phase G — Safety

1. Undo/Redo
2. Soft Delete
3. Trash
4. recovery
5. import/export

## Phase H — PWA / Sync

1. PWA
2. Auth
3. Cloud repository
4. Sync queue
5. offline behavior
6. conflict handling
7. cross-device validation

## Phase I — Polish

1. animation
2. keyboard
3. accessibility
4. empty states
5. loading
6. error states
7. performance
8. E2E tests

---

# 53. Codex作業ルール

実装時は巨大な一括変更を避ける。

各Phaseで:

1. 実装
2. lint
3. typecheck
4. test
5. build
6. 主要操作を確認
7. commit相当の区切りを作る

を繰り返す。

エラーを放置して次Phaseへ進まない。

---

# 54. READMEに含める内容

最低限:

- SongMap概要
- setup
- development command
- build
- tests
- environment variables
- cloud setup
- architecture
- directory structure
- IndexedDB説明
- sync概要
- export/import
- PWA
- known limitations

---

# 55. 推奨ディレクトリ

一例。

```text
src/
├ app/
│  ├ routes/
│  ├ providers/
│  └ shell/
├ domain/
│  ├ project/
│  ├ node/
│  ├ edge/
│  ├ fragment/
│  ├ lyrics/
│  ├ inbox/
│  └ tag/
├ features/
│  ├ home/
│  ├ songs/
│  ├ canvas/
│  ├ lyrics/
│  ├ fragments/
│  ├ inbox/
│  ├ search/
│  ├ export/
│  ├ import/
│  └ sync/
├ components/
│  ├ ui/
│  └ shared/
├ data/
│  ├ local/
│  ├ cloud/
│  ├ repositories/
│  └ sync/
├ state/
├ styles/
├ hooks/
├ utils/
└ tests/
```

FeatureとDomainを完全に混ぜない。

---

# 56. 最重要ユーザーフロー

実装判断に迷ったらこの流れを優先する。

## Flow 1 — 思いつきを逃さない

```text
App Open
↓
Quick Capture
↓
Type
↓
Save
↓
Inbox
```

最短。

## Flow 2 — 曲の中で思考を広げる

```text
Song Open
↓
Canvas
↓
Double Click / Quick Add
↓
Node
↓
Connect / Add child
↓
Organize
```

## Flow 3 — 思考を歌詞へ落とす

```text
Node
↓
Send / Drag
↓
Lyrics Section
↓
Lyrics Line
↓
Source preserved
```

## Flow 4 — まだ歌詞にならないものを残す

```text
Node
↓
Fragment
↓
Later
↓
Lyrics
```

## Flow 5 — スマホからPCへ

```text
Mobile Quick Add
↓
Local Save
↓
Cloud Sync
↓
Desktop
↓
Continue editing
```

---

# 57. Product Definition of Done

以下が自然にできる状態を「SongMapらしい」と判断する。

ユーザーが深夜にスマホで一行だけ思いついた。

```text
「世界の歯車から外れた夜」
```

SongMapを開き、即Quick Captureする。

翌日PCを開く。

Inboxにその一行がある。

制作中のSongへFragmentとして移動する。

既存Mind Mapの「昔の自由」というNodeと関連づける。

そのFragmentをChorusへ送る。

Lyricsでは一行として編集できる。

後からSourceを押すと、元FragmentとNodeへ戻れる。

すべて自動保存され、PCを閉じてもスマホ側で続きが見える。

この体験がスムーズに成立すること。

これがV1における最終的な成功条件である。
