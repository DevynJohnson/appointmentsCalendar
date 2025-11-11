// API endpoint to verify provider authentication tokens
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const provider = await ProviderAuthService.verifyToken(token);
    
    if (!provider) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      provider: {
        id: provider.id,
        email: provider.email,
        name: provider.name,
        company: provider.company,
        website: provider.website,
        bio: provider.bio,
        phone: provider.phone,
      }
    });

  } catch (error) {
    // Only log warning for invalid/expired tokens to reduce noise in dev logs
    if (error instanceof Error && error.message.includes('Invalid or expired token')) {
      console.warn('Token verification failed - token may be expired or invalid');
    } else {
      console.error('Unexpected token verification error:', error);
    }
    return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
  }
}
