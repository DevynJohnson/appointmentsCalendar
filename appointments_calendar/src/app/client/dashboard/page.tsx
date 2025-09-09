'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ClientDashboard() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto py-8 px-4"><div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="mt-2">Loading...</p></div></div>}>
      <ClientDashboardContent />
    </Suspense>
  );
}

function ClientDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerId = searchParams.get('providerId');

  useEffect(() => {
    // Redirect to the appropriate page based on whether provider is specified
    if (providerId) {
      router.replace(`/client/booking?providerId=${providerId}`);
    } else {
      router.replace('/client/search');
    }
  }, [providerId, router]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2">Redirecting...</p>
      </div>
    </div>
  );
}
