import { useRef } from 'react'
import { useReactFlow, useViewport } from '@xyflow/react'

import { MIN_ZOOM, MAX_ZOOM, fitOptions } from './viewport'

export function ZoomControls() {
  const ref = useRef<HTMLDivElement>(null)
  const { zoom } = useViewport()
  const flow = useReactFlow()
  const percent = Math.round(zoom * 100)
  return <div ref={ref} className="map-zoom-controls nodrag nopan" role="group" aria-label="マップの拡大縮小" onDoubleClick={e => e.stopPropagation()}>
    <button aria-label="縮小" disabled={zoom <= MIN_ZOOM} onClick={() => void flow.zoomTo(Math.max(MIN_ZOOM, flow.getZoom() / 1.2))}>−</button>
    <input type="range" aria-label="ズーム倍率" aria-valuetext={percent + '%'} min="15" max="250" step="1" value={percent} onChange={e => void flow.zoomTo(Number(e.target.value) / 100)}/>
    <button aria-label="拡大" disabled={zoom >= MAX_ZOOM} onClick={() => void flow.zoomTo(Math.min(MAX_ZOOM, flow.getZoom() * 1.2))}>＋</button>
    <output aria-label="現在のズーム倍率">{percent}%</output>
    <button onClick={() => void flow.fitView(fitOptions(ref.current?.parentElement))} title="マップ全体を表示（F）">全体表示</button>
  </div>
}
