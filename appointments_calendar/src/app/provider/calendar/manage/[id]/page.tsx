'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface CalendarConnection {
  id: string;
  platform: string;
  email: string;
  calendarId: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncFrequency: number;
  subscriptionId: string | null;
  webhookUrl: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  allowBookings: boolean;
  maxBookings: number;
  currentBookings: number;
}

export default function CalendarManagement() {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const params = useParams();
  const connectionId = params.id as string;

  // Form state
  const [isActive, setIsActive] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState(15);
  
  // Apple credentials state
  const [appleId, setAppleId] = useState('');
  const [appPassword, setAppPassword] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!connectionId) return;

      try {
        // Check for success/error messages from re-authentication
        const urlParams = new URLSearchParams(window.location.search);
        const successMessage = urlParams.get('success');
        const errorMessage = urlParams.get('error');

        if (successMessage) {
          alert(successMessage);
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
        if (errorMessage) {
          setError(errorMessage);
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
        const token = localStorage.getItem('providerToken');
        
        // Load connection details
        const connectionResponse = await fetch(`/api/provider/calendar/connections/${connectionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!connectionResponse.ok) {
          throw new Error('Failed to load connection');
        }

        const connectionData = await connectionResponse.json();
        setConnection(connectionData);
        setIsActive(connectionData.isActive);
        setSyncFrequency(connectionData.syncFrequency);

        // Load Apple credentials if this is an Apple connection
        if (connectionData.platform === 'APPLE' && connectionData.accessToken) {
          console.log('🍎 Loading Apple credentials, token length:', connectionData.accessToken.length);
          try {
            const credentials = Buffer.from(connectionData.accessToken, 'base64').toString('utf-8');
            console.log('🔓 Decoded credentials:', credentials);
            const [loadedAppleId, loadedAppPassword] = credentials.split(':');
            console.log('🆔 Parsed credentials:', { appleId: loadedAppleId, appPasswordLength: loadedAppPassword?.length });
            setAppleId(loadedAppleId || '');
            setAppPassword(loadedAppPassword || '');
          } catch (error) {
            console.error('❌ Failed to decode Apple credentials:', error);
            // If credentials can't be decoded, leave fields empty
            setAppleId('');
            setAppPassword('');
          }
        } else if (connectionData.platform === 'APPLE') {
          console.log('🍎 Apple connection found but no accessToken present');
        }

        // Load events for this connection
        const eventsResponse = await fetch(`/api/provider/calendar/events?connectionId=${connectionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEvents(eventsData.events || []);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [connectionId]);

  const loadConnectionData = async () => {
    try {
      const token = localStorage.getItem('providerToken');
      
      // Load connection details
      const connectionResponse = await fetch(`/api/provider/calendar/connections/${connectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!connectionResponse.ok) {
        throw new Error('Failed to load connection');
      }

      const connectionData = await connectionResponse.json();
      setConnection(connectionData);
      setIsActive(connectionData.isActive);
      setSyncFrequency(connectionData.syncFrequency);

      // Load events for this connection
      const eventsResponse = await fetch(`/api/provider/calendar/events?connectionId=${connectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!connection) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('providerToken');
      
      const updateData: {
        isActive: boolean;
        syncFrequency: number;
        accessToken?: string;
      } = {
        isActive,
        syncFrequency,
      };

      // For Apple connections, include updated credentials
      if (connection.platform === 'APPLE' && appleId && appPassword) {
        console.log('🍎 Encoding Apple credentials:', { appleId, appPasswordLength: appPassword.length });
        const credentials = Buffer.from(`${appleId}:${appPassword}`).toString('base64');
        console.log('🔐 Encoded credentials length:', credentials.length);
        updateData.accessToken = credentials;
      }

      console.log('🔧 Sending PUT request with data:', JSON.stringify(updateData, null, 2));

      const response = await fetch(`/api/provider/calendar/connections/${connectionId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('📡 PUT response status:', response.status);
      console.log('📡 PUT response ok:', response.ok);

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      // Reload data to reflect changes
      await loadConnectionData();
      alert('Settings updated successfully!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('providerToken');
      const response = await fetch(`/api/provider/calendar/sync/${connectionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 500 && result.details?.includes('refresh')) {
          // Token refresh failed - suggest re-authentication
          setError(
            `Sync failed: ${result.details}. Your calendar connection may need re-authentication. Please click "Re-authenticate" below.`
          );
        } else {
          throw new Error(result.error || 'Sync failed');
        }
        return;
      }

      alert(`${connection?.platform} calendar synced successfully!`);
      await loadConnectionData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync calendar');
    }
  };

  const handleSetupWebhook = async () => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/webhooks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup webhook');
      }

      const result = await response.json();
      alert(result.message);
      await loadConnectionData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook setup failed');
    }
  };

  const handleRemoveWebhook = async () => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/webhooks', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove webhook');
      }

      const result = await response.json();
      alert(result.message);
      await loadConnectionData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook removal failed');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this calendar? This will remove all synced events and cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch(`/api/provider/calendar/connections/${connectionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      alert('Calendar disconnected successfully');
      router.push('/provider/dashboard');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect calendar');
    }
  };

  const toggleEventBooking = async (eventId: string, allowBookings: boolean) => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch(`/api/provider/calendar/events/${eventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allowBookings }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      // Update local state
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, allowBookings } : event
      ));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  const handleReauthenticate = async () => {
    if (!connection) return;

    try {
      // Create re-authentication URL
      const baseUrl = window.location.origin;
      let authUrl = '';

      switch (connection.platform) {
        case 'GOOGLE':
          const googleScopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(baseUrl + '/provider/calendar/callback')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(googleScopes)}&` +
            `access_type=offline&` +
            `prompt=consent&` +
            `state=${encodeURIComponent(JSON.stringify({ platform: 'GOOGLE', connectionId, reauth: true }))}`;
          break;

        case 'OUTLOOK':
          const outlookScopes = 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/calendars.readwrite';
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(baseUrl + '/provider/calendar/callback')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(outlookScopes)}&` +
            `prompt=consent&` +
            `state=${encodeURIComponent(JSON.stringify({ platform: 'OUTLOOK', connectionId, reauth: true }))}`;
          break;

        case 'TEAMS':
          const teamsScopes = 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/calendars.readwrite';
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${process.env.NEXT_PUBLIC_TEAMS_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(baseUrl + '/provider/calendar/callback')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(teamsScopes)}&` +
            `prompt=consent&` +
            `state=${encodeURIComponent(JSON.stringify({ platform: 'TEAMS', connectionId, reauth: true }))}`;
          break;

        case 'APPLE':
          // Apple iCloud doesn't use OAuth - redirect to settings page
          alert('Apple iCloud uses app-specific passwords. Please check your credentials in the settings below and ensure you are using an app-specific password from your Apple ID settings.');
          return;

        default:
          throw new Error(`Re-authentication not supported for ${connection.platform}`);
      }

      // Redirect to OAuth provider
      window.location.href = authUrl;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start re-authentication');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Loading calendar management...</p>
        </div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Calendar Not Found</h1>
          <p className="text-gray-600 mb-6">The calendar connection you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/provider/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/provider/dashboard"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Calendar Connection</h1>
          <p className="text-gray-600 mt-2">
            Configure settings for your {connection.platform} calendar ({connection.email})
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Connection Settings</h2>
              
              <div className="space-y-4">
                {/* Connection Status */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-900">Active Connection</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    When disabled, events from this calendar won&apos;t sync
                  </p>
                </div>

                {/* Sync Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Sync Frequency
                  </label>
                  <div className="relative">
                    <select
                      value={syncFrequency}
                      onChange={(e) => setSyncFrequency(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm bg-white text-black focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                      style={{ 
                        color: '#000000',
                        backgroundColor: '#ffffff',
                        fontWeight: '500'
                      }}
                    >
                      <option value={5} style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: 'normal' }}>Every 5 minutes</option>
                      <option value={15} style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: 'normal' }}>Every 15 minutes</option>
                      <option value={30} style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: 'normal' }}>Every 30 minutes</option>
                      <option value={60} style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: 'normal' }}>Every hour</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Apple iCloud Credentials (only for Apple connections) */}
                {connection.platform === 'APPLE' && (
                  <>
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Apple iCloud Credentials</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Apple ID
                          </label>
                          <input
                            type="email"
                            value={appleId}
                            onChange={(e) => setAppleId(e.target.value)}
                            placeholder="your.email@icloud.com"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            App-Specific Password
                          </label>
                          <input
                            type="password"
                            value={appPassword}
                            onChange={(e) => setAppPassword(e.target.value)}
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Generate an app-specific password from your <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Apple ID account page</a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              {/* Connection Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Connection Info</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Platform:</span>
                    <span className="ml-2 text-gray-900">{connection.platform}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 text-gray-900">{connection.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Connected:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {connection.lastSyncAt && (
                    <div>
                      <span className="text-gray-500">Last Sync:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(connection.lastSyncAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={handleSyncNow}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Sync Now
                </button>

                <button
                  onClick={handleReauthenticate}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                >
                  Re-authenticate Calendar
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Use this if sync fails due to expired tokens
                </p>

                {/* Webhook Management */}
                {connection.subscriptionId ? (
                  <div>
                    <div className="flex items-center text-sm text-green-600 mb-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Real-time sync enabled
                    </div>
                    {connection.subscriptionExpiresAt && (
                      <p className="text-xs text-gray-500 mb-2">
                        Expires: {new Date(connection.subscriptionExpiresAt).toLocaleDateString()}
                      </p>
                    )}
                    <button
                      onClick={handleRemoveWebhook}
                      className="w-full bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      Disable Real-time Sync
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSetupWebhook}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Enable Real-time Sync
                  </button>
                )}

                <button
                  onClick={handleDisconnect}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Disconnect Calendar
                </button>
              </div>
            </div>
          </div>

          {/* Events Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Calendar Events</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage which events are available for booking
                </p>
              </div>
              
              <div className="px-6 py-4">
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-900 mb-4">No events found</p>
                    <button
                      onClick={handleSyncNow}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Sync Calendar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {events.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{event.title}</h3>
                            <p className="text-sm text-gray-600">{event.location}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>{new Date(event.startTime).toLocaleDateString()}</span>
                              <span>
                                {new Date(event.startTime).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - {new Date(event.endTime).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="ml-4 flex items-center space-x-3">
                            {event.allowBookings && (
                              <span className="text-xs text-gray-500">
                                {event.currentBookings}/{event.maxBookings} booked
                              </span>
                            )}
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={event.allowBookings}
                                onChange={(e) => toggleEventBooking(event.id, e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-900">Allow Booking</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
