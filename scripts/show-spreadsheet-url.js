import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Google Sheets Configuration:');
console.log('================================');
console.log('📊 Spreadsheet ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'NOT SET');
console.log('📝 Sheet Name:', process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1');

if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    const url = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_SPREADSHEET_ID}`;
    console.log('🔗 Direct URL to your spreadsheet:');
    console.log('   ', url);
    console.log('');
    console.log('📋 Copy and paste this URL into your browser to view the spreadsheet!');
} else {
    console.log('❌ No spreadsheet ID found in environment variables');
}