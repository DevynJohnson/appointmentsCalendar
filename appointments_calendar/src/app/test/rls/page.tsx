'use client';

import { useState } from 'react';

export default function RLSTestPage() {
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testRLS = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/test/rls?providerId=test-provider-rls-123');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }
      
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔒 Row Level Security Test
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test RLS Implementation
          </h2>
          <p className="text-gray-600 mb-4">
            This will test if RLS is working correctly by comparing data access 
            with and without provider context.
          </p>
          
          <button
            onClick={testRLS}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run RLS Test'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Test Results
            </h3>
            
            <div className="space-y-4">
              <div className="border rounded p-4">
                <h4 className="font-medium text-green-600 mb-2">
                  ✅ Provider Context (RLS Applied)
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Should only show data for provider: {String(results.testProviderId)}
                </p>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify((results as Record<string, Record<string, unknown>>).results.providerTest, null, 2)}
                </pre>
              </div>

              <div className="border rounded p-4">
                <h4 className="font-medium text-orange-600 mb-2">
                  ⚠️ Admin Context (No RLS)
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Shows all data in the database (admin view)
                </p>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify((results as Record<string, Record<string, unknown>>).results.adminTest, null, 2)}
                </pre>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  📊 Analysis
                </h4>
                <p className="text-sm text-blue-700">
                  <strong>RLS is working correctly if:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                  <li>Provider Context shows ≤ Admin Context numbers</li>
                  <li>Provider Context shows only data for this specific provider</li>
                  <li>Admin Context shows total counts across all providers</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}