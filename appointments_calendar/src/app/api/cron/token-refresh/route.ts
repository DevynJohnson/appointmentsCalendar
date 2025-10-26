// Cron-style scheduled maintenance for token refresh
// This can be called by external cron services like Vercel Cron or GitHub Actions

import { NextResponse } from 'next/server';
import { TokenMaintenanceService } from '@/lib/token-maintenance';

export async function GET() {
  try {
    // Verify this is being called by an authorized source
    const authHeader = process.env.CRON_SECRET;
    
    if (!authHeader) {
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