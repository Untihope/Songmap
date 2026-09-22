import { useBufferedText, flushEdits } from '../../components/useBufferedText'
import { Dialog } from '../../components/Dialog'
import { lyricToFragment } from '../../domain/fragment/service'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive, newMeta, type LyricsLine, type LyricsSection } from '../../domain/models'
import { addLine, duplicateSection, mergeLine, moveSection, sendToLyrics, splitLine } from '../../domain/lyrics/service'
import { useWorkspace } from '../../state/workspace'
import { run, useUI } from '../../state/ui'
import { BufferedInput } from '../../components/BufferedInput'
function LyricInput({line}:{line:LyricsLine}){
 const edit=useBufferedText(line.text,text=>repository.patch('lyricsLines',line.id,{text}))
 const [busy,setBusy]=useState(false)
 const focus=(id:string)=>{let attempts=0;const next=()=>{const input=document.querySelector<HTMLTextAreaElement>('[data-line-id="'+id+'"]');if(input)input.focus();else if(attempts++<20)setTimeout(next,30)};setTimeout(next,0)}
 return <div className="lyric-line"><textarea rows={1} aria-label="歌詞" data-line-id={line.id} value={edit.text} readOnly={busy} onChange={e=>edit.change(e.target.value)} onBlur={()=>run(edit.flush())} onKeyDown={e=>{
  if(e.nativeEvent.isComposing||busy)return
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();const value=e.currentTarget.value,start=e.currentTarget.selectionStart,end=e.currentTarget.selectionEnd;setBusy(true);run(edit.flush().then(()=>splitLine(line,value,start,end)).then(n=>focus(n.id)).finally(()=>setBusy(false)))}
  if(e.key==='Backspace'&&e.currentTarget.selectionStart===0&&e.currentTarget.selectionEnd===0){e.preventDefault();const value=e.currentTarget.value;setBusy(true);run(flushEdits().then(()=>mergeLine(line,value)).then(n=>{if(n)focus(n.id)}).finally(()=>setBusy(false)))}
 }}/>{edit.failed&&<button onClick={()=>run(edit.flush())}>保存を再試行</button>}<button className="line-more" aria-label="Fragmentへ戻す" onClick={()=>run(edit.flush().then(()=>lyricToFragment(line.id)),'Fragmentに戻しました')}>⋯</button>{(line.sourceNodeIds.length>0||line.sourceFragmentIds.length>0)&&<button className="source-link" aria-label="Sourceを表示" onClick={()=>useWorkspace.setState({sourceLine:line.id})}>↗</button>}</div>
}

function Section({section:s,previousId,nextId,afterNextId}:{section:LyricsSection;previousId?:string;nextId?:string;afterNextId?:string}){
 const lines=useLiveQuery(async()=>(await db.records('lyricsLines').where('sectionId').equals(s.id).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[s.id])
 return <section className="lyrics-section" data-section-id={s.id} onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drop-target')}} onDragLeave={e=>e.currentTarget.classList.remove('drop-target')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drop-target');const id=e.dataTransfer.getData('section');if(id)run(moveSection(s.projectId,id,s.id))}}>
  <div className="section-heading"><button aria-label={s.name+(s.collapsed?' を展開':' を折りたたむ')} onClick={()=>run(repository.patch('lyricsSections',s.id,{collapsed:!s.collapsed}))}>{s.collapsed?'›':'⌄'}</button><BufferedInput value={s.name} label="セクション名" onSave={name=>repository.patch('lyricsSections',s.id,{name})}/><details><summary aria-label={s.name+' の操作'}>•••</summary><div className="section-menu"><button draggable onDragStart={e=>e.dataTransfer.setData('section',s.id)}>⠿ ドラッグで並べ替え</button><button disabled={!previousId} onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');run(moveSection(s.projectId,s.id,previousId!))}}>上へ</button><button disabled={!nextId} onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');run(moveSection(s.projectId,s.id,afterNextId??''))}}>下へ</button><button onClick={()=>run(duplicateSection(s.id))}>複製</button><button onClick={()=>run(repository.remove('lyricsSections',s.id),'セクションを削除しました')}>削除</button></div></details></div>
  {!s.collapsed&&<div className="section-content">{lines?.map(l=><LyricInput key={l.id} line={l}/>)}<button className="blank-line" aria-label={s.name+' に歌詞を書く'} onClick={()=>run(addLine(s.id,'').then(l=>requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('[data-line-id="'+l.id+'"]')?.focus())))}>{lines?.length?'＋':'ここから書き始める…'}</button></div>}
 </section>
}
export function LyricsPanel({projectId}:{projectId:string}){
 const sections=useLiveQuery(async()=>(await db.records('lyricsSections').where('projectId').equals(projectId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[projectId])
 return <aside className="lyrics-panel"><div className="lyrics-title"><p className="eyebrow">LYRICS</p><h2>言葉を、歌に。</h2></div>{!sections&&<p role="status">歌詞を読み込み中…</p>}{sections?.length===0&&<p className="muted">セクションを追加して、最初の一行を書こう。</p>}{sections?.map((s,i)=><Section key={s.id} section={s} previousId={sections[i-1]?.id} nextId={sections[i+1]?.id} afterNextId={sections[i+2]?.id}/>)} <button className="add-section" onClick={()=>run(repository.put('lyricsSections',{...newMeta(),projectId,name:'新しいセクション',order:(sections?.at(-1)?.order??-1)+1,collapsed:false}))}>＋ セクション</button></aside>
}
export function SendSheet({projectId}:{projectId:string}){
 const sendId=useWorkspace(s=>s.sendId),sendType=useWorkspace(s=>s.sendType);const [busy,setBusy]=useState(false);const [sectionId,setSectionId]=useState('');const [before,setBefore]=useState('')
 const sections=useLiveQuery(async()=>(await db.records('lyricsSections').where('projectId').equals(projectId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[projectId])
 const target=(sections?.some(s=>s.id===sectionId)?sectionId:'')||sections?.find(s=>s.name==='Chorus')?.id||sections?.[0]?.id||''
 const lines=useLiveQuery(async()=>(await db.records('lyricsLines').where('sectionId').equals(target).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[target])
 if(!sendId)return null
 return <Dialog label="歌詞へ送る" onClose={()=>useWorkspace.setState({sendId:''})}><div className="row between"><h2>歌詞へ送る</h2><button autoFocus onClick={()=>useWorkspace.setState({sendId:''})} aria-label="送信を閉じる">×</button></div><label>セクション<select value={target} onChange={e=>{setSectionId(e.target.value);setBefore('')}}>{sections?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>位置<select value={before} onChange={e=>setBefore(e.target.value)}><option value="">末尾</option>{lines?.map((l,i)=><option key={l.id} value={l.id}>{i+1}行目の前: {l.text.slice(0,20)}</option>)}</select></label><button className="primary" disabled={!target||busy} onClick={()=>{setBusy(true);run(flushEdits().then(()=>sendToLyrics(sendType,sendId,target,lines?.some(l=>l.id===before)?before:undefined)).then(()=>{useWorkspace.setState({sendId:''});useUI.getState().notify((sections?.find(s=>s.id===target)?.name??'歌詞')+'へ追加しました')}).finally(()=>setBusy(false)))}}>追加する</button>{sections?.length===0&&<p>歌詞パネルでセクションを追加してください。</p>}</Dialog>
}
export function SourceSheet(){
 const sourceLine=useWorkspace(s=>s.sourceLine)
 const sources=useLiveQuery(async()=>{const l=await db.records('lyricsLines').get(sourceLine);if(!l)return null;return {nodes:await db.records('nodes').bulkGet(l.sourceNodeIds),fragments:await db.records('fragments').bulkGet(l.sourceFragmentIds)}},[sourceLine])
 if(!sourceLine)return null
 return <Dialog label="Source" onClose={()=>useWorkspace.setState({sourceLine:''})}><div className="row between"><h2>この言葉の生まれた場所</h2><button autoFocus aria-label="Sourceを閉じる" onClick={()=>useWorkspace.setState({sourceLine:''})}>×</button></div>{sources===undefined&&<p role="status">Sourceを読み込み中…</p>}{sources===null&&<p>元の歌詞が見つかりません。</p>}{sources?.nodes.map((n,i)=>n?<button key={n.id} onClick={()=>{if(n.deletedAt){useUI.getState().notify('元ノードはゴミ箱にあります');return}useWorkspace.getState().reveal(n.id);useWorkspace.setState({sourceLine:''})}}>↗ {n.text}{n.deletedAt?'（削除済み）':''}</button>:<p key={i}>元ノードが見つかりません</p>)}{sources?.fragments.map((f,i)=>f?<button key={f.id} onClick={()=>{if(f.deletedAt){useUI.getState().notify('元Fragmentはゴミ箱にあります');return}useWorkspace.setState({mobileView:'fragments',sourceLine:'',zen:false});requestAnimationFrame(()=>document.getElementById('fragment-'+f.id)?.scrollIntoView({block:'center'}))}}>↗ {f.text}{f.deletedAt?'（削除済み）':''}</button>:<p key={i}>元Fragmentが見つかりません</p>)}</Dialog>
}
