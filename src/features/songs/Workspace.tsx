import { SaveStatus } from '../../components/SaveStatus'
import { HistoryButtons, ExportMenu } from '../safety/Safety'
import { NodeList } from '../canvas/NodeList'
import { FragmentBox } from '../fragments/FragmentBox'
import { LyricsPanel, SendSheet, SourceSheet } from '../lyrics/LyricsPanel'
import { useWorkspace } from '../../state/workspace'
import { SongMap } from '../canvas/SongMap'
import { Filters } from '../canvas/Filters'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { BufferedInput } from '../../components/BufferedInput'
import { run } from '../../state/ui'
export function Workspace() {
  const { projectId = '' } = useParams()
  const mobileView = useWorkspace(s=>s.mobileView)
  const result = useLiveQuery(async () => ({ project: await db.records('projects').get(projectId) }), [projectId])
  useEffect(() => { run(repository.atomic(()=>repository.patch('projects', projectId, { lastOpenedAt: new Date().toISOString() }),false)) }, [projectId])
  if (!result) return <div className="page"><div className="skeleton" aria-label="曲を読み込み中"/></div>
  const p = result.project
  if (!p || p.deletedAt) return <div className="page"><h1>曲が見つかりません</h1><Link to="/songs">曲一覧へ</Link></div>
  return <div className={"workspace view-"+mobileView} onKeyDown={e=>{if(!(e.ctrlKey||e.metaKey))return;if(e.key==='s'){e.preventDefault();window.dispatchEvent(new Event('songmap:save'))}if(e.key==='z'&&!(e.target as HTMLElement).closest('input,textarea')){e.preventDefault();run(e.shiftKey?repository.redo():repository.undo())}}}><div className="workspace-bar"><Link to="/songs">← 曲</Link><BufferedInput value={p.title} label="曲のタイトル" onSave={title => repository.patch('projects', p.id, { title: title.trim() || p.title })}/><div className="row workspace-tabs"><button onClick={()=>useWorkspace.setState({mobileView:'map'})}>MAP</button><button onClick={()=>useWorkspace.setState({mobileView:'lyrics'})}>LYRICS</button><button onClick={()=>useWorkspace.setState({mobileView:'fragments'})}>FRAGMENTS</button><button onClick={()=>useWorkspace.setState({mobileView:'list'})}>LIST</button></div><button className="workspace-capture" aria-label="Quick Captureを開く" onClick={()=>window.dispatchEvent(new Event('songmap:capture'))}>＋</button><HistoryButtons/><ExportMenu projectId={p.id}/><SaveStatus/></div><div className="workspace-body"><aside className="project-sidebar stack"><p className="eyebrow">PROJECT</p><label>テーマ<BufferedInput value={p.theme ?? ''} label="テーマ" onSave={theme => repository.patch('projects', p.id, { theme })}/></label><label>気分<BufferedInput value={p.moods.join(', ')} label="気分" placeholder="夜, 孤独" onSave={value => repository.patch('projects', p.id, { moods: value.split(',').map(s => s.trim()).filter(Boolean) })}/></label><div className="row"><label>BPM<BufferedInput value={p.bpm?.toString() ?? ''} label="BPM" onSave={value => repository.patch('projects', p.id, { bpm: value && Number.isFinite(Number(value)) ? Number(value) : undefined })}/></label><label>Key<BufferedInput value={p.key ?? ''} label="Key" onSave={key => repository.patch('projects', p.id, { key })}/></label></div><Filters projectId={p.id}/></aside><SongMap key={p.id} projectId={p.id}/><NodeList projectId={p.id}/><div className="writing-panel"><LyricsPanel projectId={p.id}/><FragmentBox projectId={p.id}/></div></div><SendSheet projectId={p.id}/><SourceSheet/></div>
}
