// Microsoft Teams OAuth callback
import { NextRequest, NextResponse } from 'next/server';
import { CalendarConnectionService } from '@/lib/calendar-connections';

export async function GET(request: NextRequest) {
  console.log('👥👥👥 TEAMS OAUTH CALLBACK HIT 👥👥👥');
  console.log('Request URL:', request.url);
  
  try {
    console.log('🚀 Starting Teams OAuth processing...');
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    const params = { 
      code: code ? `${code.substring(0, 10)}...` : null, 
      state, 
      error,
      allParams: Object.fromEntries(searchParams.entries())
    };
    
    console.log('📊 Teams OAuth parameters:', params);

    // Handle OAuth error
    if (error) {
      console.error('Teams OAuth error:', error);
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=oauth_failed', request.url)
      );
    }

    // Validate required parameters
    if (!code) {
      console.error('❌ Missing authorization code');
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=missing_code', request.url)
      );
    }

    // Extract provider ID from state parameter
    let providerId: string;
    try {
      if (state) {
        const stateData = JSON.parse(decodeURIComponent(state));
        providerId = stateData.providerId;
        console.log('✅ Extracted provider ID:', providerId);
      } else {
        throw new Error('Missing state parameter');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse state parameter:', parseError);
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=invalid_state', request.url)
      );
    }

    // Connect Teams calendar using the same OAuth flow as Outlook
    console.log('🔗 Connecting Teams calendar...');
    const connection = await CalendarConnectionService.connectTeamsCalendar(providerId, code);
    
    console.log('✅ Teams calendar connected successfully:', {
      id: connection.id,
      platform: connection.platform,
      email: connection.email
    });

    // Redirect back to calendar connect page
    return NextResponse.redirect(
      new URL('/provider/calendar/connect?success=teams_connected', request.url)
    );

  } catch (error) {
    console.error('❌ Teams OAuth callback error:', error);
    
    // Redirect with error
    return NextResponse.redirect(
      new URL('/provider/calendar/connect?error=teams_connection_failed', request.url)
    );
  }
}
