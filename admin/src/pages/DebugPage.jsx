import React, { useState } from 'react';
import { pdfAPI } from '../api';
import api from '../api';

export default function DebugPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const runTest = async (testName, testFunction) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const result = await testFunction();
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: true, 
          data: result.data || result,
          timestamp: new Date().toISOString()
        } 
      }));
    } catch (error) {
      console.error(`${testName} error:`, error);
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
          },
          timestamp: new Date().toISOString()
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const tests = [
    {
      name: 'Server Health Check',
      fn: () => api.get('/admin/health')
    },
    {
      name: 'Environment Variables Check',
      fn: () => api.get('/admin/env-check')
    },
    {
      name: 'Admin Routes Ping',
      fn: () => api.get('/admin/ping')
    },
    {
      name: 'Basic CORS Test',
      fn: () => api.get('/admin/test-cors')
    },
    {
      name: 'Simple Upload Test (No Middleware)',
      fn: () => api.post('/admin/simple-upload', { test: 'data' })
    },
    {
      name: 'Upload CORS Test',
      fn: () => api.post('/admin/test-upload-cors', { test: 'data' })
    },
    {
      name: 'Debug Upload (5MB limit)',
      fn: () => {
        const formData = new FormData();
        const blob = new Blob(['test pdf content'], { type: 'application/pdf' });
        formData.append('pdf', blob, 'test.pdf');
        
        return api.post('/admin/debug-upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    },
    {
      name: 'Upload Test (No Auth)',
      fn: () => {
        const formData = new FormData();
        const blob = new Blob(['test pdf content'], { type: 'application/pdf' });
        formData.append('pdf', blob, 'test.pdf');
        
        return api.post('/admin/upload-no-auth', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    },
    {
      name: 'Auth Test',
      fn: () => api.post('/admin/test-auth', { test: 'auth' })
    },
    {
      name: 'Minimal Upload Test',
      fn: () => {
        const formData = new FormData();
        const blob = new Blob(['test pdf content'], { type: 'application/pdf' });
        formData.append('pdf', blob, 'test.pdf');
        formData.append('title', 'Test PDF');
        formData.append('department', 'CSE');
        formData.append('year', '1');
        formData.append('subject', 'Test Subject');
        
        return api.post('/admin/test-upload-minimal', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    },
    {
      name: 'Upload Test (No Rate Limit)',
      fn: () => {
        const formData = new FormData();
        const blob = new Blob(['test pdf content'], { type: 'application/pdf' });
        formData.append('pdf', blob, 'test.pdf');
        
        return api.post('/admin/test-upload-no-rate-limit', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    },
    {
      name: 'Upload Test (No Validation)',
      fn: () => {
        const formData = new FormData();
        const blob = new Blob(['test pdf content'], { type: 'application/pdf' });
        formData.append('pdf', blob, 'test.pdf');
        formData.append('title', 'Test PDF');
        formData.append('department', 'CSE');
        formData.append('year', '1');
        formData.append('subject', 'Test Subject');
        
        return api.post('/admin/test-upload-no-validation', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    },
    {
      name: 'Get PDFs (working endpoint)',
      fn: () => pdfAPI.getAllPdfs({ page: 1, limit: 1 })
    },
    {
      name: 'Environment Info',
      fn: () => Promise.resolve({
        API_URL: import.meta.env.VITE_API_URL || 'Using default/proxy',
        NODE_ENV: import.meta.env.NODE_ENV,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD,
        BASE_URL: import.meta.env.BASE_URL,
        CURRENT_ORIGIN: window.location.origin,
        USER_AGENT: navigator.userAgent,
        TIMESTAMP: new Date().toISOString()
      })
    },
    {
      name: 'Auth Token Check',
      fn: () => Promise.resolve({
        tokenExists: !!localStorage.getItem('adminToken'),
        tokenLength: localStorage.getItem('adminToken')?.length || 0,
        tokenPreview: localStorage.getItem('adminToken')?.substring(0, 20) + '...' || 'No token',
        timestamp: new Date().toISOString()
      })
    },
    {
      name: 'Upload Test (With Auth)',
      fn: () => {
        const formData = new FormData();
        const blob = new Blob(['test pdf content'], { type: 'application/pdf' });
        formData.append('pdf', blob, 'test.pdf');
        formData.append('title', 'Test PDF');
        formData.append('department', 'CSE');
        formData.append('year', '1');
        formData.append('subject', 'Test Subject');
        
        return api.post('/admin/upload-simple', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    },
    {
      name: 'Direct Backend Test',
      fn: () => {
        // Test direct connection to backend without using our API wrapper
        const backendUrl = 'https://ignite-backend-eight.vercel.app/api/admin/ping';
        return fetch(backendUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        });
      }
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Upload Debug Tests</h1>
        
        <div className="grid gap-6">
          {tests.map((test) => (
            <div key={test.name} className="bg-white/10 backdrop-blur-md rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{test.name}</h3>
                <button
                  onClick={() => runTest(test.name, test.fn)}
                  disabled={loading[test.name]}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading[test.name] ? 'Running...' : 'Run Test'}
                </button>
              </div>
              
              {results[test.name] && (
                <div className="mt-4">
                  <div className={`p-4 rounded-lg ${
                    results[test.name].success 
                      ? 'bg-green-900/30 border border-green-500' 
                      : 'bg-red-900/30 border border-red-500'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${
                        results[test.name].success ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span className="text-white font-medium">
                        {results[test.name].success ? 'Success' : 'Failed'}
                      </span>
                      <span className="text-gray-300 text-sm">
                        {results[test.name].timestamp}
                      </span>
                    </div>
                    
                    <pre className="text-sm text-gray-300 overflow-auto max-h-60 bg-black/20 p-3 rounded">
                      {JSON.stringify(
                        results[test.name].success 
                          ? results[test.name].data 
                          : results[test.name].error, 
                        null, 
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Instructions</h3>
          <div className="text-gray-300 space-y-2">
            <p>1. Run each test in order to identify where the upload issue occurs</p>
            <p>2. The "Get PDFs" test should work if delete is working</p>
            <p>3. Compare the headers and responses between working and failing tests</p>
            <p>4. Check the browser's Network tab for additional details</p>
          </div>
        </div>
      </div>
    </div>
  );
}
