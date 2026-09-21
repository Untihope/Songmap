export interface RecordMeta {
  id: string; createdAt: string; updatedAt: string; revision: number; deletedAt?: string
}
export type ProjectStatus = 'idea' | 'writing' | 'revising' | 'completed' | 'archived'
export interface Project extends RecordMeta {
  ownerId?: string; title: string; theme?: string; moods: string[]; bpm?: number; key?: string
  status: ProjectStatus; pinned: boolean; archived: boolean; lastOpenedAt?: string
}
export type NodeType = 'theme' | 'emotion' | 'scene' | 'keyword' | 'phrase' | 'structure' | 'free'
export type NodeStatus = 'raw' | 'candidate' | 'adopted' | 'hold' | 'rejected'
export interface SongNode extends RecordMeta {
  projectId: string; text: string; note?: string; type: NodeType; status: NodeStatus
  importance?: number; position: { x: number; y: number }; width?: number
  collapsed: boolean; favorite: boolean; tagIds: string[]
}
export type RelationType = 'related' | 'cause' | 'contrast' | 'rephrase' | 'chronology' | 'foreshadow' | 'payoff' | 'custom'
export interface SongEdge extends RecordMeta {
  projectId: string; sourceNodeId: string; targetNodeId: string; relationType: RelationType; customLabel?: string
}
export interface Tag extends RecordMeta { projectId: string; name: string }
export interface Fragment extends RecordMeta {
  projectId: string; text: string; note?: string; favorite: boolean; tagIds: string[]
  status: NodeStatus; sourceNodeId?: string
}
export interface LyricsSection extends RecordMeta { projectId: string; name: string; order: number; collapsed: boolean }
export interface LyricsLine extends RecordMeta {
  sectionId: string; text: string; order: number; sourceNodeIds: string[]; sourceFragmentIds: string[]
}
export type InboxSource = 'home' | 'quickCapture' | 'mobileShortcut' | 'project'
export type InboxStatus = 'raw' | 'converted' | 'archived'
export interface InboxItem extends RecordMeta {
  ownerId?: string; text: string; note?: string; status: InboxStatus; source: InboxSource
  convertedAt?: string; convertedToType?: 'node' | 'fragment' | 'project'; convertedToId?: string
}
export interface ProjectReference extends RecordMeta {
  projectId: string; title: string; type: 'song' | 'lyrics' | 'video' | 'image' | 'text' | 'other'; url?: string; note?: string
}
export interface WorkspaceState {
  id: string; projectId: string; deviceClass: 'phone' | 'tablet' | 'desktop'
  zoom?: number; viewportX?: number; viewportY?: number; sidebarWidth?: number; lyricsPanelWidth?: number
  sidebarCollapsed?: boolean; lyricsCollapsed?: boolean; selectedNodeId?: string
  activeView?: 'canvas' | 'focus' | 'lyrics' | 'zen'
}
export interface DomainTables {
  projects: Project; nodes: SongNode; edges: SongEdge; tags: Tag; fragments: Fragment
  lyricsSections: LyricsSection; lyricsLines: LyricsLine; inboxItems: InboxItem; references: ProjectReference
}
export type DomainTable = keyof DomainTables
export type DomainRecord = DomainTables[DomainTable]
export interface SyncEntry {
  id: string; table: DomainTable; recordId: string; record: DomainRecord; baseRevision: number; createdAt: string
}
export interface TrashEntry { id: string; table: DomainTable; recordId: string; deletedAt: string }
export const domainTables: DomainTable[] = ['projects', 'nodes', 'edges', 'tags', 'fragments', 'lyricsSections', 'lyricsLines', 'inboxItems', 'references']
export const newMeta = (): RecordMeta => {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, revision: 1 }
}
export const isLive = <T extends { deletedAt?: string }>(item: T) => !item.deletedAt
