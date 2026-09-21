import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive, type InboxSource } from '../../domain/models'
import { capture, convertInbox } from '../../domain/fragment/service'
import { run, useUI } from '../../state/ui'
import { BufferedInput } from '../../components/BufferedInput'
export function QuickCapture({source='home',onDone,autoFocus=false}:{source?:InboxSource;onDone?:()=>void;autoFocus?:boolean}){
 const [text,setText]=useState('');const [busy,setBusy]=useState(false)
 const submit=()=>{if(!text.trim()||busy)return;setBusy(true);run(capture(text,source).then(()=>{setText('');useUI.getState().notify('Inboxに保存しました');onDone?.()}).finally(()=>setBusy(false)))}
 return <form className="capture-form" onSubmit={e=>{e.preventDefault();submit()}}><textarea rows={2} autoFocus={autoFocus} aria-label="Quick Capture" placeholder="思いついた言葉を、そのまま…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();submit()}}}/><div className="row between"><small>整理はあとで。Enterで保存 / Shift + Enterで改行</small><button className="primary" aria-label="Inboxに保存" disabled={busy||!text.trim()}>＋ 保存</button></div></form>
}
export function Inbox(){
 const items=useLiveQuery(async()=>(await db.records('inboxItems').toArray()).filter(i=>isLive(i)&&i.status==='raw').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
 const projects=useLiveQuery(async()=>(await db.records('projects').toArray()).filter(p=>isLive(p)&&!p.archived))
 const [selected,setSelected]=useState('');const [projectId,setProjectId]=useState('')
 return <div className="page inbox-page"><div className="row between"><div><p className="eyebrow">A PLACE FOR EVERY IDEA</p><h1>Inbox <small>{items?.length??0}</small></h1></div><Link to="/songs">曲へ →</Link></div><QuickCapture source="quickCapture"/><div className="inbox-list">{items?.map(i=><article key={i.id} className="inbox-item"><small>{new Date(i.createdAt).toLocaleString('ja-JP')}</small><BufferedInput multiline label="アイデア" value={i.text} onSave={text=>repository.patch('inboxItems',i.id,{text})}/><div className="row"><button onClick={()=>setSelected(i.id)}>曲へ移す</button><button onClick={()=>run(convertInbox(i.id,'project'),'新しい曲に保存しました')}>新しい曲にする</button><button aria-label="アイデアを削除" onClick={()=>run(repository.remove('inboxItems',i.id),'削除しました')}>削除</button></div>{selected===i.id&&<div className="conversion row"><label>曲<select aria-label="移動先の曲" value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">曲を選ぶ</option>{projects?.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button disabled={!projectId} onClick={()=>run(convertInbox(i.id,'fragment',projectId).then(()=>setSelected('')),'Fragmentに移しました')}>Fragmentにする</button><button disabled={!projectId} onClick={()=>run(convertInbox(i.id,'node',projectId).then(()=>setSelected('')),'Nodeに移しました')}>Nodeにする</button><button onClick={()=>setSelected('')}>閉じる</button></div>}</article>)}</div>{items?.length===0&&<div className="empty"><h2>まだ曲にならない言葉も、ここへ。</h2><p>上に入力して、Enterで保存できます。</p></div>}</div>
}
