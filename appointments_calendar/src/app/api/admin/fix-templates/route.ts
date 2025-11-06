import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/availability-service';

async function fixTemplates() {
  try {
    // For security, you might want to add admin authentication here
    // For now, just run the fix
    
    await AvailabilityService.fixAllMultipleDefaults();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Fixed multiple default templates across all providers' 
    });
  } catch (error) {
    console.error('Error fixing templates:', error);
    return NextResponse.json(
      { error: 'Failed to fix templates' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return fixTemplates();
}

export async function GET() {
  return fixTemplates();
}