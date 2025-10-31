// API endpoint for managing template assignments
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

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let assignments;

    if (templateId) {
      assignments = await AvailabilityService.getTemplateAssignments(templateId);
    } else if (startDate && endDate) {
      assignments = await AvailabilityService.getAssignmentsInDateRange(
        authResult.payload.providerId,
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      assignments = await AvailabilityService.getAllAssignmentsForProvider(authResult.payload.providerId);
    }
    
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching template assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = extractAndVerifyJWT(request.headers.get('authorization'));
    
    if (!authResult.success || !authResult.payload?.providerId) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { templateId, startDate, endDate } = await request.json();
    
    if (!templateId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Template ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    const assignment = await AvailabilityService.assignTemplate(
      templateId,
      new Date(startDate),
      new Date(endDate)
    );
    
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating template assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create template assignment' },
      { status: 500 }
    );
  }
}