// Booking service for customer appointments
import { LocationService } from './location';
import { prisma } from '@/lib/db';

export class BookingService {
  /**
   * Get available appointments, optionally filtered by location
   */
  static async getAvailableAppointments(locationQuery?: string) {
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        startTime: {
          gte: new Date(),
        },
        allowBookings: true,
      },
      include: {
        provider: {
          select: {
            name: true,
            title: true,
            company: true,
          },
        },
        bookings: true, // To check availability
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Filter by location if provided
    let filteredEvents = upcomingEvents;
    if (locationQuery) {
      filteredEvents = upcomingEvents.filter(event =>
        LocationService.isLocationMatch(event.location || '', locationQuery)
      );
    }

    // Calculate availability
    return filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      provider: event.provider,
      isAllDay: event.isAllDay,
      maxBookings: event.maxBookings,
      currentBookings: event.bookings.length,
      spotsAvailable: event.maxBookings - event.bookings.length,
      isAvailable: event.bookings.length < event.maxBookings,
    }));
  }

  /**
   * Create a booking for a customer
   */
  static async createBooking(data: {
    calendarEventId: string;
    customerEmail: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerPhone?: string;
    customerCity: string;
    customerState: string;
    customerZipCode?: string;
    serviceType: string;
    notes?: string;
  }) {
    // Get or create customer
    const customer = await prisma.user.upsert({
      where: { email: data.customerEmail },
      update: {
        firstName: data.customerFirstName,
        lastName: data.customerLastName,
        phone: data.customerPhone,
      },
      create: {
        email: data.customerEmail,
        firstName: data.customerFirstName,
        lastName: data.customerLastName,
        phone: data.customerPhone,
      },
    });

    // Get the calendar event
    const calendarEvent = await prisma.calendarEvent.findUnique({
      where: { id: data.calendarEventId },
      include: {
        provider: true,
        bookings: true,
      },
    });

    if (!calendarEvent) {
      throw new Error('Calendar event not found');
    }

    if (!calendarEvent.allowBookings) {
      throw new Error('Bookings not allowed for this event');
    }

    if (calendarEvent.bookings.length >= calendarEvent.maxBookings) {
      throw new Error('No spots available for this appointment');
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        customerId: customer.id,
        providerId: calendarEvent.providerId,
        calendarEventId: data.calendarEventId,
        scheduledAt: calendarEvent.startTime,
        duration: Math.floor(
          (calendarEvent.endTime.getTime() - calendarEvent.startTime.getTime()) / (1000 * 60)
        ),
        serviceType: data.serviceType,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        customer: true,
        provider: true,
        calendarEvent: true,
      },
    });

    return booking;
  }
}
