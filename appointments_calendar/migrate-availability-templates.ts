// Migration script to create default availability templates for existing providers
import { PrismaClient } from '@prisma/client';
import { AvailabilityService } from './src/lib/availability-service';

const prisma = new PrismaClient();

async function migrateExistingProviders() {
  console.log('🔄 Starting migration: Creating default availability templates for existing providers...');

  try {
    // Find all providers without availability templates
    const providersWithoutTemplates = await prisma.provider.findMany({
      where: {
        availabilityTemplates: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    console.log(`📊 Found ${providersWithoutTemplates.length} providers without availability templates`);

    for (const provider of providersWithoutTemplates) {
      try {
        console.log(`🏥 Creating default template for provider: ${provider.name} (${provider.email})`);
        
        const template = await AvailabilityService.createDefaultTemplate(provider.id);
        
        console.log(`✅ Created template "${template.name}" for ${provider.name}`);
        console.log(`   - Time slots: ${template.timeSlots.length}`);
        console.log(`   - Assignments: ${template.assignments.length}`);
        
      } catch (error) {
        console.error(`❌ Failed to create template for provider ${provider.name}:`, error);
      }
    }

    // Verify migration results
    const allProviders = await prisma.provider.findMany({
      include: {
        availabilityTemplates: {
          where: { isActive: true },
          include: {
            timeSlots: true,
            assignments: true
          }
        }
      }
    });

    console.log('\n📋 Migration Summary:');
    console.log(`Total providers: ${allProviders.length}`);
    
    let providersWithTemplates = 0;
    let totalTemplates = 0;
    let totalTimeSlots = 0;

    for (const provider of allProviders) {
      if (provider.availabilityTemplates.length > 0) {
        providersWithTemplates++;
        totalTemplates += provider.availabilityTemplates.length;
        totalTimeSlots += provider.availabilityTemplates.reduce(
          (sum, template) => sum + template.timeSlots.length, 
          0
        );
      }
    }

    console.log(`Providers with templates: ${providersWithTemplates}/${allProviders.length}`);
    console.log(`Total templates created: ${totalTemplates}`);
    console.log(`Total time slots created: ${totalTimeSlots}`);

    if (providersWithTemplates === allProviders.length) {
      console.log('\n🎉 Migration completed successfully! All providers now have availability templates.');
    } else {
      console.log(`\n⚠️ Migration incomplete. ${allProviders.length - providersWithTemplates} providers still need templates.`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateExistingProviders()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateExistingProviders };