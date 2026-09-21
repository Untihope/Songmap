import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive, newMeta, type LyricsLine, type LyricsSection } from '../../domain/models'
import { addLine, duplicateSection, mergeLine, moveSection, sendToLyrics, splitLine } from '../../domain/lyrics/service'
import { useWorkspace } from '../../state/workspace'
import { run, useUI } from '../../state/ui'
import { BufferedInput } from '../../components/BufferedInput'
function LyricInput({line}:{line:LyricsLine}){
 const [draft,setDraft]=useState<string|null>(null);const pending=useRef<string|undefined>(undefined);const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const flush=useCallback(()=>{clearTimeout(timer.current);const text=pending.current;if(text===undefined)return;pending.current=undefined;run(repository.patch('lyricsLines',line.id,{text}).then(()=>{if(pending.current===undefined)setDraft(null)}).catch(e=>{pending.current=text;throw e}))},[line.id])
 useEffect(()=>{window.addEventListener('songmap:save',flush);return()=>{flush();window.removeEventListener('songmap:save',flush)}},[flush])
 const focus=(id:string)=>requestAnimationFrame(()=>{const input=document.querySelector<HTMLTextAreaElement>('[data-line-id="'+id+'"]');input?.focus()})
 return <div className="lyric-line"><textarea rows={1} aria-label="歌詞" data-line-id={line.id} value={draft??line.text} onChange={e=>{setDraft(e.target.value);pending.current=e.target.value;clearTimeout(timer.current);timer.current=setTimeout(flush,650)}} onBlur={flush} onKeyDown={e=>{
  if(e.nativeEvent.isComposing)return
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();clearTimeout(timer.current);pending.current=undefined;const value=e.currentTarget.value;const start=e.currentTarget.selectionStart;const end=e.currentTarget.selectionEnd;run(splitLine(line,value,start,end).then(n=>{setDraft(null);focus(n.id)}))}
  if(e.key==='Backspace'&&e.currentTarget.selectionStart===0&&e.currentTarget.selectionEnd===0){e.preventDefault();clearTimeout(timer.current);pending.current=undefined;run(mergeLine(line,e.currentTarget.value).then(n=>{if(n)focus(n.id)}))}
 }}/>{(line.sourceNodeIds.length>0||line.sourceFragmentIds.length>0)&&<button className="source-link" aria-label="Sourceを表示" onClick={()=>useWorkspace.setState({sourceLine:line.id})}>↗</button>}</div>
}
function Section({section:s}:{section:LyricsSection}){
 const lines=useLiveQuery(async()=>(await db.records('lyricsLines').where('sectionId').equals(s.id).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[s.id])
 return <section className="lyrics-section" data-section-id={s.id} onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drop-target')}} onDragLeave={e=>e.currentTarget.classList.remove('drop-target')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drop-target');const id=e.dataTransfer.getData('section');if(id)run(moveSection(s.projectId,id,s.id))}}>
  <div className="section-heading"><button aria-label={s.name+(s.collapsed?' を展開':' を折りたたむ')} onClick={()=>run(repository.patch('lyricsSections',s.id,{collapsed:!s.collapsed}))}>{s.collapsed?'›':'⌄'}</button><BufferedInput value={s.name} label="セクション名" onSave={name=>repository.patch('lyricsSections',s.id,{name})}/><details><summary aria-label={s.name+' の操作'}>•••</summary><div className="section-menu"><button draggable onDragStart={e=>e.dataTransfer.setData('section',s.id)}>⠿ ドラッグで並べ替え</button><button onClick={()=>run(duplicateSection(s.id))}>複製</button><button onClick={()=>run(repository.remove('lyricsSections',s.id),'セクションを削除しました')}>削除</button></div></details></div>
  {!s.collapsed&&<div className="section-content">{lines?.map(l=><LyricInput key={l.id} line={l}/>)}<button className="blank-line" aria-label={s.name+' に歌詞を書く'} onClick={()=>run(addLine(s.id,'').then(l=>requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('[data-line-id="'+l.id+'"]')?.focus())))}>{lines?.length?'＋':'ここから書き始める…'}</button></div>}
 </section>
}
export function LyricsPanel({projectId}:{projectId:string}){
 const sections=useLiveQuery(async()=>(await db.records('lyricsSections').where('projectId').equals(projectId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[projectId])
 return <aside className="lyrics-panel"><div className="lyrics-title"><p className="eyebrow">LYRICS</p><h2>言葉を、歌に。</h2></div>{sections?.map(s=><Section key={s.id} section={s}/>)}<button className="add-section" onClick={()=>run(repository.put('lyricsSections',{...newMeta(),projectId,name:'新しいセクション',order:(sections?.at(-1)?.order??-1)+1,collapsed:false}))}>＋ セクション</button></aside>
}
export function SendSheet({projectId}:{projectId:string}){
 const {sendId,sendType}=useWorkspace();const [sectionId,setSectionId]=useState('');const [before,setBefore]=useState('')
 const sections=useLiveQuery(async()=>(await db.records('lyricsSections').where('projectId').equals(projectId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[projectId])
 const target=sectionId||sections?.find(s=>s.name==='Chorus')?.id||sections?.[0]?.id||''
 const lines=useLiveQuery(async()=>(await db.records('lyricsLines').where('sectionId').equals(target).toArray()).filter(isLive).sort((a,b)=>a.order-b.order),[target])
 if(!sendId)return null
 return <div className="sheet-backdrop" onClick={()=>useWorkspace.setState({sendId:''})}><section className="send-sheet stack" role="dialog" aria-modal="true" aria-label="歌詞へ送る" onClick={e=>e.stopPropagation()}><div className="row between"><h2>歌詞へ送る</h2><button autoFocus onClick={()=>useWorkspace.setState({sendId:''})} aria-label="送信を閉じる">×</button></div><label>セクション<select value={target} onChange={e=>{setSectionId(e.target.value);setBefore('')}}>{sections?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>位置<select value={before} onChange={e=>setBefore(e.target.value)}><option value="">末尾</option>{lines?.map((l,i)=><option key={l.id} value={l.id}>{i+1}行目の前: {l.text.slice(0,20)}</option>)}</select></label><button className="primary" disabled={!target} onClick={()=>run(sendToLyrics(sendType,sendId,target,before||undefined).then(()=>{useWorkspace.setState({sendId:''});useUI.getState().notify((sections?.find(s=>s.id===target)?.name??'歌詞')+'へ追加しました')}))}>追加する</button></section></div>
}
export function SourceSheet(){
 const {sourceLine}=useWorkspace()
 const sources=useLiveQuery(async()=>{const l=await db.records('lyricsLines').get(sourceLine);if(!l)return null;return {nodes:await db.records('nodes').bulkGet(l.sourceNodeIds),fragments:await db.records('fragments').bulkGet(l.sourceFragmentIds)}},[sourceLine])
 if(!sourceLine)return null
 return <div className="sheet-backdrop" onClick={()=>useWorkspace.setState({sourceLine:''})}><section className="send-sheet stack" role="dialog" aria-modal="true" aria-label="Source" onClick={e=>e.stopPropagation()}><div className="row between"><h2>この言葉の生まれた場所</h2><button autoFocus aria-label="Sourceを閉じる" onClick={()=>useWorkspace.setState({sourceLine:''})}>×</button></div>{sources?.nodes.map((n,i)=>n?<button key={n.id} onClick={()=>{if(n.deletedAt){useUI.getState().notify('元ノードはゴミ箱にあります');return}useWorkspace.getState().reveal(n.id);useWorkspace.setState({sourceLine:''})}}>↗ {n.text}{n.deletedAt?'（削除済み）':''}</button>:<p key={i}>元ノードが見つかりません</p>)}{sources?.fragments.map((f,i)=><p key={f?.id??i}>{f?.text??'元Fragmentが見つかりません'}</p>)}</section></div>
}
