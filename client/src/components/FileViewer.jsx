import React from 'react';
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

  React.useEffect(() => {
    let isMounted = true;
    async function fetchSecureUrl(fileId) {
      try {
        const res = await fetch(`/api/folders/file/${fileId}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (isMounted && data.viewUrl) {
          setSecureUrl(data.viewUrl + `&ext=${ext}`);
        }
      } catch {
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

  if (!secureUrl) {
    return <div>Loading file...</div>;
  }

  // PDF: use iframe for secure proxy
  if (pdfExtensions.includes(ext)) {
    return (
      <iframe
        src={secureUrl}
        title={fileName}
        style={{ width: '100%', height: '80vh', border: 'none' }}
        allow="autoplay"
      />
    );
  }

  // Images: use native img tag for best compatibility
  if (imageExtensions.includes(ext)) {
    return <img src={secureUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '80vh' }} />;
  }

  // Text: fetch and display as text
  if (txtExtensions.includes(ext)) {
    React.useEffect(() => {
      fetch(secureUrl)
        .then((res) => res.text())
        .then(setText)
        .catch(() => setText('Failed to load text file.'));
    }, [secureUrl]);
    return (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '80vh', overflow: 'auto' }}>{text}</pre>
    );
  }

  // Office docs and other supported types: use react-file-viewer
  if ([...docExtensions, ...pdfExtensions, ...txtExtensions, ...imageExtensions].includes(ext)) {
    return (
      <div style={{ width: '100%', height: '80vh' }}>
        <FileViewerLib
          fileType={ext}
          filePath={secureUrl}
          errorComponent={<div>Cannot display this file type.<br/>URL: {secureUrl}</div>}
          unsupportedComponent={<div>Unsupported file type.<br/>URL: {secureUrl}</div>}
        />
      </div>
    );
  }

  // Fallback: try iframe for anything else
  return (
    <iframe
      src={secureUrl}
      title={fileName}
      style={{ width: '100%', height: '80vh', border: 'none' }}
      allow="autoplay"
    />
  );
};

export default FileViewer;
