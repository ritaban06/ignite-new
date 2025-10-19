import React from 'react';
import { folderAPI } from '../api';

// Supported file extensions
const imageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
const docExtensions = ['doc', 'docx', 'ppt', 'pptx'];
const txtExtensions = ['txt'];

function getExtension(filename) {
  if (!filename || !filename.includes('.')) return '';
  return filename.split('.').pop().toLowerCase();
}

const FileViewer = ({ fileUrl, fileName }) => {
  const [docxHtml, setDocxHtml] = React.useState(null);
  const pptxContainerRef = React.useRef(null);
  const ext = getExtension(fileName);

  // Hooks
  const [secureUrl, setSecureUrl] = React.useState(null);
  const [text, setText] = React.useState('');
  const [imgError, setImgError] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [debugMsg, setDebugMsg] = React.useState('');

  // Authenticated URL (must be above all usages)
  const token = localStorage.getItem('authToken');
  const authenticatedUrl = secureUrl
    ? (token && !secureUrl.includes('token=')
        ? `${secureUrl}${secureUrl.includes('?') ? '&' : '?'}token=${token}`
        : secureUrl)
    : null;

  // Debug message when props change
  React.useEffect(() => {
    setDebugMsg(`[FileViewer] fileUrl: ${fileUrl}, fileName: ${fileName}, ext: ${ext}`);
  }, [fileUrl, fileName, ext]);

  // DOCX preview using mammoth.js CDN
  React.useEffect(() => {
    if (secureUrl && ext === 'docx' && window.mammoth) {
      fetch(authenticatedUrl)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => window.mammoth.convertToHtml({ 
          arrayBuffer,
          styleMap: [
            "p[style-name='Normal'] => p.normal",
            "p[style-name='Heading 1'] => h1",
            "p[style-name='Heading 2'] => h2",
            "p[style-name='Heading 3'] => h3",
            "p[style-name='Heading 4'] => h4",
            "p[style-name='Title'] => h1.title",
            "p[style-name='Subtitle'] => h2.subtitle",
            "p[style-name='List Paragraph'] => li",
            "r[style-name='Strong'] => strong"
          ]
        }))
        .then(result => setDocxHtml(result.value))
        .catch(() => setDocxHtml('<div style="color:red">Failed to preview DOCX file.</div>'));
    }
  }, [secureUrl, authenticatedUrl, ext]);

  // PPTX preview using pptxjs CDN
  React.useEffect(() => {
    if (secureUrl && ext === 'pptx' && window.PPTX) {
      fetch(authenticatedUrl)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          const container = pptxContainerRef.current;
          if (container) {
            container.innerHTML = '';
            window.PPTX.render(arrayBuffer, { fileName, container });
          }
        })
        .catch(() => {
          if (pptxContainerRef.current) {
            pptxContainerRef.current.innerHTML = '<div style="color:red">Failed to preview PPTX file.</div>';
          }
        });
    }
  }, [secureUrl, authenticatedUrl, ext, fileName]);

  // Fetch secure URL
  React.useEffect(() => {
    let isMounted = true;
    async function fetchSecureUrl(fileId) {
      try {
        const token = localStorage.getItem('authToken');
        setDebugMsg(`[FileViewer] Requesting secure view URL for fileId: ${fileId}, ext: ${ext}`);
        const res = await folderAPI.getViewURL(fileId);
        if (res.status !== 200) {
          setDebugMsg(`[FileViewer] Backend returned error status: ${res.status}`);
        }
        const data = res.data;
        if (isMounted && data.viewUrl) {
          setDebugMsg(`[FileViewer] Received secureUrl: ${data.viewUrl + `&ext=${ext}`}`);
          setSecureUrl(data.viewUrl + `&ext=${ext}`);
        } else {
          setDebugMsg(`[FileViewer] No viewUrl returned for fileId: ${fileId}, response: ${JSON.stringify(data)}`);
        }
      } catch (err) {
        setDebugMsg(`[FileViewer] Error fetching secureUrl: ${err}`);
        if (isMounted) setSecureUrl(null);
      }
    }

    // Extract fileId
    let fileId = null;
    if (fileUrl && /^[\w-]{20,}$/.test(fileUrl)) {
      fileId = fileUrl;
    } else {
      const match = fileUrl?.match(/\/d\/([\w-]+)/);
      if (match && match[1]) fileId = match[1];
    }

    if (fileId) {
      fetchSecureUrl(fileId);
    } else {
      setSecureUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [fileUrl, ext]);

  // Fetch text file content
  React.useEffect(() => {
    if (secureUrl && txtExtensions.includes(ext)) {
      const token = localStorage.getItem('authToken');
      fetch(secureUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch text file');
          return res.text();
        })
        .then(setText)
        .catch(() => {
          setText('Failed to load text file.');
          setLoadError(true);
        });
    }
  }, [secureUrl, ext]);


  React.useEffect(() => {
    if (authenticatedUrl) {
      setDebugMsg(`[FileViewer] Authenticated URL: ${authenticatedUrl}`);
    }
  }, [authenticatedUrl]);

  // Rendering (safe to use conditionals here
  if (!secureUrl) {
    return (
      <div>
        Loading file...<br />
        <pre style={{ fontSize: '0.8em', color: '#888', marginTop: '1em' }}>{debugMsg}</pre>
      </div>
    );
  }

  if (txtExtensions.includes(ext)) {
    return loadError ? (
      <div>Failed to load text file.</div>
    ) : (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '80vh', overflow: 'auto' }}>
        {text}
      </pre>
    );
  }

  if (imageExtensions.includes(ext)) {
    return imgError ? (
      <div style={{ color: 'red' }}>
        Failed to load image.<br />
        Ensure the file URL is correct and accessible.<br />
      </div>
    ) : (
      <img
        src={authenticatedUrl}
        alt={fileName}
        style={{ maxWidth: '100%', maxHeight: '80vh' }}
        onError={() => {
          setImgError(true);
          setLoadError(true);
        }}
        ref={(el) => {
          if (el) {
            const token = localStorage.getItem('authToken');
            if (token) {
              el.setAttribute('crossorigin', 'use-credentials');
            }
          }
        }}
      />
    );
  }

  if (docExtensions.includes(ext)) {
    if (ext === 'docx') {
      return (
        <div style={{ maxHeight: '80vh', overflow: 'auto', background: '#fff', padding: '1em' }}>
          {docxHtml ? (
            <div 
              dangerouslySetInnerHTML={{ __html: docxHtml }}
              className="docx-content"
              style={{
                fontFamily: "'Inter', Arial, sans-serif",
                lineHeight: "1.5",
                color: "#333",
                maxWidth: "800px",
                margin: "0 auto"
              }}
            />
          ) : 'Loading DOCX preview...'}
          <style>
            {`
              .docx-content h1 { font-size: 24px; font-weight: bold; margin: 20px 0 10px; color: #222; }
              .docx-content h2 { font-size: 20px; font-weight: bold; margin: 18px 0 9px; color: #333; }
              .docx-content h3 { font-size: 16px; font-weight: bold; margin: 16px 0 8px; color: #444; }
              .docx-content h4 { font-size: 14px; font-weight: bold; margin: 14px 0 7px; color: #555; }
              .docx-content p { margin: 0 0 10px; }
              .docx-content ol, .docx-content ul { margin: 10px 0; padding-left: 20px; }
              .docx-content li { margin-bottom: 5px; }
              .docx-content table { border-collapse: collapse; width: 100%; margin: 15px 0; }
              .docx-content table td, .docx-content table th { border: 1px solid #ddd; padding: 8px; }
              .docx-content img { max-width: 100%; height: auto; }
              .docx-content a { color: #0066cc; text-decoration: underline; }
            `}
          </style>
        </div>
      );
    }
    if (ext === 'pptx') {
      return (
        <div style={{ maxHeight: '80vh', overflow: 'auto', background: '#fff', padding: '1em' }}>
          <div ref={pptxContainerRef}>Loading PPTX preview...</div>
        </div>
      );
    }
    // For unsupported formats (doc, ppt)
    return (
      <div style={{ color: 'orange', padding: '2em', textAlign: 'center' }}>
        Preview not available for restricted {ext.toUpperCase()} files.<br />
        Please download to view.<br />
      </div>
    );
  }

  // Fallback
  return (
    <div className='z-100'>
      <iframe
        src={authenticatedUrl}
        title={fileName}
        style={{ width: '100%', height: '80vh', border: 'none' }}
        allow="autoplay"
        onError={() => setLoadError(true)}
      ></iframe>
      {loadError && <div>Failed to load file.</div>}
    </div>
  );
};

export default FileViewer;
