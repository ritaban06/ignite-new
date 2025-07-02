import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Simple test component to debug PDF rendering
const PDFTest = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    console.log('✅ Test PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
  }

  function onDocumentLoadError(error) {
    console.error('❌ Test PDF load error:', error);
  }

  if (!pdfUrl) {
    return <div className="p-4 text-red-500">No PDF URL provided for test</div>;
  }

  return (
    <div className="border-2 border-blue-500 p-4 m-4">
      <h3 className="text-lg font-bold mb-2">PDF Test Component</h3>
      <p className="text-sm mb-2">URL: {pdfUrl.substring(0, 50)}...</p>
      <p className="text-sm mb-2">Worker: {pdfjs.GlobalWorkerOptions.workerSrc}</p>
      
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={<div>Loading test PDF...</div>}
        error={<div className="text-red-500">Failed to load test PDF</div>}
      >
        {numPages && (
          <Page 
            pageNumber={pageNumber} 
            width={300}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        )}
      </Document>
      
      {numPages && (
        <div className="mt-2">
          <p>Page {pageNumber} of {numPages}</p>
          <button 
            onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="px-2 py-1 bg-blue-500 text-white rounded mr-2"
          >
            Previous
          </button>
          <button 
            onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
            disabled={pageNumber >= numPages}
            className="px-2 py-1 bg-blue-500 text-white rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFTest;
