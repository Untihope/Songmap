import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BufferedInput } from './BufferedInput'
import { flushEdits } from './useBufferedText'
import { useSave } from '../state/save'

afterEach(() => { vi.useRealTimers(); useSave.setState({ pending: [], writes: 0, error: false }) })

it('serializes edits made while the previous save is still running', async () => {
  vi.useFakeTimers()
  let resolve!: () => void
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>(r => { resolve = r })).mockResolvedValue(undefined)
  render(<BufferedInput label="言葉" value="" onSave={save}/>)
  fireEvent.change(screen.getByLabelText('言葉'), { target: { value: '先の言葉' } })
  await act(() => vi.advanceTimersByTimeAsync(650))
  fireEvent.change(screen.getByLabelText('言葉'), { target: { value: 'あとから続けた言葉' } })
  expect(save).toHaveBeenCalledTimes(1)
  await act(async () => { resolve(); await flushEdits() })
  expect(save.mock.calls.map(call => call[0])).toEqual(['先の言葉', 'あとから続けた言葉'])
  expect(useSave.getState().pending).toHaveLength(0)
})

it('keeps the newest draft when an earlier write fails and retries it', async () => {
  vi.useFakeTimers()
  let reject!: (error: Error) => void
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>((_, r) => { reject = r })).mockResolvedValue(undefined)
  render(<BufferedInput label="言葉" value="保存済み" onSave={save}/>)
  fireEvent.change(screen.getByLabelText('言葉'), { target: { value: '古い下書き' } })
  await act(() => vi.advanceTimersByTimeAsync(650))
  fireEvent.change(screen.getByLabelText('言葉'), { target: { value: '最新の下書き' } })
  await act(async () => { reject(new Error('容量不足')); await Promise.resolve() })
  expect(screen.getByLabelText('言葉')).toHaveValue('最新の下書き')
  expect(useSave.getState().pending).toHaveLength(1)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '保存を再試行' })); await flushEdits() })
  expect(save).toHaveBeenLastCalledWith('最新の下書き')
  expect(useSave.getState().pending).toHaveLength(0)
})
