import type { FitViewOptions } from '@xyflow/react'
export const MIN_ZOOM = 0.15
export const MAX_ZOOM = 2.5
export const FIT_OPTIONS = { padding: 0.3, minZoom: MIN_ZOOM, maxZoom: 0.85 }

export function fitOptions(container: HTMLElement | null | undefined): Pick<FitViewOptions, 'padding' | 'minZoom' | 'maxZoom'> {
  const height = container?.clientHeight ?? 600
  return { ...FIT_OPTIONS, padding: {
    top: `${Math.min(120, height * .28)}px`,
    bottom: `${Math.min(innerWidth <= 640 ? 210 : 145, height * .45)}px`,
    left: '24px', right: '24px',
  } }
}
