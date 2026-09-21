import {useLiveQuery} from 'dexie-react-hooks'
import {db} from '../../data/local/database'
import {isLive} from '../../domain/models'
export function UsedIn({nodeId}:{nodeId:string}){
 const names=useLiveQuery(async()=>{
  const lines=(await db.records('lyricsLines').toArray()).filter(l=>isLive(l)&&l.sourceNodeIds.includes(nodeId))
  const sections=await db.records('lyricsSections').bulkGet([...new Set(lines.map(l=>l.sectionId))])
  return sections.filter(s=>s&&isLive(s)).map(s=>s!.name)
 },[nodeId])
 return names?.length?<p className="muted">Used in: {names.join(' / ')}</p>:null
}
