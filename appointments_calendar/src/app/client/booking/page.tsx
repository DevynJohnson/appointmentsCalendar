'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Slot {
  id: string;
  eventId: string;
  startTime: string;
  endTime: string;
  duration: number;
  provider: {
    id: string;
    name: string;
  };
  location: {
    display: string;
    city: string;
    state: string;
    address: string;
  };
  availableServices: string[];
  eventTitle: string;
  slotsRemaining: number;
}

interface ApiResponse {
  success: boolean;
  provider: {
    id: string;
    name: string;
  };
  totalSlots: number;
  slots: Slot[];
}

export default function ClientBooking() {
  return (
    <Suspense fallback={<div className="p-6">Loading booking page...</div>}>
      <ClientBookingContent />
    </Suspense>
  );
}

function ClientBookingContent() {
  const searchParams = useSearchParams();
  const urlProviderId = searchParams.get('providerId');
  
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerInfo, setProviderInfo] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState({
    providerId: urlProviderId || '',
    serviceType: '',
    daysAhead: '14', // Default to 2 weeks for better UX
    mode: 'both', // Always use both modes for best client experience
  });
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bookingForm, setBookingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    serviceType: 'consultation',
    notes: '',
  });
  const [isBooking, setIsBooking] = useState(false);

  const fetchOpenSlots = useCallback(async () => {
    if (!filters.providerId) {
      if (urlProviderId) {
        setFilters(prev => ({ ...prev, providerId: urlProviderId }));
        return;
      } else {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/client/open-slots?${params}`);
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setSlots(data.slots);
        setProviderInfo(data.provider);
      } else {
        console.error('Failed to fetch slots');
        setSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [filters, urlProviderId]);

  useEffect(() => {
    fetchOpenSlots();
  }, [fetchOpenSlots]);

  const handleBookSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    if (slot.availableServices.length === 1) {
      setBookingForm(prev => ({ ...prev, serviceType: slot.availableServices[0] }));
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedSlot) return;

    setIsBooking(true);
    try {
      const isAutoSlot = selectedSlot.eventTitle === 'Available Time' || 
                        selectedSlot.eventTitle.includes('Auto Generated');
      
      const response = await fetch('/api/client/book-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: isAutoSlot ? null : selectedSlot.eventId,
          providerId: selectedSlot.provider.id,
          scheduledAt: selectedSlot.startTime,
          duration: selectedSlot.duration,
          slotType: isAutoSlot ? 'automatic' : 'manual',
          customer: {
            firstName: bookingForm.firstName,
            lastName: bookingForm.lastName,
            email: bookingForm.email,
            phone: bookingForm.phone,
            address: bookingForm.address,
            city: bookingForm.city,
            state: bookingForm.state,
            zipCode: bookingForm.zipCode,
          },
          serviceType: bookingForm.serviceType,
          notes: bookingForm.notes,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Appointment booked successfully! You will receive a confirmation email.');
        setSelectedSlot(null);
        setBookingForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          serviceType: 'consultation',
          notes: '',
        });
        fetchOpenSlots();
      } else {
        alert(`Booking failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const copyBookingLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert('Booking link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this booking link:', currentUrl);
    });
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Book an Appointment</h1>
            {providerInfo && (
              <p className="text-lg text-gray-800 mt-1">with {providerInfo.name}</p>
            )}
            {!urlProviderId && (
              <p className="text-gray-700 mt-2">Select a provider to see available appointments</p>
            )}
          </div>
          <div className="flex gap-2">
            {urlProviderId && (
              <button
                onClick={copyBookingLink}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm"
              >
                📋 Share
              </button>
            )}
            <a
              href="/client/search"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              {urlProviderId ? '🔍 Find Other Providers' : '🔍 Find a Provider'}
            </a>
          </div>
        </div>
      </div>

      {!urlProviderId ? (
        /* No Provider Selected - Show Search Prompt */
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Find Your Provider</h2>
            <p className="text-gray-800 max-w-md mx-auto">
              Search for service providers by name, company, or location to book an appointment.
            </p>
          </div>
          <a
            href="/client/search"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Search Providers →
          </a>
        </div>
      ) : (
        <>
          {/* Simple Filters for Clients */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Customize Your Search</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Type</label>
                <select
                  value={filters.serviceType}
                  onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Services</option>
                  <option value="consultation">Consultation</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="emergency">Emergency</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time Period</label>
                <select
                  value={filters.daysAhead}
                  onChange={(e) => setFilters(prev => ({ ...prev, daysAhead: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">Next week</option>
                  <option value="14">Next 2 weeks</option>
                  <option value="30">Next month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2">Finding available appointments...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border">
              <div className="mb-4">
                <span className="text-4xl">📅</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">No Available Appointments</h3>
              <p className="text-gray-800 mb-4">
                No appointments are currently available for the selected time period.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, daysAhead: '30' }))}
                  className="block mx-auto bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 text-sm"
                >
                  Try looking further ahead
                </button>
                <a
                  href="/client/search"
                  className="block text-blue-600 hover:underline text-sm"
                >
                  Or find a different provider
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-800">
                  {slots.length} appointment{slots.length !== 1 ? 's' : ''} available
                </p>
                <div className="text-xs text-gray-700">
                  Showing next {filters.daysAhead} days
                </div>
              </div>
              
              <div className="grid gap-4">
                {slots.map(slot => (
                  <div key={slot.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {formatDateTime(slot.startTime)}
                            </h3>
                            <p className="text-sm text-gray-800">
                              {slot.duration} minutes • {slot.eventTitle}
                            </p>
                            {slot.location.display && (
                              <p className="text-sm text-gray-700 mt-1">
                                📍 {slot.location.display}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">
                              Available
                            </div>
                            {slot.slotsRemaining > 1 && (
                              <div className="text-xs text-gray-700">
                                {slot.slotsRemaining} slots left
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 md:mt-0 md:ml-4">
                        <button
                          onClick={() => handleBookSlot(slot)}
                          className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Booking Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">Book Appointment</h2>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>
              
              <div className="bg-blue-50 p-3 rounded mb-4">
                <p className="font-medium">{formatDateTime(selectedSlot.startTime)}</p>
                <p className="text-sm text-gray-800">
                  {selectedSlot.duration} minutes with {selectedSlot.provider.name}
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleBookingSubmit(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.firstName}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.lastName}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.address}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.city}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.state}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Service Type</label>
                  <select
                    value={bookingForm.serviceType}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="emergency">Emergency</option>
                    <option value="follow-up">Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional information..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBooking}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isBooking ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
