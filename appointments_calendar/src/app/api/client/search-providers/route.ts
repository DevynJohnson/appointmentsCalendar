// API endpoint for searching providers
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SearchConditions {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    email?: { contains: string; mode: 'insensitive' };
    company?: { contains: string; mode: 'insensitive' };
    bio?: { contains: string; mode: 'insensitive' };
  }>;
  city?: { contains: string; mode: 'insensitive' };
  state?: { contains: string; mode: 'insensitive' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const city = searchParams.get('city')?.trim();
    const state = searchParams.get('state')?.trim();
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build search conditions
    const whereConditions: SearchConditions = {};

    if (query) {
      whereConditions.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { company: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (city) {
      whereConditions.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      whereConditions.state = { contains: state, mode: 'insensitive' };
    }

    const providers = await prisma.provider.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        bio: true,
        phone: true,
        title: true,
        website: true,
        defaultBookingDuration: true,
        _count: {
          select: {
            calendarEvents: {
              where: {
                allowBookings: true,
                endTime: {
                  gte: new Date()
                }
              }
            }
          }
        }
      },
      take: limit,
      orderBy: [
        { company: 'asc' },
        { name: 'asc' }
      ]
    });

    // Get recent booking count for each provider
    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const recentBookings = await prisma.booking.count({
          where: {
            providerId: provider.id,
            scheduledAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        });

        return {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          company: provider.company,
          bio: provider.bio,
          phone: provider.phone,
          title: provider.title,
          website: provider.website,
          defaultBookingDuration: provider.defaultBookingDuration,
          stats: {
            availableEvents: provider._count.calendarEvents,
            recentBookings
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      providers: providersWithStats,
      total: providersWithStats.length
    });

  } catch (error) {
    console.error('Failed to search providers:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search providers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
