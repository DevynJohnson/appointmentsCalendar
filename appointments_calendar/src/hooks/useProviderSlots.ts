'use client';

import { useState } from 'react';
import { ClientSyncManager } from '@/lib/client-sync';

interface UseProviderSlotsOptions {
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
}

interface SlotData {
  // Define your slot data structure here
  date: string;
  time: string;
  available: boolean;
  location?: string;
  // Add other slot properties as needed
}

export function useProviderSlots(options: UseProviderSlotsOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async (
    providerId: string, 
    serviceType?: string, 
    daysAhead?: number
  ): Promise<void> => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Check if sync is needed
      const needsSync = !ClientSyncManager.isSyncInProgress(providerId);
      
      if (needsSync) {
        setIsSyncing(true);
        options.onSyncStart?.();
        
        try {
          const didSync = await ClientSyncManager.syncProviderBeforeQuery(providerId);
          console.log(didSync ? '✅ Provider calendar synced' : '⏰ Using cached calendar data');
        } catch (syncError) {
          console.warn('⚠️ Calendar sync failed, proceeding with existing data:', syncError);
        } finally {
          setIsSyncing(false);
          options.onSyncEnd?.();
        }
      }

      // Fetch the slots
      const params = new URLSearchParams({
        providerId,
        ...(serviceType && { serviceType }),
        ...(daysAhead && { daysAhead: daysAhead.toString() })
      });

      const response = await fetch(`/api/client/open-slots?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch slots: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setSlots(data.slots || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch appointment slots';
      setError(errorMessage);
      console.error('Error fetching provider slots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const forceSync = async (providerId: string): Promise<void> => {
    if (isSyncing) return;

    setIsSyncing(true);
    options.onSyncStart?.();
    
    try {
      await ClientSyncManager.forceSyncProvider(providerId);
      console.log('✅ Force sync completed');
    } catch (syncError) {
      console.error('❌ Force sync failed:', syncError);
      throw syncError;
    } finally {
      setIsSyncing(false);
      options.onSyncEnd?.();
    }
  };

  return {
    slots,
    isLoading,
    isSyncing,
    error,
    fetchSlots,
    forceSync,
    refetch: (providerId: string, serviceType?: string, daysAhead?: number) => 
      fetchSlots(providerId, serviceType, daysAhead)
  };
}