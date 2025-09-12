// Calendar Connection Management Page
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUrls {
  outlook: string;
  teams: string;
  google: string;
  apple: null;
}

interface CalendarConnection {
  id: string;
  platform: string;
  email: string;
  calendarId: string;
  calendarName?: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncFrequency: number;
  subscriptionId: string | null;
  webhookUrl: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  accessToken?: string;
  isDefaultForBookings?: boolean;
  syncEvents?: boolean;
  allowBookings?: boolean;
}

export default function CalendarConnectPage() {
  const [authUrls, setAuthUrls] = useState<AuthUrls | null>(null);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAppleForm, setShowAppleForm] = useState(false);
  const [appleCredentials, setAppleCredentials] = useState({
    appleId: '',
    appPassword: '',
  });
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

      // Load authentication URLs
      const authResponse = await fetch('/api/provider/calendar/auth-urls', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!authResponse.ok) {
        throw new Error('Failed to load authentication URLs');
      }

      const authData = await authResponse.json();
      setAuthUrls(authData);

      // Load existing connections
      const connectionsResponse = await fetch('/api/provider/calendar/connections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
    
    // Check for success/error parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'google_connected') {
      // Show success message and redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/provider/dashboard');
      }, 2000);
    } else if (error) {
      setError(`Connection failed: ${error.replace(/_/g, ' ')}`);
    }
  }, [loadData, router]);

  const handleConnectApple = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/connect/apple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(appleCredentials),
      });

      if (!response.ok) {
        throw new Error('Failed to connect Apple Calendar');
      }

      router.push('/provider/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Apple Calendar');
    }
  };

  const platformIcons = {
    outlook: '📧',
    teams: '👥',
    google: '📅',
    apple: '🍎',
  };

  const platformNames = {
    outlook: 'Microsoft Outlook',
    teams: 'Microsoft Teams',
    google: 'Google Calendar',
    apple: 'Apple iCloud Calendar',
  };

  const platformDescriptions = {
    outlook: 'Connect your Office 365 or Outlook.com calendar',
    teams: 'Connect your Microsoft Teams meetings and calendar',
    google: 'Connect your Google Calendar or Google Workspace calendar',
    apple: 'Connect your Apple iCloud calendar (requires App-Specific Password)',
  };

  // Helper function to get connection for platform
  const getConnectionForPlatform = (platform: string) => {
    return connections.find(conn => conn.platform.toLowerCase() === platform.toLowerCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Connect Calendar</h1>
              <p className="text-gray-600">Add your calendar platforms to sync events and locations</p>
            </div>
            <button
              onClick={() => router.push('/provider/dashboard')}
              className="text-gray-700 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success message */}
        {new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('success') === 'google_connected' && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            ✅ Google Calendar connected successfully! Redirecting to dashboard...
          </div>
        )}
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outlook */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{platformIcons.outlook}</div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {platformNames.outlook}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {platformDescriptions.outlook}
                </p>
                <div className="mt-4">
                  {getConnectionForPlatform('outlook') && (
                    <div className="mb-3">
                      <div className="text-sm text-green-600 flex items-center mb-2">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Connected ({getConnectionForPlatform('outlook')?.email})
                      </div>
                      <button
                        onClick={() => router.push(`/provider/calendar/manage/${getConnectionForPlatform('outlook')?.id}`)}
                        className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
                      >
                        Manage Calendar
                      </button>
                    </div>
                  )}
                  {authUrls?.outlook ? (
                    <a
                      href={authUrls.outlook}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Connect Outlook
                    </a>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                    >
                      Configuration Required
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{platformIcons.teams}</div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {platformNames.teams}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {platformDescriptions.teams}
                </p>
                <div className="mt-4">
                  {getConnectionForPlatform('teams') && (
                    <div className="mb-3">
                      <div className="text-sm text-green-600 flex items-center mb-2">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Connected ({getConnectionForPlatform('teams')?.email})
                      </div>
                      <button
                        onClick={() => router.push(`/provider/calendar/manage/${getConnectionForPlatform('teams')?.id}`)}
                        className="inline-flex items-center px-4 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-600 bg-white hover:bg-purple-50 transition-colors"
                      >
                        Manage Calendar
                      </button>
                    </div>
                  )}
                  {authUrls?.teams ? (
                    <a
                      href={authUrls.teams}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      Connect Teams
                    </a>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                    >
                      Configuration Required
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Google */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{platformIcons.google}</div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {platformNames.google}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {platformDescriptions.google}
                </p>
                <div className="mt-4">
                  {getConnectionForPlatform('google') && (
                    <div className="mb-3">
                      <div className="text-sm text-green-600 flex items-center mb-2">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Connected ({getConnectionForPlatform('google')?.email})
                      </div>
                      <button
                        onClick={() => router.push(`/provider/calendar/manage/${getConnectionForPlatform('google')?.id}`)}
                        className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 transition-colors"
                      >
                        Manage Calendar
                      </button>
                    </div>
                  )}
                  {authUrls?.google ? (
                    <a
                      href={authUrls.google}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      Connect Google
                    </a>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                    >
                      Configuration Required
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Apple */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{platformIcons.apple}</div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {platformNames.apple}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {platformDescriptions.apple}
                </p>
                <div className="mt-4">
                  {getConnectionForPlatform('apple') && (
                    <div className="mb-3">
                      <div className="text-sm text-green-600 flex items-center mb-2">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Connected ({getConnectionForPlatform('apple')?.email})
                      </div>
                      <button
                        onClick={() => router.push(`/provider/calendar/manage/${getConnectionForPlatform('apple')?.id}`)}
                        className="inline-flex items-center px-4 py-2 border border-gray-800 text-sm font-medium rounded-md text-gray-800 bg-white hover:bg-gray-50 transition-colors"
                      >
                        Manage Calendar
                      </button>
                    </div>
                  )}
                  {!showAppleForm ? (
                    <button
                      onClick={() => setShowAppleForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 transition-colors"
                    >
                      Connect Apple Calendar
                    </button>
                  ) : (
                    <form onSubmit={handleConnectApple} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Apple ID
                        </label>
                        <input
                          type="email"
                          value={appleCredentials.appleId}
                          onChange={(e) => setAppleCredentials(prev => ({ ...prev, appleId: e.target.value }))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="your.email@icloud.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          App-Specific Password
                        </label>
                        <input
                          type="password"
                          value={appleCredentials.appPassword}
                          onChange={(e) => setAppleCredentials(prev => ({ ...prev, appPassword: e.target.value }))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="xxxx-xxxx-xxxx-xxxx"
                          required
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="flex-1 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 transition-colors"
                        >
                          Connect
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAppleForm(false)}
                          className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Setup Instructions</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <strong>Microsoft Outlook/Teams:</strong> You&apos;ll be redirected to Microsoft to sign in and authorize access to your calendar.
            </div>
            <div>
              <strong>Google Calendar:</strong> You&apos;ll be redirected to Google to sign in and authorize access to your calendar.
            </div>
            <div>
              <strong>Apple iCloud Calendar:</strong> You need to generate an App-Specific Password:
              <ol className="list-decimal list-inside mt-1 ml-4 space-y-1">
                <li>Go to <a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer" className="underline">appleid.apple.com</a></li>
                <li>Sign in and go to &quot;Sign-In and Security&quot; → &quot;App-Specific Passwords&quot;</li>
                <li>Generate a new password with a label like &quot;Calendar App&quot;</li>
                <li>Use your Apple ID email and the generated password above</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
