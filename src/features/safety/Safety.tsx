import { Account } from '../sync/Account'
import { useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { repository, type Snapshot } from '../../data/repositories/localRepository'
import { db } from '../../data/local/database'
import { download, exportProject, importProject, markdown } from '../../domain/backup'
import { run, useUI } from '../../state/ui'
export function HistoryButtons(){
 useSyncExternalStore(repository.subscribe,repository.getHistoryVersion)
 return <div className="history-buttons row"><button aria-label="元に戻す" disabled={!repository.canUndo} onClick={()=>run(repository.undo(),'元に戻しました')}>↶</button><button aria-label="やり直す" disabled={!repository.canRedo} onClick={()=>run(repository.redo(),'やり直しました')}>↷</button></div>
}
export function ExportMenu({projectId}:{projectId:string}){
 return <details className="export-menu"><summary>書き出し</summary><div className="section-menu"><button onClick={()=>run(exportProject(projectId).then(b=>download(JSON.stringify(b,null,2),b.project.title+'.json','application/json')))}>JSON バックアップ</button><button onClick={()=>run(exportProject(projectId).then(b=>download(markdown(b),b.project.title+'.md','text/markdown')))}>Markdown</button></div></details>
}
export function Settings(){
 const trash=useLiveQuery(async()=>{const entries=await db.trash.toArray();return Promise.all(entries.map(async e=>({...e,record:await db.records(e.table).get(e.recordId)})))})
 const snapshots=useLiveQuery(()=>db.table<Snapshot>('snapshots').orderBy('createdAt').reverse().toArray())
 const {theme,setTheme}=useUI()
 return <div className="page settings-page"><p className="eyebrow">YOUR WORKSPACE</p><h1>設定</h1><Account/><section className="panel stack"><h2>表示</h2><label>テーマ<select value={theme} onChange={e=>{const t=e.target.value as 'dark'|'light';setTheme(t);run(db.table('preferences').put({id:'theme',value:t}))}}><option value="dark">Dark</option><option value="light">Light</option></select></label><p className="muted">Guestモード · 変更はこのブラウザに保存されます。</p></section><section className="panel stack"><h2>JSONを読み込む</h2><p className="muted">新しい曲として復元します。既存の曲は上書きしません。</p><input type="file" aria-label="JSONを読み込む" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)run(f.text().then(text=>importProject(JSON.parse(text))).then(()=>useUI.getState().notify('曲を読み込みました')));e.target.value=''}}/></section><section className="panel stack"><h2>ゴミ箱</h2>{trash?.length===0&&<p className="muted">ゴミ箱は空です。</p>}{trash?.map(e=><div className="row between trash-row" key={e.id}><span><small>{e.table}</small><br/>{e.record&&('title'in e.record?e.record.title:'text'in e.record?e.record.text:'name'in e.record?e.record.name:e.record.id)}</span><button onClick={()=>run(repository.restore(e.table,e.recordId),'復元しました')}>復元</button></div>)}</section><section className="panel stack"><h2>復旧スナップショット</h2><p className="muted">直近5回の保存前の状態を保持します。復旧はレコードを戻し、追加したデータも残します。操作はUndoできます。</p>{snapshots?.map(s=><div className="row between" key={s.id}><span>{new Date(s.createdAt).toLocaleString('ja-JP')} · {s.records.length} 件</span><button onClick={()=>run(repository.recover(s.id),'スナップショットを復旧しました')}>復旧</button></div>)}</section><Link className="button" to="/songs">曲へ戻る</Link></div>
}
