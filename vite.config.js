import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' garante que funcione no GitHub Pages, Netlify e em subpastas.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    // Alvo conservador: cobre iPhone antigo que ainda roda na corporação.
    // O padrão do Vite exige Safari 14+, e aparelho de guarda costuma ser
    // mais velho que isso.
    target: ['es2018', 'safari12', 'chrome70'],
    sourcemap: false,
    chunkSizeWarningLimit: 1200
  },
  server: { port: 5173, host: true }
})
