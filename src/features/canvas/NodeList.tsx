import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { matchesNode, nodeTypes, statuses } from '../../domain/node/service'
import { useWorkspace } from '../../state/workspace'
export function NodeList({projectId}:{projectId:string}){
 const {search,filterType,filterStatus,filterTags}=useWorkspace()
 const nodes=useLiveQuery(()=>db.records('nodes').where('projectId').equals(projectId).toArray(),[projectId])
 const tags=useLiveQuery(()=>db.records('tags').where('projectId').equals(projectId).toArray(),[projectId])
 const filtered=nodes?.filter(n=>matchesNode(n,search,filterType,filterStatus,filterTags))
 return <section className="node-list"><p className="eyebrow">ALL YOUR THOUGHTS</p><h2>言葉を探す</h2><div className="stack"><input aria-label="Listの検索" placeholder="テキスト・メモを検索" value={search} onChange={e=>useWorkspace.setState({search:e.target.value})}/><div className="row"><select aria-label="Listの種類" value={filterType} onChange={e=>useWorkspace.setState({filterType:e.target.value})}><option value="">すべての種類</option>{Object.entries(nodeTypes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select aria-label="Listの状態" value={filterStatus} onChange={e=>useWorkspace.setState({filterStatus:e.target.value})}><option value="">すべての状態</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div><div className="row">{tags?.map(t=><button key={t.id} aria-pressed={filterTags.includes(t.id)} onClick={()=>useWorkspace.setState({filterTags:filterTags.includes(t.id)?filterTags.filter(id=>id!==t.id):[...filterTags,t.id]})}>#{t.name}</button>)}</div></div><div className="node-list-items">{filtered?.map(n=><button key={n.id} onClick={()=>useWorkspace.getState().reveal(n.id)}><small>{nodeTypes[n.type]} · {statuses[n.status]}</small><span>{n.text}</span>{n.favorite&&<small>★</small>}</button>)}</div>{filtered?.length===0&&<p className="empty">該当する言葉はありません。</p>}</section>
}
