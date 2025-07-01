import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { pdfjs } from 'react-pdf'
import './index.css'
import App from './App.jsx'

// Configure PDF.js worker globally to prevent CORS issues
// Use CDNJS which has proper CORS headers
const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

console.log('PDF.js version:', pdfjs.version);
console.log('PDF.js worker configured to use:', workerUrl);

// Fallback to local file if CDN fails
if (typeof window !== 'undefined') {
  const originalWorkerSrc = pdfjs.GlobalWorkerOptions.workerSrc;
  
  // Test if CDN is accessible
  fetch(originalWorkerSrc, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        console.log('✅ CDNJS worker is accessible');
      } else {
        throw new Error(`CDN responded with status ${response.status}`);
      }
    })
    .catch((error) => {
      console.warn('CDN worker failed:', error.message);
      console.log('Falling back to local worker');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
    });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
