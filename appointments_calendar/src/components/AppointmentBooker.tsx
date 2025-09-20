'use client';

import { useEffect, useState } from 'react';
import { useProviderSlots } from '@/hooks/useProviderSlots';
import { SyncLoading, SyncButton } from '@/components/SyncLoading';

interface AppointmentBookerProps {
  providerId: string;
  serviceType?: string;
}

export function AppointmentBooker({ providerId, serviceType }: AppointmentBookerProps) {
  const [showSyncLoader, setShowSyncLoader] = useState(false);
  
  const { 
    slots, 
    isLoading, 
    isSyncing, 
    error, 
    fetchSlots, 
    forceSync 
  } = useProviderSlots({
    onSyncStart: () => setShowSyncLoader(true),
    onSyncEnd: () => setShowSyncLoader(false)
  });

  // Fetch slots when component mounts
  useEffect(() => {
    if (providerId) {
      fetchSlots(providerId, serviceType);
    }
  }, [providerId, serviceType, fetchSlots]);

  const handleForceSync = async () => {
    try {
      await forceSync(providerId);
      // Refetch slots after manual sync
      await fetchSlots(providerId, serviceType);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error Loading Appointments</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button 
          onClick={() => fetchSlots(providerId, serviceType)}
          className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Sync Loading Overlay */}
      <SyncLoading 
        isVisible={showSyncLoader} 
        message="Syncing provider calendar, please wait a moment. Appointment availability is subject to change."
      />

      <div className="space-y-4">
        {/* Header with manual sync button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Available Appointments</h2>
          <SyncButton
            onClick={handleForceSync}
            isLoading={isSyncing}
            className="text-sm"
          >
            {isSyncing ? 'Syncing...' : 'Refresh Calendar'}
          </SyncButton>
        </div>

        {/* Loading state for slots */}
        {isLoading && !isSyncing && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading appointments...</p>
          </div>
        )}

        {/* Appointment slots */}
        {!isLoading && slots.length > 0 && (
          <div className="grid gap-2">
            {slots.map((slot, index) => (
              <div 
                key={index}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-colors
                  ${slot.available 
                    ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  }
                `}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{slot.date} at {slot.time}</span>
                  {slot.location && (
                    <span className="text-sm text-gray-600">📍 {slot.location}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No slots message */}
        {!isLoading && slots.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <p>No available appointments found.</p>
            <SyncButton
              onClick={handleForceSync}
              isLoading={isSyncing}
              className="mt-2"
            >
              Check for Updates
            </SyncButton>
          </div>
        )}

        {/* Sync status indicator */}
        {isSyncing && (
          <div className="text-center text-sm text-blue-600">
            <span className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing calendar...
            </span>
          </div>
        )}
      </div>
    </>
  );
}