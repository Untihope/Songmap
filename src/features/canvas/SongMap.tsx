import { ZoomControls } from './ZoomControls'
import { MIN_ZOOM, MAX_ZOOM, FIT_OPTIONS, fitOptions } from './viewport'
import { useShallow } from 'zustand/react/shallow'
import { Dialog } from '../../components/Dialog'
import { saveWorkspace, workspaceId } from '../../data/local/workspace'
import { UsedIn } from '../lyrics/UsedIn'
import { nodeToFragment } from '../../domain/fragment/service'
import { sendToLyrics } from '../../domain/lyrics/service'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Background, MiniMap, Handle, Position, useReactFlow, useNodesInitialized, type NodeProps, type NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/local/database'
import { repository } from '../../data/repositories/localRepository'
import { isLive, newMeta, type NodeType, type NodeStatus, type RelationType } from '../../domain/models'
import { addNode, addChildNode, connect, matchesNode, nodeTypes, relatedIds, setNodeTags, statuses } from '../../domain/node/service'
import { useWorkspace } from '../../state/workspace'
import { run } from '../../state/ui'
import { BufferedInput } from '../../components/BufferedInput'
import { toCanvasNode, toCanvasEdge, type CanvasNode } from './adapter'
const NodeCard = memo(function NodeCard({ data }:NodeProps<CanvasNode>) {
  return <div className={'map-node status-' + data.item.status}><Handle type="target" position={Position.Left}/><small>{nodeTypes[data.item.type]} {data.item.favorite ? '★' : ''}</small><div>{data.item.text}</div>{data.tags.length>0 && <p>{data.tags.map(t=>'#'+t).join(' ')}</p>}{data.item.status!=='raw' && <small>{statuses[data.item.status]}</small>}{data.item.collapsed && <small>枝を折りたたみ中</small>}<Handle type="source" position={Position.Right}/></div>
}, (a,b)=>a.data.item.text===b.data.item.text&&a.data.item.type===b.data.item.type&&a.data.item.status===b.data.item.status&&a.data.item.favorite===b.data.item.favorite&&a.data.item.collapsed===b.data.item.collapsed&&a.data.tags.join('\0')===b.data.tags.join('\0'))
const types = { song:NodeCard }
function MapContent({ projectId }: { projectId:string }) {
  const nodes = useLiveQuery(() => db.records('nodes').where('projectId').equals(projectId).toArray(),[projectId])
  const edges = useLiveQuery(() => db.records('edges').where('projectId').equals(projectId).toArray(),[projectId])
  const tags = useLiveQuery(() => db.records('tags').where('projectId').equals(projectId).toArray(),[projectId])
  const { selected, editor, focus, filterType, filterTags, filterStatus, search, revealNode, revealToken, select } = useWorkspace(useShallow(s=>({selected:s.selected,editor:s.editor,focus:s.focus,filterType:s.filterType,filterTags:s.filterTags,filterStatus:s.filterStatus,search:s.search,revealNode:s.revealNode,revealToken:s.revealToken,select:s.select})))
  const mapRef=useRef<HTMLDivElement>(null)
  const longPress=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const touchStart=useRef({x:0,y:0})
  useEffect(()=>()=>clearTimeout(longPress.current),[])
  const viewportReady=useRef(false)
  const nodesInitialized=useNodesInitialized()
  const flow = useReactFlow<CanvasNode>(); const [positions,setPositions] = useState<Record<string,{x:number;y:number}>>({})
  const [measurements,setMeasurements]=useState<Record<string,{width:number;height:number}>>({})
  const [adding,setAdding]=useState(false)
  const [draft,setDraft] = useState<{x:number;y:number;parent?:string} | null>(null); const [text,setText]=useState('')
  const [edgeId,setEdgeId]=useState(''); const [connecting,setConnecting]=useState('')
  useEffect(()=>{
    if(viewportReady.current||nodes===undefined||nodes.some(isLive)&&!nodesInitialized||!flow.viewportInitialized)return
    let active=true
    run((async()=>{
      const saved=await db.workspaceStates.get(workspaceId(projectId))
      if(!active)return
      if(saved?.zoom)await flow.setViewport({x:saved.viewportX??0,y:saved.viewportY??0,zoom:Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,saved.zoom))})
      else if(nodes.some(isLive))await flow.fitView(fitOptions(mapRef.current))
      else await flow.setViewport({x:0,y:0,zoom:FIT_OPTIONS.maxZoom})
      if(active)viewportReady.current=true
    })())
    return()=>{active=false}
  },[nodes,nodesInitialized,flow,projectId])
  const liveEdges = useMemo(() => (edges??[]).filter(isLive),[edges])
  const liveNodes = useMemo(() => (nodes??[]).filter(isLive),[nodes])
  const hidden = useMemo(() => {
    const ids = new Set<string>(); const roots = liveNodes.filter(n=>n.collapsed)
    for(const root of roots) { const seen=new Set([root.id]); const queue=[root.id]; while(queue.length){ const id=queue.shift(); for(const e of liveEdges){if(e.sourceNodeId===id&&!seen.has(e.targetNodeId)){ seen.add(e.targetNodeId);ids.add(e.targetNodeId);queue.push(e.targetNodeId)}} } }
    return ids
  },[liveNodes,liveEdges])
  const baseNodes=useMemo(() => {
    const related=focus&&selected[0]?relatedIds(selected[0],liveEdges):null
    return liveNodes.filter(n=>!hidden.has(n.id)).map(n=>{const node=toCanvasNode(n,tags??[],selected.includes(n.id),!matchesNode(n,search,filterType,filterStatus,filterTags)||!!related&&!related.has(n.id));return node })
  },[liveNodes,tags,selected,focus,search,filterType,filterStatus,filterTags,liveEdges,hidden])
  const canvasNodes=useMemo(()=>baseNodes.map(n=>({...n,position:positions[n.id]??n.position,measured:measurements[n.id]})),[baseNodes,positions,measurements])
  const canvasEdges=useMemo(()=>{const ids=new Set(liveNodes.filter(n=>!hidden.has(n.id)).map(n=>n.id));return liveEdges.filter(e=>ids.has(e.sourceNodeId)&&ids.has(e.targetNodeId)).map(toCanvasEdge)},[liveEdges,liveNodes,hidden])
  useEffect(()=>{
    if(!revealNode)return
    let active=true
    run((async()=>{
      const node=await db.records('nodes').get(revealNode)
      if(!node||node.deletedAt||node.projectId!==projectId)return
      const edges=(await db.records('edges').where('projectId').equals(projectId).toArray()).filter(isLive)
      const ancestors=new Set([node.id]),queue=[node.id]
      while(queue.length){const id=queue.shift();for(const edge of edges)if(edge.targetNodeId===id&&!ancestors.has(edge.sourceNodeId)){ancestors.add(edge.sourceNodeId);queue.push(edge.sourceNodeId)}}
      const parents=(await db.records('nodes').bulkGet([...ancestors])).filter(n=>n&&isLive(n)&&n.collapsed)
      if(parents.length)await repository.atomic(async()=>{for(const n of parents)if(n)await repository.patch('nodes',n.id,{collapsed:false})})
      if(!active)return
      await flow.setCenter(node.position.x+100,node.position.y+45,{zoom:1,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:200})
      if(!active)return
      const element=mapRef.current?.querySelector<HTMLElement>('[data-id="'+node.id+'"]')
      element?.focus({preventScroll:true})
      element?.animate([{outline:'2px solid var(--accent)'},{outline:'2px solid transparent'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:800})
    })())
    return()=>{active=false}
  },[revealNode,revealToken,projectId,flow])
  useEffect(()=>{if(!editor)return;const timer=setTimeout(()=>mapRef.current?.querySelector<HTMLTextAreaElement>('[aria-label="ノードのテキスト"]')?.focus(),0);return()=>clearTimeout(timer)},[editor])
  const onNodesChange=useCallback((changes:NodeChange<CanvasNode>[])=>{
    for(const c of changes){ if(c.type==='dimensions'&&c.dimensions){const size=c.dimensions;setMeasurements(p=>p[c.id]?.width===size.width&&p[c.id]?.height===size.height?p:{...p,[c.id]:size})} if(c.type==='position'&&c.position) setPositions(p=>({...p,[c.id]:c.position!})); if(c.type==='select') { const ids=useWorkspace.getState().selected; select(c.selected?[...new Set([...ids,c.id])]:ids.filter(id=>id!==c.id)) } }
  },[select])
  const add=(parent?:string)=>{const n=liveNodes.find(n=>n.id===parent);setText('');setDraft(n?{x:n.position.x+280,y:n.position.y+100,parent:n.id}:{...flow.screenToFlowPosition({x:(mapRef.current?.getBoundingClientRect().left??0)+(mapRef.current?.clientWidth??innerWidth)/2,y:(mapRef.current?.getBoundingClientRect().top??0)+(mapRef.current?.clientHeight??innerHeight)/2})})}
  const remove=()=>run(repository.atomic(async()=>{for(const id of selected) await repository.remove('nodes',id)}).then(()=>select([])),'削除しました')
  const chosen=liveNodes.find(n=>n.id===selected[0]); const edited=liveNodes.find(n=>n.id===editor); const edge=liveEdges.find(e=>e.id===edgeId)
  return <div ref={mapRef} className="map-area" tabIndex={0} aria-label="Mind Map" onPointerDownCapture={e=>{if(e.pointerType!=='touch')return;const x=e.clientX,y=e.clientY;touchStart.current={x,y};const id=(e.target as HTMLElement).closest('.react-flow__node')?.getAttribute('data-id');longPress.current=setTimeout(()=>{if(id){select([id]);useWorkspace.setState({editor:id})}else if((e.target as HTMLElement).closest('.react-flow__pane')){setText('');setDraft(flow.screenToFlowPosition({x,y}))}},550)}} onPointerMoveCapture={e=>{if(Math.hypot(e.clientX-touchStart.current.x,e.clientY-touchStart.current.y)>10)clearTimeout(longPress.current)}} onPointerUpCapture={()=>clearTimeout(longPress.current)} onPointerCancelCapture={()=>clearTimeout(longPress.current)} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{
    if(e.nativeEvent.isComposing)return
    if(e.key==='Escape'){e.preventDefault();select([]);setDraft(null);useWorkspace.setState({editor:''});setEdgeId('');setConnecting('');mapRef.current?.focus();return}
    if((e.target as HTMLElement).closest('input,textarea,select,button,summary,[contenteditable=true]')) return
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove()}
    if(e.key==='f'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();void flow.fitView(fitOptions(mapRef.current))}
    if(e.key==='Enter'&&chosen){e.preventDefault();if(e.shiftKey){setText('');setDraft({x:chosen.position.x,y:chosen.position.y+120,parent:liveEdges.find(edge=>edge.targetNodeId===chosen.id)?.sourceNodeId})}else useWorkspace.setState({editor:chosen.id})}
    if(e.key==='Tab'&&!e.shiftKey&&chosen){e.preventDefault();add(chosen.id)}
    if(e.key==='/'&&chosen){e.preventDefault();useWorkspace.setState({editor:chosen.id})}
    if((e.ctrlKey||e.metaKey)&&e.key==='d'&&chosen){e.preventDefault();run(repository.put('nodes',{...chosen,...newMeta(),position:{x:chosen.position.x+40,y:chosen.position.y+70}}))}
  }}>
    <ReactFlow<CanvasNode> nodes={canvasNodes} edges={canvasEdges} nodeTypes={types} onNodesChange={onNodesChange} defaultViewport={{x:0,y:0,zoom:FIT_OPTIONS.maxZoom}} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} zoomOnDoubleClick={false}
      autoPanOnNodeDrag={false} zoomOnPinch panOnDrag panOnScroll zoomOnScroll={false} zoomActivationKeyCode={['Meta','Control']} panActivationKeyCode="Space" selectionKeyCode="Shift" multiSelectionKeyCode="Shift" deleteKeyCode={null}
      onConnect={c=>run(connect(projectId,c.source,c.target))}
      onNodeClick={(e,n)=>{if(connecting){run(connect(projectId,connecting,n.id),'接続しました');setConnecting('')}else if(!e.shiftKey)select([n.id])}}
      onNodeDoubleClick={(_,n)=>useWorkspace.setState({editor:n.id})}
      onPaneClick={()=>{select([]);setEdgeId('')}}
      onDoubleClick={e=>{if(!(e.target as HTMLElement).classList.contains('react-flow__pane'))return;setText('');setDraft(flow.screenToFlowPosition({x:e.clientX,y:e.clientY}))}}
      onNodeDrag={event=>{const point='clientX'in event?event:event.changedTouches[0];document.querySelectorAll('.lyrics-section.drop-target').forEach(el=>el.classList.remove('drop-target'));if(point)document.elementsFromPoint(point.clientX,point.clientY).map(el=>el.closest('[data-section-id]')).find(Boolean)?.classList.add('drop-target')}}
      onNodeDragStop={(event,n,dragged)=>{document.querySelectorAll('.lyrics-section.drop-target').forEach(el=>el.classList.remove('drop-target'));const point='clientX'in event?event:event.changedTouches[0];const target=point?document.elementsFromPoint(point.clientX,point.clientY).map(el=>el.closest('[data-section-id]')).find(Boolean):null;const sectionId=target?.getAttribute('data-section-id');if(sectionId){run(sendToLyrics('nodes',n.id,sectionId).then(()=>setPositions({})),'歌詞へ追加しました');return}run(repository.atomic(async()=>{for(const moved of dragged.length?dragged:[n]) await repository.patch('nodes',moved.id,{position:moved.position})}).then(()=>setPositions({})))}}
      onEdgeClick={(_,e)=>{setEdgeId(e.id);select([])}}
      onMoveEnd={(_,v)=>{if(viewportReady.current)run(saveWorkspace(projectId,{zoom:v.zoom,viewportX:v.x,viewportY:v.y,selectedNodeId:useWorkspace.getState().selected[0]}))}}
      ><Background gap={24} size={1}/><MiniMap pannable zoomable nodeColor="var(--accent)" maskColor="var(--canvas)"/></ReactFlow><ZoomControls/>
    <div className="canvas-top"><span className="eyebrow">MIND MAP</span><small>{liveNodes.length} nodes</small><button onClick={()=>{useWorkspace.setState({focus:!focus,zen:false});run(saveWorkspace(projectId,{activeView:focus?'canvas':'focus'}))}} aria-pressed={focus}>Focus</button></div>
    <button className="quick-add primary" onClick={()=>add()}>＋ 言葉を追加</button>
    {connecting&&<div className="map-hint">接続先のノードを選択 <button onClick={()=>setConnecting('')}>取消</button></div>}
    {chosen&&<div className="node-actions"><button onClick={()=>add(chosen.id)}>＋子</button><button onClick={()=>setConnecting(chosen.id)}>接続</button><button aria-label="お気に入り" aria-pressed={chosen.favorite} onClick={()=>run(repository.patch('nodes',chosen.id,{favorite:!chosen.favorite}))}>{chosen.favorite?'★':'☆'}</button><button onClick={()=>useWorkspace.setState({sendId:chosen.id,sendType:'nodes'})}>→歌詞</button><button onClick={()=>useWorkspace.setState({editor:chosen.id})}>編集</button><button onClick={remove}>削除</button></div>}
    {draft&&<Dialog label="Quick Add" onClose={()=>{setDraft(null);mapRef.current?.focus()}}><form className="quick-input" onSubmit={e=>{e.preventDefault();if(adding)return;setAdding(true);run((draft.parent?addChildNode(projectId,text,draft.parent,measurements):addNode(projectId,text,{x:draft.x,y:draft.y})).then(n=>{select([n.id]);setDraft(null);mapRef.current?.focus()}).finally(()=>setAdding(false)),'ノードを追加しました')}}><label>何を考えてる？<input autoFocus aria-label="新しいノード" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.nativeEvent.isComposing&&e.key==='Enter')e.preventDefault()}}/></label><div className="row"><button className="primary" disabled={!text.trim()||adding}>追加</button><button type="button" onClick={()=>setDraft(null)}>閉じる</button></div></form></Dialog>}
    {nodes===undefined&&<p className="map-empty" role="status">マップを読み込み中…</p>}{nodes!==undefined&&liveNodes.length===0&&!draft&&<p className="map-empty">浮かんだ言葉をひとつ。<br/>「＋ 言葉を追加」から始められます。</p>}
    {edited&&<aside className="node-editor floating-editor" aria-label="ノード編集"><div className="row between"><h2>言葉を整える</h2><button aria-label="編集を閉じる" onClick={()=>useWorkspace.setState({editor:''})}>×</button></div><div className="stack"><UsedIn nodeId={edited.id}/><div className="row"><button onClick={()=>useWorkspace.setState({sendId:edited.id,sendType:'nodes'})}>歌詞へ送る</button><button onClick={()=>run(repository.put('nodes',{...edited,...newMeta(),position:{x:edited.position.x+40,y:edited.position.y+70}}))}>複製</button><button onClick={()=>run(repository.remove('nodes',edited.id).then(()=>useWorkspace.setState({editor:''})),'削除しました')}>削除</button></div><BufferedInput multiline label="ノードのテキスト" value={edited.text} onSave={text=>repository.patch('nodes',edited.id,{text})}/><label>種類<select aria-label="ノードの種類" value={edited.type} onChange={e=>run(repository.patch('nodes',edited.id,{type:e.target.value as NodeType}))}>{Object.entries(nodeTypes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>状態<select value={edited.status} onChange={e=>run(repository.patch('nodes',edited.id,{status:e.target.value as NodeStatus}))}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>タグ<BufferedInput label="ノードのタグ" value={(tags??[]).filter(t=>edited.tagIds.includes(t.id)).map(t=>t.name).join(', ')} onSave={text=>setNodeTags(edited,text)}/></label><label>メモ<BufferedInput multiline label="ノードのメモ" value={edited.note??''} onSave={note=>repository.patch('nodes',edited.id,{note})}/></label><button onClick={()=>run(nodeToFragment(edited.id),'Fragmentに残しました')}>Fragmentに残す</button><button onClick={()=>run(repository.patch('nodes',edited.id,{collapsed:!edited.collapsed}))}>{edited.collapsed?'枝を展開':'枝を折りたたむ'}</button></div></aside>}
    {edge&&<aside className="floating-editor"><div className="row between"><h2>つながり</h2><button onClick={()=>setEdgeId('')}>閉じる</button></div><label>関係<select value={edge.relationType} onChange={e=>run(repository.patch('edges',edge.id,{relationType:e.target.value as RelationType}))}>{['related','cause','contrast','rephrase','chronology','foreshadow','payoff','custom'].map(t=><option key={t}>{t}</option>)}</select></label>{edge.relationType==='custom'&&<BufferedInput label="関係の名前" value={edge.customLabel??''} onSave={customLabel=>repository.patch('edges',edge.id,{customLabel})}/>}<button onClick={()=>run(repository.remove('edges',edge.id).then(()=>setEdgeId('')))}>接続を削除</button></aside>}
  </div>
}
export function SongMap({projectId}:{projectId:string}) { return <ReactFlowProvider><MapContent projectId={projectId}/></ReactFlowProvider> }
