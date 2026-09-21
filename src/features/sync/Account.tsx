import {useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {supabase} from '../../data/cloud/supabase'
import {db} from '../../data/local/database'
import {type Conflict} from '../../data/sync/engine'
import {useSync} from '../../state/sync'
import {run,useUI} from '../../state/ui'
import {resolveConflict,syncNow} from './runtime'
export function Account(){
 const {userId,email:accountEmail,state,message}=useSync();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false)
 const conflicts=useLiveQuery(()=>db.table<Conflict>('conflicts').toArray())
 const authenticate=(signup:boolean)=>{if(!supabase)return;setBusy(true);run((signup?supabase.auth.signUp({email,password}):supabase.auth.signInWithPassword({email,password})).then(({error,data})=>{if(error)throw new Error(error.message);setPassword('');if(signup&&!data.session)useUI.getState().notify('確認メールをご確認ください')}).finally(()=>setBusy(false)))}
 return <section className="panel stack"><h2>スマホとPCをつなぐ</h2>{!supabase?<p className="muted">現在はこの端末に保存するGuestモードです。クラウド接続が未設定です。READMEのクラウド設定を行うとアカウント同期を利用できます。</p>:userId?<><p>{accountEmail}</p><p className={state==='error'?'error':'muted'}>{message|| (state==='syncing'?'同期中…':'ログイン中 · ローカル保存とバックグラウンド同期')}</p><div className="row"><button onClick={()=>run(syncNow())}>今すぐ同期</button><button onClick={()=>run(supabase!.auth.signOut().then(({error})=>{if(error)throw error}))}>ログアウト</button></div></>:<form className="stack" onSubmit={e=>{e.preventDefault();authenticate(false)}}><p className="muted">同じアカウントで各端末にログインしてください。このブラウザの曲・Inboxをそのアカウントに同期します。</p><label>メール<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>パスワード<input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><div className="row"><button className="primary" disabled={busy}>ログイン</button><button type="button" disabled={busy||!email||password.length<8} onClick={()=>authenticate(true)}>アカウント作成</button></div></form>}{conflicts?.map(c=><article className="conflict stack" key={c.id}><h3>同じ言葉が別の端末でも編集されました</h3><label>クラウドの内容<pre>{'text'in c.cloud.record?c.cloud.record.text:JSON.stringify(c.cloud.record,null,2)}</pre></label><label>この端末の内容<pre>{'text'in c.local?c.local.text:JSON.stringify(c.local,null,2)}</pre></label><div className="row"><button onClick={()=>run(resolveConflict(c.id,'cloud'))}>クラウドを採用</button><button onClick={()=>run(resolveConflict(c.id,'local'))}>この端末を採用</button>{['nodes','fragments','lyricsLines'].includes(c.table)&&<button onClick={()=>run(resolveConflict(c.id,'both'))}>両方残す</button>}</div></article>)}</section>
}
