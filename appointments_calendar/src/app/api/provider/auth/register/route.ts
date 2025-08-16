// Provider registration API route
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, company, title, bio } = await request.json();

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, email, phone, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const provider = await ProviderAuthService.createProvider({
      name,
      email,
      phone,
      password,
      company,
      title,
      bio,
    });

    return NextResponse.json({
      message: 'Provider account created successfully',
      provider,
    });
  } catch (error) {
    console.error('Provider registration error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
