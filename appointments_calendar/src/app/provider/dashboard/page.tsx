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
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  platform: string;
  allowBookings: boolean;
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

export default function ProviderDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const handleSetupWebhooks = async () => {
    try {
      const token = localStorage.getItem('providerToken');
      const response = await fetch('/api/provider/calendar/webhooks', {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to setup webhooks');
      }

      const result = await response.json();
      alert(result.message || 'Webhooks setup successfully');
      
      // Reload data to show updated webhook status
      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhook setup failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('providerToken');
    router.push('/provider/login');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
              <p className="text-gray-800">Manage your calendar connections and appointments</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSyncCalendars}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Sync All Calendars
              </button>
              <button
                onClick={handleSetupWebhooks}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Setup Real-Time Sync
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  onClick={() => router.push('/provider/bookings')}
                  className="text-sm text-blue-600 hover:text-blue-800 block"
                >
                  View Bookings
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Connections */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Calendar Connections</h2>
                <button
                  onClick={() => router.push('/provider/calendar/connect')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Add New
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              {connections.length === 0 ? (
                <p className="text-gray-900 text-center py-4">
                  No calendar connections. Connect your first calendar to get started.
                </p>
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
                        <div className="ml-4 text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.allowBookings 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.allowBookings ? 'Bookable' : 'Private'}
                          </div>
                          {event.allowBookings && (
                            <p className="text-xs text-gray-500 mt-1">
                              {event.currentBookings}/{event.maxBookings} booked
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
