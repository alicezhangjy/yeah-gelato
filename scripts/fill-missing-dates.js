/**
 * Script to fill missing dates in the gelato spreadsheet
 */
import dotenv from 'dotenv';
import { GelatoSheetsIntegration } from '../src/gelato-sheets.js';
import { DateFiller } from '../src/date-filler.js';
import { logger } from '../src/utils/logger.js';

// Load environment variables
dotenv.config();

async function fillMissingDates() {
  try {
    logger.info('🔧 Starting date filler tool...');

    // Validate environment variables
    const requiredEnvVars = [
      'GOOGLE_SPREADSHEET_ID',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Set up Google Sheets integration
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      sheetName: 'Sheet1',
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    };

    const sheetsIntegration = new GelatoSheetsIntegration(sheetsConfig);
    await sheetsIntegration.initialize();

    // Create date filler and run
    const dateFiller = new DateFiller(sheetsIntegration);

    // Show current status
    logger.info('📊 Getting current spreadsheet status...');
    const summary = await dateFiller.getDateCoverageSummary();
    logger.info(`Current status:
    📅 Total dates: ${summary.totalDates}
    ✅ Filled dates: ${summary.filledDates}
    ⚪ Empty dates: ${summary.emptyDates}
    📊 Date range: ${summary.dateRange}
    `);

    // Fill missing dates
    const missingDates = await dateFiller.fillMissingDates();
    
    if (missingDates.length > 0) {
      logger.info('✅ Date filling completed successfully!');
      logger.info(`📊 Added ${missingDates.length} missing date entries`);
      
      // Show updated status
      const updatedSummary = await dateFiller.getDateCoverageSummary();
      logger.info(`Updated status:
      📅 Total dates: ${updatedSummary.totalDates}
      ✅ Filled dates: ${updatedSummary.filledDates}
      ⚪ Empty dates: ${updatedSummary.emptyDates}
      📊 Date range: ${updatedSummary.dateRange}
      `);
    } else {
      logger.info('✅ No missing dates found - your spreadsheet is complete!');
    }

  } catch (error) {
    logger.error('❌ Error running date filler:', error);
    process.exit(1);
  }
}

// Run the script
fillMissingDates().then(() => {
  logger.info('🎉 Date filler completed successfully');
  process.exit(0);
}).catch((error) => {
  logger.error('💥 Date filler failed:', error);
  process.exit(1);
});