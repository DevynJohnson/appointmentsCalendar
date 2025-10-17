import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/maileroo-email-service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find provider by email
    const provider = await prisma.provider.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if provider exists
    if (provider) {
      // Send reset email using the new email service
      await emailService.sendPasswordReset(provider.id, provider.email, provider.name);
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}