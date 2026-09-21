import { create } from 'zustand'
interface UIState {
  theme: 'dark' | 'light'; notice: string; error: string
  setTheme: (theme: 'dark' | 'light') => void; notify: (notice: string) => void; fail: (error: unknown) => void
}
export const useUI = create<UIState>(set => ({
  theme: 'dark', notice: '', error: '', setTheme: theme => set({ theme }),
  notify: notice => set({ notice, error: '' }),
  fail: error => set({ error: error instanceof Error ? error.message : '保存できませんでした。もう一度お試しください。' }),
}))
export function run(work: Promise<unknown>, message?: string) {
  void work.then(() => { if (message) useUI.getState().notify(message) }).catch(useUI.getState().fail)
}
