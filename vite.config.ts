import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react(), VitePWA({registerType:'prompt',includeAssets:['icon-192.png','icon-512.png'],manifest:{name:'SongMap',short_name:'SongMap',description:'思いつきを捕まえ、歌詞へ育てる',lang:'ja',theme_color:'#111318',background_color:'#111318',display:'standalone',start_url:'/',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}],shortcuts:[{name:'Quick Capture',url:'/?capture=1'},{name:'Inbox',url:'/inbox'},{name:'Continue',url:'/?continue=1'}]},workbox:{globPatterns:['**/*.{js,css,html,png,svg,webmanifest}'],navigateFallback:'/index.html',cleanupOutdatedCaches:true}})],
  test: { environment: 'jsdom', setupFiles: ['./src/tests/setup.ts'], include: ['src/**/*.test.{ts,tsx}'] },
})
