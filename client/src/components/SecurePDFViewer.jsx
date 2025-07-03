import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Download, X } from 'lucide-react';
import { pdfAPI } from '../api';
import toast from 'react-hot-toast';

const SecurePDFViewer = ({ pdfId, isOpen, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  
  // Refs to track state and prevent infinite loops
  const fetchingRef = useRef(false);
  const currentPdfIdRef = useRef(null);

  // Create default layout plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      // Remove bookmark tab, keep only thumbnail and attachment tabs
      defaultTabs[0], // thumbnail tab
      defaultTabs[2], // attachment tab
    ],
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setPdfInfo(null);
      setUseIframeFallback(false);
      
      // Clean up blob URL
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        console.log('Cleaning up blob URL on modal close:', pdfUrl);
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      
      // Reset refs
      fetchingRef.current = false;
      currentPdfIdRef.current = null;
    }
  }, [isOpen, pdfUrl]);

  // Separate effect for cleanup of previous blob URLs
  useEffect(() => {
    // Store the current URL so we can clean it up when it changes
    const currentUrl = pdfUrl;
    
    return () => {
      // Cleanup: revoke object URL if it exists
      if (currentUrl && currentUrl.startsWith('blob:')) {
        console.log('Cleaning up blob URL:', currentUrl);
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [pdfUrl]);

  // Reset refs when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      fetchingRef.current = false;
      currentPdfIdRef.current = null;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        console.log('Cleaning up blob URL on unmount:', pdfUrl);
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  const fetchPDFUrl = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // Debug authentication state
      const token = localStorage.getItem('authToken');
      
      console.log('=== PDF Fetch Debug ===');
      console.log('PDF ID:', pdfId);
      console.log('Auth token exists:', !!token);
      console.log('======================');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      console.log('Fetching PDF URL for ID:', pdfId);
      
      const response = await pdfAPI.getViewURL(pdfId);
      console.log('PDF URL response:', response.data);
      
      if (response.data.viewUrl) {
        console.log('Fetching PDF content from proxy URL:', response.data.viewUrl);
        
        try {
          const pdfResponse = await fetch(response.data.viewUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/pdf'
            },
            credentials: 'omit',
            mode: 'cors'
          });
          
          if (!pdfResponse.ok) {
            throw new Error(`HTTP ${pdfResponse.status}: ${pdfResponse.statusText}`);
          }
          
          const pdfBlob = await pdfResponse.blob();
          console.log('PDF blob created, size:', pdfBlob.size, 'type:', pdfBlob.type);
          
          // Ensure the blob has the correct MIME type
          const correctedBlob = pdfBlob.type === 'application/pdf' ? 
            pdfBlob : 
            new Blob([pdfBlob], { type: 'application/pdf' });
          
          const blobUrl = URL.createObjectURL(correctedBlob);
          console.log('PDF blob URL created:', blobUrl);
          
          setPdfUrl(blobUrl);
          setPdfInfo(response.data.pdf);
          console.log('PDF blob URL set successfully');
          
        } catch (fetchError) {
          console.error('Failed to fetch PDF content:', fetchError);
          
          // Fallback to direct URL
          console.log('Using direct proxy URL as fallback');
          setPdfUrl(response.data.viewUrl);
          setPdfInfo(response.data.pdf);
        }
      } else {
        throw new Error('Failed to get PDF view URL');
      }
    } catch (error) {
      console.error('Error fetching PDF URL:', error);
      
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        toast.error('Please log in again to view PDFs');
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to load PDF');
        toast.error('Failed to load PDF');
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [pdfId]);

  // Fetch secure PDF URL when component mounts or pdfId changes
  useEffect(() => {
    if (isOpen && pdfId && pdfId !== currentPdfIdRef.current && !fetchingRef.current) {
      currentPdfIdRef.current = pdfId;
      fetchPDFUrl();
    }
  }, [isOpen, pdfId, fetchPDFUrl]);

  const handleDownload = async () => {
    if (!pdfUrl || !pdfInfo) return;
    
    try {
      if (pdfUrl.startsWith('blob:')) {
        // For blob URLs, create a direct download
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = pdfInfo.title || `pdf-${pdfId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For direct URLs, fetch and download
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdfInfo.title || `pdf-${pdfId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download PDF');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {pdfInfo?.title || `PDF Document ${pdfId}`}
            </h2>
            {pdfInfo && (
              <span className="text-sm text-gray-500">
                {pdfInfo.pages ? `${pdfInfo.pages} pages` : ''}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {pdfUrl && !isLoading && !error && (
              <button
                onClick={handleDownload}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download PDF"
              >
                <Download size={20} />
              </button>
            )}
            
            <button
              onClick={() => {
                setUseIframeFallback(prev => !prev);
                console.log('Switched fallback mode:', !useIframeFallback);
              }}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {useIframeFallback ? 'Use PDF Viewer' : 'Use Iframe'}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={fetchPDFUrl}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Iframe Fallback */}
          {useIframeFallback && pdfUrl && !isLoading && !error && (
            <div className="h-full w-full">
              <iframe
                src={pdfUrl}
                width="100%"
                height="100%"
                style={{ 
                  border: 'none',
                  backgroundColor: 'white'
                }}
                title="PDF Document"
                onLoad={() => console.log('✅ Iframe PDF loaded successfully')}
                onError={() => console.error('❌ Iframe PDF failed to load')}
              />
            </div>
          )}

          {/* React PDF Viewer */}
          {!useIframeFallback && pdfUrl && !isLoading && !error && (
            <div className="h-full pdf-viewer-container">
              <Worker workerUrl="/pdfjs/pdf.worker.min.js">
                <Viewer
                  fileUrl={pdfUrl}
                  plugins={[defaultLayoutPluginInstance]}
                  onDocumentLoad={(e) => {
                    console.log('✅ PDF Document loaded successfully!');
                    console.log('Number of pages:', e.doc.numPages);
                    toast.success(`PDF loaded successfully with ${e.doc.numPages} pages!`);
                  }}
                  onPageChange={(e) => {
                    console.log('Page changed to:', e.currentPage + 1);
                  }}
                  onZoom={(e) => {
                    console.log('Zoom changed to:', e.scale);
                  }}
                />
              </Worker>
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
