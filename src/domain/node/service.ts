import { newMeta, isLive, type SongNode, type SongEdge, type NodeType } from '../models'
import { repository, type LocalRepository } from '../../data/repositories/localRepository'
export const nodeTypes: Record<NodeType, string> = { theme:'◎ テーマ', emotion:'♡ 感情', scene:'▧ 情景', keyword:'# キーワード', phrase:'“ フレーズ', structure:'≡ 構成', free:'· 自由' }
export const statuses = { raw:'未整理', candidate:'候補', adopted:'採用', hold:'保留', rejected:'見送り' } as const
export async function addNode(projectId: string, text: string, position = { x:0, y:0 }, parentId?: string, repo: LocalRepository = repository) {
  if (!text.trim()) throw new Error('言葉を入力してください')
  return repo.atomic(async () => {
    const project = await repo.database.records('projects').get(projectId)
    if (!project || project.deletedAt) throw new Error('曲が見つかりません')
    const n: SongNode = { ...newMeta(), projectId, text: text.trim(), position, type:'free', status:'raw', favorite:false, collapsed:false, tagIds:[] }
    await repo.put('nodes', n)
    if (parentId) await connect(projectId, parentId, n.id, repo)
    return n
  })
}
type NodeSize = { width: number; height: number }
const estimatedSize = (node: Pick<SongNode, 'text' | 'width' | 'tagIds'>): NodeSize => ({
  width: node.width ?? 210,
  height: Math.max(110, 65 + node.text.split('\n').reduce((lines, text) => lines + Math.max(1, Math.ceil(text.length / 12)), 0) * 26 + (node.tagIds.length ? 28 : 0)),
})
/** Allocate against the latest records inside the same transaction as creation. */
export async function addChildNode(projectId: string, text: string, parentId: string, sizes: Record<string, NodeSize> = {}, repo: LocalRepository = repository) {
  return repo.atomic(async () => {
    const nodes = (await repo.database.records('nodes').where('projectId').equals(projectId).toArray()).filter(isLive)
    const parent = nodes.find(n => n.id === parentId)
    if (!parent) throw new Error('親ノードが見つかりません')
    const parentSize = sizes[parent.id] ?? estimatedSize(parent)
    const size = estimatedSize({ text, tagIds: [] })
    const x = parent.position.x + parentSize.width + 90
    const gap = 40
    const obstacles = nodes.map(n => ({ ...n.position, ...(sizes[n.id] ?? estimatedSize(n)) }))
      .filter(n => x < n.x + n.width + gap && x + size.width + gap > n.x)
    const candidates = [parent.position.y, ...obstacles.flatMap(n => [n.y + n.height + gap, n.y - size.height - gap])]
      .sort((a, b) => Math.abs(a - parent.position.y) - Math.abs(b - parent.position.y) || b - a)
    const y = candidates.find(y => obstacles.every(n => y + size.height + gap <= n.y || y >= n.y + n.height + gap))!
    if (parent.collapsed) await repo.patch('nodes', parent.id, { collapsed: false })
    return addNode(projectId, text, { x, y }, parent.id, repo)
  })
}
export async function connect(projectId: string, source: string, target: string, repo: LocalRepository = repository) {
  return repo.atomic(async () => {
    if (source === target) throw new Error('別のノードを選んでください')
    const [a,b] = await Promise.all([repo.database.records('nodes').get(source),repo.database.records('nodes').get(target)])
    if (!a || !b || !isLive(a) || !isLive(b) || a.projectId !== projectId || b.projectId !== projectId) throw new Error('この曲のノード同士を接続してください')
    const edges = await repo.database.records('edges').where('projectId').equals(projectId).toArray()
    const existing = edges.find(e => isLive(e) && e.sourceNodeId === source && e.targetNodeId === target)
    if (existing) return existing
    return repo.put('edges', { ...newMeta(), projectId, sourceNodeId:source, targetNodeId:target, relationType:'related' })
  })
}
export async function setNodeTags(node: SongNode, text: string, repo: LocalRepository = repository) {
  return repo.atomic(async () => {
    const existing = await repo.database.records('tags').where('projectId').equals(node.projectId).toArray()
    const ids: string[] = []
    for (const name of [...new Set(text.split(/[,、#]/).map(s => s.trim()).filter(Boolean))]) {
      const tag = existing.find(t => isLive(t) && t.name === name) ?? await repo.put('tags', { ...newMeta(), projectId:node.projectId, name })
      ids.push(tag.id)
    }
    return repo.patch('nodes', node.id, { tagIds:ids })
  })
}
export function relatedIds(selected: string, edges: SongEdge[], depth = 1) {
  const ids = new Set([selected])
  for(let i=0;i<depth;i++){ const layer = new Set(ids); for(const e of edges.filter(isLive)) { if(layer.has(e.sourceNodeId)) ids.add(e.targetNodeId); if(layer.has(e.targetNodeId)) ids.add(e.sourceNodeId) } }
  return ids
}
export function matchesNode(n: SongNode, search: string, type: string, status: string, tags: string[]) {
  return isLive(n) && (!type || n.type === type) && (!status || n.status === status) && tags.every(t => n.tagIds.includes(t)) && (n.text + ' ' + (n.note ?? '')).toLowerCase().includes(search.toLowerCase())
}
