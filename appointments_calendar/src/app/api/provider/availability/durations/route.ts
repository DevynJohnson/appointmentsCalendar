// API endpoint for managing allowed appointment durations
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

    const provider = await prisma.provider.findUnique({
      where: { id: authResult.payload.providerId },
      select: { allowedDurations: true }
    });
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({ allowedDurations: provider.allowedDurations });
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

    const updated = await prisma.provider.update({
      where: { id: authResult.payload.providerId },
      data: { allowedDurations }
    });
    return NextResponse.json({ 
      message: 'Allowed durations updated successfully',
      allowedDurations: updated.allowedDurations
    });
  } catch (error) {
    console.error('Error updating allowed durations:', error);
    return NextResponse.json(
      { error: 'Failed to update allowed durations' },
      { status: 500 }
    );
  }
}