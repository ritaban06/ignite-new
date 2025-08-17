import React from 'react';

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

  if (imageExtensions.includes(ext)) {
    return <img src={fileUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '80vh' }} />;
  }

  if (pdfExtensions.includes(ext)) {
    return (
      <iframe
        src={fileUrl}
        title={fileName}
        style={{ width: '100%', height: '80vh', border: 'none' }}
      />
    );
  }

  if (docExtensions.includes(ext)) {
    // Use Google Docs Viewer for Office files
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    return (
      <iframe
        src={viewerUrl}
        title={fileName}
        style={{ width: '100%', height: '80vh', border: 'none' }}
      />
    );
  }

  if (txtExtensions.includes(ext)) {
    // Fetch and display text file
    const [text, setText] = React.useState('');
    React.useEffect(() => {
      fetch(fileUrl)
        .then((res) => res.text())
        .then(setText)
        .catch(() => setText('Failed to load text file.'));
    }, [fileUrl]);
    return (
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '80vh', overflow: 'auto' }}>{text}</pre>
    );
  }

  return <div>Unsupported file type: {fileName}</div>;
};

export default FileViewer;
