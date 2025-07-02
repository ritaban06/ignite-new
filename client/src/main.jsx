import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Import and configure PDF.js worker early
import { pdfjs } from 'react-pdf'

// Configure worker immediately with error handling
try {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
  console.log('PDF.js version:', pdfjs.version);
  console.log('PDF.js worker configured to use local file: /pdfjs/pdf.worker.min.js');
} catch (error) {
  console.error('Error configuring PDF.js worker:', error);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
