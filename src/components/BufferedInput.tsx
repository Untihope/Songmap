import { useBufferedText } from './useBufferedText'
type Props = { value: string; onSave: (value: string) => Promise<unknown>; label: string; multiline?: boolean; className?: string; placeholder?: string }
export function BufferedInput({ value, onSave, label, multiline, className, placeholder }: Props) {
  const edit = useBufferedText(value, onSave)
  const props = { value: edit.text, 'aria-label': label, placeholder, className, onBlur: () => { void edit.flush().catch(() => {}) }, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => edit.change(e.target.value) }
  return <>{multiline ? <textarea {...props}/> : <input {...props}/>} {edit.failed && <button onClick={() => { void edit.flush().catch(() => {}) }}>保存を再試行</button>}</>
}
