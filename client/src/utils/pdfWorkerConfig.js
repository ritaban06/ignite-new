import { pdfjs } from 'react-pdf';

// Configuration for PDF.js worker to avoid CORS issues
export const configurePDFWorker = () => {
  try {
    // Always use local worker file to avoid CORS issues with CDN
    const workerUrl = '/pdfjs/pdf.worker.min.js';
    
    // Ensure pdfjs is properly initialized before setting worker
    if (typeof pdfjs !== 'undefined' && pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      console.log('PDF.js worker configured to use local file:', workerUrl);
      console.log('PDF.js version:', pdfjs.version);
    } else {
      console.error('PDF.js not properly initialized');
      return false;
    }
    
    // Test if worker is accessible (but don't block initialization)
    if (typeof window !== 'undefined') {
      setTimeout(() => {
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
      }, 100); // Small delay to ensure everything is loaded
    }
    
    return true;
  } catch (error) {
    console.error('Error configuring PDF worker:', error);
    return false;
  }
};

// Export version info for debugging
export const getPDFVersion = () => {
  try {
    return pdfjs?.version || 'unknown';
  } catch (error) {
    console.error('Error getting PDF version:', error);
    return 'error';
  }
};
