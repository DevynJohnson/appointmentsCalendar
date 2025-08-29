'use client';

import React, { useEffect, useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  allowBookings: boolean;
  maxBookings: number;
  availableServices: string[];
  provider: string;
}

export default function EventBookingSettings() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/event-booking-settings?providerId=cmek2qbli0000zy18bh84zbwm');
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableBookings = async (eventId: string, settings: {
    allowBookings: boolean;
    maxBookings?: number;
    availableServices?: string[];
  }) => {
    setUpdating(eventId);
    try {
      const response = await fetch('/api/admin/event-booking-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          ...settings,
        }),
      });

      if (response.ok) {
        await fetchEvents(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setUpdating(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Event Booking Settings</h1>
        <div className="text-center py-8">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Event Booking Settings</h1>
      <p className="text-gray-600 mb-6">
        Enable bookings on calendar events to allow clients to schedule appointments during those times.
      </p>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No upcoming calendar events found.</p>
          <p className="text-sm text-gray-500 mt-2">
            Sync your calendar first to see events here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className="border rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    📅 {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
                  </p>
                  {event.location && (
                    <p className="text-gray-600 text-sm mb-2">📍 {event.location}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      event.allowBookings 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.allowBookings ? '✅ Bookings Enabled' : '❌ Bookings Disabled'}
                    </span>
                    
                    {event.allowBookings && (
                      <>
                        <span className="text-gray-500">
                          Max: {event.maxBookings} appointments
                        </span>
                        {event.availableServices.length > 0 && (
                          <span className="text-gray-500">
                            Services: {event.availableServices.join(', ')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 lg:mt-0 lg:ml-4 space-y-2">
                  {!event.allowBookings ? (
                    <button
                      onClick={() => enableBookings(event.id, {
                        allowBookings: true,
                        maxBookings: 1,
                        availableServices: ['consultation']
                      })}
                      disabled={updating === event.id}
                      className="w-full lg:w-auto bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {updating === event.id ? 'Enabling...' : 'Enable Bookings'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => enableBookings(event.id, {
                          allowBookings: true,
                          maxBookings: 3,
                          availableServices: ['consultation', 'maintenance']
                        })}
                        disabled={updating === event.id}
                        className="w-full lg:w-auto bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Allow 3 Appointments
                      </button>
                      <button
                        onClick={() => enableBookings(event.id, {
                          allowBookings: false
                        })}
                        disabled={updating === event.id}
                        className="w-full lg:w-auto bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        Disable Bookings
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Test the Client Dashboard</h3>
        <p className="text-sm text-gray-600 mb-3">
          After enabling bookings on events above, test the client booking experience:
        </p>
        <a 
          href="/client/dashboard" 
          target="_blank"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Open Client Dashboard →
        </a>
      </div>
    </div>
  );
}
