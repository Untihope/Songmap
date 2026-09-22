import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { markDirty, markSaved } from '../state/save'
import { useUI } from '../state/ui'

const flushers = new Set<() => Promise<void>>()
export async function flushEdits() { await Promise.all([...flushers].map(flush => flush())) }

export function useBufferedText(value: string, onSave: (text: string) => Promise<unknown>) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const save = useRef(onSave)
  const pending = useRef<{ text: string; version: number } | undefined>(undefined)
  const version = useRef(0)
  const running = useRef<Promise<void> | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => { save.current = onSave }, [onSave])
  const flush = useCallback((): Promise<void> => {
    clearTimeout(timer.current)
    if (running.current) return running.current
    if (!pending.current) return Promise.resolve()
    const work = async () => {
      while (pending.current) {
        const current = pending.current
        await save.current(current.text)
        if (pending.current?.version === current.version) pending.current = undefined
      }
      setDraft(null); setFailed(false); markSaved(id)
    }
    const result = work().catch(error => { setFailed(true); useUI.getState().fail(error); throw error }).finally(() => { running.current = undefined })
    running.current = result
    return result
  }, [id])
  useEffect(() => {
    const now = () => { void flush().catch(() => {}) }
    flushers.add(flush)
    window.addEventListener('songmap:save', now)
    return () => { now(); flushers.delete(flush); window.removeEventListener('songmap:save', now) }
  }, [flush])
  const change = (text: string) => {
    pending.current = { text, version: ++version.current }
    setDraft(text); markDirty(id); clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush().catch(() => {}) }, 650)
  }
  return { text: draft ?? value, change, flush, failed }
}
