#!/usr/bin/env ts-node

/**
 * Test script to verify all calendar connections are working
 * This tests the actual calendar sync functionality without requiring new OAuth
 */

import { PrismaClient } from '@prisma/client';
import { CalendarSyncService } from '../src/lib/calendar-sync';

const prisma = new PrismaClient();

async function testCalendarConnections() {
  console.log('🔄 Testing Calendar Connections...\n');

  try {
    // Get all active connections
    const connections = await prisma.calendarConnection.findMany({
      where: { isActive: true },
      include: { provider: true },
    });

    console.log(`Found ${connections.length} active connections:\n`);

    for (const connection of connections) {
      console.log(`📅 ${connection.platform} - ${connection.email}`);
      console.log(`   Provider: ${connection.provider.name}`);
      console.log(`   Last Sync: ${connection.lastSyncAt || 'Never'}`);
      console.log(`   Token Expiry: ${connection.tokenExpiry || 'N/A'}`);
      console.log(`   Status: ${connection.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log('');
    }

    // Test sync for the first provider (should have all connections)
    if (connections.length > 0) {
      const providerId = connections[0].providerId;
      console.log(`🔄 Testing sync for provider: ${connections[0].provider.name}\n`);

      try {
        const results = await CalendarSyncService.syncAllCalendars(providerId);
        
        console.log('Sync Results:');
        results.forEach(result => {
          const status = result.success ? '✅' : '❌';
          const events = 'eventsProcessed' in result ? result.eventsProcessed : 0;
          console.log(`  ${status} ${result.platform}: ${events} events processed`);
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
          if ('note' in result && result.note) {
            console.log(`     Note: ${result.note}`);
          }
        });
      } catch (error) {
        console.error('❌ Sync test failed:', error);
      }
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCalendarConnections()
  .then(() => {
    console.log('\n✅ Calendar connection test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
