import dotenv from 'dotenv';
import { gelatoExtractors } from '../dist/gelato-config.js';
dotenv.config();

// Test the gelato extractors with your sample message
const sampleMessage = {
  id: 123,
  text: `✨ Today's (10/11/25) Gelato Flavors 今日口味 ✨
🍨 Pistachio 开心果
🍚 Premium Rice 五常大米
🍫 Dark Chocolate 黑巧克力
🥝 Kiwi 奇异果
🍦 Vanilla 香草
🤩 Durian 榴莲
快来尝鲜，挖掘你的今日最爱！💜`,
  date: new Date(),
  chat: { id: -1001234567890, type: 'channel', title: 'Yeah Gelato' },
  entities: []
};

console.log('🧪 Testing Gelato Data Extraction...\n');

console.log('📅 Testing Date Extraction:');
const extractedDate = gelatoExtractors.extractDate(sampleMessage);
console.log(`   Extracted date: ${extractedDate}`);

console.log('\n📅 Testing Day of Week:');
const dayOfWeek = gelatoExtractors.extractDayOfWeek(sampleMessage);
console.log(`   Day of week: ${dayOfWeek}`);

console.log('\n🍦 Testing Flavor Extraction:');
const extractedFlavors = gelatoExtractors.extractFlavors(sampleMessage);
console.log('   Available flavors:');
Object.entries(extractedFlavors).forEach(([flavor, available]) => {
  const status = available ? '✅ Yes' : '❌ No';
  console.log(`      ${flavor}: ${status}`);
});

console.log('\n📊 Sample Spreadsheet Row:');
console.log('Date\t\tDay\t\tPremium Rice\tPistachio\tKiwi\tDurian\tVanilla\tDark Chocolate');
const row = [
  extractedDate,
  dayOfWeek,
  extractedFlavors['Premium Rice'] ? 'Yes' : 'No',
  extractedFlavors['Pistachio'] ? 'Yes' : 'No',
  extractedFlavors['Kiwi'] ? 'Yes' : 'No',
  extractedFlavors['Durian'] ? 'Yes' : 'No',
  extractedFlavors['Vanilla'] ? 'Yes' : 'No',
  extractedFlavors['Dark Chocolate'] ? 'Yes' : 'No'
];
console.log(row.join('\t\t'));

console.log('\n✅ Extraction test completed!');