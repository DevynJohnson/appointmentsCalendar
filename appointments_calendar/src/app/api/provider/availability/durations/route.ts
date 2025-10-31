// API endpoint for managing allowed appointment durations
import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/availability-service';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';

export async function GET(request: NextRequest) {
  try {
    const authResult = extractAndVerifyJWT(request.headers.get('authorization'));
    
    if (!authResult.success || !authResult.payload?.providerId) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const durations = await AvailabilityService.getAllowedDurations(authResult.payload.providerId);
    
    return NextResponse.json({ allowedDurations: durations });
  } catch (error) {
    console.error('Error fetching allowed durations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allowed durations' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = extractAndVerifyJWT(request.headers.get('authorization'));
    
    if (!authResult.success || !authResult.payload?.providerId) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { allowedDurations } = await request.json();
    
    if (!Array.isArray(allowedDurations) || !allowedDurations.every(d => typeof d === 'number')) {
      return NextResponse.json(
        { error: 'Invalid durations format' },
        { status: 400 }
      );
    }

    await AvailabilityService.updateAllowedDurations(authResult.payload.providerId, allowedDurations);
    
    return NextResponse.json({ 
      message: 'Allowed durations updated successfully',
      allowedDurations
    });
  } catch (error) {
    console.error('Error updating allowed durations:', error);
    return NextResponse.json(
      { error: 'Failed to update allowed durations' },
      { status: 500 }
    );
  }
}