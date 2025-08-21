import React from 'react';
import { folderAPI } from '../api';
import api from '../api';

// Supported file extensions
const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const docExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const txtExtensions = ['txt'];

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

const FileViewer = ({ fileUrl, fileName }) => {
  const ext = getExtension(fileName);

  // Hooks
  const [secureUrl, setSecureUrl] = React.useState(null);
  const [text, setText] = React.useState('');
  const [imgError, setImgError] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [debugMsg, setDebugMsg] = React.useState('');

  // Debug message when props change
  React.useEffect(() => {
    setDebugMsg(`[FileViewer] fileUrl: ${fileUrl}, fileName: ${fileName}, ext: ${ext}`);
  }, [fileUrl, fileName, ext]);

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

  // Authenticated URL effect
  const token = localStorage.getItem('authToken');
  const authenticatedUrl = token
    ? `${secureUrl}${secureUrl.includes('?') ? '&' : '?'}authToken=${token}`
    : secureUrl;

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
        src={secureUrl}
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
    return (
      <div>
        <iframe
          src={secureUrl}
          title={fileName}
          style={{ width: '100%', height: '80vh', border: 'none' }}
          allow="autoplay"
          onError={() => setLoadError(true)}
        ></iframe>
        {loadError && (
          <div style={{ color: 'red', marginTop: '1em' }}>
            Failed to load file.<br />
            Ensure you have the necessary permissions and the token is valid.<br />
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div>
      <iframe
        src={secureUrl}
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
