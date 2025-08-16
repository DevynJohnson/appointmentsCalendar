// Script to create a test provider account
// Run this with: npx tsx scripts/create-test-provider.ts

import { ProviderAuthService } from '../src/lib/provider-auth';

async function createTestProvider() {
  try {
    console.log('Creating test provider account...');
    
    const testProvider = await ProviderAuthService.createProvider({
      name: 'Test Provider',
      email: 'test@example.com',
      phone: '+1-555-0123',
      password: 'testpassword123',
      company: 'Test Company',
      title: 'Service Provider',
      bio: 'This is a test provider account for development and testing.',
    });

    console.log('✅ Test provider created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: testpassword123');
    console.log('🆔 Provider ID:', testProvider.id);
    console.log('\nYou can now login at: http://localhost:3000/provider/login');
    
  } catch (error) {
    console.error('❌ Failed to create test provider:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('\n📧 Test provider already exists!');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Password: testpassword123');
      console.log('\nYou can login at: http://localhost:3000/provider/login');
    }
  }
}

createTestProvider().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
