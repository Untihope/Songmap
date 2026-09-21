import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Plus, Music2, Pin } from 'lucide-react'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive, type Project } from '../../domain/models'
import { createProject, duplicateProject, templates, type Template } from '../../domain/project/service'
import { run } from '../../state/ui'
import { BufferedInput } from '../../components/BufferedInput'
export function SongCard({ project: p }: { project: Project }) {
  const counts = useLiveQuery(async () => {
    const nodes = (await db.records('nodes').where('projectId').equals(p.id).toArray()).filter(isLive)
    const fragments = (await db.records('fragments').where('projectId').equals(p.id).toArray()).filter(isLive)
    const sections = (await db.records('lyricsSections').where('projectId').equals(p.id).toArray()).filter(isLive)
    const lines = sections.length ? (await db.records('lyricsLines').where('sectionId').anyOf(sections.map(s => s.id)).toArray()).filter(isLive) : []
    return { nodes: nodes.length, fragments: fragments.length, lines: lines.filter(l => l.text.trim()).length }
  }, [p.id])
  return <article className="song-card"><Link to={'/songs/' + p.id} className="song-open"><div className="row between"><Music2 size={20}/>{p.pinned && <Pin size={14}/>}<ArrowUpRight size={18}/></div><h3>{p.title}</h3><p className="muted">{p.moods.join(' · ') || p.theme || 'まだ名前のない気持ちから。'}</p><small>{counts?.nodes ?? 0} nodes · {counts?.fragments ?? 0} fragments · {counts?.lines ?? 0} 行</small></Link><div className="row between card-bottom"><small>{new Date(p.updatedAt).toLocaleDateString('ja-JP')}</small><details><summary aria-label={p.title + ' のメニュー'}>•••</summary><div className="card-menu"><label>曲名<BufferedInput label={p.title + ' の曲名'} value={p.title} onSave={title => repository.patch('projects', p.id, { title: title.trim() || p.title })}/></label>{p.deletedAt ? <button onClick={() => run(repository.restore('projects', p.id), '復元しました')}>復元</button> : <><button onClick={() => run(duplicateProject(p.id), '曲を複製しました')}>複製</button><button onClick={() => run(repository.patch('projects', p.id, { pinned: !p.pinned }))}>{p.pinned ? 'ピンを外す' : 'ピン留め'}</button><button onClick={() => run(repository.patch('projects', p.id, { archived: !p.archived }))}>{p.archived ? 'アーカイブから戻す' : 'アーカイブ'}</button><button onClick={() => run(repository.remove('projects', p.id), 'ゴミ箱へ移動しました')}>削除</button></>}</div></details></div></article>
}
export function Home() {
  const projects = useLiveQuery(() => db.records('projects').toArray())
  const live = projects?.filter(p => isLive(p) && !p.archived).sort((a,b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))
  return <div className="page home"><div className="row between"><div><p className="eyebrow">YOUR WRITING ROOM</p><h1>制作のつづきへ</h1><p className="muted">浮かんだ言葉を、あなたの曲に。</p></div><Link className="button primary" to="/songs/new"><Plus size={17}/>新しい曲</Link></div>
    <section className="home-section"><p className="eyebrow">CONTINUE</p>{!projects ? <div className="skeleton" aria-label="読み込み中"/> : live?.[0] ? <Link className="continue-panel" to={'/songs/' + live[0].id}><span><small>最後に開いた曲</small><h2>{live[0].title}</h2><p className="muted">{live[0].moods.join(' · ') || '言葉の続きを書く'}</p></span><ArrowUpRight size={28}/></Link> : <div className="empty"><Music2 size={28}/><h2>最初の一曲を、ここから。</h2><p>タイトルは後から。空白からでも始められます。</p><Link className="button" to="/songs/new">曲をつくる</Link></div>}</section>
    <section className="home-section"><div className="row between"><p className="eyebrow">SONGS</p><Link to="/songs">すべての曲 →</Link></div><div className="song-grid">{live?.slice(0,6).map(p => <SongCard key={p.id} project={p}/>)}</div></section></div>
}
export function Songs() {
  const projects = useLiveQuery(() => db.records('projects').toArray())
  const [filter, setFilter] = useState('Recent'); const [search, setSearch] = useState('')
  const filtered = projects?.filter(p => filter === 'Trash' ? !!p.deletedAt : isLive(p) && (filter === 'Archive' ? p.archived : !p.archived && (filter !== 'Pinned' || p.pinned))).filter(p => [p.title, p.theme, ...p.moods].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))
  return <div className="page"><div className="row between"><div><p className="eyebrow">YOUR SONGS</p><h1>曲</h1></div><Link className="button primary" to="/songs/new"><Plus size={17}/>新しい曲</Link></div><div className="row between song-filters"><div className="row">{['Pinned','Recent','All','Archive','Trash'].map(f => <button className={filter === f ? 'active' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div><input aria-label="曲を検索" placeholder="曲名・テーマ・気分で検索" value={search} onChange={e => setSearch(e.target.value)}/></div>{!projects ? <div className="skeleton"/> : filtered?.length ? <div className="song-grid">{filtered.map(p => <SongCard key={p.id} project={p}/>)}</div> : <div className="empty">ここにはまだ曲がありません。</div>}</div>
}
export function NewSong() {
  const [title, setTitle] = useState(''); const [template, setTemplate] = useState<Template>('Blank'); const [busy, setBusy] = useState(false); const navigate = useNavigate()
  return <div className="page new-song"><p className="eyebrow">A NEW BEGINNING</p><h1>新しい曲</h1><p className="muted">小さな思いつきから、始めよう。</p><form className="stack" onSubmit={e => { e.preventDefault(); if(busy) return; setBusy(true); run(createProject(title, template).then(p => navigate('/songs/' + p.id)).finally(() => setBusy(false))) }}><label>タイトル<input autoFocus placeholder="Untitled Song" value={title} onChange={e => setTitle(e.target.value)}/></label><fieldset><legend>テンプレート</legend><div className="template-grid">{Object.keys(templates).map(t => <label className={'template-option ' + (template === t ? 'chosen' : '')} key={t}><input type="radio" name="template" value={t} checked={template === t} onChange={() => setTemplate(t as Template)}/><strong>{t}</strong><small>{t === 'Blank' ? 'ひとつのテーマから自由に' : templates[t as Template].join(' / ')}</small></label>)}</div></fieldset><button className="primary" disabled={busy}>{busy ? '作成中…' : '作成する'}</button></form></div>
}
