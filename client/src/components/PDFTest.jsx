import React, { useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Simple test component to debug PDF rendering
const PDFTest = ({ pdfUrl }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create secure default layout plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      // Only keep thumbnail tab, remove others to prevent file access
      defaultTabs[0], // thumbnail tab
    ],
  });

  if (!pdfUrl) {
    return <div className="p-4 text-red-500">No PDF URL provided for test</div>;
  }

  return (
    <div className="border-2 border-blue-500 p-4 m-4" style={{ userSelect: 'none' }}>
      <h3 className="text-lg font-bold mb-2">PDF Test Component</h3>
      <p className="text-sm mb-2">URL: {pdfUrl.substring(0, 50)}...</p>
      <p className="text-sm mb-2">Worker: /pdfjs/pdf.worker.min.js</p>
      <p className="text-xs text-red-600 mb-2">🔒 Download & Print Disabled</p>
      
      <div 
        style={{ 
          height: '400px', 
          border: '1px solid #ccc',
          userSelect: 'none'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Worker workerUrl="/pdfjs/pdf.worker.min.js">
          <Viewer
            fileUrl={pdfUrl}
            plugins={[defaultLayoutPluginInstance]}
            onDocumentLoad={(e) => {
              console.log('✅ Test PDF loaded successfully with', e.doc.numPages, 'pages');
              setIsLoading(false);
              setError(null);
            }}
            onDocumentLoadError={(e) => {
              console.error('❌ Test PDF load error:', e);
              setIsLoading(false);
              setError('Failed to load test PDF');
            }}
          />
        </Worker>
      </div>
      
      {isLoading && (
        <div className="mt-2 text-blue-600">Loading test PDF...</div>
      )}
      
      {error && (
        <div className="mt-2 text-red-600">{error}</div>
      )}
    </div>
  );
};

export default PDFTest;
