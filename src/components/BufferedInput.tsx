import { useCallback, useEffect, useRef, useState } from 'react'
import { useUI } from '../state/ui'
type Props = { value: string; onSave: (value: string) => Promise<unknown>; label: string; multiline?: boolean; className?: string; placeholder?: string }
export function BufferedInput({ value, onSave, label, multiline, className, placeholder }: Props) {
  const [draft, setDraft] = useState(value)
  const [failed, setFailed] = useState(false)
  const pending = useRef<string | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const save = useRef(onSave)
  useEffect(() => { save.current = onSave }, [onSave])
  useEffect(() => { if (pending.current === undefined) setDraft(value) }, [value])
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const text = pending.current
    if (text === undefined) return
    pending.current = undefined
    void save.current(text).then(() => setFailed(false)).catch(error => { pending.current = text; setFailed(true); useUI.getState().fail(error) })
  }, [])
  useEffect(() => {
    const now = () => flush()
    window.addEventListener('songmap:save', now)
    const hide = () => { if (document.visibilityState === 'hidden') now() }
    document.addEventListener('visibilitychange', hide)
    return () => { now(); window.removeEventListener('songmap:save', now); document.removeEventListener('visibilitychange', hide) }
  }, [flush])
  const props = { value: draft, 'aria-label': label, placeholder, className, onBlur: () => flush(), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setDraft(e.target.value); pending.current = e.target.value; clearTimeout(timer.current); timer.current = setTimeout(() => flush(), 650) } }
  return <>{multiline ? <textarea {...props}/> : <input {...props}/>} {failed && <button onClick={() => flush()}>保存を再試行</button>}</>
}
