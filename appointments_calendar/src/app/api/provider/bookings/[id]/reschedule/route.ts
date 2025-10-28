// API endpoint for rescheduling a booking
import { NextRequest, NextResponse } from 'next/server';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/maileroo-email-service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Extract and verify the JWT token
    const authHeader = request.headers.get('Authorization');
    const jwtResult = extractAndVerifyJWT(authHeader);
    
    if (!jwtResult.success) {
      return NextResponse.json(
        { error: jwtResult.error },
        { status: 401 }
      );
    }

    const providerId = jwtResult.payload!.providerId;
    const params = await context.params;
    const bookingId = params.id;

    // Parse request body for new datetime (optional for now)
    const body = await request.json().catch(() => ({}));
    const { newDateTime } = body;

    // Find the booking and verify it belongs to this provider
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        providerId: providerId,
      },
      include: {
        customer: true,
        provider: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      );
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot reschedule a cancelled booking' },
        { status: 400 }
      );
    }

    // For now, just mark as RESCHEDULED and let provider handle new scheduling
    // In a full implementation, this would include date/time selection
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: 'RESCHEDULED',
        updatedAt: new Date(),
        ...(newDateTime && { scheduledAt: new Date(newDateTime) }),
      },
      include: {
        customer: true,
        provider: true,
      },
    });

    // Send reschedule notification to customer
    try {
      const bookingDetails = {
        id: updatedBooking.id,
        customerName: `${updatedBooking.customer.firstName || ''} ${updatedBooking.customer.lastName || ''}`.trim() || 'Valued Customer',
        customerEmail: updatedBooking.customer.email,
        providerName: updatedBooking.provider.name,
        providerEmail: updatedBooking.provider.email,
        scheduledAt: booking.scheduledAt, // Original scheduled time
        duration: updatedBooking.duration,
        serviceType: updatedBooking.serviceType,
        notes: updatedBooking.notes || undefined,
      };
      
      await emailService.sendBookingReschedule(bookingDetails, newDateTime ? new Date(newDateTime) : undefined);
    } catch (error) {
      console.error('Failed to send reschedule email:', error);
      // Don't fail the reschedule if email sending fails
    }

    return NextResponse.json({
      success: true,
      message: 'Booking marked for rescheduling',
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        scheduledAt: updatedBooking.scheduledAt,
        customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`,
        providerName: updatedBooking.provider.name,
      }
    });

  } catch (error) {
    console.error('Error rescheduling booking:', error);
    return NextResponse.json(
      { error: 'Failed to reschedule booking' },
      { status: 500 }
    );
  }
}