import { flushEdits } from '../../components/useBufferedText'
import type { CSSProperties } from 'react'
import type { WorkspaceState } from '../../domain/models'
import { saveWorkspace, workspaceId } from '../../data/local/workspace'
import { ProjectSearch } from '../search/ProjectSearch'
import { SaveStatus } from '../../components/SaveStatus'
import { HistoryButtons, ExportMenu } from '../safety/Safety'
import { NodeList } from '../canvas/NodeList'
import { FragmentBox } from '../fragments/FragmentBox'
import { LyricsPanel, SendSheet, SourceSheet } from '../lyrics/LyricsPanel'
import { useWorkspace } from '../../state/workspace'
import { SongMap } from '../canvas/SongMap'
import { Filters } from '../canvas/Filters'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { BufferedInput } from '../../components/BufferedInput'
import { run } from '../../state/ui'
export function Workspace() { const { projectId = '' } = useParams(); return <WorkspaceContent key={projectId} projectId={projectId}/> }
function WorkspaceContent({projectId}:{projectId:string}) {
  const [searchOpen,setSearchOpen]=useState(false)
  const [layout,setLayout]=useState<Partial<WorkspaceState>>({})
  const focus=useWorkspace(s=>s.focus)
  const zen=useWorkspace(s=>s.zen)
  const changeLayout=(changes:Partial<WorkspaceState>)=>{setLayout(s=>({...s,...changes}));run(saveWorkspace(projectId,changes))}
  useEffect(()=>{
    useWorkspace.setState({selected:[],editor:'',sendId:'',sourceLine:'',revealNode:'',filterTags:[],filterType:'',filterStatus:'',search:'',mobileView:'map',focus:false,zen:false})
    let active=true
    const restore=()=>run(db.workspaceStates.get(workspaceId(projectId)).then(s=>{
      if(!active)return
      setLayout(s??{})
      useWorkspace.setState({focus:s?.activeView==='focus',zen:s?.activeView==='zen',mobileView:s?.activeView==='lyrics'?'lyrics':'map',selected:s?.selectedNodeId?[s.selectedNodeId]:[]})
    }))
    restore()
    const phone=matchMedia('(max-width: 639px)'),tablet=matchMedia('(max-width: 1023px)')
    phone.addEventListener('change',restore);tablet.addEventListener('change',restore)
    return()=>{active=false;phone.removeEventListener('change',restore);tablet.removeEventListener('change',restore)}
  },[projectId])
  const mobileView = useWorkspace(s=>s.mobileView)
  const result = useLiveQuery(async () => ({ project: await db.records('projects').get(projectId) }), [projectId])
  useEffect(() => { run(db.records('projects').update(projectId, { lastOpenedAt: new Date().toISOString() })) }, [projectId])
  if (!result) return <div className="page"><div className="skeleton" aria-label="曲を読み込み中"/></div>
  const p = result.project
  if (!p || p.deletedAt) return <div className="page"><h1>曲が見つかりません</h1><Link to="/songs">曲一覧へ</Link></div>
  const style={'--sidebar-width':(layout.sidebarCollapsed||zen?0:layout.sidebarWidth??220)+'px','--lyrics-width':(layout.lyricsCollapsed?0:layout.lyricsPanelWidth??340)+'px'} as CSSProperties
  return <div style={style} className={'workspace view-'+mobileView+(zen?' zen-view':'')+(layout.sidebarCollapsed?' sidebar-closed':'')+(layout.lyricsCollapsed?' lyrics-closed':'')} onKeyDown={e=>{if(e.key==='Escape'&&!(e.target as HTMLElement).closest('dialog')){const details=(e.target as HTMLElement).closest('details[open]');if(details){details.removeAttribute('open');details.querySelector('summary')?.focus();e.preventDefault();return}}if(!(e.ctrlKey||e.metaKey)||e.nativeEvent.isComposing)return;if(e.key==='f'){e.preventDefault();setSearchOpen(true)}if(e.key==='s'){e.preventDefault();window.dispatchEvent(new Event('songmap:save'))}if(e.key==='z'&&!(e.target as HTMLElement).closest('input,textarea')){e.preventDefault();run(flushEdits().then(()=>e.shiftKey?repository.redo():repository.undo()))}}}><div className="workspace-bar"><Link to="/songs">← 曲</Link><BufferedInput value={p.title} label="曲のタイトル" onSave={title => repository.patch('projects', p.id, { title: title.trim() || p.title })}/><div className="row workspace-tabs" role="group" aria-label="ワークスペースの表示">{(['map','lyrics','fragments','list'] as const).map(view=><button key={view} aria-pressed={mobileView===view} onClick={()=>{useWorkspace.setState({mobileView:view});if(view==='lyrics'||view==='fragments')changeLayout({lyricsCollapsed:false})}}>{view.toUpperCase()}</button>)}</div>
    <button aria-label="曲の中を検索" aria-keyshortcuts="Control+f Meta+f" onClick={()=>setSearchOpen(true)}>検索</button>
    <details className="layout-controls"><summary>表示</summary><div className="section-menu stack">
      <label>モード<select aria-label="表示モード" value={zen?'zen':focus?'focus':mobileView==='lyrics'?'lyrics':'canvas'} onChange={e=>{const activeView=e.target.value as WorkspaceState['activeView'];changeLayout({activeView,lyricsCollapsed:false});useWorkspace.setState({focus:activeView==='focus',zen:activeView==='zen',mobileView:activeView==='lyrics'?'lyrics':'map'})}}><option value="canvas">Canvas</option><option value="focus">Focus</option><option value="lyrics">Lyrics</option><option value="zen">Zen</option></select></label>
      <div className="desktop-panel-options stack">
      <button aria-pressed={!layout.sidebarCollapsed} onClick={()=>changeLayout({sidebarCollapsed:!layout.sidebarCollapsed})}>{layout.sidebarCollapsed?'プロジェクトを開く':'プロジェクトを閉じる'}</button>
      <label>プロジェクト幅<input type="range" aria-label="プロジェクト幅" min="170" max="320" value={layout.sidebarWidth??220} onChange={e=>changeLayout({sidebarWidth:Number(e.target.value)})}/></label>
      <button aria-pressed={!layout.lyricsCollapsed} onClick={()=>changeLayout({lyricsCollapsed:!layout.lyricsCollapsed})}>{layout.lyricsCollapsed?'歌詞パネルを開く':'歌詞パネルを閉じる'}</button>
      <label>歌詞パネル幅<input type="range" aria-label="歌詞パネル幅" min="260" max="580" value={layout.lyricsPanelWidth??340} onChange={e=>changeLayout({lyricsPanelWidth:Number(e.target.value)})}/></label></div>
    </div></details><button className="workspace-capture" aria-label="Quick Captureを開く" onClick={()=>window.dispatchEvent(new Event('songmap:capture'))}>＋</button><HistoryButtons/><ExportMenu projectId={p.id}/><SaveStatus/></div><div className="workspace-body"><aside className="project-sidebar stack"><p className="eyebrow">PROJECT</p><label>テーマ<BufferedInput value={p.theme ?? ''} label="テーマ" onSave={theme => repository.patch('projects', p.id, { theme })}/></label><label>気分<BufferedInput value={p.moods.join(', ')} label="気分" placeholder="夜, 孤独" onSave={value => repository.patch('projects', p.id, { moods: value.split(',').map(s => s.trim()).filter(Boolean) })}/></label><div className="row"><label>BPM<BufferedInput value={p.bpm?.toString() ?? ''} label="BPM" onSave={value => repository.patch('projects', p.id, { bpm: value && Number.isFinite(Number(value)) ? Number(value) : undefined })}/></label><label>Key<BufferedInput value={p.key ?? ''} label="Key" onSave={key => repository.patch('projects', p.id, { key })}/></label></div><Filters projectId={p.id}/></aside><SongMap key={p.id} projectId={p.id}/><NodeList projectId={p.id}/><div className="writing-panel"><LyricsPanel projectId={p.id}/><FragmentBox projectId={p.id}/></div></div><SendSheet projectId={p.id}/><SourceSheet/>{searchOpen&&<ProjectSearch projectId={p.id} onClose={()=>setSearchOpen(false)} onRevealWriting={()=>{useWorkspace.setState({zen:false});changeLayout({lyricsCollapsed:false,activeView:'canvas'})}}/>}</div>
}
