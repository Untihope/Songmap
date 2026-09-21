import { useSave } from '../state/save'
import { Settings } from '../features/safety/Safety'
import { db } from '../data/local/database'
import { Inbox, QuickCapture } from '../features/inbox/Inbox'
import { Home, Songs, NewSong } from '../features/songs/Songs'
import { useEffect, useState, lazy, Suspense } from 'react'
const Workspace = lazy(() => import('../features/songs/Workspace').then(m => ({ default: m.Workspace })))
import { NavLink, Outlet, Route, Routes, Link, useLocation } from 'react-router-dom'
import { Moon, Sun, AudioLines, Settings as SettingsIcon } from 'lucide-react'
import { useUI } from '../state/ui'
export function Shell() {
  const { theme, setTheme, notice, error } = useUI()
  useEffect(()=>{const hide=()=>{if(document.visibilityState==='hidden')window.dispatchEvent(new Event('songmap:save'))};const leave=(e:BeforeUnloadEvent)=>{const s=useSave.getState();if(s.pending.length||s.writes||s.error){window.dispatchEvent(new Event('songmap:save'));e.preventDefault()}};document.addEventListener('visibilitychange',hide);window.addEventListener('beforeunload',leave);return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('beforeunload',leave)}},[])
  const [capturing,setCapturing]=useState(false)
  const location=useLocation();const inWorkspace=/^\/songs\/(?!new$)[^/]+$/.test(location.pathname)
  useEffect(()=>{const open=()=>setCapturing(true);window.addEventListener('songmap:capture',open);return()=>window.removeEventListener('songmap:capture',open)},[])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(()=>{void db.table('preferences').get('theme').then(p=>{if(p?.value==='light'||p?.value==='dark')setTheme(p.value)})},[setTheme])
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => useUI.setState({ notice: '' }), 4000); return () => clearTimeout(timer) }, [notice])
  return <><a className="skip-link" href="#main">本文へ</a><header className={inWorkspace ? "app-header in-workspace" : "app-header"}>
    <Link className="brand" to="/"><AudioLines size={23}/>SongMap</Link><span className="tagline">言葉になる、その手前から。</span>
    <nav className="desktop-nav" aria-label="メイン"><NavLink to="/" end>ホーム</NavLink><NavLink to="/songs">曲</NavLink><NavLink to="/inbox">Inbox</NavLink></nav>
    <button className="global-capture" aria-label="Quick Captureを開く" onClick={()=>setCapturing(true)}>＋</button><button aria-label={theme === 'dark' ? 'ライトテーマ' : 'ダークテーマ'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
    <Link className="icon-button" aria-label="設定" to="/settings"><SettingsIcon size={19}/></Link>
  </header><main id="main"><Outlet/></main>
  <nav className={inWorkspace ? "mobile-nav in-workspace" : "mobile-nav"} aria-label="モバイルメイン"><NavLink to="/" end>Home</NavLink><NavLink to="/inbox">Inbox</NavLink><NavLink to="/songs">Songs</NavLink></nav>
  {capturing&&<div className="sheet-backdrop" onClick={()=>setCapturing(false)}><section className="send-sheet" role="dialog" aria-modal="true" aria-label="Quick Capture" onClick={e=>e.stopPropagation()}><div className="row between"><h2>思いつきを逃さない</h2><button aria-label="Captureを閉じる" onClick={()=>setCapturing(false)}>×</button></div><QuickCapture source="quickCapture" autoFocus onDone={()=>setCapturing(false)}/></section></div>}
  {(notice || error) && <div className={`toast ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button aria-label="通知を閉じる" onClick={() => useUI.setState({ notice: '', error: '' })}>×</button></div>}</>
}
export function App() { return <Routes><Route element={<Shell/>}><Route index element={<Home/>}/><Route path="songs" element={<Songs/>}/><Route path="songs/new" element={<NewSong/>}/><Route path="songs/:projectId" element={<Suspense fallback={<div className="page skeleton" aria-label="読み込み中"/>}><Workspace/></Suspense>}/><Route path="inbox" element={<Inbox/>}/><Route path="settings" element={<Settings/>}/><Route path="*" element={<div className="page"><h1>ページが見つかりません</h1><Link to="/">ホームへ戻る</Link></div>}/></Route></Routes> }
