import type { Node, Edge } from '@xyflow/react'
import type { SongNode, SongEdge, Tag } from '../../domain/models'
export type CanvasNode = Node<{ item:SongNode; tags:string[] }, 'song'>
export function toCanvasNode(item:SongNode, tags:Tag[], selected:boolean, faded:boolean):CanvasNode {
  return { id:item.id, type:'song', position:item.position, selected, data:{item,tags:tags.filter(t=>item.tagIds.includes(t.id)).map(t=>t.name)}, className:faded?'faded':'' }
}
export function toCanvasEdge(e:SongEdge):Edge {
  return { id:e.id, source:e.sourceNodeId, target:e.targetNodeId, label:e.relationType === 'related' ? undefined : e.relationType === 'custom' ? e.customLabel : e.relationType }
}
