import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function DELETE(request: NextRequest) {
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

    const { currentPassword } = await request.json();

    // Validate input
    if (!currentPassword) {
      return NextResponse.json({ 
        error: 'Current password is required' 
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

    // Delete account and all related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all bookings (this will also delete customer data)
      await tx.booking.deleteMany({
        where: { providerId: provider.id }
      });

      // Delete all calendar events
      await tx.calendarEvent.deleteMany({
        where: { providerId: provider.id }
      });

      // Delete all calendar connections
      await tx.calendarConnection.deleteMany({
        where: { providerId: provider.id }
      });

      // Delete all availability assignments (through template relationship)
      await tx.templateAssignment.deleteMany({
        where: { 
          template: {
            providerId: provider.id
          }
        }
      });

      // Delete all availability templates
      await tx.availabilityTemplate.deleteMany({
        where: { providerId: provider.id }
      });

      // Delete all provider locations
      await tx.providerLocation.deleteMany({
        where: { providerId: provider.id }
      });

      // Finally, delete the provider account
      await tx.provider.delete({
        where: { id: provider.id }
      });
    });

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}