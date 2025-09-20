'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';

interface ConfirmationResult {
  success?: boolean;
  message: string;
  booking?: {
    id: string;
    status: string;
    scheduledAt: string;
    customerName?: string;
    providerName?: string;
  };
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading confirmation...</div>}>
      <BookingConfirmContent />
    </Suspense>
  );
}

function BookingConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [result, setResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      confirmBooking(token);
    } else {
      setResult({ message: 'Invalid confirmation link. No token provided.' });
      setLoading(false);
    }
  }, [token]);

  const confirmBooking = async (token: string) => {
    try {
      const response = await fetch(`/api/client/booking/confirm?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      
      setResult(data);
    } catch (error) {
      console.error('Confirmation error:', error);
      setResult({ message: 'Failed to process confirmation. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your confirmation...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">No confirmation result available.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav type="public" />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {result.success ? (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
            </>
          ) : (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {result.booking?.status === 'CANCELLED' ? 'Booking Cancelled' : 'Confirmation Failed'}
              </h2>
            </>
          )}
          
          <p className="mt-4 text-gray-600">{result.message}</p>

          {result.booking && (
            <div className="mt-6 p-4 bg-white rounded-lg shadow border">
              <h3 className="font-medium text-gray-900 mb-2">Booking Details</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Booking ID:</strong> {result.booking.id}</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                    result.booking.status === 'CONFIRMED' 
                      ? 'bg-green-100 text-green-800' 
                      : result.booking.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {result.booking.status}
                  </span>
                </p>
                {result.booking.scheduledAt && (
                  <p><strong>Scheduled:</strong> {new Date(result.booking.scheduledAt).toLocaleString()}</p>
                )}
                {result.booking.customerName && (
                  <p><strong>Customer:</strong> {result.booking.customerName}</p>
                )}
                {result.booking.providerName && (
                  <p><strong>Provider:</strong> {result.booking.providerName}</p>
                )}
              </div>
            </div>
          )}

          {result.success && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                📧 Confirmation emails have been sent to both you and your provider. 
                The appointment has been added to your provider&apos;s calendar.
              </p>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={() => window.close()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}