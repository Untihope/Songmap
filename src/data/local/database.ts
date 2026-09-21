import Dexie, { type Table } from 'dexie'
import type { DomainTable, DomainTables, SyncEntry, TrashEntry, WorkspaceState } from '../../domain/models'
export class SongMapDatabase extends Dexie {
  constructor(name = 'songmap') {
    super(name)
    this.version(1).stores({
      projects: 'id, updatedAt, lastOpenedAt', nodes: 'id, projectId', edges: 'id, projectId',
      tags: 'id, projectId', fragments: 'id, projectId', lyricsSections: 'id, projectId',
      lyricsLines: 'id, sectionId', inboxItems: 'id, createdAt, status', references: 'id, projectId',
      workspaceStates: 'id, projectId', syncQueue: 'id, recordId, createdAt', trash: 'id, table, recordId',
      preferences: 'id', snapshots: 'id, createdAt',
    })
  }
  records<K extends DomainTable>(name: K): Table<DomainTables[K], string> { return this.table(name) }
  get syncQueue(): Table<SyncEntry, string> { return this.table('syncQueue') }
  get trash(): Table<TrashEntry, string> { return this.table('trash') }
  get workspaceStates(): Table<WorkspaceState, string> { return this.table('workspaceStates') }
}
export const db = new SongMapDatabase()
