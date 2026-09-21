import { Home, Songs, NewSong } from '../features/songs/Songs'
import { Workspace } from '../features/songs/Workspace'
import { useEffect } from 'react'
import { NavLink, Outlet, Route, Routes, Link } from 'react-router-dom'
import { Moon, Sun, AudioLines, Settings } from 'lucide-react'
import { useUI } from '../state/ui'
export function Shell() {
  const { theme, setTheme, notice, error } = useUI()
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => useUI.setState({ notice: '' }), 4000); return () => clearTimeout(timer) }, [notice])
  return <><a className="skip-link" href="#main">本文へ</a><header className="app-header">
    <Link className="brand" to="/"><AudioLines size={23}/>SongMap</Link><span className="tagline">言葉になる、その手前から。</span>
    <nav className="desktop-nav" aria-label="メイン"><NavLink to="/" end>ホーム</NavLink><NavLink to="/songs">曲</NavLink><NavLink to="/inbox">Inbox</NavLink></nav>
    <button aria-label={theme === 'dark' ? 'ライトテーマ' : 'ダークテーマ'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
    <Link className="icon-button" aria-label="設定" to="/settings"><Settings size={19}/></Link>
  </header><main id="main"><Outlet/></main>
  <nav className="mobile-nav" aria-label="モバイルメイン"><NavLink to="/" end>Home</NavLink><NavLink to="/inbox">Inbox</NavLink><NavLink to="/songs">Songs</NavLink></nav>
  {(notice || error) && <div className={`toast ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button aria-label="通知を閉じる" onClick={() => useUI.setState({ notice: '', error: '' })}>×</button></div>}</>
}
function Foundation({ title }: { title: string }) { return <div className="page"><p className="eyebrow">SONGMAP</p><h1>{title}</h1><p className="muted">言葉を捕まえて、曲へ育てるワークスペース。</p></div> }
export function App() { return <Routes><Route element={<Shell/>}><Route index element={<Home/>}/><Route path="songs" element={<Songs/>}/><Route path="songs/new" element={<NewSong/>}/><Route path="songs/:projectId" element={<Workspace/>}/><Route path="inbox" element={<Foundation title="Inbox"/>}/><Route path="settings" element={<Foundation title="設定"/>}/><Route path="*" element={<div className="page"><h1>ページが見つかりません</h1><Link to="/">ホームへ戻る</Link></div>}/></Route></Routes> }
