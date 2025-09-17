import { prisma } from '@/lib/db';

// Provider service functions
export class ProviderService {
  static async createProvider(data: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    title?: string;
    bio?: string;
    defaultBookingDuration?: number;
    bufferTime?: number;
    advanceBookingDays?: number;
  }) {
    return await prisma.provider.create({
      data: {
        ...data,
        defaultBookingDuration: data.defaultBookingDuration || 60,
        bufferTime: data.bufferTime || 15,
        advanceBookingDays: data.advanceBookingDays || 30,
      },
    });
  }

  static async getProvider(id: string) {
    return await prisma.provider.findUnique({
      where: { id },
      include: {
        calendarConnections: true,
        calendarEvents: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });
  }

  static async updateProviderSettings(id: string, settings: {
    defaultBookingDuration?: number;
    bufferTime?: number;
    advanceBookingDays?: number;
    bio?: string;
  }) {
    return await prisma.provider.update({
      where: { id },
      data: settings,
    });
  }
}
