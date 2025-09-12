/**
 * Simple database connection test script
 * Run this after reactivating your Supabase project
 */

const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Simple connection test
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📊 Database tables found:', tables.length);
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found - you may need to run migrations');
    } else {
      console.log('✅ Database is ready to use!');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('Tenant or user not found')) {
      console.log('\n🔄 This means your Supabase project is still paused.');
      console.log('👉 Go to https://supabase.com/dashboard');
      console.log('👉 Find your project and click "Resume Project"');
      console.log('👉 Wait 2-5 minutes and run this test again');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
