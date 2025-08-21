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
  isActive: boolean;
  createdAt: string;
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

  const loadAuthUrls = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        console.error('No provider token found');
        router.push('/provider/login');
        return;
      }

      console.log('Fetching auth URLs with token:', token.substring(0, 20) + '...');
      
      const response = await fetch('/api/provider/calendar/auth-urls', {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Auth URLs response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Auth URLs request failed:', response.status, errorText);
        throw new Error(`Failed to load authentication URLs: ${response.status}`);
      }

      const data = await response.json();
      console.log('Auth URLs loaded successfully:', data);
      setAuthUrls(data);
    } catch (err) {
      console.error('Auth URLs error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load auth URLs');
    }
  }, [router]);

  const loadConnections = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) return;

      const response = await fetch('/api/provider/calendar/connections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load calendar connections');
      }

      const data = await response.json();
      setConnections(data);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadAuthUrls(), loadConnections()]);
    setLoading(false);
  }, [loadAuthUrls, loadConnections]);

  useEffect(() => {
    loadData();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const successParam = urlParams.get('success');
    const errorParam = urlParams.get('error');
    
    if (successParam === 'google_connected') {
      setError('');
      // Show success message and reload connections
      alert('Google Calendar connected successfully!');
      setTimeout(() => loadConnections(), 1000);
    } else if (errorParam) {
      const errorMessages: { [key: string]: string } = {
        'oauth_failed': 'OAuth authorization failed',
        'missing_code': 'Missing authorization code',
        'invalid_state': 'Invalid OAuth state parameter',
        'token_exchange_failed': 'Failed to exchange authorization code for tokens',
        'calendar_access_failed': 'Failed to access calendar information',
        'callback_failed': 'OAuth callback failed'
      };
      setError(errorMessages[errorParam] || 'Unknown OAuth error occurred');
    }
    
    // Clean up URL parameters
    if (successParam || errorParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadData, loadConnections]);

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

      const data = await response.json();

      if (data.success) {
        // Success - reload connections and hide form
        setShowAppleForm(false);
        setAppleCredentials({ appleId: '', appPassword: '' });
        await loadConnections();
        alert('Apple Calendar connected successfully!');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Apple Calendar');
      }

      // Success - reload connections and hide form
      setShowAppleForm(false);
      setAppleCredentials({ appleId: '', appPassword: '' });
      await loadConnections();
      alert('Apple Calendar connected successfully!');
      
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
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Connected Calendars */}
        {connections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected Calendars</h2>
            <div className="grid gap-4">
              {connections.map((connection) => (
                <div key={connection.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {connection.platform === 'GOOGLE' && '📅'}
                        {connection.platform === 'OUTLOOK' && '📧'}
                        {connection.platform === 'TEAMS' && '💼'}
                        {connection.platform === 'APPLE' && '🍎'}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {connection.platform.charAt(0) + connection.platform.slice(1).toLowerCase()} Calendar
                        </h3>
                        <p className="text-sm text-gray-600">{connection.email}</p>
                        <p className="text-xs text-gray-500">
                          Connected on {new Date(connection.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        connection.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {connection.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {connections.length > 0 ? 'Connect Additional Calendars' : 'Connect Your Calendars'}
        </h2>

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
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
