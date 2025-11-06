import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify provider authentication
    const provider = await ProviderAuthService.verifyToken(token);
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newEmail, currentPassword } = await request.json();

    // Validate input
    if (!newEmail || !currentPassword) {
      return NextResponse.json({ 
        error: 'New email and current password are required' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Get current provider data
    const currentProvider = await prisma.provider.findUnique({
      where: { id: provider.id }
    });

    if (!currentProvider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, currentProvider.passwordHash || '');
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Current password is incorrect' 
      }, { status: 400 });
    }

    // Check if new email is already in use
    const existingProvider = await prisma.provider.findUnique({
      where: { email: newEmail }
    });

    if (existingProvider) {
      return NextResponse.json({ 
        error: 'Email address is already in use' 
      }, { status: 400 });
    }

    // Update email
    await prisma.provider.update({
      where: { id: provider.id },
      data: { email: newEmail }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Email updated successfully' 
    });

  } catch (error) {
    console.error('Email update error:', error);
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    );
  }
}