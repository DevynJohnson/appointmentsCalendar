// API endpoint for managing availability templates
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

    const templates = await AvailabilityService.getProviderTemplates(authResult.payload.providerId);
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching availability templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
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

    const settings = await request.json();
    
    const template = await AvailabilityService.saveTemplate(
      authResult.payload.providerId,
      settings
    );
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error saving availability template:', error);
    return NextResponse.json(
      { error: 'Failed to save template' },
      { status: 500 }
    );
  }
}