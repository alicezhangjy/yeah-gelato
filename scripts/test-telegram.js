import dotenv from 'dotenv';
import { TelegramDataFetcher } from '../dist/telegram.js';
import { logger } from '../dist/utils/logger.js';

dotenv.config();

async function testTelegramSetup() {
  console.log('🤖 Testing Telegram Bot Setup...\n');
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  
  if (!botToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN is not set in .env file');
    return;
  }
  
  if (!channelId) {
    console.log('❌ TELEGRAM_CHANNEL_ID is not set in .env file');
    return;
  }
  
  console.log(`🔑 Bot Token: ${botToken.substring(0, 10)}...`);
  console.log(`📺 Channel ID: ${channelId}\n`);
  
  try {
    const fetcher = new TelegramDataFetcher(botToken, channelId);
    
    // Test 1: Bot Token
    console.log('1️⃣ Testing bot token...');
    const tokenValid = await fetcher.testBotToken();
    
    if (!tokenValid) {
      console.log('❌ Bot token is invalid. Check your TELEGRAM_BOT_TOKEN');
      return;
    }
    
    // Test 2: Channel Access
    console.log('\n2️⃣ Testing channel access...');
    const hasAccess = await fetcher.checkChannelAccess();
    
    if (!hasAccess) {
      console.log('\n🔧 To fix channel access:');
      console.log('   1. Add your bot to the Telegram channel');
      console.log('   2. Make the bot an admin (or use a public channel)');
      console.log('   3. Use the correct channel format:');
      console.log('      • For usernames: @channelname');
      console.log('      • For private channels: -1001234567890');
      console.log('   4. Test with: npm run test:telegram');
      return;
    }
    
    console.log('\n✅ All tests passed! Your Telegram setup is working correctly.');
    console.log('\nYou can now run: npm start');
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

testTelegramSetup().catch(console.error);