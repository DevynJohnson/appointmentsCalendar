import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security-headers';
import { cookies } from 'next/headers';

/**
 * Generate CSRF token for client-side requests
 */
export async function GET() {
  try {
    const csrfToken = generateCSRFToken();
    
    // Set CSRF token as HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
    return NextResponse.json({ 
      csrfToken,
      message: 'CSRF token generated successfully' 
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}