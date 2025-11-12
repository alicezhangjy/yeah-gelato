import express from 'express';
import type { Request, Response } from 'express';
import { GelatoTrackingApp } from './gelato-app.js';
import { DateFiller } from './date-filler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

let gelatoApp: GelatoTrackingApp | null = null;

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    app_running: gelatoApp !== null
  });
});

// Status endpoint
app.get('/status', async (req: Request, res: Response) => {
  if (!gelatoApp) {
    return res.json({ error: 'Gelato app not initialized' });
  }
  
  try {
    const stats = gelatoApp.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * Main entry point for the Gelato Tracking Application with HTTP server
 */
async function main(): Promise<void> {
  try {
    console.log('🍦 Yeah Gelato Flavor Tracker (Server Mode)');
    console.log('============================================');
    console.log('Automatically tracks daily gelato flavors from Telegram to Google Sheets\n');
    
    logger.info('🚀 Starting Gelato Tracking Application with HTTP server...');
    
    // Create the application
    gelatoApp = new GelatoTrackingApp();
    logger.info('✅ Created GelatoTrackingApp instance');
    
    // Start the application (this will initialize everything)
    await gelatoApp.start();
    logger.info('✅ Application started successfully');
    
    // Fill missing dates after startup
    logger.info('🔍 Checking for missing dates after startup...');
    
    try {
      const dateFiller = new DateFiller(gelatoApp.getSheetsIntegration());
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
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🌐 HTTP server running on port ${PORT}`);
      logger.info(`   Health check: http://localhost:${PORT}/health`);
      logger.info(`   Status: http://localhost:${PORT}/status`);
      logger.info('🔄 Now monitoring Telegram channel for gelato updates...');
    });
    
    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('🛑 Shutting down...');
      if (gelatoApp) {
        await gelatoApp.stop();
      }
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    logger.error('🚨 Failed to start application:', error);
    console.error('\n💡 Troubleshooting checklist:');
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