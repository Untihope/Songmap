import { create } from 'zustand'
export const useSave=create<{pending:string[];writes:number;error:boolean}>(()=>({pending:[],writes:0,error:false}))
export const markDirty=(id:string)=>useSave.setState(s=>({pending:[...new Set([...s.pending,id])]}))
export const markSaved=(id:string)=>useSave.setState(s=>({pending:s.pending.filter(v=>v!==id)}))

