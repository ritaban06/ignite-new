// Enhanced Cloudflare Worker for Ignite PDF platform
// This worker handles all R2 operations for the free plan

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Add CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CLIENT_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Auth, X-Worker-Signature, X-Worker-Timestamp',
      'Access-Control-Allow-Credentials': 'true'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Authenticate request (except for view endpoint which has its own auth)
      if (url.pathname !== '/view') {
        const authResult = await authenticateRequest(request, env);
        if (!authResult.success) {
          return new Response(JSON.stringify({ error: authResult.error }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Route requests
      switch (url.pathname) {
        case '/health':
          return handleHealthCheck(request, env, corsHeaders);
        
        case '/upload':
          return handleFileUpload(request, env, corsHeaders);
        
        case '/view':
          return handleFileView(request, env, corsHeaders);
        
        case '/delete':
          return handleFileDelete(request, env, corsHeaders);
        
        case '/metadata':
          return handleFileMetadata(request, env, corsHeaders);
        
        case '/cleanup':
          return handleCleanup(request, env, corsHeaders);
        
        default:
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Authenticate incoming requests
async function authenticateRequest(request, env) {
  try {
    const authHeader = request.headers.get('X-Worker-Auth');
    const signature = request.headers.get('X-Worker-Signature');
    const timestamp = request.headers.get('X-Worker-Timestamp');

    if (!authHeader || !signature || !timestamp) {
      return { success: false, error: 'Missing authentication headers' };
    }

    // Check timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    const reqTimestamp = parseInt(timestamp);
    
    if (Math.abs(now - reqTimestamp) > 300) { // 5 minute window
      return { success: false, error: 'Request timestamp too old' };
    }

    // Verify signature
    const payload = atob(authHeader);
    const expectedSignature = await generateHMAC(payload, env.WORKER_SECRET || env.JWT_SECRET);
    
    if (signature !== expectedSignature) {
      return { success: false, error: 'Invalid signature' };
    }

    const parsedPayload = JSON.parse(payload);
    return { success: true, payload: parsedPayload };
  } catch (error) {
    return { success: false, error: 'Authentication failed' };
  }
}

// Health check endpoint
async function handleHealthCheck(request, env, corsHeaders) {
  return new Response(JSON.stringify({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT || 'development',
    bucket: env.R2_BUCKET ? 'connected' : 'not configured'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle file upload
async function handleFileUpload(request, env, corsHeaders) {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const fileKey = formData.get('fileKey');
    const department = formData.get('department');
    const year = formData.get('year');
    const subject = formData.get('subject');

    if (!file || !fileKey) {
      return new Response(JSON.stringify({ error: 'Missing file or fileKey' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return new Response(JSON.stringify({ error: 'Only PDF files are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Upload to R2
    await env.R2_BUCKET.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: 'application/pdf',
        contentDisposition: 'inline'
      },
      customMetadata: {
        'original-name': file.name,
        'department': department,
        'year': year,
        'subject': subject,
        'upload-timestamp': Date.now().toString()
      }
    });

    return new Response(JSON.stringify({
      success: true,
      fileKey: fileKey,
      message: 'File uploaded successfully',
      metadata: {
        size: file.size,
        type: file.type,
        department,
        year,
        subject
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle file viewing with token validation
async function handleFileView(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const signature = url.searchParams.get('sig');

    if (!token || !signature) {
      return new Response('Missing parameters', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Decode and verify token
    let payload;
    try {
      const decoded = atob(token);
      payload = JSON.parse(decoded);
    } catch (e) {
      return new Response('Invalid token', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Verify signature
    const expectedSignature = await generateHMAC(JSON.stringify(payload), env.WORKER_SECRET || env.JWT_SECRET);
    if (signature !== expectedSignature) {
      return new Response('Invalid signature', { 
        status: 403,
        headers: corsHeaders
      });
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.expiry < now) {
      return new Response('Token expired', { 
        status: 410,
        headers: corsHeaders
      });
    }

    // Fetch file from R2
    const object = await env.R2_BUCKET.get(payload.fileKey);
    
    if (!object) {
      return new Response('File not found', { 
        status: 404,
        headers: corsHeaders
      });
    }

    // Return PDF with security headers
    const securityHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'"
    };

    return new Response(object.body, {
      headers: securityHeaders
    });
  } catch (error) {
    console.error('View error:', error);
    return new Response('View failed', { 
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle file deletion
async function handleFileDelete(request, env, corsHeaders) {
  try {
    if (request.method !== 'DELETE') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { fileKey } = body;

    if (!fileKey) {
      return new Response(JSON.stringify({ error: 'fileKey is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Delete from R2
    await env.R2_BUCKET.delete(fileKey);

    return new Response(JSON.stringify({
      success: true,
      message: 'File deleted successfully',
      fileKey
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ error: 'Delete failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle file metadata retrieval
async function handleFileMetadata(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const fileKey = url.searchParams.get('fileKey');

    if (!fileKey) {
      return new Response(JSON.stringify({ error: 'fileKey is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get object metadata from R2
    const object = await env.R2_BUCKET.head(fileKey);
    
    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      metadata: {
        size: object.size,
        lastModified: object.uploaded,
        contentType: object.httpMetadata?.contentType,
        customMetadata: object.customMetadata
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Metadata error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get metadata' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle cleanup operations
async function handleCleanup(request, env, corsHeaders) {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { olderThanDays = 30 } = body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // List objects to find old files
    const listResult = await env.R2_BUCKET.list({ prefix: 'pdfs/' });
    let deletedCount = 0;

    for (const object of listResult.objects) {
      if (object.uploaded < cutoffDate) {
        await env.R2_BUCKET.delete(object.key);
        deletedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} files older than ${olderThanDays} days`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ error: 'Cleanup failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Generate HMAC signature
async function generateHMAC(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* 
=== Cloudflare Worker Setup Instructions ===

1. Create a new Cloudflare Worker in your dashboard
2. Deploy this script
3. Configure environment variables in Worker settings:
   - R2_BUCKET: Your R2 bucket binding
   - WORKER_SECRET: Same secret as JWT_SECRET in your backend
   - CLIENT_URL: Your client app URL (for CORS)
   - ENVIRONMENT: 'production' or 'development'

4. Set up R2 bucket binding in wrangler.toml:
   [[r2_buckets]]
   binding = "R2_BUCKET"
   bucket_name = "ignite-pdfs"

5. Deploy with:
   npx wrangler publish

6. Update your backend .env with the worker URL:
   CLOUDFLARE_WORKER_URL=https://your-worker.your-subdomain.workers.dev

=== Security Features ===
- HMAC signature verification
- Timestamp validation (prevents replay attacks)
- Token-based PDF access with expiry
- CORS protection
- Content-Type validation
- Security headers on PDF responses

This worker provides all R2 functionality needed for the free Cloudflare plan!
*/
