import { GelatoTrackingApp } from './gelato-app.js';
import { DateFiller } from './date-filler.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point for the Gelato Tracking Application
 */
async function main(): Promise<void> {
  try {
    console.log('🍦 Yeah Gelato Flavor Tracker');
    console.log('============================');
    console.log('Automatically tracks daily gelato flavors from Telegram to Google Sheets\n');
    
    logger.info('🚀 Starting Gelato Tracking Application...');
    
    // Create the application
    const app = new GelatoTrackingApp();
    logger.info('✅ Created GelatoTrackingApp instance');
    
    // Start the application (this will initialize everything)
    await app.start();
    logger.info('✅ Application started successfully');
    
    // Fill missing dates after startup
    logger.info('🔍 Checking for missing dates after startup...');
    
    try {
      const dateFiller = new DateFiller(app.getSheetsIntegration());
      logger.info('✅ DateFiller instance created');
      
      const missingDates = await dateFiller.fillMissingDates();
      logger.info(`✅ fillMissingDates completed, found ${missingDates.length} missing dates`);
      
      if (missingDates.length > 0) {
        logger.info(`📝 Automatically filled ${missingDates.length} missing dates:`);
        missingDates.forEach(dateInfo => {
          logger.info(`   📅 ${dateInfo.date} (${dateInfo.dayOfWeek})`);
        });
        logger.info('💡 These dates are now available for manual flavor data entry');
      } else {
        logger.info('✅ No missing dates found - spreadsheet is up to date!');
      }
      
      // Show current spreadsheet status
      const summary = await dateFiller.getDateCoverageSummary();
      logger.info(`📊 Spreadsheet Status: ${summary.totalDates} total dates, ${summary.filledDates} filled, ${summary.emptyDates} empty`);
      
    } catch (error) {
      logger.warn('⚠️ Could not fill missing dates on startup:', error);
      logger.info('📱 Continuing with normal Telegram monitoring...');
    }
    
    // Application is already running - just log status
    logger.info('� Gelato tracker is now monitoring for daily flavor updates...');
    
    // Log application statistics periodically
    const statsInterval = setInterval(() => {
      const stats = app.getStats();
      logger.info(`📊 App Status - Running: ${stats.isRunning}, Processed: ${stats.processedMessages} messages, Filter Rules: ${stats.filterRules}`);
    }, 300000); // Every 5 minutes
    
    // Handle graceful shutdown
    const shutdown = async () => {
      clearInterval(statsInterval);
      await app.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    logger.error('💥 Failed to start gelato tracking application:', error);
    console.error('\n❌ Startup failed! Check your configuration:');
    console.error('   1. Telegram bot token (TELEGRAM_BOT_TOKEN)');
    console.error('   2. Channel access (@yeahgelato)');
    console.error('   3. Google Sheets credentials (GOOGLE_CREDENTIALS_JSON)');
    console.error('   4. Run: npm run test:telegram to diagnose issues\n');
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error('🚨 Unhandled error in main:', error);
  process.exit(1);
});