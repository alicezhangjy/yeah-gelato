/**
 * Simple standalone script to test date filling functionality
 */
import dotenv from 'dotenv';
import { GelatoSheetsIntegration } from '../dist/gelato-sheets.js';
import { DateFiller } from '../dist/date-filler.js';

// Load environment variables
dotenv.config();

async function testDateFilling() {
  try {
    console.log('🔧 Testing date filling functionality...');

    // Validate environment variables
    const requiredEnvVars = [
      'GOOGLE_SHEETS_SPREADSHEET_ID',
      'GOOGLE_CREDENTIALS_JSON'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log('✅ Environment variables validated');

    // Parse Google credentials
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

    // Set up Google Sheets integration (minimal)
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
      credentials: credentials,
    };

    console.log('🔧 Creating sheets integration...');
    const sheetsIntegration = new GelatoSheetsIntegration(sheetsConfig);
    
    console.log('🔧 Initializing sheets connection...');
    await sheetsIntegration.initialize();
    console.log('✅ Sheets connection established');

    // Create date filler and run
    console.log('🔧 Creating date filler...');
    const dateFiller = new DateFiller(sheetsIntegration);

    // Show current status
    console.log('📊 Getting current spreadsheet status...');
    const summary = await dateFiller.getDateCoverageSummary();
    console.log(`Current status:
    📅 Total dates: ${summary.totalDates}
    ✅ Filled dates: ${summary.filledDates}
    ⚪ Empty dates: ${summary.emptyDates}
    📊 Date range: ${summary.dateRange}
    `);

    // Fill missing dates
    console.log('🔍 Scanning for missing dates...');
    const missingDates = await dateFiller.fillMissingDates();
    
    if (missingDates.length > 0) {
      console.log('✅ Date filling completed successfully!');
      console.log(`📊 Added ${missingDates.length} missing date entries:`);
      missingDates.forEach(dateInfo => {
        console.log(`   📅 ${dateInfo.date} (${dateInfo.dayOfWeek})`);
      });
      
      // Show updated status
      const updatedSummary = await dateFiller.getDateCoverageSummary();
      console.log(`Updated status:
      📅 Total dates: ${updatedSummary.totalDates}
      ✅ Filled dates: ${updatedSummary.filledDates}
      ⚪ Empty dates: ${updatedSummary.emptyDates}
      📊 Date range: ${updatedSummary.dateRange}
      `);
    } else {
      console.log('✅ No missing dates found - your spreadsheet is complete!');
    }

    console.log('🎉 Date filling test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing date filling:', error);
    process.exit(1);
  }
}

// Run the test
testDateFilling().then(() => {
  console.log('👍 Test finished');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});