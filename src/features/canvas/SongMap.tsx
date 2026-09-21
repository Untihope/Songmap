import { sendToLyrics } from '../../domain/lyrics/service'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position, useReactFlow, type NodeProps, type NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive, newMeta, type NodeType, type NodeStatus, type RelationType } from '../../domain/models'
import { addNode, connect, matchesNode, nodeTypes, relatedIds, setNodeTags, statuses } from '../../domain/node/service'
import { useWorkspace } from '../../state/workspace'
import { run } from '../../state/ui'
import { BufferedInput } from '../../components/BufferedInput'
import { toCanvasNode, toCanvasEdge, type CanvasNode } from './adapter'
const NodeCard = memo(function NodeCard({ data }:NodeProps<CanvasNode>) {
  return <div className={'map-node status-' + data.item.status}><Handle type="target" position={Position.Left}/><small>{nodeTypes[data.item.type]} {data.item.favorite ? '★' : ''}</small><div>{data.item.text}</div>{data.tags.length>0 && <p>{data.tags.map(t=>'#'+t).join(' ')}</p>}{data.item.status!=='raw' && <small>{statuses[data.item.status]}</small>}{data.item.collapsed && <small>枝を折りたたみ中</small>}<Handle type="source" position={Position.Right}/></div>
})
const types = { song:NodeCard }
function MapContent({ projectId }: { projectId:string }) {
  const nodes = useLiveQuery(() => db.records('nodes').where('projectId').equals(projectId).toArray(),[projectId])
  const edges = useLiveQuery(() => db.records('edges').where('projectId').equals(projectId).toArray(),[projectId])
  const tags = useLiveQuery(() => db.records('tags').where('projectId').equals(projectId).toArray(),[projectId])
  const { selected, editor, focus, filterType, filterTags, filterStatus, search, revealNode, revealToken, select } = useWorkspace()
  const flow = useReactFlow<CanvasNode>(); const [positions,setPositions] = useState<Record<string,{x:number;y:number}>>({})
  const [draft,setDraft] = useState<{x:number;y:number;parent?:string} | null>(null); const [text,setText]=useState('')
  const [edgeId,setEdgeId]=useState(''); const [connecting,setConnecting]=useState('')
  const liveEdges = useMemo(() => (edges??[]).filter(isLive),[edges])
  const liveNodes = useMemo(() => (nodes??[]).filter(isLive),[nodes])
  const hidden = useMemo(() => {
    const ids = new Set<string>(); const roots = liveNodes.filter(n=>n.collapsed)
    for(const root of roots) { const seen=new Set([root.id]); const queue=[root.id]; while(queue.length){ const id=queue.shift(); for(const e of liveEdges){if(e.sourceNodeId===id&&!seen.has(e.targetNodeId)){ seen.add(e.targetNodeId);ids.add(e.targetNodeId);queue.push(e.targetNodeId)}} } }
    return ids
  },[liveNodes,liveEdges])
  const canvasNodes=useMemo(() => {
    const related=focus&&selected[0]?relatedIds(selected[0],liveEdges):null
    return liveNodes.filter(n=>!hidden.has(n.id)).map(n=>{const node=toCanvasNode(n,tags??[],selected.includes(n.id),!matchesNode(n,search,filterType,filterStatus,filterTags)||!!related&&!related.has(n.id));return {...node,position:positions[n.id]??node.position} })
  },[liveNodes,tags,selected,focus,search,filterType,filterStatus,filterTags,liveEdges,hidden,positions])
  const canvasEdges=useMemo(()=>liveEdges.filter(e=>liveNodes.some(n=>n.id===e.sourceNodeId)&&liveNodes.some(n=>n.id===e.targetNodeId)&&!hidden.has(e.sourceNodeId)&&!hidden.has(e.targetNodeId)).map(toCanvasEdge),[liveEdges,liveNodes,hidden])
  useEffect(()=>{ if(!revealNode) return; const node=liveNodes.find(n=>n.id===revealNode); if(node) void flow.setCenter(node.position.x+100,node.position.y+45,{zoom:1,duration:200}) },[revealNode,revealToken,liveNodes,flow])
  const onNodesChange=useCallback((changes:NodeChange<CanvasNode>[])=>{
    for(const c of changes){ if(c.type==='position'&&c.position) setPositions(p=>({...p,[c.id]:c.position!})); if(c.type==='select') { const ids=useWorkspace.getState().selected; select(c.selected?[...new Set([...ids,c.id])]:ids.filter(id=>id!==c.id)) } }
  },[select])
  const add=(parent?:string)=>{const n=liveNodes.find(n=>n.id===parent);setText('');setDraft(n?{x:n.position.x+280,y:n.position.y+100,parent:n.id}:{...flow.screenToFlowPosition({x:window.innerWidth/2,y:window.innerHeight/2})})}
  const remove=()=>run(repository.atomic(async()=>{for(const id of selected) await repository.remove('nodes',id)}).then(()=>select([])),'削除しました')
  const chosen=liveNodes.find(n=>n.id===selected[0]); const edited=liveNodes.find(n=>n.id===editor); const edge=liveEdges.find(e=>e.id===edgeId)
  return <div className="map-area" tabIndex={0} aria-label="Mind Map" onKeyDown={e=>{
    if((e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return
    if(e.key==='Escape'){select([]);setDraft(null);useWorkspace.setState({editor:''});setEdgeId('');setConnecting('')}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove()}
    if(e.key==='f'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();void flow.fitView({padding:.3})}
    if(e.key==='Enter'&&chosen){e.preventDefault();if(e.shiftKey)add();else useWorkspace.setState({editor:chosen.id})}
    if(e.key==='Tab'&&chosen){e.preventDefault();add(chosen.id)}
    if(e.key==='/'&&chosen){e.preventDefault();useWorkspace.setState({editor:chosen.id})}
    if((e.ctrlKey||e.metaKey)&&e.key==='d'&&chosen){e.preventDefault();run(repository.put('nodes',{...chosen,...newMeta(),position:{x:chosen.position.x+40,y:chosen.position.y+70}}))}
  }}>
    <ReactFlow<CanvasNode> nodes={canvasNodes} edges={canvasEdges} nodeTypes={types} onNodesChange={onNodesChange} fitView fitViewOptions={{padding:.4}} minZoom={.15} maxZoom={2.5}
      panOnScroll zoomOnScroll={false} zoomActivationKeyCode={['Meta','Control']} panActivationKeyCode="Space" selectionKeyCode="Shift" multiSelectionKeyCode="Shift" deleteKeyCode={null}
      onConnect={c=>run(connect(projectId,c.source,c.target))}
      onNodeClick={(e,n)=>{if(connecting){run(connect(projectId,connecting,n.id),'接続しました');setConnecting('')}else if(!e.shiftKey)select([n.id])}}
      onNodeDoubleClick={(_,n)=>useWorkspace.setState({editor:n.id})}
      onPaneClick={()=>{select([]);setEdgeId('')}}
      onDoubleClick={e=>{if((e.target as HTMLElement).closest('.react-flow__node,.react-flow__edge'))return;setText('');setDraft(flow.screenToFlowPosition({x:e.clientX,y:e.clientY}))}}
      onNodeDragStop={(event,n,dragged)=>{const point='clientX'in event?event:event.changedTouches[0];const target=point?document.elementsFromPoint(point.clientX,point.clientY).map(el=>el.closest('[data-section-id]')).find(Boolean):null;const sectionId=target?.getAttribute('data-section-id');if(sectionId){run(sendToLyrics('nodes',n.id,sectionId).then(()=>setPositions({})),'歌詞へ追加しました');return}run(repository.atomic(async()=>{for(const moved of dragged.length?dragged:[n]) await repository.patch('nodes',moved.id,{position:moved.position})}).then(()=>setPositions({})))}}
      onEdgeClick={(_,e)=>{setEdgeId(e.id);select([])}}
      onMoveEnd={(_,v)=>run(db.workspaceStates.put({id:projectId+':'+(innerWidth<640?'phone':'desktop'),projectId,deviceClass:innerWidth<640?'phone':'desktop',zoom:v.zoom,viewportX:v.x,viewportY:v.y}))}
      onInit={instance=>run(db.workspaceStates.get(projectId+':'+(innerWidth<640?'phone':'desktop')).then(s=>{if(s?.zoom)void instance.setViewport({x:s.viewportX??0,y:s.viewportY??0,zoom:s.zoom})}))}
      ><Background gap={24} size={1}/><Controls showInteractive={false}/><MiniMap pannable zoomable nodeColor="var(--accent)" maskColor="var(--canvas)"/></ReactFlow>
    <div className="canvas-top"><span className="eyebrow">MIND MAP</span><small>{liveNodes.length} nodes</small><button onClick={()=>useWorkspace.setState({focus:!focus})} aria-pressed={focus}>Focus</button></div>
    <button className="quick-add primary" onClick={()=>add()}>＋ 言葉を追加</button>
    {connecting&&<div className="map-hint">接続先のノードを選択 <button onClick={()=>setConnecting('')}>取消</button></div>}
    {chosen&&<div className="node-actions"><button onClick={()=>add(chosen.id)}>＋子</button><button onClick={()=>setConnecting(chosen.id)}>接続</button><button aria-label="お気に入り" aria-pressed={chosen.favorite} onClick={()=>run(repository.patch('nodes',chosen.id,{favorite:!chosen.favorite}))}>{chosen.favorite?'★':'☆'}</button><button onClick={()=>useWorkspace.setState({sendId:chosen.id,sendType:'nodes'})}>→歌詞</button><button onClick={()=>useWorkspace.setState({editor:chosen.id})}>編集</button><button onClick={remove}>削除</button></div>}
    {draft&&<form className="quick-input floating-editor" onSubmit={e=>{e.preventDefault();run(addNode(projectId,text,{x:draft.x,y:draft.y},draft.parent).then(n=>{select([n.id]);setDraft(null)}),'ノードを追加しました')}}><label>何を考えてる？<input autoFocus aria-label="新しいノード" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.nativeEvent.isComposing&&e.key==='Enter')e.preventDefault()}}/></label><div className="row"><button className="primary" disabled={!text.trim()}>追加</button><button type="button" onClick={()=>setDraft(null)}>閉じる</button></div></form>}
    {edited&&<aside className="node-editor floating-editor" aria-label="ノード編集"><div className="row between"><h2>言葉を整える</h2><button aria-label="編集を閉じる" onClick={()=>useWorkspace.setState({editor:''})}>×</button></div><div className="stack"><BufferedInput multiline label="ノードのテキスト" value={edited.text} onSave={text=>repository.patch('nodes',edited.id,{text})}/><label>種類<select aria-label="ノードの種類" value={edited.type} onChange={e=>run(repository.patch('nodes',edited.id,{type:e.target.value as NodeType}))}>{Object.entries(nodeTypes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>状態<select value={edited.status} onChange={e=>run(repository.patch('nodes',edited.id,{status:e.target.value as NodeStatus}))}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>タグ<BufferedInput label="ノードのタグ" value={(tags??[]).filter(t=>edited.tagIds.includes(t.id)).map(t=>t.name).join(', ')} onSave={text=>setNodeTags(edited,text)}/></label><label>メモ<BufferedInput multiline label="ノードのメモ" value={edited.note??''} onSave={note=>repository.patch('nodes',edited.id,{note})}/></label><button onClick={()=>run(repository.patch('nodes',edited.id,{collapsed:!edited.collapsed}))}>{edited.collapsed?'枝を展開':'枝を折りたたむ'}</button></div></aside>}
    {edge&&<aside className="floating-editor"><div className="row between"><h2>つながり</h2><button onClick={()=>setEdgeId('')}>閉じる</button></div><label>関係<select value={edge.relationType} onChange={e=>run(repository.patch('edges',edge.id,{relationType:e.target.value as RelationType}))}>{['related','cause','contrast','rephrase','chronology','foreshadow','payoff','custom'].map(t=><option key={t}>{t}</option>)}</select></label>{edge.relationType==='custom'&&<BufferedInput label="関係の名前" value={edge.customLabel??''} onSave={customLabel=>repository.patch('edges',edge.id,{customLabel})}/>}<button onClick={()=>run(repository.remove('edges',edge.id).then(()=>setEdgeId('')))}>接続を削除</button></aside>}
  </div>
}
export function SongMap({projectId}:{projectId:string}) { return <ReactFlowProvider><MapContent projectId={projectId}/></ReactFlowProvider> }

