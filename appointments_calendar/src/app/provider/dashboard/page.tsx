// Provider Dashboard - Main Overview Page
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CalendarConnection {
  id: string;
  platform: string;
  email: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncEvents?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  platform: string;
  maxBookings: number;
  currentBookings: number;
}

interface DashboardStats {
  totalConnections: number;
  activeConnections: number;
  upcomingEvents: number;
  totalBookings: number;
  pendingBookings: number;
}

interface CalendarInfo {
  calendarId: string;
  calendarName: string;
  email: string;
}

interface PlatformGroup {
  platform: string;
  calendars: CalendarInfo[];
}

interface DefaultCalendarSettings {
  platforms: PlatformGroup[];
  currentDefault?: {
    platform: string;
    calendarId: string;
    email: string;
  };
}

export default function ProviderDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [defaultCalendar, setDefaultCalendar] = useState<DefaultCalendarSettings | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadDefaultCalendar = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/default', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('Default calendar API response:', data);
      if (response.ok) {
        setDefaultCalendar(data);
        
        // Set initial selection if there's a current default
        if (data.currentDefault) {
          setSelectedPlatform(data.currentDefault.platform);
          setSelectedCalendarId(data.currentDefault.calendarId);
        }
      } else {
        console.error('Default calendar API error:', response.status, data);
      }
    } catch (err) {
      console.error('Failed to load default calendar:', err);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

      // Trigger calendar sync in background when dashboard loads
      // This ensures provider sees fresh data when they check their dashboard
      fetch('/api/provider/calendar/sync', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forceSync: false }) // Only sync if needed
      }).catch(error => {
        console.warn('Background calendar sync failed on dashboard load:', error);
      });

      // Load dashboard stats
      const statsResponse = await fetch('/api/provider/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Load calendar connections
      const connectionsResponse = await fetch('/api/provider/calendar/connections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Load upcoming events
      const eventsResponse = await fetch('/api/provider/calendar/events', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!statsResponse.ok || !connectionsResponse.ok || !eventsResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const [statsData, connectionsData, eventsData] = await Promise.all([
        statsResponse.json(),
        connectionsResponse.json(),
        eventsResponse.json(),
      ]);

      setStats(statsData);
      setConnections(connectionsData);
      setUpcomingEvents(eventsData);
      
      // Load default calendar data
      await loadDefaultCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [router, loadDefaultCalendar]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleUpdateDefaultCalendar = async () => {
    if (!selectedPlatform || !selectedCalendarId) return;

    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/default', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          calendarId: selectedCalendarId,
        }),
      });

      if (response.ok) {
        // Reload default calendar data to get updated info
        await loadDefaultCalendar();
      } else {
        throw new Error('Failed to update default calendar');
      }
    } catch (err) {
      console.error('Error updating default calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to update default calendar');
    }
  };

  const handleSyncCalendars = async () => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to sync calendars');
      }

      // Reload data after sync
      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const handleFixConnections = async () => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/fix-connections', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      console.log('Fix connections API response:', data);

      if (!response.ok) {
        throw new Error('Failed to fix calendar connections');
      }

      // Reload all data after fixing connections
      await Promise.all([
        loadDashboardData(),
        loadDefaultCalendar()
      ]);
      
      alert('Calendar connections fixed! All calendars should now be available for booking settings.');
    } catch (err) {
      console.error('Fix connections error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fix calendar connections');
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Actions */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Manage your calendar connections and appointments</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSyncCalendars}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Sync All Calendars
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-900">Calendar Connections</h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeConnections}/{stats.totalConnections}
              </p>
              <p className="text-xs text-gray-600 mt-1">Active connections</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-900">Upcoming Events</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
              <p className="text-xs text-gray-600 mt-1">Next 30 days</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-900">Total Bookings</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-900">Pending Bookings</h3>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingBookings}</p>
              <p className="text-xs text-gray-600 mt-1">Needs attention</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => router.push('/provider/calendar/connect')}
                  className="text-sm text-blue-600 hover:text-blue-800 block"
                >
                  Add Calendar
                </button>
                <button
                  onClick={() => router.push('/provider/location')}
                  className="text-sm text-blue-600 hover:text-blue-800 block"
                >
                  Manage Locations
                </button>
                <button
                  onClick={() => router.push('/provider/bookings')}
                  className="text-sm text-blue-600 hover:text-blue-800 block"
                >
                  View Bookings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Default Calendar Settings */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Default Calendar for New Bookings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose where new booking events will be written. Only calendars with sync enabled are shown here. If you do not see a calendar that you have connected, please make sure it has &quot;Sync Events&quot; enabled on the Manage Calendar page. If it still does not appear, try using the &quot;Fix Multi-Calendar Support&quot; button below.
            </p>
          </div>
          <div className="px-6 py-4">
            {!defaultCalendar || defaultCalendar.platforms.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-900 mb-4">
                  No calendar connections available. Connect a calendar first to set a default.
                </p>
                <button
                  onClick={() => router.push('/provider/calendar/connect')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  📅 Connect Calendar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Default Display */}
                {defaultCalendar.currentDefault && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                      <span className="text-sm font-medium text-green-800">Current Default:</span>
                      <span className="text-sm text-green-700">
                        {defaultCalendar.currentDefault.platform} ({defaultCalendar.currentDefault.email})
                      </span>
                    </div>
                  </div>
                )}

                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Platform
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => {
                      setSelectedPlatform(e.target.value);
                      setSelectedCalendarId(''); // Reset calendar selection when platform changes
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a platform</option>
                    {defaultCalendar.platforms.map((platform) => (
                      <option key={platform.platform} value={platform.platform}>
                        {platform.platform} ({platform.calendars?.length || 0} calendar{(platform.calendars?.length || 0) !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calendar Selection */}
                {selectedPlatform && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specific Calendar
                    </label>
                    <select
                      value={selectedCalendarId}
                      onChange={(e) => setSelectedCalendarId(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a calendar</option>
                      {defaultCalendar.platforms
                        .find(p => p.platform === selectedPlatform)
                        ?.calendars?.map((calendar) => (
                          <option key={calendar.calendarId} value={calendar.calendarId}>
                            {calendar.calendarName} ({calendar.email})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Update Button */}
                {selectedPlatform && selectedCalendarId && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdateDefaultCalendar}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Set as Default Calendar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Connections */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Calendar Connections</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleFixConnections}
                    className="inline-flex items-center px-3 py-1.5 border border-orange-600 text-xs font-medium rounded-md text-orange-600 bg-white hover:bg-orange-50 transition-colors"
                    title="Fix calendar connections to enable multi-calendar features"
                  >
                    🔧 Fix Multi-Calendar Support
                  </button>
                  <button
                    onClick={() => router.push('/provider/calendar/connect')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    + Add New
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              {connections.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-900 mb-4">
                    No calendar connections. Connect your first calendar to get started.
                  </p>
                  <button
                    onClick={() => router.push('/provider/calendar/connect')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    📅 Connect Calendar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            connection.isActive ? 'bg-green-400' : 'bg-red-400'
                          }`}></span>
                          <span className="font-medium text-gray-900">{connection.platform}</span>
                        </div>
                        <p className="text-sm text-gray-600">{connection.email}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            connection.syncEvents ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {connection.syncEvents ? '✅ Sync Enabled' : '⏸️ Sync Off'}
                          </span>
                        </div>
                        {connection.lastSyncAt && (
                          <p className="text-xs text-gray-500">
                            Last sync: {new Date(connection.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/provider/calendar/manage/${connection.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Upcoming Events</h2>
            </div>
            <div className="px-6 py-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-900 text-center py-4">
                  No upcoming events. Sync your calendars to see events.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {upcomingEvents.slice(0, 10).map((event) => (
                    <div key={event.id} className="border rounded-lg p-3">
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
                            <span className="capitalize">{event.platform}</span>
                          </div>
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
  );
}
