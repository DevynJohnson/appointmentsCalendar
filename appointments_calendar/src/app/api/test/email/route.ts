import { NextRequest, NextResponse } from 'next/server';
import { MailerooEmailService } from '@/lib/resend-email-service';

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    const emailService = new MailerooEmailService();
    
    // Send a simple test email
    const success = await emailService.sendPasswordResetEmail(
      testEmail,
      'Test User',
      'https://example.com/test-reset-link'
    );

    if (success) {
      return NextResponse.json({
        message: 'Test email sent successfully!',
        service: 'Maileroo',
        recipient: testEmail
      });
    } else {
      throw new Error('Failed to send test email');
    }

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