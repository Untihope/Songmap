import { isLive, newMeta, type InboxSource, type Fragment } from '../models'
import { repository, type LocalRepository } from '../../data/repositories/localRepository'
import { addNode } from '../node/service'
import { createProject } from '../project/service'
export async function capture(text:string,source:InboxSource='quickCapture',repo:LocalRepository=repository){
 if(!text.trim())throw new Error('言葉を入力してください')
 return repo.put('inboxItems',{...newMeta(),text:text.trim(),status:'raw',source})
}
export async function createFragment(projectId:string,text:string,sourceNodeId?:string,repo:LocalRepository=repository){
 if(!text.trim())throw new Error('言葉を入力してください')
 return repo.atomic(async()=>{
  const p=await repo.database.records('projects').get(projectId);if(!p||!isLive(p))throw new Error('曲が見つかりません')
  return repo.put('fragments',{...newMeta(),projectId,text,favorite:false,tagIds:[],status:'raw',sourceNodeId})
 })
}
export async function nodeToFragment(id:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{const n=await repo.database.records('nodes').get(id);if(!n||!isLive(n))throw new Error('元ノードが見つかりません');return createFragment(n.projectId,n.text,n.id,repo)})
}
export async function lyricToFragment(id:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{
  const l=await repo.database.records('lyricsLines').get(id);if(!l||!isLive(l))throw new Error('歌詞が見つかりません')
  const s=await repo.database.records('lyricsSections').get(l.sectionId);if(!s)throw new Error('曲が見つかりません')
  const f=await createFragment(s.projectId,l.text,l.sourceNodeIds[0],repo);await repo.remove('lyricsLines',l.id);return f
 })
}
export async function convertInbox(id:string,type:'node'|'fragment'|'project',projectId?:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{
  const item=await repo.database.records('inboxItems').get(id)
  if(!item||!isLive(item)||item.status!=='raw')throw new Error('このアイデアは変換済みです')
  let target:string
  if(type==='project'){const p=await createProject(item.text.split('\n')[0]??'','Blank',repo);await createFragment(p.id,item.text,undefined,repo);target=p.id}
  else {if(!projectId)throw new Error('曲を選んでください');target=type==='node'?(await addNode(projectId,item.text,undefined,undefined,repo)).id:(await createFragment(projectId,item.text,undefined,repo)).id}
  await repo.patch('inboxItems',id,{status:'converted',convertedAt:new Date().toISOString(),convertedToType:type,convertedToId:target})
  return target
 })
}
export async function fragmentToNode(f:Fragment,repo:LocalRepository=repository){return repo.atomic(async()=>{const n=await addNode(f.projectId,f.text,undefined,undefined,repo);await repo.patch('fragments',f.id,{sourceNodeId:n.id});return n})}
export async function setFragmentTags(f:Fragment,text:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{const existing=await repo.database.records('tags').where('projectId').equals(f.projectId).toArray();const ids:string[]=[]
 for(const name of [...new Set(text.split(/[,、#]/).map(s=>s.trim()).filter(Boolean))]){const t=existing.find(t=>isLive(t)&&t.name===name)??await repo.put('tags',{...newMeta(),projectId:f.projectId,name});ids.push(t.id)}
 return repo.patch('fragments',f.id,{tagIds:ids})})
}
