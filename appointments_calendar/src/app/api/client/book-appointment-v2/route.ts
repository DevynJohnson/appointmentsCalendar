// Enhanced booking API that handles both manual events and automatic slots
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AvailabilityService } from '@/lib/availability-service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const {
      eventId,
      providerId,
      scheduledAt,
      duration,
      customer,
      serviceType,
      notes,
      slotType = 'manual' // 'manual' or 'automatic'
    } = await request.json();

    // Validate required fields
    if (!scheduledAt || !duration || !customer || !providerId) {
      return NextResponse.json({ 
        error: 'Missing required fields: providerId, scheduledAt, duration, customer' 
      }, { status: 400 });
    }

    if (!customer.email || !customer.address || !customer.city || !customer.state) {
      return NextResponse.json({ 
        error: 'Customer information incomplete' 
      }, { status: 400 });
    }

    const appointmentStart = new Date(scheduledAt);
    const appointmentEnd = new Date(appointmentStart.getTime() + (duration * 60 * 1000));

    // Validate provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, name: true, email: true, phone: true, bufferTime: true }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    let calendarEvent = null;

    if (slotType === 'manual' && eventId) {
      // Handle manual calendar event booking
      calendarEvent = await prisma.calendarEvent.findUnique({
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

      if (appointmentStart < eventStart || appointmentEnd > eventEnd) {
        return NextResponse.json({ 
          error: 'Appointment time must be within the calendar event window' 
        }, { status: 400 });
      }
    } else if (slotType === 'automatic') {
      // Handle automatic slot booking - verify the slot is actually available
      const isValid = await AvailabilityService.isSlotAvailable(
        providerId,
        appointmentStart,
        duration
      );

      if (!isValid) {
        return NextResponse.json({ 
          error: 'Selected time slot is no longer available' 
        }, { status: 400 });
      }

      // For automatic slots, create a virtual calendar event
      calendarEvent = {
        id: 'auto-' + Date.now(), // Virtual ID
        title: 'Available Time Slot',
        location: 'To be confirmed',
        providerId: providerId,
        startTime: appointmentStart,
        endTime: appointmentEnd,
        allowBookings: true,
        maxBookings: 1,
        bookings: []
      };
    }

    // Check for scheduling conflicts with ALL bookings for this provider
    const bufferTime = provider.bufferTime || 15;
    
    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId: providerId,
        status: {
          in: ['CONFIRMED', 'PENDING']
        },
        scheduledAt: {
          gte: new Date(appointmentStart.getTime() - (2 * 60 * 60 * 1000)), // 2 hours before
          lte: new Date(appointmentEnd.getTime() + (2 * 60 * 60 * 1000)) // 2 hours after
        }
      }
    });

    const hasConflict = existingBookings.some(booking => {
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

    // Check for conflicts with calendar events (if not booking within one)
    if (slotType === 'automatic') {
      const conflictingEvents = await prisma.calendarEvent.findMany({
        where: {
          providerId: providerId,
          startTime: {
            lt: appointmentEnd
          },
          endTime: {
            gt: appointmentStart
          }
        }
      });

      if (conflictingEvents.length > 0) {
        return NextResponse.json({ 
          error: 'Appointment conflicts with existing calendar event' 
        }, { status: 400 });
      }
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
        providerId: providerId,
        calendarEventId: slotType === 'manual' ? eventId : null, // null for automatic slots
        scheduledAt: appointmentStart,
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
        slotType: slotType,
        event: {
          title: booking.calendarEvent?.title || calendarEvent?.title || 'Appointment',
          location: booking.calendarEvent?.location || calendarEvent?.location || 'To be confirmed',
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
