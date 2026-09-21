import {create} from 'zustand'
export const useSync=create<{userId:string;email:string;state:'guest'|'idle'|'syncing'|'error';message:string}>(()=>({userId:'',email:'',state:'guest',message:''}))

