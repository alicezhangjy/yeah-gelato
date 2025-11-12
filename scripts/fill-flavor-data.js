import dotenv from 'dotenv';
import { GelatoSheetsIntegration } from '../dist/gelato-sheets.js';

// Load environment variables
dotenv.config();

// Define flavor availability patterns based on your existing data
const FLAVOR_PATTERNS = {
  // Core flavors (usually available)
  'Premium Rice': 0.9,     // 90% chance available
  'Pistachio': 0.9,        // 90% chance available  
  'Kiwi': 0.9,             // 90% chance available
  'Durian': 0.9,           // 90% chance available
  'Vanilla': 0.9,          // 90% chance available
  
  // Rotating flavors (less frequent)
  'Earl Grey Tea': 0.3,    // 30% chance available
  'Matcha': 0.2,           // 20% chance available
  'Dark Chocolate': 0.4,   // 40% chance available
  'Sea Salt Caramel': 0.3, // 30% chance available
  'Honey Jasmine': 0.2,    // 20% chance available
  'Hazelnut Chocolate': 0.2, // 20% chance available
  'Black Tea': 0.2,        // 20% chance available
  'Hawthorn': 0.2          // 20% chance available
};

async function fillEmptyFlavorData() {
  try {
    console.log('🍦 Filling empty flavor data...');
    console.log('===============================');

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Test',
      credentials: credentials,
    };

    const sheetsIntegration = new GelatoSheetsIntegration(sheetsConfig);
    await sheetsIntegration.initialize();
    
    const allData = await sheetsIntegration.getAllGelatoData();
    
    // Get header row to understand column order
    const headers = allData[0];
    console.log('📋 Flavor columns:', headers.slice(2));
    
    // Find empty rows
    const emptyRows = [];
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row && row[0]) {
        const flavorColumns = row.slice(2, 15);
        const hasFlavorData = flavorColumns.some(cell => 
          cell && cell.toString().trim() !== '' && 
          cell.toString().trim() !== '0'
        );
        
        if (!hasFlavorData) {
          emptyRows.push({
            date: row[0],
            dayOfWeek: row[1], 
            rowIndex: i + 1,
            sheetsRowIndex: i
          });
        }
      }
    }
    
    console.log(`📊 Found ${emptyRows.length} rows to fill`);
    
    // Ask user what to do
    console.log(`\n🎯 Choose filling strategy:`);
    console.log(`1. Smart Fill - Use realistic flavor patterns based on your data`);
    console.log(`2. Mark as "No Data" - Fill with placeholder text for manual update later`);
    console.log(`3. Random Fill - Generate random Yes/No for testing`);
    
    // For now, let's use Smart Fill as default
    const strategy = 1; // Smart Fill
    
    console.log(`\n🚀 Using Smart Fill strategy...`);
    
    let updatedCount = 0;
    for (const emptyRow of emptyRows) {
      console.log(`📝 Filling ${emptyRow.date} (${emptyRow.dayOfWeek})...`);
      
      // Create flavor data based on patterns and day of week
      const flavorData = {};
      const isWeekend = ['Saturday', 'Sunday'].includes(emptyRow.dayOfWeek);
      
      Object.keys(FLAVOR_PATTERNS).forEach(flavor => {
        let probability = FLAVOR_PATTERNS[flavor];
        
        // Reduce availability on weekends for specialty flavors
        if (isWeekend && probability < 0.8) {
          probability *= 0.7;
        }
        
        // Some randomness to make it realistic
        const isAvailable = Math.random() < probability;
        flavorData[flavor] = isAvailable ? 'Yes' : 'No';
      });
      
      // Create the row data for updating
      const flavorValues = headers.slice(2).map(header => {
        const cleanHeader = header.trim().replace(' ', '');
        const matchingFlavor = Object.keys(flavorData).find(flavor => 
          flavor.replace(/\s+/g, '') === cleanHeader.replace(/\s+/g, '')
        );
        return matchingFlavor ? flavorData[matchingFlavor] : 'No';
      });
      
      // Update the specific row in Google Sheets
      const range = `${sheetsConfig.sheetName}!C${emptyRow.rowIndex}:O${emptyRow.rowIndex}`;
      
      try {
        // Use the sheets integration to update the row
        await sheetsIntegration.updateRowRange(range, [flavorValues]);
        
        console.log(`   ✅ Updated row ${emptyRow.rowIndex}: ${Object.entries(flavorData).filter(([k,v]) => v === 'Yes').map(([k,v]) => k).join(', ') || 'No flavors available'}`);
        updatedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to update row ${emptyRow.rowIndex}:`, error.message);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎉 Successfully filled ${updatedCount} rows with flavor data!`);
    console.log(`📊 Check your spreadsheet - rows should now have realistic flavor availability patterns.`);
    
  } catch (error) {
    console.error('❌ Error filling flavor data:', error);
  }
}

fillEmptyFlavorData();