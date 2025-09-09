'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import GoogleCalendarManagement from './components/GoogleCalendarManagement';
import AppleCalendarManagement from './components/AppleCalendarManagement';
import OutlookCalendarManagement from './components/OutlookCalendarManagement';
import TeamsCalendarManagement from './components/TeamsCalendarManagement';

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

export default function CalendarManagementRouter() {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const connectionId = params.id as string;

  useEffect(() => {
    const loadConnection = async () => {
      if (!connectionId) return;

      try {
        const token = localStorage.getItem('providerToken');
        const response = await fetch(`/api/provider/calendar/connections/${connectionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load connection');
        }

        const connectionData = await response.json();
        setConnection(connectionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load connection');
      } finally {
        setLoading(false);
      }
    };

    loadConnection();
  }, [connectionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading calendar details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !connection) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error || 'Connection not found'}</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/provider/dashboard"
                    className="bg-red-100 border border-red-300 rounded-md px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Route to the appropriate platform-specific component
  switch (connection.platform) {
    case 'GOOGLE':
      return <GoogleCalendarManagement connection={connection} />;
    case 'APPLE':
      return <AppleCalendarManagement connection={connection} />;
    case 'OUTLOOK':
      return <OutlookCalendarManagement connection={connection} />;
    case 'TEAMS':
      return <TeamsCalendarManagement connection={connection} />;
    default:
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Unsupported Platform</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Platform &ldquo;{connection.platform}&rdquo; is not yet supported.</p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/provider/dashboard"
                      className="bg-yellow-100 border border-yellow-300 rounded-md px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200"
                    >
                      Back to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
  }
}
