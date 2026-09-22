import { useEffect, useRef, type ReactNode } from 'react'

/** Native modal semantics provide focus containment, Escape and background inertness. */
export function Dialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    const initial = dialog.querySelector<HTMLElement>('input:not([type=hidden]),textarea') ?? dialog.querySelector<HTMLElement>('[autofocus],button')
    initial?.focus()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className="song-dialog send-sheet stack" aria-label={label}
    onKeyDown={e => {
      if(e.key !== 'Tab') return
      const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button,input,textarea,select,a[href],[tabindex]')].filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length)
      const first=items[0], last=items.at(-1)
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus()}
    }}
    onCancel={e => { e.preventDefault(); onClose() }}
    onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose() } }}>
    {children}
  </dialog>
}
