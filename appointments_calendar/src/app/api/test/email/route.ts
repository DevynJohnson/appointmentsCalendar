import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/maileroo-email-service';

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Send a simple test email using account verification as test
    await emailService.sendAccountVerification(
      'test-provider-id',
      testEmail,
      'Test User'
    );

    return NextResponse.json({
      message: 'Test email sent successfully!',
      service: 'Maileroo',
      recipient: testEmail
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}