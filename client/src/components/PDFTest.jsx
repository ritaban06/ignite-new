import React, { useState, useEffect } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';

// Simple test component to debug PDF rendering
const PDFTest = ({ pdfUrl }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create secure toolbar plugin that disables download, print, and open
  const secureToolbarPluginInstance = toolbarPlugin({
    transform: (slot) => ({
      ...slot,
      Download: () => <></>,
      DownloadMenuItem: () => <></>,
      Print: () => <></>,
      PrintMenuItem: () => <></>,
      Open: () => <></>,
      OpenMenuItem: () => <></>,
      MoreActions: () => <></>,
      MoreActionsPopover: () => <></>,
    }),
  });

  // Create secure default layout plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      // Only keep thumbnail tab, remove others to prevent file access
      defaultTabs[0], // thumbnail tab
    ],
    toolbarPlugin: secureToolbarPluginInstance,
  });

  // Hide toolbar buttons dynamically
  useEffect(() => {
    if (!isLoading) {
      const hideToolbarButtons = () => {
        const selectors = [
          'button[title*="Download"]',
          'button[title*="Print"]', 
          'button[title*="Open"]',
          '[data-testid="toolbar__download-button"]',
          '[data-testid="toolbar__print-button"]',
          '[data-testid="toolbar__open-button"]',
          '.rpv-download',
          '.rpv-print',
          '.rpv-open'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
          });
        });
      };

      hideToolbarButtons();
      const timer = setTimeout(hideToolbarButtons, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

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
