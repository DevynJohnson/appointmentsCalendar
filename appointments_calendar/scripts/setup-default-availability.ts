// Setup script to create default availability templates for existing providers
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDefaultAvailability() {
  console.log('Setting up default availability templates for existing providers...');

  try {
    // Get all providers
    const providers = await prisma.provider.findMany({
      select: { id: true, name: true, email: true },
    });

    console.log(`Found ${providers.length} providers to setup.`);

    for (const provider of providers) {
      console.log(`Setting up availability for ${provider.name} (${provider.email})`);

      // Check if provider already has templates
      const existingTemplates = await prisma.availabilityTemplate.count({
        where: { providerId: provider.id },
      });

      if (existingTemplates > 0) {
        console.log(`  - Provider already has ${existingTemplates} template(s), skipping.`);
        continue;
      }

      // Create default template
      const template = await prisma.availabilityTemplate.create({
        data: {
          providerId: provider.id,
          name: 'Default Schedule',
          isDefault: true,
          isActive: true,
          timeSlots: {
            create: [
              // Monday
              { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', isEnabled: true },
              // Tuesday
              { dayOfWeek: 2, startTime: '08:00', endTime: '18:00', isEnabled: true },
              // Wednesday
              { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isEnabled: true },
              // Thursday
              { dayOfWeek: 4, startTime: '08:00', endTime: '18:00', isEnabled: true },
              // Friday
              { dayOfWeek: 5, startTime: '08:00', endTime: '18:00', isEnabled: true },
            ],
          },
          assignments: {
            create: {
              startDate: new Date(),
              endDate: null, // Indefinite
            },
          },
        },
      });

      console.log(`  - Created default template (${template.id})`);
    }

    console.log('✅ Default availability setup complete!');
  } catch (error) {
    console.error('❌ Error setting up default availability:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupDefaultAvailability();