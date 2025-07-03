// Security middleware to prevent PDF downloads and enhance protection
const pdfSecurityHeaders = (req, res, next) => {
  // Add security headers for PDF responses
  if (req.path.includes('/pdf') || req.path.includes('.pdf')) {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Download-Options': 'noopen',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Security-Policy': "default-src 'none'; object-src 'none'; script-src 'none'; style-src 'unsafe-inline';",
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'document-domain=(), camera=(), microphone=(), geolocation=()',
    });
  }
  next();
};

// Middleware to disable caching for sensitive PDF content
const disablePdfCaching = (req, res, next) => {
  if (req.path.includes('/view') || req.path.includes('/stream')) {
    res.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
    });
  }
  next();
};

module.exports = {
  pdfSecurityHeaders,
  disablePdfCaching
};
