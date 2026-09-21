import { db, type SongMapDatabase } from '../local/database'
import { domainTables, type DomainTable, type DomainTables } from '../../domain/models'
export class LocalRepository {
  constructor(readonly database: SongMapDatabase = db) {}
  async put<K extends DomainTable>(table: K, record: DomainTables[K]): Promise<DomainTables[K]> {
    return this.database.transaction('rw', [this.database.records(table), this.database.syncQueue], async () => {
      const previous = await this.database.records(table).get(record.id)
      const next = { ...record, revision: previous ? previous.revision + 1 : 1, updatedAt: new Date().toISOString() }
      await this.database.records(table).put(next)
      await this.database.syncQueue.put({ id: crypto.randomUUID(), table, recordId: next.id, record: next,
        baseRevision: previous?.revision ?? 0, createdAt: next.updatedAt })
      return next
    })
  }
  async patch<K extends DomainTable>(table: K, id: string, changes: Partial<DomainTables[K]>) {
    return this.atomic(async () => {
      const record = await this.database.records(table).get(id)
      if (!record) throw new Error('データが見つかりません')
      return this.put(table, { ...record, ...changes, id })
    })
  }
  async atomic<T>(work: () => Promise<T>): Promise<T> {
    return this.database.transaction('rw', [...domainTables, 'syncQueue', 'trash', 'snapshots'], work)
  }
  async remove<K extends DomainTable>(table: K, id: string) {
    return this.atomic(async () => {
      const deletedAt = new Date().toISOString()
      await this.patch(table, id, { deletedAt } as Partial<DomainTables[K]>)
      await this.database.trash.put({ id: `${table}:${id}`, table, recordId: id, deletedAt })
    })
  }
  async restore<K extends DomainTable>(table: K, id: string) {
    return this.atomic(async () => {
      await this.patch(table, id, { deletedAt: undefined } as Partial<DomainTables[K]>)
      await this.database.trash.delete(`${table}:${id}`)
    })
  }
}
export const repository = new LocalRepository()
