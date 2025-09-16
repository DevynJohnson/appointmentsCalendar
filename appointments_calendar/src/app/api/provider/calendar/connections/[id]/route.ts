// API endpoint to manage individual calendar connections
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProviderAuthService } from '@/lib/provider-auth';

const prisma = new PrismaClient();

// Get connection details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params before using
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: id,
        providerId: provider.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json(connection);

  } catch (error) {
    console.error('Error fetching connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update connection settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params before using
    
    console.log('🔧 PUT request started for connection:', id);
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Provider verified:', provider.email);

    const requestBody = await request.json();
    console.log('🔧 Request body received:', requestBody);
    
    const { isActive, syncFrequency, accessToken, syncEvents, allowBookings, selectedCalendars, calendarSettings } = requestBody;
    
    console.log('🔧 PUT connection update request:', {
      id,
      isActive,
      syncFrequency,
      syncEvents,
      allowBookings,
      selectedCalendarsCount: selectedCalendars?.length,
      selectedCalendars,
      calendarSettingsKeys: calendarSettings ? Object.keys(calendarSettings) : [],
      accessTokenPresent: !!accessToken,
      accessTokenLength: accessToken?.length
    });

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: id,
        providerId: provider.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const updatedConnection = await prisma.calendarConnection.update({
      where: { id: id },
      data: {
        isActive: isActive !== undefined ? isActive : connection.isActive,
        syncFrequency: syncFrequency !== undefined ? syncFrequency : connection.syncFrequency,
        accessToken: accessToken !== undefined ? accessToken : connection.accessToken,
        syncEvents: syncEvents !== undefined ? syncEvents : connection.syncEvents,
        allowBookings: allowBookings !== undefined ? allowBookings : connection.allowBookings,
        selectedCalendars: selectedCalendars !== undefined ? selectedCalendars : connection.selectedCalendars,
        calendarSettings: calendarSettings !== undefined ? calendarSettings : connection.calendarSettings,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedConnection);

  } catch (error) {
    console.error('Error updating connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params before using
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: id,
        providerId: provider.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete all related events first
    await prisma.calendarEvent.deleteMany({
      where: { connectionId: id },
    });

    // Delete the connection
    await prisma.calendarConnection.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true, message: 'Connection deleted successfully' });

  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
