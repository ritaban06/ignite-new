import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X, RotateCw } from 'lucide-react';
import { pdfAPI } from '../api';
import toast from 'react-hot-toast';

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

  // Fetch secure PDF URL when component mounts or pdfId changes
  useEffect(() => {
    if (isOpen && pdfId) {
      fetchPDFUrl();
    }
    
    return () => {
      // Cleanup: revoke object URL if it exists
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, pdfId]);

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
      const response = await pdfAPI.getViewURL(pdfId);
      console.log('PDF URL response:', response.data);
      
      if (response.data.viewUrl) {
        setPdfUrl(response.data.viewUrl);
        setPdfInfo(response.data.pdf);
        console.log('PDF URL set to:', response.data.viewUrl);
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
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF loading error:', error);
    console.error('PDF URL that failed:', pdfUrl);
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
    } else {
      setError('Failed to load PDF document. The file might be corrupted or inaccessible.');
      toast.error('Failed to load PDF document');
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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 gradient-bg text-white">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold truncate">
              {pdfInfo?.title || 'PDF Document'}
            </h3>
            {pdfInfo && (
              <div className="text-sm text-primary-200">
                {pdfInfo.subject} • {pdfInfo.department} Year {pdfInfo.year}
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-primary-100">
          <div className="flex items-center space-x-2">
            {/* Page Navigation */}
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
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
                className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-gray-600">
                of {numPages || '...'}
              </span>
            </div>
            
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            
            <span className="text-sm text-gray-600 min-w-12 text-center font-medium">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            {/* Rotate */}
            <button
              onClick={rotate}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Reset */}
            <button
              onClick={resetView}
              className="px-3 py-1 text-sm bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-gray-200 p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading PDF...</p>
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
                    onClick={() => {
                      console.log('=== Auth Debug Info ===');
                      console.log('Token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
                      console.log('User:', localStorage.getItem('user') ? 'Present' : 'Missing');
                      console.log('API URL:', import.meta.env.VITE_API_URL || '/api');
                      console.log('Current URL:', window.location.href);
                      toast.info('Check browser console for debug info');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Debug Auth
                  </button>
                </div>
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <div className="flex justify-center">
              <div style={{ transform: `rotate(${rotation}deg)` }}>
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  options={{
                    workerSrc: '/pdfjs/pdf.worker.min.js'
                  }}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    className="shadow-lg"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
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
