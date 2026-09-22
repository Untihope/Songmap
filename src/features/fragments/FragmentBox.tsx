import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive, type NodeStatus } from '../../domain/models'
import { createFragment, fragmentToNode, setFragmentTags } from '../../domain/fragment/service'
import { statuses } from '../../domain/node/service'
import { BufferedInput } from '../../components/BufferedInput'
import { useWorkspace } from '../../state/workspace'
import { run } from '../../state/ui'
export function FragmentBox({projectId}:{projectId:string}){
 const items=useLiveQuery(async()=>(await db.records('fragments').where('projectId').equals(projectId).toArray()).filter(isLive).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||b.createdAt.localeCompare(a.createdAt)),[projectId])
 const nodes=useLiveQuery(async()=>(await db.records('nodes').where('projectId').equals(projectId).toArray()).filter(isLive),[projectId])
 const tags=useLiveQuery(()=>db.records('tags').where('projectId').equals(projectId).toArray(),[projectId])
 const [text,setText]=useState('')
 return <section className="fragment-box"><p className="eyebrow">FRAGMENTS</p><h2>まだ、歌詞になる前の言葉。</h2><form className="row" onSubmit={e=>{e.preventDefault();run(createFragment(projectId,text).then(()=>setText('')))}}><input aria-label="新しいFragment" placeholder="一行の断片を残す…" value={text} onChange={e=>setText(e.target.value)}/><button aria-label="Fragmentを追加" disabled={!text.trim()}>＋</button></form>{items===undefined&&<p role="status">Fragmentを読み込み中…</p>}{items?.map(f=><article className="fragment-item" id={'fragment-'+f.id} key={f.id}><BufferedInput multiline label="Fragment" value={f.text} onSave={text=>repository.patch('fragments',f.id,{text})}/><div className="row"><button aria-label="Fragmentのお気に入り" aria-pressed={f.favorite} onClick={()=>run(repository.patch('fragments',f.id,{favorite:!f.favorite}))}>{f.favorite?'★':'☆'}</button><button onClick={()=>useWorkspace.setState({sendId:f.id,sendType:'fragments'})}>歌詞へ</button>{f.sourceNodeId&&<button aria-label="元Nodeへ" onClick={()=>useWorkspace.getState().reveal(f.sourceNodeId!)}>↗</button>}<details><summary aria-label="Fragmentの操作">•••</summary><div className="stack"><label>関連するNode<select aria-label="関連するNode" value={f.sourceNodeId??''} onChange={e=>run(repository.patch('fragments',f.id,{sourceNodeId:e.target.value||undefined}))}><option value="">未設定</option>{nodes?.map(n=><option key={n.id} value={n.id}>{n.text}</option>)}</select></label><label>タグ<BufferedInput label="Fragmentのタグ" value={(tags??[]).filter(t=>f.tagIds.includes(t.id)).map(t=>t.name).join(', ')} onSave={text=>setFragmentTags(f,text)}/></label><label>状態<select value={f.status} onChange={e=>run(repository.patch('fragments',f.id,{status:e.target.value as NodeStatus}))}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><button onClick={()=>run(fragmentToNode(f).then(n=>useWorkspace.getState().reveal(n.id)))}>Nodeにする</button><button onClick={()=>run(repository.remove('fragments',f.id),'削除しました')}>Fragmentを削除</button></div></details></div></article>)}{items?.length===0&&<p className="muted fragment-empty">使うか決めるのは、あとで。思い浮かんだ一行を残しておこう。</p>}</section>
}
