// Security audit script to identify potential provider data leakage issues
import { NextRequest, NextResponse } from 'next/server';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (you might want to add proper admin authentication)
    const authHeader = request.headers.get('authorization');
    const jwtResult = extractAndVerifyJWT(authHeader);
    
    if (!jwtResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Security audit checks
    const auditResults = {
      timestamp: new Date().toISOString(),
      checks: {
        duplicateEmails: await checkDuplicateProviderEmails(),
        orphanedCalendarConnections: await checkOrphanedCalendarConnections(),
        crossProviderDataLeaks: await checkCrossProviderDataLeaks(),
        invalidProviderReferences: await checkInvalidProviderReferences(),
        suspiciousConnections: await checkSuspiciousConnections()
      }
    };

    return NextResponse.json(auditResults);

  } catch (error) {
    console.error('Security audit error:', error);
    return NextResponse.json(
      { error: 'Security audit failed' },
      { status: 500 }
    );
  }
}

// Check for duplicate provider emails (should be impossible due to unique constraint)
async function checkDuplicateProviderEmails() {
  const duplicates = await prisma.provider.groupBy({
    by: ['email'],
    having: {
      email: {
        _count: {
          gt: 1
        }
      }
    },
    _count: {
      email: true
    }
  });

  return {
    found: duplicates.length > 0,
    count: duplicates.length,
    emails: duplicates.map(d => d.email)
  };
}

// Check for calendar connections without valid provider references
async function checkOrphanedCalendarConnections() {
  const orphaned = await prisma.calendarConnection.findMany({
    where: {
      NOT: {
        provider: {
          id: {
            not: undefined
          }
        }
      }
    },
    select: {
      id: true,
      providerId: true,
      platform: true,
      email: true,
      createdAt: true
    }
  });

  return {
    found: orphaned.length > 0,
    count: orphaned.length,
    connections: orphaned
  };
}

// Check for potential cross-provider data leaks
async function checkCrossProviderDataLeaks() {
  // Check if any calendar connections have mismatched provider emails
  const mismatchedConnections = await prisma.calendarConnection.findMany({
    include: {
      provider: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  const mismatches = mismatchedConnections.filter(conn => 
    conn.provider && conn.email && 
    conn.email.toLowerCase() !== conn.provider.email.toLowerCase()
  );

  return {
    found: mismatches.length > 0,
    count: mismatches.length,
    details: mismatches.map(m => ({
      connectionId: m.id,
      connectionEmail: m.email,
      providerId: m.providerId,
      providerEmail: m.provider?.email,
      platform: m.platform
    }))
  };
}

// Check for invalid provider references in related tables
async function checkInvalidProviderReferences() {
  const issues = [];

  // Check bookings with invalid provider references
  const invalidBookings = await prisma.booking.findMany({
    where: {
      NOT: {
        provider: {
          id: {
            not: undefined
          }
        }
      }
    },
    select: {
      id: true,
      providerId: true
    }
  });

  if (invalidBookings.length > 0) {
    issues.push({
      table: 'bookings',
      count: invalidBookings.length,
      records: invalidBookings
    });
  }

  // Check calendar events with invalid provider references
  const invalidEvents = await prisma.calendarEvent.findMany({
    where: {
      NOT: {
        provider: {
          id: {
            not: undefined
          }
        }
      }
    },
    select: {
      id: true,
      providerId: true
    }
  });

  if (invalidEvents.length > 0) {
    issues.push({
      table: 'calendarEvents',
      count: invalidEvents.length,
      records: invalidEvents
    });
  }

  return {
    found: issues.length > 0,
    issues
  };
}

// Check for suspicious connection patterns that might indicate security issues
async function checkSuspiciousConnections() {
  const suspiciousPatterns = [];

  // Check for multiple providers using the same calendar email
  const emailGroups = await prisma.calendarConnection.groupBy({
    by: ['email'],
    having: {
      email: {
        _count: {
          gt: 1
        }
      }
    },
    _count: {
      email: true,
      providerId: true
    }
  });

  const sharedEmails = [];
  for (const group of emailGroups) {
    const connections = await prisma.calendarConnection.findMany({
      where: { email: group.email },
      select: {
        id: true,
        providerId: true,
        platform: true,
        createdAt: true,
        provider: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    const uniqueProviders = new Set(connections.map(c => c.providerId));
    if (uniqueProviders.size > 1) {
      sharedEmails.push({
        calendarEmail: group.email,
        providerCount: uniqueProviders.size,
        connections: connections
      });
    }
  }

  if (sharedEmails.length > 0) {
    suspiciousPatterns.push({
      type: 'shared_calendar_emails',
      description: 'Same calendar email used by multiple providers',
      count: sharedEmails.length,
      details: sharedEmails
    });
  }

  return {
    found: suspiciousPatterns.length > 0,
    patterns: suspiciousPatterns
  };
}