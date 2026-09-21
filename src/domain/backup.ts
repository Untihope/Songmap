import { z } from 'zod'
import { domainTables, type DomainRecord, type DomainTable, type DomainTables } from './models'
import { repository, type LocalRepository } from '../data/repositories/localRepository'
const meta={id:z.string().min(1),createdAt:z.string(),updatedAt:z.string(),revision:z.number().int().nonnegative(),deletedAt:z.string().optional()}
const project=z.object({...meta,ownerId:z.string().optional(),title:z.string(),theme:z.string().optional(),moods:z.array(z.string()),bpm:z.number().optional(),key:z.string().optional(),status:z.enum(['idea','writing','revising','completed','archived']),pinned:z.boolean(),archived:z.boolean(),lastOpenedAt:z.string().optional()})
const status=z.enum(['raw','candidate','adopted','hold','rejected'])
const node=z.object({...meta,projectId:z.string(),text:z.string(),note:z.string().optional(),type:z.enum(['theme','emotion','scene','keyword','phrase','structure','free']),status,position:z.object({x:z.number().finite(),y:z.number().finite()}),importance:z.number().optional(),width:z.number().optional(),collapsed:z.boolean(),favorite:z.boolean(),tagIds:z.array(z.string())})
const edge=z.object({...meta,projectId:z.string(),sourceNodeId:z.string(),targetNodeId:z.string(),relationType:z.enum(['related','cause','contrast','rephrase','chronology','foreshadow','payoff','custom']),customLabel:z.string().optional()})
const tag=z.object({...meta,projectId:z.string(),name:z.string()})
const fragment=z.object({...meta,projectId:z.string(),text:z.string(),note:z.string().optional(),favorite:z.boolean(),tagIds:z.array(z.string()),status,sourceNodeId:z.string().optional()})
const section=z.object({...meta,projectId:z.string(),name:z.string(),order:z.number().finite(),collapsed:z.boolean()})
const line=z.object({...meta,sectionId:z.string(),text:z.string(),order:z.number().finite(),sourceNodeIds:z.array(z.string()),sourceFragmentIds:z.array(z.string())})
const reference=z.object({...meta,projectId:z.string(),title:z.string(),type:z.enum(['song','lyrics','video','image','text','other']),url:z.string().optional(),note:z.string().optional()})
const schema=z.object({schemaVersion:z.literal(1),project,nodes:z.array(node),edges:z.array(edge),tags:z.array(tag),fragments:z.array(fragment),lyricsSections:z.array(section),lyricsLines:z.array(line),references:z.array(reference)})
export type Backup=z.infer<typeof schema>
export async function exportProject(id:string,repo:LocalRepository=repository):Promise<Backup>{
 return repo.database.transaction('r',domainTables,async()=>{
  const p=await repo.database.records('projects').get(id);if(!p)throw new Error('曲が見つかりません')
  const nodes=await repo.database.records('nodes').where('projectId').equals(id).toArray()
  const edges=await repo.database.records('edges').where('projectId').equals(id).toArray()
  const tags=await repo.database.records('tags').where('projectId').equals(id).toArray()
  const fragments=await repo.database.records('fragments').where('projectId').equals(id).toArray()
  const lyricsSections=await repo.database.records('lyricsSections').where('projectId').equals(id).toArray()
  const lyricsLines=lyricsSections.length?await repo.database.records('lyricsLines').where('sectionId').anyOf(lyricsSections.map(s=>s.id)).toArray():[]
  const references=await repo.database.records('references').where('projectId').equals(id).toArray()
  return {schemaVersion:1,project:p,nodes,edges,tags,fragments,lyricsSections,lyricsLines,references}
 })
}
export function parseBackup(input:unknown):Backup{
 const result=schema.safeParse(input);if(!result.success)throw new Error('SongMap JSONの形式が正しくありません')
 const b=result.data;const all=[b.project,...b.nodes,...b.edges,...b.tags,...b.fragments,...b.lyricsSections,...b.lyricsLines,...b.references]
 if(new Set(all.map(r=>r.id)).size!==all.length)throw new Error('JSON内のIDが重複しています')
 const nodes=new Set(b.nodes.map(n=>n.id)),fragments=new Set(b.fragments.map(n=>n.id)),tags=new Set(b.tags.map(n=>n.id)),sections=new Set(b.lyricsSections.map(n=>n.id))
 if([...b.nodes,...b.edges,...b.tags,...b.fragments,...b.lyricsSections,...b.references].some(r=>r.projectId!==b.project.id)
 || b.edges.some(e=>!nodes.has(e.sourceNodeId)||!nodes.has(e.targetNodeId))
 || [...b.nodes,...b.fragments].some(n=>n.tagIds.some(t=>!tags.has(t)))
 || b.fragments.some(f=>f.sourceNodeId&&!nodes.has(f.sourceNodeId))
 || b.lyricsLines.some(l=>!sections.has(l.sectionId)||l.sourceNodeIds.some(n=>!nodes.has(n))||l.sourceFragmentIds.some(f=>!fragments.has(f))))throw new Error('JSONのSourceまたは所属関係が壊れています')
 return b
}
export async function importProject(input:unknown,repo:LocalRepository=repository){
 const b=parseBackup(input)
 return repo.atomic(async()=>{
  const records:{table:DomainTable;record:DomainRecord}[]=[{table:'projects',record:b.project}]
  for(const table of ['nodes','edges','tags','fragments','lyricsSections','lyricsLines','references'] as const)for(const record of b[table])records.push({table,record})
  const ids=new Map<string,string>(records.map(r=>[r.record.id,crypto.randomUUID()]))
  for(const {table,record}of records){
   const copy={...record,id:ids.get(record.id)!,revision:1} as DomainRecord & Record<string,unknown>
   delete copy.ownerId
   for(const key of ['projectId','sectionId','sourceNodeId','targetNodeId'])if(typeof copy[key]==='string')copy[key]=ids.get(copy[key] as string)
   for(const key of ['tagIds','sourceNodeIds','sourceFragmentIds'])if(Array.isArray(copy[key]))copy[key]=(copy[key] as string[]).map(id=>ids.get(id)!)
   await repo.put(table,copy as DomainTables[typeof table])
   if(copy.deletedAt)await repo.database.trash.put({id:table+':'+copy.id,table,recordId:copy.id,deletedAt:copy.deletedAt})
  }
  return ids.get(b.project.id)!
 })
}
export function markdown(b:Backup){
 const live=<T extends {deletedAt?:string}>(items:T[])=>items.filter(i=>!i.deletedAt)
 const esc=(s:string)=>s.replace(/[\\`*_{}[\]<>#|]/g,'\\$&')
 return ['# '+esc(b.project.title),'','## Song Profile','','Theme: '+esc(b.project.theme??''),'Mood: '+b.project.moods.map(esc).join(', '),'BPM: '+(b.project.bpm??''),'Key: '+esc(b.project.key??''),'','## Mind Map','',...live(b.nodes).map(n=>'- ['+n.type+'] '+esc(n.text).replaceAll('\n','\n  ')),'','## Relationships','',...live(b.edges).map(e=>'- '+esc(b.nodes.find(n=>n.id===e.sourceNodeId)?.text??'')+' → '+(e.customLabel??e.relationType)+' → '+esc(b.nodes.find(n=>n.id===e.targetNodeId)?.text??'')),'','## Fragments','',...live(b.fragments).map(f=>'- '+esc(f.text).replaceAll('\n','\n  ')),'','## Lyrics','',...live(b.lyricsSections).sort((a,b)=>a.order-b.order).flatMap(s=>['### '+esc(s.name),'',...live(b.lyricsLines).filter(l=>l.sectionId===s.id).sort((a,b)=>a.order-b.order).map(l=>l.text+'  '),''])].join('\n')
}
export function download(text:string,name:string,type:string){
 const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}


const inbox=z.object({...meta,ownerId:z.string().optional(),text:z.string(),note:z.string().optional(),status:z.enum(['raw','converted','archived']),source:z.enum(['home','quickCapture','mobileShortcut','project']),convertedAt:z.string().optional(),convertedToType:z.enum(['node','fragment','project']).optional(),convertedToId:z.string().optional()})
export function parseDomainRecord(table:DomainTable,input:unknown):DomainRecord{const schemas={projects:project,nodes:node,edges:edge,tags:tag,fragments:fragment,lyricsSections:section,lyricsLines:line,inboxItems:inbox,references:reference};const validator=schemas[table];if(!validator)throw new Error('不明なデータ種別');return validator.parse(input)}
