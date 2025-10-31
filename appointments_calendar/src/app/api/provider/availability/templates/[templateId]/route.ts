// API endpoint for individual template operations
import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/availability-service';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';

interface RouteParams {
  params: {
    templateId: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = extractAndVerifyJWT(request.headers.get('authorization'));
    
    if (!authResult.success || !authResult.payload?.providerId) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    await AvailabilityService.deleteTemplate(params.templateId);
    
    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting availability template:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = extractAndVerifyJWT(request.headers.get('authorization'));
    
    if (!authResult.success || !authResult.payload?.providerId) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { action, ...data } = await request.json();

    switch (action) {
      case 'setDefault':
        await AvailabilityService.setDefaultTemplate(params.templateId);
        return NextResponse.json({ message: 'Template set as default' });
      
      case 'assign':
        await AvailabilityService.assignTemplate(
          params.templateId,
          new Date(data.startDate),
          data.endDate ? new Date(data.endDate) : undefined
        );
        return NextResponse.json({ message: 'Template assigned to date range' });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing template action:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform action';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}