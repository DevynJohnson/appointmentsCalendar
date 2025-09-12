// API endpoint for clients to book appointments
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const {
      eventId,
      scheduledAt,
      duration,
      customer,
      serviceType,
      notes
    } = await request.json();

    // Validate required fields
    if (!eventId || !scheduledAt || !duration || !customer) {
      return NextResponse.json({ 
        error: 'Missing required fields: eventId, scheduledAt, duration, customer' 
      }, { status: 400 });
    }

    if (!customer.email || !customer.address || !customer.city || !customer.state) {
      return NextResponse.json({ 
        error: 'Customer information incomplete' 
      }, { status: 400 });
    }

    // Get the calendar event
    const calendarEvent = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING']
            }
          }
        }
      }
    });

    if (!calendarEvent) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    if (!calendarEvent.allowBookings) {
      return NextResponse.json({ error: 'Bookings not allowed for this event' }, { status: 400 });
    }

    // Check if event has available slots
    if (calendarEvent.bookings.length >= calendarEvent.maxBookings) {
      return NextResponse.json({ error: 'No available slots for this event' }, { status: 400 });
    }

    // Validate the scheduled time is within the event window
    const eventStart = new Date(calendarEvent.startTime);
    const eventEnd = new Date(calendarEvent.endTime);
    const appointmentStart = new Date(scheduledAt);
    const appointmentEnd = new Date(appointmentStart.getTime() + (duration * 60 * 1000));

    if (appointmentStart < eventStart || appointmentEnd > eventEnd) {
      return NextResponse.json({ 
        error: 'Appointment time must be within the calendar event window' 
      }, { status: 400 });
    }

    // Check for scheduling conflicts with existing bookings
    const provider = await prisma.provider.findUnique({
      where: { id: calendarEvent.providerId },
      select: { bufferTime: true }
    });

    const bufferTime = provider?.bufferTime || 15;

    const hasConflict = calendarEvent.bookings.some(booking => {
      const existingStart = new Date(booking.scheduledAt);
      const existingEnd = new Date(existingStart.getTime() + (booking.duration * 60 * 1000));
      
      const bufferStart = new Date(existingStart.getTime() - (bufferTime * 60 * 1000));
      const bufferEnd = new Date(existingEnd.getTime() + (bufferTime * 60 * 1000));

      return (
        (appointmentStart >= bufferStart && appointmentStart < bufferEnd) ||
        (appointmentEnd > bufferStart && appointmentEnd <= bufferEnd) ||
        (appointmentStart <= bufferStart && appointmentEnd >= bufferEnd)
      );
    });

    if (hasConflict) {
      return NextResponse.json({ 
        error: 'Appointment conflicts with existing booking (including buffer time)' 
      }, { status: 400 });
    }

    // Create or find the customer
    let user = await prisma.user.findUnique({
      where: { email: customer.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
        }
      });
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        customerId: user.id,
        providerId: calendarEvent.providerId,
        calendarEventId: eventId,
        scheduledAt: new Date(scheduledAt),
        duration: duration,
        status: 'PENDING',
        customerAddress: customer.address,
        customerCity: customer.city,
        customerState: customer.state,
        customerZipCode: customer.zipCode,
        serviceType: serviceType || 'consultation',
        notes: notes,
      },
      include: {
        calendarEvent: {
          select: {
            title: true,
            location: true,
          }
        },
        provider: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        duration: booking.duration,
        status: booking.status,
        serviceType: booking.serviceType,
        event: {
          title: booking.calendarEvent.title,
          location: booking.calendarEvent.location,
        },
        provider: {
          name: booking.provider.name,
          email: booking.provider.email,
          phone: booking.provider.phone,
        }
      }
    });

  } catch (error) {
    console.error('Failed to create booking:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
