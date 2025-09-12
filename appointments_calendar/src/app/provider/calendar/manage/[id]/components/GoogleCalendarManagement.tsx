'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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

interface AvailableCalendar {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  canWrite?: boolean;
  color?: string;
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

interface GoogleCalendarManagementProps {
  connection: CalendarConnection;
  onConnectionUpdate?: (connection: CalendarConnection) => void;
}

export default function GoogleCalendarManagement({ connection, onConnectionUpdate }: GoogleCalendarManagementProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Form state
  const [isActive, setIsActive] = useState(connection.isActive);
  const [syncFrequency, setSyncFrequency] = useState(connection.syncFrequency);

  // Google-specific multi-calendar state
  const [availableCalendars, setAvailableCalendars] = useState<AvailableCalendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [calendarSettings, setCalendarSettings] = useState<{[key: string]: {syncEvents: boolean, allowBookings: boolean}}>({});

  const loadData = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');

      // Load events for this connection
      const eventsResponse = await fetch(`/api/provider/calendar/events?connectionId=${connection.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }

      // Load available Google calendars
      setLoadingCalendars(true);
      try {
        // We need to get the access token from the connection to fetch calendars
        if (connection.id) {
          const calendarsResponse = await fetch(`/api/provider/calendar/available-calendars?platform=GOOGLE&connectionId=${encodeURIComponent(connection.id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (calendarsResponse.ok) {
            const calendarsData = await calendarsResponse.json();
            setAvailableCalendars(calendarsData.calendars || []);
            
            // Set initial selected calendars based on existing connection
            const initialSelected = calendarsData.calendars
              ?.filter((cal: AvailableCalendar) => cal.id === connection.calendarId)
              .map((cal: AvailableCalendar) => cal.id) || [];
            setSelectedCalendars(initialSelected);
          } else {
            console.error('Failed to fetch calendars:', await calendarsResponse.text());
            setError('Failed to load Google calendars. Try re-authenticating your connection.');
          }
        } else {
          setError('No access token found. Please re-authenticate your Google connection.');
        }
      } catch (calErr) {
        console.error('Failed to load calendars:', calErr);
        setError('Failed to load available calendars');
      } finally {
        setLoadingCalendars(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    }
  }, [connection.id, connection.calendarId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('providerToken');
      
      const updateData = {
        isActive,
        syncFrequency,
        selectedCalendars,
        calendarSettings,
      };

      const response = await fetch(`/api/provider/calendar/connections/${connection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      alert('Google Calendar settings saved successfully!');
      await loadData(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

    const handleSyncNow = async () => {
    if (!connection || syncLoading) return;
    
    setSyncLoading(true);
    
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch(`/api/provider/calendar/sync/${connection.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update the connection state immediately with the new lastSyncAt timestamp
        if (onConnectionUpdate) {
          const updatedConnection = {
            ...connection,
            lastSyncAt: new Date().toISOString()
          };
          onConnectionUpdate(updatedConnection);
        } else {
          // Fallback to reloading data if no callback is provided
          await loadData();
        }
      } else {
        const errorData = await response.json();
        console.error('Sync failed:', errorData.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleReauth = async () => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch(`/api/provider/calendar/auth-urls`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to get authentication URL');
      }

      const data = await response.json();
      
      // Use the Google auth URL for re-authentication, but modify the state to include connection ID
      if (data.google) {
        // Parse the existing URL to modify the state parameter
        const url = new URL(data.google);
        const currentState = url.searchParams.get('state');
        
        if (currentState) {
          // Parse existing state and add connection ID for re-auth
          const stateData = JSON.parse(decodeURIComponent(currentState));
          stateData.connectionId = connection.id;
          stateData.isReauth = true;
          
          // Update the state parameter
          url.searchParams.set('state', encodeURIComponent(JSON.stringify(stateData)));
          
          window.location.href = url.toString();
        } else {
          throw new Error('Invalid authentication URL format');
        }
      } else {
        throw new Error('Google authentication URL not available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate re-authentication');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSyncFrequency = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/provider/dashboard" className="text-gray-500 hover:text-gray-700">
                  Dashboard
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-900">Google Calendar Management</span>
                </div>
              </li>
            </ol>
          </nav>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg className="w-8 h-8 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              Google Calendar - {connection.email}
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your Google Calendar connections and multi-calendar settings
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  Connection Settings
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-6">
                  {/* Connection Status */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        Active Connection
                      </span>
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      When disabled, this Google Calendar will not sync events or be available for bookings
                    </p>
                  </div>

                  {/* Sync Frequency */}
                  <div>
                    <label htmlFor="syncFrequency" className="block text-sm font-medium text-gray-700">
                      Sync Frequency
                    </label>
                    <select
                      id="syncFrequency"
                      value={syncFrequency}
                      onChange={(e) => setSyncFrequency(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    >
                      <option value={5}>Every 5 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every hour</option>
                      <option value={240}>Every 4 hours</option>
                      <option value={1440}>Daily</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      How often to check for Google Calendar updates
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    
                    <button
                      onClick={handleSyncNow}
                      disabled={syncLoading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {syncLoading ? 'Syncing...' : 'Sync Now'}
                    </button>
                    
                    <button
                      onClick={handleReauth}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
                    >
                      Re-authenticate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Calendar Management for Google */}
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Google Calendar Selection
                </h2>
                <p className="text-sm text-gray-500">Choose which Google Calendars to sync and manage</p>
              </div>
              
              <div className="p-6">
                {loadingCalendars ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading Google Calendars...</p>
                  </div>
                ) : availableCalendars.length > 0 ? (
                  <div className="space-y-3">
                    {availableCalendars.map((calendar) => (
                      <div key={calendar.id} className="border border-gray-200 rounded-md p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 flex items-center">
                              {calendar.color && (
                                <span 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: calendar.color }}
                                />
                              )}
                              {calendar.name}
                            </h3>
                            {calendar.description && (
                              <p className="text-sm text-gray-500 mt-1">{calendar.description}</p>
                            )}
                            <div className="flex items-center mt-2 space-x-4">
                              {calendar.isDefault && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Primary Calendar
                                </span>
                              )}
                              {calendar.canWrite && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Can Create Events
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedCalendars.includes(calendar.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCalendars([...selectedCalendars, calendar.id]);
                                  } else {
                                    setSelectedCalendars(selectedCalendars.filter(id => id !== calendar.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-900">Sync Events</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={calendarSettings[calendar.id]?.allowBookings || false}
                                onChange={(e) => {
                                  setCalendarSettings({
                                    ...calendarSettings,
                                    [calendar.id]: {
                                      ...calendarSettings[calendar.id],
                                      syncEvents: calendarSettings[calendar.id]?.syncEvents || false,
                                      allowBookings: e.target.checked
                                    }
                                  });
                                }}
                                className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                              />
                              <span className="text-sm text-gray-900">Allow Bookings</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 12v6m0-6V9m0 4h.01" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Google Calendars Found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Unable to load your Google Calendars. Try re-authenticating your connection.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Connection Info */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Google Connection Info</h3>
              </div>
              <div className="p-6">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Platform</dt>
                    <dd className="text-sm text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google Calendar
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{connection.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Primary Calendar ID</dt>
                    <dd className="text-sm text-gray-900 break-all font-mono">{connection.calendarId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        connection.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {connection.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Sync</dt>
                    <dd className="text-sm text-gray-900">
                      {connection.lastSyncAt ? formatDate(connection.lastSyncAt) : 'Never'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sync Frequency</dt>
                    <dd className="text-sm text-gray-900">
                      {formatSyncFrequency(connection.syncFrequency || 15)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Connected</dt>
                    <dd className="text-sm text-gray-900">
                      {connection.createdAt ? formatDate(connection.createdAt) : 'Unknown'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Google Events</h3>
              </div>
              <div className="p-6">
                {events.length > 0 ? (
                  <div className="space-y-3">
                    {events.slice(0, 5).map((event) => (
                      <div key={event.id} className="border-l-4 border-blue-400 pl-3 hover:border-blue-600 transition-colors">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(event.startTime)} - {formatDate(event.endTime)}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-500">📍 {event.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 12v6m0-6V9m0 4h.01" />
                    </svg>
                    <p className="text-gray-500 text-sm mt-2">No recent Google Calendar events</p>
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
