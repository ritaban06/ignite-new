import { pdfjs } from 'react-pdf';

// Configuration for PDF.js worker to avoid CORS issues
export const configurePDFWorker = () => {
  // Always use local worker file to avoid CORS issues with CDN
  const workerUrl = '/pdfjs/pdf.worker.min.js';
  
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  
  console.log('PDF.js worker configured to use local file:', workerUrl);
  
  // Test if worker is accessible
  if (typeof window !== 'undefined') {
    fetch(workerUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('✅ PDF worker is accessible');
        } else {
          console.warn(`❌ PDF worker responded with status ${response.status}`);
        }
      })
      .catch((error) => {
        console.warn('❌ PDF worker test failed:', error.message);
      });
  }
};

// Export version info for debugging
export const getPDFVersion = () => pdfjs.version;
