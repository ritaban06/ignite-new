import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configurePDFWorker } from './utils/pdfWorkerConfig'
import './index.css'
import App from './App.jsx'

// Configure PDF.js worker to prevent CORS issues
configurePDFWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
