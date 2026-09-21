import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { isLive } from '../../domain/models'
import { nodeTypes } from '../../domain/node/service'
import { useWorkspace } from '../../state/workspace'
export function Filters({projectId}:{projectId:string}){
  const {filterType,filterTags,search}=useWorkspace()
  const tags=useLiveQuery(()=>db.records('tags').where('projectId').equals(projectId).toArray(),[projectId])
  const nodes=useLiveQuery(()=>db.records('nodes').where('projectId').equals(projectId).toArray(),[projectId])
  return <div className="stack filters"><p className="eyebrow">NODES</p><input aria-label="ノード検索" placeholder="言葉を探す…" value={search} onChange={e=>useWorkspace.setState({search:e.target.value})}/><button className={!filterType?'active':''} onClick={()=>useWorkspace.setState({filterType:''})}>すべて</button>{Object.entries(nodeTypes).map(([k,v])=><button className={filterType===k?'active':''} key={k} onClick={()=>useWorkspace.setState({filterType:k})}>{v}<small>{nodes?.filter(n=>isLive(n)&&n.type===k).length??0}</small></button>)}<p className="eyebrow">TAGS</p><div className="row">{tags?.filter(isLive).map(t=><button key={t.id} aria-pressed={filterTags.includes(t.id)} onClick={()=>useWorkspace.setState({filterTags:filterTags.includes(t.id)?filterTags.filter(id=>id!==t.id):[...filterTags,t.id]})}>#{t.name} {nodes?.filter(n=>isLive(n)&&n.tagIds.includes(t.id)).length??0}</button>)}</div><p className="eyebrow">FAVORITES</p>{nodes?.filter(n=>isLive(n)&&n.favorite).map(n=><button key={n.id} onClick={()=>useWorkspace.getState().reveal(n.id)}>★ {n.text}</button>)}</div>
}
