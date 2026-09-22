import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Dialog } from '../../components/Dialog'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive } from '../../domain/models'
import { useWorkspace } from '../../state/workspace'
import { run } from '../../state/ui'

export function ProjectSearch({ projectId, onClose, onRevealWriting }: { projectId: string; onClose: () => void; onRevealWriting: () => void }) {
  const [query, setQuery] = useState('')
  const results = useLiveQuery(async () => {
    const [nodes, fragments, tags, sections] = await Promise.all([
      db.records('nodes').where('projectId').equals(projectId).toArray(),
      db.records('fragments').where('projectId').equals(projectId).toArray(),
      db.records('tags').where('projectId').equals(projectId).toArray(),
      db.records('lyricsSections').where('projectId').equals(projectId).toArray(),
    ])
    const lines = await db.records('lyricsLines').where('sectionId').anyOf(sections.filter(isLive).map(s => s.id)).toArray()
    const q = query.trim().toLocaleLowerCase()
    const matches = (text: string) => !!q && text.toLocaleLowerCase().includes(q)
    return {
      nodes: nodes.filter(n => isLive(n) && matches(n.text + ' ' + (n.note ?? ''))),
      fragments: fragments.filter(f => isLive(f) && matches(f.text + ' ' + (f.note ?? ''))),
      lyrics: lines.filter(l => isLive(l) && matches(l.text)),
      tags: tags.filter(t => isLive(t) && matches(t.name)),
    }
  }, [projectId, query])
  const revealWriting = (view: 'lyrics' | 'fragments', selector: string) => {
    onRevealWriting()
    useWorkspace.setState({ mobileView: view })
    onClose()
    let attempts = 0
    const reveal = () => {
      const el = document.querySelector<HTMLElement>(selector)
      if (!el && attempts++ < 20) { setTimeout(reveal, 50); return }
      el?.scrollIntoView({ block: 'center', behavior: 'auto' })
      el?.focus({ preventScroll: true })
      el?.animate([{ outline: '2px solid var(--accent)' }, { outline: '2px solid transparent' }], { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 800 })
    }
    setTimeout(reveal, 0)
  }
  return <Dialog label="曲の中を検索" onClose={onClose}>
    <div className="row between"><h2>曲の中を検索</h2><button aria-label="検索を閉じる" onClick={onClose}>×</button></div>
    <input autoFocus type="search" aria-label="曲内検索" placeholder="言葉・メモ・タグを探す" value={query} onChange={e => setQuery(e.target.value)}/>
    {!query.trim() ? <p className="muted">Node・Fragment・Lyrics・Tagから探せます。</p> : !results ? <p role="status">検索中…</p> : <div className="search-results">
      {!Object.values(results).some(items => items.length) && <p role="status">見つかりませんでした。別の言葉で探してみてください。</p>}
      {!!results.nodes.length && <section><h3>Nodes</h3>{results.nodes.map(n => <button key={n.id} onClick={() => { onClose(); useWorkspace.getState().reveal(n.id) }}>{n.text}</button>)}</section>}
      {!!results.fragments.length && <section><h3>Fragments</h3>{results.fragments.map(f => <button key={f.id} onClick={() => revealWriting('fragments', '#fragment-' + f.id + ' textarea')}>{f.text}</button>)}</section>}
      {!!results.lyrics.length && <section><h3>Lyrics</h3>{results.lyrics.map(l => <button key={l.id} onClick={() => run(repository.patch('lyricsSections', l.sectionId, { collapsed: false }).then(() => revealWriting('lyrics', '[data-line-id="' + l.id + '"]')))}>{l.text || '空の行'}</button>)}</section>}
      {!!results.tags.length && <section><h3>Tags</h3>{results.tags.map(t => <button key={t.id} onClick={() => { useWorkspace.setState({ filterTags: [t.id], mobileView: 'map' }); onClose() }}>#{t.name}</button>)}</section>}
    </div>}
  </Dialog>
}
