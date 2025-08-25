import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { toolbarPlugin, MoreActionsPopover } from '@react-pdf-viewer/toolbar';
import { X } from 'lucide-react';
import { pdfAPI } from '../api';
import toast from 'react-hot-toast';


const SecurePDFViewer = ({ pdfId, isOpen, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  // --- Annotation State ---
  // const [annotations, setAnnotations] = useState([]); // [{page, type, rect, text, note}]
  // const [selectedText, setSelectedText] = useState(null);
  // const [showNoteInput, setShowNoteInput] = useState(false);
  // const [noteInput, setNoteInput] = useState('');
  const viewerRef = useRef();
  
  // Refs to track state and prevent infinite loops
  const fetchingRef = useRef(false);
  const currentPdfIdRef = useRef(null);


  // Create secure toolbar plugin that disables download, print, and open
  const secureToolbarPluginInstance = toolbarPlugin({
    // Transform the toolbar to remove dangerous buttons
    transform: (slot) => ({
      ...slot,
      // Remove download button completely
      Download: () => <></>,
      DownloadMenuItem: () => <></>,
      // Remove print button completely  
      Print: () => <></>,
      PrintMenuItem: () => <></>,
      // Remove open file button
      Open: () => <></>,
      // Remove more actions that might contain download/print
      MoreActions: () => <></>,
      MoreActionsPopover: () => <></>,
    }),
  });

  // Create default layout plugin instance with lazy loading enabled
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Keep only the thumbnail tab
    ],
    renderPage: (props) => {
      // Render only the visible pages lazily
      if (props.pageIndex === 0 || props.isVisible) {
        return props.canvasLayer;
      }
      return null;
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setPdfInfo(null);
      setUseIframeFallback(false);
      
      // Clean up blob URL
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        // console.log('Cleaning up blob URL on modal close:', pdfUrl);
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
        // console.log('Cleaning up blob URL:', currentUrl);
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
        // console.log('Cleaning up blob URL on unmount:', pdfUrl);
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  const fetchPDFUrl = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('[SecurePDFViewer] Fetch already in progress, skipping...');
      return;
    }
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Debug authentication state
      const token = localStorage.getItem('authToken');

      // console.log('[SecurePDFViewer] === PDF Fetch Debug ===');
      // console.log('[SecurePDFViewer] PDF ID:', pdfId);
      // console.log('[SecurePDFViewer] Auth token exists:', !!token);
      // console.log('[SecurePDFViewer] ======================');

      if (!token) {
        console.error('[SecurePDFViewer] No authentication token found.');
        throw new Error('No authentication token found. Please log in again.');
      }

      // console.log('[SecurePDFViewer] Fetching PDF URL for ID:', pdfId);

      let response;
      try {
        response = await pdfAPI.getViewURL(pdfId);
        // console.log('[SecurePDFViewer] PDF URL response:', response.data);
      } catch (apiError) {
        console.error('[SecurePDFViewer] Error calling pdfAPI.getViewURL:', apiError);
        throw apiError;
      }

      if (response.data.viewUrl) {
        // console.log('[SecurePDFViewer] Proxy URL received:', response.data.viewUrl);
        try {
          // console.log('[SecurePDFViewer] Fetching PDF from proxy URL:', response.data.viewUrl);
          const pdfResponse = await fetch(response.data.viewUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/pdf'
            },
            credentials: 'omit',
            mode: 'cors'
          });

          // console.log('[SecurePDFViewer] PDF proxy fetch response:', pdfResponse.status, pdfResponse.statusText);
          if (!pdfResponse.ok) {
            console.error('[SecurePDFViewer] PDF proxy fetch failed:', pdfResponse.status, pdfResponse.statusText);
            throw new Error(`HTTP ${pdfResponse.status}: ${pdfResponse.statusText}`);
          }

          const pdfBlob = await pdfResponse.blob();
          // console.log('[SecurePDFViewer] PDF blob created, size:', pdfBlob.size, 'type:', pdfBlob.type);

          // Ensure the blob has the correct MIME type
          const correctedBlob = pdfBlob.type === 'application/pdf' ?
            pdfBlob :
            new Blob([pdfBlob], { type: 'application/pdf' });

          const blobUrl = URL.createObjectURL(correctedBlob);
          // console.log('[SecurePDFViewer] PDF blob URL created:', blobUrl);

          setPdfUrl(blobUrl);
          setPdfInfo(response.data.pdf);
          // console.log('[SecurePDFViewer] PDF blob URL set successfully');

        } catch (fetchError) {
          console.error('[SecurePDFViewer] Failed to fetch PDF content from proxy:', fetchError);
          // Fallback to direct URL
          // console.log('[SecurePDFViewer] Using direct proxy URL as fallback');
          setPdfUrl(response.data.viewUrl);
          setPdfInfo(response.data.pdf);
        }
      } else {
        // console.error('[SecurePDFViewer] No viewUrl in response:', response.data);
        throw new Error('Failed to get PDF view URL');
      }
    } catch (error) {
      console.error('[SecurePDFViewer] Error fetching PDF URL:', error);
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

  // Disable right-click context menu and keyboard shortcuts
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      // Disable Ctrl+S (Save), Ctrl+P (Print), Ctrl+A (Select All), F12 (DevTools)
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'S')) ||
        (e.ctrlKey && (e.key === 'p' || e.key === 'P')) ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'A')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) ||
        e.key === 'F12' ||
        e.keyCode === 123
      ) {
        e.preventDefault();
        
        // Determine which key combination was pressed
        let keyDescription = '';
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
          keyDescription = 'Ctrl+Shift+I (Developer Tools)';
        } else if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
          keyDescription = 'Ctrl+Shift+J (Console)';
        } else if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          keyDescription = 'Ctrl+Shift+C (Inspect Element)';
        } else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
          keyDescription = 'Ctrl+S (Save)';
        } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
          keyDescription = 'Ctrl+P (Print)';
        } else if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
          keyDescription = 'Ctrl+A (Select All)';
        } else if (e.key === 'F12' || e.keyCode === 123) {
          keyDescription = 'F12 (Developer Tools)';
        } else {
          keyDescription = `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        }
        
        toast.error(`${keyDescription} is disabled for security reasons`);
        return false;
      }
    };

    if (isOpen) {
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Additional effect to hide any remaining toolbar buttons after PDF loads
  useEffect(() => {
    if (pdfUrl && !isLoading && !error) {
      const hideToolbarButtons = () => {
        // Hide download, print, open, and Show Properties buttons by various selectors
        const selectors = [
          'button[title*="Download"]',
          'button[title*="Print"]', 
          'button[title*="Open"]',
          'button[title*="Save"]',
          '[data-testid="toolbar__download-button"]',
          '[data-testid="toolbar__print-button"]',
          '[data-testid="toolbar__open-button"]',
          '[data-testid="more-actions__menu"]',
          '.rpv-download',
          '.rpv-print',
          '.rpv-open',
          'button[title*="Properties"]',
          '[data-testid="toolbar__properties-button"]',
          '.rpv-properties',
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.remove(); // Completely remove the element
          });
        });
      };

      // Hide buttons immediately and after a short delay to catch late-rendered elements
      hideToolbarButtons();
      const timer = setTimeout(hideToolbarButtons, 500);
      const timer2 = setTimeout(hideToolbarButtons, 1000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [pdfUrl, isLoading, error]);

  // Load annotations when PDF is opened
  // useEffect(() => {
  //   if (isOpen && pdfId) {
  //     annotationAPI.getAnnotations(pdfId)
  //       .then(res => setAnnotations(res.data || []))
  //       .catch(() => setAnnotations([]));
  //   }
  // }, [isOpen, pdfId]);

  // Save annotations to backend
  // const saveAnnotations = async (newAnnotations) => {
  //   setAnnotations(newAnnotations);
  //   await annotationAPI.saveAnnotations(pdfId, newAnnotations);
  // };

  // Delete annotation by index
  // const deleteAnnotation = (index) => {
  //   const newAnn = annotations.filter((_, i) => i !== index);
  //   saveAnnotations(newAnn);
  // };

  // --- Region-based annotation state ---
  // const [drawing, setDrawing] = useState(false);
  // const [startPoint, setStartPoint] = useState(null);
  // const [region, setRegion] = useState(null); // {left, top, width, height}

  // --- Annotation mode toggle ---
  // const [annotationMode, setAnnotationMode] = useState(false);

  // Mouse events for region drawing
  // const handleMouseDown = (e) => {
  //   if (!annotationMode || !isOpen || isLoading || error) return;
  //   // Only left click
  //   if (e.button !== 0) return;
  //   const rect = e.currentTarget.getBoundingClientRect();
  //   setDrawing(true);
  //   setStartPoint({
  //     x: e.clientX - rect.left,
  //     y: e.clientY - rect.top
  //   });
  //   setRegion(null);
  // };

  // const handleMouseMove = (e) => {
  //   if (!drawing || !startPoint) return;
  //   const rect = e.currentTarget.getBoundingClientRect();
  //   const x = e.clientX - rect.left;
  //   const y = e.clientY - rect.top;
  //   setRegion({
  //     left: Math.min(startPoint.x, x),
  //     top: Math.min(startPoint.y, y),
  //     width: Math.abs(x - startPoint.x),
  //     height: Math.abs(y - startPoint.y)
  //   });
  // };

  // const getPageFromRegion = (region) => {
  //   // Try to map region.top to a page by using the rendered PDF pages
  //   const pages = document.querySelectorAll('.rpv-core__page-layer');
  //   for (let i = 0; i < pages.length; i++) {
  //     const pageRect = pages[i].getBoundingClientRect();
  //     // region.top is relative to the viewer container
  //     if (
  //       region.top >= pageRect.top - viewerRef.current.getBoundingClientRect().top &&
  //       region.top < pageRect.bottom - viewerRef.current.getBoundingClientRect().top
  //     ) {
  //       return i + 1; // Pages are 1-indexed
  //     }
  //   }
  //   return 1; // fallback
  // };

  // const handleMouseUp = (e) => {
  //   if (!drawing || !region) return;
  //   setDrawing(false);
  //   const page = getPageFromRegion(region);
  //   setSelectedText({
  //     rect: region,
  //     page
  //   });
  //   setRegion(null);
  // };

  // Fetch PDF URL and annotations when component mounts or pdfId changes
  useEffect(() => {
    if (isOpen && pdfId && pdfId !== currentPdfIdRef.current && !fetchingRef.current) {
      currentPdfIdRef.current = pdfId;
      fetchPDFUrl();
    }
  }, [isOpen, pdfId, fetchPDFUrl]);

  // Effect to handle text selection and annotation actions
  // useEffect(() => {
  //   if (isOpen && pdfUrl) {
  //     const viewer = viewerRef.current;
  //     if (viewer) {
  //       viewer.addEventListener('mouseup', handleTextSelection);
  //     }
  //     return () => {
  //       if (viewer) viewer.removeEventListener('mouseup', handleTextSelection);
  //     };
  //   }
  // }, [isOpen, pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" style={{ userSelect: 'none' }}>
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-semibold text-gray-800 truncate">
              {pdfInfo?.title || `PDF File`}
            </h2>
            {pdfInfo && (
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                {pdfInfo.pages ? `${pdfInfo.pages} pages` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Annotation button removed (annotationMode not defined) */}
            <div className="text-xs text-red-600 mr-1 sm:mr-4 hidden sm:inline">
              🔒 Viewing Only - Download & Print Disabled
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-target"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden" ref={viewerRef} style={{ position: 'relative' }}>
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

          {/* React PDF Viewer */}
          {!useIframeFallback && pdfUrl && !isLoading && !error && (
            <div className="h-full pdf-viewer-container" style={{ userSelect: 'none', position: 'relative' }}>
              <Worker workerUrl="/pdfjs/pdf.worker.min.js">
                <Viewer
                  fileUrl={pdfUrl}
                  plugins={[defaultLayoutPluginInstance]}
                  onDocumentLoad={(e) => {
                    // console.log('✅ PDF Document loaded successfully!');
                    // console.log('Number of pages:', e.doc.numPages);
                    // toast.success(`PDF loaded successfully with ${e.doc.numPages} pages!`);
                  }}
                  onPageChange={(e) => {
                    // console.log('Page changed to:', e.currentPage + 1);
                  }}
                  onZoom={(e) => {
                    // console.log('Zoom changed to:', e.scale);
                  }}
                />
                {/* Render highlights */}
                {/* {annotations.filter(a => a.type === 'highlight').map((a, i) => {
                  // Find the index in the original array for correct deletion
                  const annIndex = annotations.findIndex((ann) => ann === a);
                  return (
                    <div key={i} style={{
                      position: 'absolute',
                      top: a.rect.top,
                      left: a.rect.left,
                      width: a.rect.width,
                      height: a.rect.height,
                      background: 'yellow',
                      opacity: 0.4,
                      pointerEvents: 'auto',
                      zIndex: 10,
                      cursor: 'pointer'
                    }}
                    onClick={() => deleteAnnotation(annIndex)}
                    title="Click to delete highlight"
                    />
                  );
                })} */}
                {/* Render notes */}
                {/* {annotations.filter(a => a.type === 'note').map((a, i) => {
                  const annIndex = annotations.findIndex((ann) => ann === a);
                  return (
                    <div key={i} style={{
                      position: 'absolute',
                      top: a.rect.top,
                      left: a.rect.left,
                      width: a.rect.width,
                      height: a.rect.height,
                      zIndex: 20,
                      background: 'rgba(255,255,0,0.7)',
                      border: '1px solid #aaa',
                      padding: 2,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      cursor: 'pointer'
                    }}
                    title={a.note + ' (Click to delete note)'}
                    onClick={() => deleteAnnotation(annIndex)}
                    >
                      📝
                    </div>
                  );
                })} */}
          {/* Draw region while dragging */}
          {/* Annotation UI commented out */}
              </Worker>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-100 border-t text-center text-sm text-gray-600">
          <p>This PDF is protected and can only be viewed through Ignite.</p>
          <p className="text-xs text-red-500 mt-1">Download, Print, and Right-click are disabled</p>
        </div>
      </div>
    </div>
  );
};

export default SecurePDFViewer;
