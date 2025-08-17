import React from 'react';
import { folderAPI } from '../api';
import api from '../api';
import FileViewerLib from 'react-file-viewer';

// Supported file extensions
const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const pdfExtensions = ['pdf'];
const docExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const txtExtensions = ['txt'];

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

const FileViewer = ({ fileUrl, fileName }) => {
  const ext = getExtension(fileName);
  const [secureUrl, setSecureUrl] = React.useState(null);
  const [text, setText] = React.useState('');
  const [imgError, setImgError] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [debugMsg, setDebugMsg] = React.useState('');
  React.useEffect(() => {
    // console.log('[FileViewer] fileUrl:', fileUrl, 'fileName:', fileName, 'ext:', ext);
    setDebugMsg(`[FileViewer] fileUrl: ${fileUrl}, fileName: ${fileName}, ext: ${ext}`);
  }, [fileUrl, fileName, ext]);
  React.useEffect(() => {
    // console.log('[FileViewer] fileUrl:', fileUrl, 'fileName:', fileName, 'ext:', ext);
  }, [fileUrl, fileName, ext]);

  // Fetch secure URL for all files
  React.useEffect(() => {
    let isMounted = true;
    async function fetchSecureUrl(fileId) {
      try {
        const token = localStorage.getItem('authToken');
        // console.log('[FileViewer] Requesting secure view URL for fileId:', fileId, 'ext:', ext, 'authToken:', token);
        setDebugMsg(`[FileViewer] Requesting secure view URL for fileId: ${fileId}, ext: ${ext}, authToken: ${token}`);
        const res = await folderAPI.getViewURL(fileId);
        if (res.status !== 200) {
          setDebugMsg(`[FileViewer] Backend returned error status: ${res.status}`);
          // console.log('[FileViewer] Backend returned error status:', res.status);
        }
        const data = res.data;
        if (isMounted && data.viewUrl) {
          // console.log('[FileViewer] Received secureUrl:', data.viewUrl + `&ext=${ext}`);
          setDebugMsg(`[FileViewer] Received secureUrl: ${data.viewUrl + `&ext=${ext}`}`);
          setSecureUrl(data.viewUrl + `&ext=${ext}`);
        } else {
          setDebugMsg(`[FileViewer] No viewUrl returned for fileId: ${fileId}, response: ${JSON.stringify(data)}`);
          // console.log('[FileViewer] No viewUrl returned for', fileId, 'response:', data);
        }
      } catch (err) {
        setDebugMsg(`[FileViewer] Error fetching secureUrl: ${err}`);
        // console.log('[FileViewer] Error fetching secureUrl', err);
        if (isMounted) setSecureUrl(null);
      }
    }
    // Extract fileId from fileUrl or use direct id
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
    return () => { isMounted = false; };
  }, [fileUrl, ext]);

  // Fetch text file content if needed
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
        .catch((err) => {
          setText('Failed to load text file.');
          setLoadError(true);
          // console.log('FileViewer: Error loading text file', err);
        });
    }
  }, [secureUrl, ext]);

  if (!secureUrl) {
    // console.log('[FileViewer] Waiting for secureUrl for', fileName, 'ext:', ext);
    return <div>
      Loading file...<br/>
      <pre style={{ fontSize: '0.8em', color: '#888', marginTop: '1em' }}>{debugMsg}</pre>
    </div>;
  }

  // Text: display fetched text
  if (txtExtensions.includes(ext)) {
    // console.log('[FileViewer] Rendering text file for', fileName, 'secureUrl:', secureUrl);
    return loadError ? (
      <div>Failed to load text file.<br/>
      {/* URL: {secureUrl} */}
      </div>
    ) : (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '80vh', overflow: 'auto' }}>{text}</pre>
    );
  }

  // Images: use native img tag for best compatibility
  if (imageExtensions.includes(ext)) {
    // console.log('[FileViewer] Rendering image for', fileName, 'secureUrl:', secureUrl);
    return imgError ? (
      <div>Failed to load image.<br/>
      {/* URL: {secureUrl} */}
      </div>
    ) : (
      <img
        src={secureUrl}
        alt={fileName}
        style={{ maxWidth: '100%', maxHeight: '80vh' }}
        onError={() => {
          setImgError(true);
          setLoadError(true);
          // console.log('[FileViewer] Error loading image', secureUrl);
        }}
        // Attach Authorization header for image requests
        ref={el => {
          if (el) {
            const token = localStorage.getItem('authToken');
            if (token) {
              // Only works if server supports CORS for Authorization header
              el.setAttribute('crossorigin', 'use-credentials');
            }
          }
        }}
      />
    );
  }

  // Office docs: use react-file-viewer
  if (docExtensions.includes(ext)) {
    // console.log('[FileViewer] Rendering office doc with react-file-viewer for', fileName, 'secureUrl:', secureUrl);
    // Pass Authorization header for office files via custom fetcher
    const token = localStorage.getItem('authToken');
    const customHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    return (
      <div style={{ width: '100%', height: '80vh' }}>
        <FileViewerLib
          fileType={ext}
          filePath={secureUrl}
          errorComponent={() => (<div>Cannot display this file type.<br/>
          {/* URL: {secureUrl} */}</div>)}
          unsupportedComponent={() => (<div>Unsupported file type.<br/>{/* URL: {secureUrl} */}</div>)}
          httpHeaders={customHeaders}
        />
        {loadError && (
          <div style={{ color: 'red', marginTop: '1em' }}>
            No preview available for this office file.<br />
            Try downloading and opening it with the appropriate application.<br />
            {/* URL: {secureUrl} */}
          </div>
        )}
      </div>
    );
  }

  // Fallback: try iframe for anything else
  // console.log('[FileViewer] Rendering fallback iframe for', fileName, 'secureUrl:', secureUrl);
  return (
    <div>
      {/* For iframe, we cannot set Authorization header directly. If needed, use cookies or server-side session. */}
      <iframe
        src={secureUrl}
        title={fileName}
        style={{ width: '100%', height: '80vh', border: 'none' }}
        allow="autoplay"
        onError={() => setLoadError(true)}
      ></iframe>
      {loadError && <div>Failed to load file.<br/>{/* URL: {secureUrl} */}</div>}
    </div>
  );

}

export default FileViewer;
