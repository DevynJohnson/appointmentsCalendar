// API endpoint for managing specific template assignments
import { NextRequest, NextResponse } from 'next/server';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const authResult = extractAndVerifyJWT(request.headers.get('authorization'));
    
    if (!authResult.success || !authResult.payload?.providerId) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { assignmentId } = await context.params;

    // Verify the assignment belongs to this provider
    const assignment = await prisma.templateAssignment.findFirst({
      where: {
        id: assignmentId,
        template: { providerId: authResult.payload.providerId },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    await prisma.templateAssignment.delete({
      where: { id: assignmentId },
    });
    
    return NextResponse.json({ 
      message: 'Template assignment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting template assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete template assignment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const authResult = extractAndVerifyJWT(request.headers.get('authorization'));
    
    if (!authResult.success || !authResult.payload?.providerId) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { assignmentId } = await context.params;
    const { startDate, endDate } = await request.json();

    // Verify the assignment belongs to this provider
    const assignment = await prisma.templateAssignment.findFirst({
      where: {
        id: assignmentId,
        template: { providerId: authResult.payload.providerId },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const updatedAssignment = await prisma.templateAssignment.update({
      where: { id: assignmentId },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        template: {
          select: { name: true },
        },
      },
    });
    
    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error('Error updating template assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update template assignment' },
      { status: 500 }
    );
  }
}