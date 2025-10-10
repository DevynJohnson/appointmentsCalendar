import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MailerooEmailService } from '@/lib/resend-email-service';
import jwt from 'jsonwebtoken';

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
      // Generate reset token (expires in 1 hour)
      const resetToken = jwt.sign(
        { providerId: provider.id, email: provider.email, type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Send reset email
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://appointmentscalendar.onrender.com';
      const resetUrl = `${baseUrl}/provider/reset-password?token=${resetToken}`;

      const emailService = new MailerooEmailService();
      await emailService.sendPasswordResetEmail(provider.email, provider.name, resetUrl);
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