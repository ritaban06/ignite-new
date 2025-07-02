import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X, RotateCw } from 'lucide-react';
import { pdfAPI } from '../api';
import toast from 'react-hot-toast';
import PDFTest from './PDFTest';

// The PDF worker is configured globally in main.jsx with CORS-friendly CDN

// Also set it via the version-specific approach for better compatibility
if (typeof window !== 'undefined') {
  window.pdfWorkerSrc = '/pdfjs/pdf.worker.min.js';
}

const SecurePDFViewer = ({ pdfId, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [showTestComponent, setShowTestComponent] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // Fetch secure PDF URL when component mounts or pdfId changes
  useEffect(() => {
    if (isOpen && pdfId) {
      fetchPDFUrl();
    }
    
    return () => {
      // Cleanup: revoke object URL if it exists
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        console.log('Cleaning up blob URL:', pdfUrl);
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, pdfId, pdfUrl]); // Add pdfUrl to dependencies for cleanup

  const fetchPDFUrl = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Debug authentication state
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      console.log('=== PDF Fetch Debug ===');
      console.log('PDF ID:', pdfId);
      console.log('Auth token exists:', !!token);
      console.log('Auth token length:', token?.length);
      console.log('User exists:', !!user);
      console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
      console.log('API Base URL:', import.meta.env.VITE_API_URL || '/api');
      console.log('======================');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      console.log('Fetching PDF URL for ID:', pdfId);
      
      // Test the API request step by step
      console.log('Making API request to:', `${import.meta.env.VITE_API_URL || '/api'}/pdfs/${pdfId}/view`);
      
      const response = await pdfAPI.getViewURL(pdfId);
      console.log('PDF URL response status:', response.status);
      console.log('PDF URL response headers:', response.headers);
      console.log('PDF URL response data:', response.data);
      
      if (response.data.viewUrl) {
        // Instead of using the proxy URL directly, fetch the PDF content and create a blob URL
        console.log('Fetching PDF content from proxy URL:', response.data.viewUrl);
        
        try {
          // Fetch the PDF content with proper headers
          console.log('Attempting to fetch PDF content...');
          const pdfResponse = await fetch(response.data.viewUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/pdf'
              // Removed Cache-Control header to avoid CORS issues
            },
            credentials: 'omit', // Don't send cookies to avoid CORS issues
            mode: 'cors'
          });
          
          console.log('PDF fetch response status:', pdfResponse.status);
          console.log('PDF fetch response headers:', [...pdfResponse.headers.entries()]);
          
          if (!pdfResponse.ok) {
            throw new Error(`HTTP ${pdfResponse.status}: ${pdfResponse.statusText}`);
          }
          
          console.log('Converting PDF response to blob...');
          // Convert response to blob with explicit PDF type
          const pdfBlob = await pdfResponse.blob();
          console.log('PDF blob created, size:', pdfBlob.size, 'type:', pdfBlob.type);
          
          // Ensure the blob has the correct MIME type
          const correctedBlob = pdfBlob.type === 'application/pdf' ? 
            pdfBlob : 
            new Blob([pdfBlob], { type: 'application/pdf' });
          
          // Create blob URL for react-pdf to use
          const blobUrl = URL.createObjectURL(correctedBlob);
          console.log('PDF blob URL created:', blobUrl);
          
          // Test if blob is valid by creating a temporary link
          const testLink = document.createElement('a');
          testLink.href = blobUrl;
          testLink.download = 'test.pdf';
          console.log('✅ Blob URL is valid, download would work');
          
          setPdfUrl(blobUrl);
          setPdfInfo(response.data.pdf);
          console.log('PDF blob URL set successfully');
          console.log('🔍 PDF State Update:');
          console.log('- Original blob size:', pdfBlob.size, 'bytes');
          console.log('- Original blob type:', pdfBlob.type);
          console.log('- Corrected blob type:', correctedBlob.type);
          console.log('- Blob URL:', blobUrl);
          console.log('- PDF Info:', response.data.pdf);
          console.log('- Setting loading to false and error to null');
          
        } catch (fetchError) {
          console.error('Failed to fetch PDF content:', fetchError);
          console.error('Fetch error details:', fetchError.message);
          
          // Check if it's a blocked request (ad blocker, etc.)
          if (fetchError.message.includes('Failed to fetch') || 
              fetchError.message.includes('ERR_BLOCKED_BY_CLIENT') ||
              fetchError.message.includes('net::ERR_FAILED')) {
            
            console.log('Direct fetch blocked, trying base64 approach...');
            
            try {
              // Try getting PDF as base64 data instead
              const base64Response = await pdfAPI.getPDFBase64(pdfId);
              console.log('Base64 response received, size:', base64Response.data.base64Data?.length);
              
              if (base64Response.data.base64Data) {
                // Convert base64 to blob
                const binaryData = atob(base64Response.data.base64Data);
                const bytes = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                  bytes[i] = binaryData.charCodeAt(i);
                }
                
                const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(pdfBlob);
                
                console.log('PDF blob created from base64, size:', pdfBlob.size);
                console.log('PDF blob URL created:', blobUrl);
                
                setPdfUrl(blobUrl);
                setPdfInfo(base64Response.data.pdf);
                console.log('PDF loaded successfully via base64 method');
                
                return; // Success, don't fall back to direct URL
              }
            } catch (base64Error) {
              console.error('Base64 method also failed:', base64Error);
            }
          }
          
          // Final fallback: try using the proxy URL directly
          console.log('All fetch methods failed, falling back to direct proxy URL');
          setPdfUrl(response.data.viewUrl);
          setPdfInfo(response.data.pdf);
          console.log('Using direct proxy URL as fallback:', response.data.viewUrl);
        }
      } else {
        throw new Error('Failed to get PDF view URL');
      }
    } catch (error) {
      console.error('Error fetching PDF URL:', error);
      console.error('Error details:', error.response?.data);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        toast.error('Please log in again to view PDFs');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to load PDF');
        toast.error('Failed to load PDF');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('✅ PDF Document loaded successfully!');
    console.log('Number of pages:', numPages);
    console.log('PDF URL used:', pdfUrl);
    console.log('Worker source:', pdfjs.GlobalWorkerOptions.workerSrc);
    setNumPages(numPages);
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
    toast.success(`PDF loaded successfully with ${numPages} pages!`);
  };

  const onDocumentLoadError = (error) => {
    console.error('❌ PDF Document loading error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('PDF URL that failed:', pdfUrl);
    console.error('PDF URL type:', typeof pdfUrl);
    console.error('Is blob URL:', pdfUrl?.startsWith('blob:'));
    console.error('Current worker source:', pdfjs.GlobalWorkerOptions.workerSrc);
    
    // Check if it's a worker-related error
    if (error.message && (error.message.includes('worker') || error.message.includes('fake worker'))) {
      setError('PDF worker failed to load. Trying to reconfigure...');
      toast.error('PDF worker failed to load');
      
      // Try to reconfigure worker and retry
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
      console.log('Reconfigured worker to local file, please try opening the PDF again');
    } else if (error.message && error.message.includes('CORS')) {
      setError('PDF loading failed due to CORS restrictions. Please try refreshing the page.');
      toast.error('PDF loading failed due to CORS restrictions');
    } else if (error.message && error.message.includes('Unexpected token')) {
      setError('PDF worker file is corrupted or invalid. Please contact support.');
      toast.error('PDF worker file is corrupted');
    } else if (error.message && (error.message.includes('404') || error.message.includes('Not Found'))) {
      setError('PDF file not found. It may have been deleted or moved.');
      toast.error('PDF file not found');
    } else if (error.message && (error.message.includes('403') || error.message.includes('Forbidden'))) {
      setError('Access denied. You may not have permission to view this PDF.');
      toast.error('Access denied to PDF');
    } else {
      setError('Failed to load PDF document. The file might be corrupted or the server may be experiencing issues.');
      toast.error('Failed to load PDF document');
      
      // Log additional debugging info
      console.log('=== PDF Load Error Debug ===');
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('PDF URL:', pdfUrl);
      console.log('PDF URL type:', typeof pdfUrl);
      console.log('PDF URL includes token:', pdfUrl ? pdfUrl.includes('token=') : 'No URL');
      console.log('========================');
    }
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.max(1, Math.min(newPageNumber, numPages));
    });
  };

  const goToPage = (page) => {
    const pageNum = parseInt(page);
    if (pageNum >= 1 && pageNum <= numPages) {
      setPageNumber(pageNum);
    }
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.25, 0.5));
  };

  const rotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  const resetView = () => {
    setScale(1.0);
    setRotation(0);
    setPageNumber(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 gradient-bg flex items-center justify-center">
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 gradient-accent text-white">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold truncate">
              {pdfInfo?.title || 'PDF Document'}
            </h3>
            {pdfInfo && (
              <div className="text-sm text-white/80">
                {pdfInfo.subject} • {pdfInfo.department} Year {pdfInfo.year}
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-primary-50/80 backdrop-blur-sm border-b border-primary-200/50">
          <div className="flex items-center space-x-2">
            {/* Page Navigation */}
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-2 text-primary-700 hover:text-primary-800 hover:bg-primary-100 disabled:text-primary-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max={numPages || 1}
                value={pageNumber}
                onChange={(e) => goToPage(e.target.value)}
                className="w-16 px-2 py-1 text-center border border-primary-300 rounded bg-white/90 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-primary-700">
                of {numPages || '...'}
              </span>
            </div>
            
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="p-2 text-primary-700 hover:text-primary-800 hover:bg-primary-100 disabled:text-primary-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 text-primary-700 hover:text-primary-800 hover:bg-primary-100 disabled:text-primary-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            
            <span className="text-sm text-primary-700 min-w-12 text-center font-medium">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="p-2 text-primary-700 hover:text-primary-800 hover:bg-primary-100 disabled:text-primary-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            {/* Rotate */}
            <button
              onClick={rotate}
              className="p-2 text-primary-700 hover:text-primary-800 hover:bg-primary-100 rounded-lg transition-colors"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Reset */}
            <button
              onClick={resetView}
              className="px-3 py-1 text-sm bg-primary-200 hover:bg-primary-300 text-primary-800 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-primary-100/50 backdrop-blur-sm p-4">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 text-xs rounded">
              Debug: isLoading={isLoading.toString()}, error={error?.toString() || 'null'}, pdfUrl={pdfUrl ? 'set' : 'null'}, numPages={numPages || 'null'}
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-primary-700">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <p className="text-red-600 mb-4">{error}</p>
                <div className="space-y-2">
                  <button
                    onClick={fetchPDFUrl}
                    className="px-4 py-2 gradient-accent text-white rounded-lg hover:shadow-md transition-all duration-200 mr-2"
                  >
                    Retry
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('=== Testing API Connectivity ===');
                        // Test health endpoint first
                        const healthResponse = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/health`);
                        console.log('Health API response status:', healthResponse.status);
                        const healthData = await healthResponse.json();
                        console.log('Health API response data:', healthData);
                        
                        // Test authenticated endpoint
                        const testResponse = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pdfs`, {
                          method: 'GET',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                            'Content-Type': 'application/json'
                          },
                          credentials: 'include'
                        });
                        console.log('Test API response status:', testResponse.status);
                        console.log('Test API response headers:', [...testResponse.headers.entries()]);
                        const testData = await testResponse.json();
                        console.log('Test API response data:', testData);
                        toast.success('API test completed - check console');
                      } catch (error) {
                        console.error('API test failed:', error);
                        toast.error('API test failed - check console');
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mr-2"
                  >
                    Test API
                  </button>
                  <button
                    onClick={() => {
                      console.log('=== Auth Debug Info ===');
                      console.log('Token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
                      console.log('User:', localStorage.getItem('user') ? 'Present' : 'Missing');
                      console.log('API URL:', import.meta.env.VITE_API_URL || '/api');
                      console.log('Current URL:', window.location.href);
                      console.log('User data:', JSON.parse(localStorage.getItem('user') || '{}'));
                      console.log('Token preview:', localStorage.getItem('authToken')?.substring(0, 30) + '...');
                      console.log('Current PDF URL:', pdfUrl);
                      console.log('PDF URL type:', typeof pdfUrl);
                      console.log('Is blob URL:', pdfUrl?.startsWith('blob:'));
                      // Use toast.success instead of toast.info
                      toast.success('Check browser console for debug info');
                    }}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors mr-2"
                  >
                    Debug Auth
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('=== Testing PDF Base64 Method ===');
                        const response = await pdfAPI.getPDFBase64(pdfId);
                        console.log('Base64 response status:', response.status);
                        console.log('Base64 data length:', response.data.base64Data?.length);
                        console.log('Base64 PDF info:', response.data.pdf);
                        
                        if (response.data.base64Data) {
                          // Try to create blob and blob URL
                          const binaryData = atob(response.data.base64Data);
                          const bytes = new Uint8Array(binaryData.length);
                          for (let i = 0; i < binaryData.length; i++) {
                            bytes[i] = binaryData.charCodeAt(i);
                          }
                          
                          const blob = new Blob([bytes], { type: 'application/pdf' });
                          const blobUrl = URL.createObjectURL(blob);
                          console.log('Test blob created, size:', blob.size);
                          console.log('Test blob URL:', blobUrl);
                          
                          toast.success('Base64 test completed - check console');
                        } else {
                          throw new Error('No base64 data received');
                        }
                      } catch (error) {
                        console.error('Base64 test failed:', error);
                        toast.error('Base64 test failed - check console');
                      }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mr-2"
                  >
                    Test Base64
                  </button>
                  <button
                    onClick={() => setShowTestComponent(prev => !prev)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors mr-2"
                  >
                    {showTestComponent ? 'Hide' : 'Show'} Test Component
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔄 Force re-render PDF component');
                      setNumPages(null);
                      setPageNumber(1);
                      setError(null);
                      // Force re-render by briefly setting pdfUrl to null then back
                      const currentUrl = pdfUrl;
                      setPdfUrl(null);
                      setTimeout(() => {
                        setPdfUrl(currentUrl);
                        console.log('PDF URL restored:', currentUrl);
                      }, 100);
                    }}
                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors mr-2"
                  >
                    Force Re-render
                  </button>
                  <button
                    onClick={() => {
                      setUseIframeFallback(prev => !prev);
                      console.log('Switched to iframe fallback:', !useIframeFallback);
                    }}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    {useIframeFallback ? 'Use React-PDF' : 'Use Iframe'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Test Component */}
          {showTestComponent && pdfUrl && (
            <PDFTest pdfUrl={pdfUrl} />
          )}

          {/* Iframe Fallback */}
          {useIframeFallback && pdfUrl && !isLoading && !error && (
            <div className="h-full w-full flex justify-center">
              <iframe
                src={pdfUrl}
                width="100%"
                height="600px"
                style={{ 
                  border: 'none',
                  minHeight: '600px',
                  backgroundColor: 'white'
                }}
                title="PDF Document"
                onLoad={() => console.log('✅ Iframe PDF loaded successfully')}
                onError={() => console.error('❌ Iframe PDF failed to load')}
              />
            </div>
          )}

          {/* React-PDF Component */}
          {!useIframeFallback && pdfUrl && !isLoading && !error && (
            <div className="flex justify-center">
              <div style={{ transform: `rotate(${rotation}deg)` }}>
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  onLoadProgress={({ loaded, total }) => {
                    if (total > 0) {
                      console.log(`Loading progress: ${loaded}/${total} (${Math.round(loaded/total*100)}%)`);
                    }
                  }}
                  onSourceSuccess={() => {
                    console.log('✅ PDF source loaded successfully');
                  }}
                  onSourceError={(error) => {
                    console.error('❌ PDF source error:', error);
                  }}
                  options={{
                    // Simplified options - remove problematic ones
                    workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
                    verbosity: 1, // Show more debug info
                    isEvalSupported: false,
                    disableAutoFetch: false,
                    disableStream: false,
                    disableRange: false
                  }}
                  loading={
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-primary-700 mt-2">Loading PDF document...</span>
                      <span className="text-xs text-gray-500 mt-1">Worker: {pdfjs.GlobalWorkerOptions.workerSrc}</span>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <p className="text-red-600 mb-2">Failed to load PDF document</p>
                        <p className="text-xs text-gray-500 mb-4">URL: {pdfUrl?.substring(0, 50)}...</p>
                        <button 
                          onClick={fetchPDFUrl}
                          className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  }
                >
                  {numPages && (
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      className="shadow-lg mx-auto"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onRenderSuccess={() => {
                        console.log(`✅ Page ${pageNumber} rendered successfully`);
                      }}
                      onRenderError={(error) => {
                        console.error(`❌ Page ${pageNumber} render error:`, error);
                      }}
                      onLoadSuccess={() => {
                        console.log(`✅ Page ${pageNumber} loaded successfully`);
                      }}
                      onLoadError={(error) => {
                        console.error(`❌ Page ${pageNumber} load error:`, error);
                      }}
                    />
                  )}
                </Document>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-100 border-t text-center text-sm text-gray-600">
          <p>This PDF is protected and can only be viewed through Ignite.</p>
        </div>
      </div>
    </div>
  );
};

export default SecurePDFViewer;
