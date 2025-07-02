import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { pdfjs } from 'react-pdf'
import './index.css'
import App from './App.jsx'

// Configure PDF.js worker globally to prevent CORS issues
// Try local file first for development
const isProduction = import.meta.env.PROD;
let workerUrl;

if (isProduction) {
  // Use CDNJS for production
  workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
} else {
  // Use local file for development to avoid CORS issues
  workerUrl = '/pdfjs/pdf.worker.min.js';
}

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

console.log('PDF.js version:', pdfjs.version);
console.log('PDF.js worker configured to use:', workerUrl);
console.log('Environment:', isProduction ? 'production' : 'development');

// Test worker accessibility
if (typeof window !== 'undefined') {
  fetch(workerUrl, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        console.log('✅ PDF worker is accessible');
      } else {
        throw new Error(`Worker responded with status ${response.status}`);
      }
    })
    .catch((error) => {
      console.warn('❌ PDF worker test failed:', error.message);
      // Fallback to CDN if local fails in development
      if (!isProduction) {
        const fallbackWorker = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        console.log('Falling back to CDN worker:', fallbackWorker);
        pdfjs.GlobalWorkerOptions.workerSrc = fallbackWorker;
      }
    });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
