import { newMeta, isLive, type LyricsLine } from '../models'
import { repository, type LocalRepository } from '../../data/repositories/localRepository'
export async function addLine(sectionId:string,text:string,sources:{nodes?:string[];fragments?:string[]}={},beforeId?:string,repo:LocalRepository=repository) {
 return repo.atomic(async()=>{
  const section=await repo.database.records('lyricsSections').get(sectionId)
  if(!section||!isLive(section))throw new Error('セクションが見つかりません')
  const lines=(await repo.database.records('lyricsLines').where('sectionId').equals(sectionId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order)
  const index=beforeId?lines.findIndex(l=>l.id===beforeId):lines.length
  const i=index<0?lines.length:index;const prev=lines[i-1]?.order??-1;const next=lines[i]?.order??prev+2
  return repo.put('lyricsLines',{...newMeta(),sectionId,text,order:(prev+next)/2,sourceNodeIds:sources.nodes??[],sourceFragmentIds:sources.fragments??[]})
 })
}
export async function sendToLyrics(table:'nodes'|'fragments',id:string,sectionId:string,beforeId?:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{
  const source=await repo.database.records(table).get(id);const section=await repo.database.records('lyricsSections').get(sectionId)
  if(!source||!isLive(source)||!section||!isLive(section)||source.projectId!==section.projectId)throw new Error('元の言葉または送信先が見つかりません')
  return addLine(sectionId,source.text,{nodes:table==='nodes'?[id]:'sourceNodeId'in source&&source.sourceNodeId?[source.sourceNodeId]:[],fragments:table==='fragments'?[id]:[]},beforeId,repo)
 })
}
export async function splitLine(line:LyricsLine,text:string,start:number,end=start,repo:LocalRepository=repository){
 return repo.atomic(async()=>{
  const lines=(await repo.database.records('lyricsLines').where('sectionId').equals(line.sectionId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order)
  const next=lines[lines.findIndex(l=>l.id===line.id)+1]
  await repo.patch('lyricsLines',line.id,{text:text.slice(0,start)})
  return addLine(line.sectionId,text.slice(end),{nodes:line.sourceNodeIds,fragments:line.sourceFragmentIds},next?.id,repo)
 })
}
export async function mergeLine(line:LyricsLine,text:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{
  const lines=(await repo.database.records('lyricsLines').where('sectionId').equals(line.sectionId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order)
  const previous=lines[lines.findIndex(l=>l.id===line.id)-1];if(!previous)return
  await repo.patch('lyricsLines',previous.id,{text:previous.text+text,sourceNodeIds:[...new Set([...previous.sourceNodeIds,...line.sourceNodeIds])],sourceFragmentIds:[...new Set([...previous.sourceFragmentIds,...line.sourceFragmentIds])]})
  await repo.remove('lyricsLines',line.id);return previous
 })
}
export async function moveSection(projectId:string,id:string,before:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{
  const sections=(await repo.database.records('lyricsSections').where('projectId').equals(projectId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order)
  const item=sections.find(s=>s.id===id);if(!item)return
  const rest=sections.filter(s=>s.id!==id);const index=rest.findIndex(s=>s.id===before);rest.splice(index<0?rest.length:index,0,item)
  for(const [order,s]of rest.entries())await repo.patch('lyricsSections',s.id,{order})
 })
}
export async function duplicateSection(id:string,repo:LocalRepository=repository){
 return repo.atomic(async()=>{
  const s=await repo.database.records('lyricsSections').get(id);if(!s)return
  const sections=(await repo.database.records('lyricsSections').where('projectId').equals(s.projectId).toArray()).filter(isLive).sort((a,b)=>a.order-b.order)
  const next=sections[sections.findIndex(x=>x.id===id)+1]
  const copy=await repo.put('lyricsSections',{...s,...newMeta(),name:s.name+' copy',order:(s.order+(next?.order??s.order+2))/2})
  for(const l of (await repo.database.records('lyricsLines').where('sectionId').equals(id).toArray()).filter(isLive))await repo.put('lyricsLines',{...l,...newMeta(),sectionId:copy.id})
 })
}
