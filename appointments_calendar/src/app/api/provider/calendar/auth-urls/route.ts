// Get calendar authentication URLs
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { CalendarConnectionService } from '@/lib/calendar-connections';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 OAuth Auth URLs Request Started');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('🔐 Verifying provider token...');
    const verificationResult = await ProviderAuthService.verifyToken(token);
    console.log('✅ Provider token verified successfully');

    // Extract provider ID from the verification result
    const providerId = verificationResult.id;
    console.log('🆔 Provider ID extracted:', providerId);

    console.log('🔗 Generating OAuth URLs with provider context...');
    
    // Check for required environment variables before generating URLs
    const requiredEnvVars = [
      'OUTLOOK_CLIENT_ID', 'OUTLOOK_REDIRECT_URI',
      'TEAMS_CLIENT_ID', 'TEAMS_REDIRECT_URI', 
      'GOOGLE_CLIENT_ID', 'GOOGLE_REDIRECT_URI'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:', missingVars);
      return NextResponse.json(
        { error: `Missing environment variables: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }
    
    const authUrls = CalendarConnectionService.getAuthUrlsWithProvider(providerId);
    console.log('✅ OAuth URLs generated successfully with provider context');
    console.log('📋 URLs generated for:', Object.keys(authUrls));

    return NextResponse.json(authUrls);
  } catch (error) {
    console.error('❌ Failed to get auth URLs:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to get authentication URLs' },
      { status: 500 }
    );
  }
}
