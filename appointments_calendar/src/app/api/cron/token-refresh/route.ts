// OPTIONAL: External cron endpoint for token maintenance
// This endpoint is OPTIONAL - token maintenance already runs automatically 
// in background during high-traffic endpoints like /api/client/search-providers
// Only use this if you want additional scheduled maintenance via external cron services

import { NextResponse } from 'next/server';
import { TokenMaintenanceService } from '@/lib/token-maintenance';

export async function GET(request: Request) {
  try {
    // Verify this is being called by an authorized source
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      console.log('⚠️ Token maintenance called without proper authentication');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Starting scheduled token maintenance...');
    
    // Run maintenance
    const refreshResults = await TokenMaintenanceService.refreshExpiringTokens();
    const cleanupResults = await TokenMaintenanceService.cleanupExpiredConnections();
    const healthStats = await TokenMaintenanceService.getTokenHealthStats();
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        tokensRefreshed: refreshResults.successCount,
        refreshFailures: refreshResults.failureCount,
        connectionsDisabled: cleanupResults.disabledCount,
        healthScore: healthStats.healthScore
      },
      details: {
        refresh: refreshResults,
        cleanup: cleanupResults,
        health: healthStats
      }
    };

    console.log('✅ Scheduled token maintenance completed:', result.summary);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Scheduled token maintenance failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}