import { create } from 'zustand'
interface WorkspaceUI {
  selected: string[]; editor: string; focus: boolean; filterType: string; filterStatus: string; filterTags: string[]; search: string
  mobileView: 'map' | 'lyrics' | 'fragments' | 'list'; revealNode: string; revealToken: number
  select: (ids: string[]) => void; reveal: (id: string) => void
}
export const useWorkspace = create<WorkspaceUI>(set => ({
  selected:[], editor:'', focus:false, filterType:'', filterStatus:'', filterTags:[], search:'', mobileView:'map', revealNode:'', revealToken:0,
  select: selected => set({ selected }), reveal: id => set(s => ({ selected:[id], revealNode:id, revealToken:s.revealToken+1, mobileView:'map' })),
}))
