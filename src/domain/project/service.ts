import { newMeta, isLive, type Project, type SongNode, type DomainTable, type DomainRecord } from '../models'
import { repository, type LocalRepository } from '../../data/repositories/localRepository'
export const templates = { Blank: [], Emotional: ['Emotion', 'Past', 'Present', 'Scene', 'Symbol / Metaphor'], Storytelling: ['Character', 'Situation', 'Conflict', 'Change', 'Conclusion'], 'Anime / Rock': ['World', 'Character', 'Obstacle', 'Decision', 'Keyword', 'Climax'] } as const
export type Template = keyof typeof templates
export async function createProject(title: string, template: Template = 'Blank', repo: LocalRepository = repository) {
  return repo.atomic(async () => {
    const meta = newMeta()
    const p: Project = { ...meta, title: title.trim() || 'Untitled ' + meta.createdAt.slice(0, 10) + ' ' + meta.id.slice(0, 4), moods: [], pinned: false, archived: false, status: 'idea', lastOpenedAt: meta.createdAt }
    await repo.put('projects', p)
    const center: SongNode = { ...newMeta(), projectId: p.id, text: p.title, type: 'theme', status: 'raw', position: { x: 0, y: 0 }, collapsed: false, favorite: false, tagIds: [] }
    await repo.put('nodes', center)
    for (const [i, text] of templates[template].entries()) {
      const node = { ...center, ...newMeta(), text, type: 'free' as const, position: { x: Math.cos(i * Math.PI / 3) * 320, y: Math.sin(i * Math.PI / 3) * 200 } }
      await repo.put('nodes', node)
      await repo.put('edges', { ...newMeta(), projectId: p.id, sourceNodeId: center.id, targetNodeId: node.id, relationType: 'related' })
    }
    for (const [order, name] of ['A', 'B', 'Chorus', 'A2', 'B2', 'Bridge', 'Last Chorus'].entries()) await repo.put('lyricsSections', { ...newMeta(), projectId: p.id, name, order, collapsed: false })
    return p
  })
}
export async function duplicateProject(id: string, repo: LocalRepository = repository) {
  return repo.atomic(async () => {
    const project = await repo.database.records('projects').get(id)
    if (!project) throw new Error('曲が見つかりません')
    const tables: DomainTable[] = ['nodes', 'edges', 'tags', 'fragments', 'lyricsSections', 'references']
    const records: { table: DomainTable; record: DomainRecord }[] = []
    for (const table of tables) {
      const items = await repo.database.records(table).where('projectId').equals(id).toArray()
      records.push(...items.filter(isLive).map(record => ({ table, record })))
    }
    const sections = records.filter(r => r.table === 'lyricsSections').map(r => r.record.id)
    if (sections.length) records.push(...(await repo.database.records('lyricsLines').where('sectionId').anyOf(sections).toArray()).filter(isLive).map(record => ({ table: 'lyricsLines' as const, record })))
    const clone = { ...project, ...newMeta(), title: project.title + ' のコピー', pinned: false, archived: false, deletedAt: undefined }
    const ids = new Map<string, string>(records.map(r => [r.record.id, crypto.randomUUID()]))
    ids.set(id, clone.id)
    await repo.put('projects', clone)
    for (const { table, record } of records) {
      const copy = { ...record, ...newMeta(), id: ids.get(record.id)! } as DomainRecord & Record<string, unknown>
      for (const key of ['projectId', 'sectionId', 'sourceNodeId', 'targetNodeId']) if (typeof copy[key] === 'string') copy[key] = ids.get(copy[key] as string)
      for (const key of ['tagIds', 'sourceNodeIds', 'sourceFragmentIds']) if (Array.isArray(copy[key])) copy[key] = (copy[key] as string[]).map(v => ids.get(v)).filter(Boolean)
      await repo.put(table, copy)
    }
    return clone
  })
}
