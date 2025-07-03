import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    historyApiFallback: true, // Enable history API fallback for SPA routing
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    },
    // Configure proper headers for PDF.js worker compatibility
    middlewareMode: false,
    headers: {
      // Remove restrictive COOP/COEP headers that can break PDF.js
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist', '@react-pdf-viewer/core', '@react-pdf-viewer/default-layout']
  },
  build: {
    rollupOptions: {
      // Remove external configuration for PDF worker
    }
  },
  // Ensure proper MIME types for PDF worker files
  define: {
    global: 'globalThis',
  }
})
