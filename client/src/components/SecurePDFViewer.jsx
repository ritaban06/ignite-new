import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X, RotateCw } from 'lucide-react';
import { pdfAPI } from '../api';
import toast from 'react-hot-toast';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
      
      const response = await pdfAPI.getViewURL(pdfId);
      if (response.data.viewUrl) {
        setPdfUrl(response.data.viewUrl);
        setPdfInfo(response.data.pdf);
      } else {
        throw new Error('Failed to get PDF view URL');
      }
    } catch (error) {
      console.error('Error fetching PDF URL:', error);
      setError(error.response?.data?.error || 'Failed to load PDF');
      toast.error('Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF loading error:', error);
    setError('Failed to load PDF document');
    toast.error('Failed to load PDF document');
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
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold truncate">
              {pdfInfo?.title || 'PDF Document'}
            </h3>
            {pdfInfo && (
              <div className="text-sm text-gray-300">
                {pdfInfo.subject} • {pdfInfo.department} Year {pdfInfo.year}
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
          <div className="flex items-center space-x-2">
            {/* Page Navigation */}
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
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
                className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
              />
              <span className="text-gray-600">
                of {numPages || '...'}
              </span>
            </div>
            
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            
            <span className="text-sm text-gray-600 min-w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={zoomIn}
              disabled={scale >= 3.0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            {/* Rotate */}
            <button
              onClick={rotate}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Reset */}
            <button
              onClick={resetView}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
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
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchPDFUrl}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Retry
                </button>
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
