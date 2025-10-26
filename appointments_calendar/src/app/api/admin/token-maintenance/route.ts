import { NextResponse } from 'next/server';
import { TokenMaintenanceService } from '@/lib/token-maintenance';

export async function POST() {
  try {
    console.log('🔄 Starting proactive token refresh maintenance...');
    
    // Refresh expiring tokens
    const refreshResults = await TokenMaintenanceService.refreshExpiringTokens();
    
    // Clean up expired connections
    const cleanupResults = await TokenMaintenanceService.cleanupExpiredConnections();
    
    // Get health statistics
    const healthStats = await TokenMaintenanceService.getTokenHealthStats();
    
    console.log(`✅ Token maintenance completed: ${refreshResults.successCount}/${refreshResults.totalChecked} tokens refreshed, ${cleanupResults.disabledCount} connections cleaned up`);
    
    return NextResponse.json({
      success: true,
      message: 'Token maintenance completed successfully',
      refresh: {
        totalChecked: refreshResults.totalChecked,
        successful: refreshResults.successCount,
        failed: refreshResults.failureCount
      },
      cleanup: {
        disabled: cleanupResults.disabledCount
      },
      health: healthStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Token maintenance failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Token maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just return health statistics for monitoring
    const healthStats = await TokenMaintenanceService.getTokenHealthStats();
    
    return NextResponse.json({
      success: true,
      health: healthStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to get token health stats:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get token health statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}