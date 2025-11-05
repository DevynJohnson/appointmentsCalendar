// Provider Bookings Management Page
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { secureFetch } from '@/lib/csrf';

interface Customer {
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface Provider {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  scheduledAt: string;
  duration: number;
  serviceType: string;
  notes: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED';
  customer: Customer;
  provider: Provider;
  createdAt: string;
  updatedAt: string;
}

type BookingStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED';

export default function ProviderBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  const loadBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

      const response = await fetch('/api/provider/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load bookings');
      }

      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Filter bookings based on status and search term
  useEffect(() => {
    let filtered = bookings;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by search term (customer name, email, or service type)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => {
        const customerName = `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.toLowerCase();
        const customerEmail = booking.customer.email.toLowerCase();
        const serviceType = booking.serviceType.toLowerCase();
        
        return customerName.includes(searchLower) || 
               customerEmail.includes(searchLower) || 
               serviceType.includes(searchLower);
      });
    }

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, searchTerm]);

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'cancel' | 'reschedule') => {
    setActionLoading(bookingId);
    try {
      const token = localStorage.getItem('providerToken');
      const response = await secureFetch(`/api/provider/bookings/${bookingId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} booking`);
      }

      // Reload bookings to reflect changes
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RESCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusCounts = () => {
    return {
      ALL: bookings.length,
      PENDING: bookings.filter(b => b.status === 'PENDING').length,
      CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
      CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
      RESCHEDULED: bookings.filter(b => b.status === 'RESCHEDULED').length,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading bookings...</p>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Management</h1>
            <p className="text-gray-600">Review and manage your appointment requests</p>
          </div>
          <button
            onClick={() => router.push('/provider/dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(Object.keys(statusCounts) as BookingStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  statusFilter === status
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()} ({statusCounts[status]})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by customer name, email, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </span>
          <button
            onClick={loadBookings}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white shadow rounded-lg">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'ALL' ? 'No bookings found' : `No ${statusFilter.toLowerCase()} bookings`}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : statusFilter === 'PENDING'
                ? 'New booking requests will appear here.'
                : 'Bookings matching this status will appear here.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredBookings.map((booking) => {
              const { date, time } = formatDateTime(booking.scheduledAt);
              const customerName = `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.trim() || 'Unknown Customer';
              
              return (
                <div key={booking.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{customerName}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p><span className="font-medium">Email:</span> {booking.customer.email}</p>
                          <p><span className="font-medium">Service:</span> {booking.serviceType}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Date:</span> {date}</p>
                          <p><span className="font-medium">Time:</span> {time}</p>
                          <p><span className="font-medium">Duration:</span> {booking.duration} minutes</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Requested:</span> {new Date(booking.createdAt).toLocaleDateString()}</p>
                          {booking.notes && (
                            <p><span className="font-medium">Notes:</span> {booking.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {booking.status === 'PENDING' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleBookingAction(booking.id, 'confirm')}
                          disabled={actionLoading === booking.id}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking.id, 'reschedule')}
                          disabled={actionLoading === booking.id}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? '...' : 'Reschedule'}
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking.id, 'cancel')}
                          disabled={actionLoading === booking.id}
                          className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? '...' : 'Deny'}
                        </button>
                      </div>
                    )}
                    
                    {booking.status === 'CONFIRMED' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleBookingAction(booking.id, 'cancel')}
                          disabled={actionLoading === booking.id}
                          className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? '...' : 'Cancel'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}