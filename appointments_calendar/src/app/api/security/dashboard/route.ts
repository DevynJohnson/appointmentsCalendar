import { NextRequest, NextResponse } from 'next/server';
import { getSecurityMetrics, getIPEvents, checkIPBlocking } from '@/lib/security-monitor';

/**
 * Security Dashboard API
 * Provides real-time security metrics and monitoring data
 * Requires admin authentication in production
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';
    const windowMinutes = parseInt(searchParams.get('window') || '60');
    const ip = searchParams.get('ip');
    
    // TODO: Add admin authentication check here
    // const user = await authenticateAdmin(request);
    // if (!user || !user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }
    
    switch (action) {
      case 'metrics':
        const metrics = getSecurityMetrics(windowMinutes);
        return NextResponse.json({
          metrics: {
            ...metrics,
            uniqueIPs: metrics.uniqueIPs.size, // Convert Set to number
          },
          timestamp: new Date().toISOString(),
        });
      
      case 'ip-events':
        if (!ip) {
          return NextResponse.json(
            { error: 'IP parameter required for ip-events action' },
            { status: 400 }
          );
        }
        
        const events = getIPEvents(ip, windowMinutes);
        const blockInfo = checkIPBlocking(ip);
        
        return NextResponse.json({
          ip,
          events,
          blockInfo,
          eventCount: events.length,
          timeWindow: `${windowMinutes} minutes`,
        });
      
      case 'block-status':
        if (!ip) {
          return NextResponse.json(
            { error: 'IP parameter required for block-status action' },
            { status: 400 }
          );
        }
        
        const blockStatus = checkIPBlocking(ip);
        return NextResponse.json({
          ip,
          ...blockStatus,
          timestamp: new Date().toISOString(),
        });
      
      case 'health':
        return NextResponse.json({
          status: 'healthy',
          monitoring: 'active',
          timestamp: new Date().toISOString(),
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: metrics, ip-events, block-status, health' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}