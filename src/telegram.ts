import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import type { TelegramMessage } from './types.js';
import https from 'https';

// Create HTTPS agent that ignores SSL issues (development only)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

export class TelegramDataFetcher {
  private bot: Telegraf;
  private channelId: string;

  constructor(botToken: string, channelId: string) {
    // Configure bot with custom agent for SSL issues
    this.bot = new Telegraf(botToken, {
      telegram: {
        agent: httpsAgent
      }
    });
    this.channelId = channelId;
  }

  /**
   * Initialize the bot and set up message listeners
   */
  async initialize(): Promise<void> {
    try {
      // Test bot connection
      const botInfo = await this.bot.telegram.getMe();
      logger.info(`Bot initialized: ${botInfo.username}`);
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      // Start the bot (for real-time listening) - don't await to prevent hanging
      this.bot.launch().then(() => {
        logger.info('Telegram bot started successfully');
      }).catch((error) => {
        logger.error('Failed to start Telegram bot:', error);
      });
      
      logger.info('Bot launch initiated');
    } catch (error) {
      logger.error('Failed to initialize Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Set up message handlers for the channel
   */
  private setupMessageHandlers(): void {
    this.bot.on('channel_post', (ctx) => {
      if (ctx.chat.id.toString() === this.channelId) {
        this.handleChannelMessage(ctx.channelPost);
      }
    });

    this.bot.on('message', (ctx) => {
      if (ctx.chat.id.toString() === this.channelId) {
        this.handleChannelMessage(ctx.message);
      }
    });
  }

  /**
   * Handle incoming channel messages
   */
  private async handleChannelMessage(message: any): Promise<void> {
    try {
      const processedMessage = this.processMessage(message);
      logger.info(`New message received: ${processedMessage.id}`);
      
      // Emit event or call callback for message processing
      // This will be connected to the filtering and Google Sheets modules
      await this.onNewMessage(processedMessage);
    } catch (error) {
      logger.error('Error handling channel message:', error);
    }
  }

  /**
   * Process raw Telegram message into our format
   */
  private processMessage(rawMessage: any): TelegramMessage {
    return {
      id: rawMessage.message_id,
      text: rawMessage.text || rawMessage.caption,
      date: new Date(rawMessage.date * 1000),
      from: rawMessage.from ? {
        id: rawMessage.from.id,
        username: rawMessage.from.username,
        first_name: rawMessage.from.first_name,
        last_name: rawMessage.from.last_name,
      } : undefined,
      chat: {
        id: rawMessage.chat.id,
        title: rawMessage.chat.title,
        type: rawMessage.chat.type,
      },
      entities: rawMessage.entities || [],
    };
  }

  /**
   * Fetch historical messages from the channel
   */
  async fetchHistoricalMessages(limit: number = 100): Promise<TelegramMessage[]> {
    try {
      logger.info(`Fetching ${limit} historical messages from channel ${this.channelId}`);
      
      // Note: This requires the bot to be an admin of the channel
      // or the channel to be public
      const messages: TelegramMessage[] = [];
      
      // For private channels, you might need to use different approach
      // This is a simplified implementation
      
      return messages;
    } catch (error) {
      logger.error('Error fetching historical messages:', error);
      return [];
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(): Promise<any> {
    try {
      const chat = await this.bot.telegram.getChat(this.channelId);
      return chat;
    } catch (error) {
      logger.error('Error getting channel info:', error);
      throw error;
    }
  }

  /**
   * Test bot token validity
   */
  async testBotToken(): Promise<boolean> {
    try {
      const botInfo = await this.bot.telegram.getMe();
      logger.info(`Bot token is valid. Bot info: ${botInfo.username} (${botInfo.id})`);
      return true;
    } catch (error) {
      logger.error('Bot token test failed:', error);
      return false;
    }
  }

  /**
   * Callback for new messages - to be implemented by the main application
   */
  private async onNewMessage(message: TelegramMessage): Promise<void> {
    // This will be connected to the filtering and processing pipeline
    // For now, just log the message
    logger.info(`Processing message ${message.id}: ${message.text?.substring(0, 100)}...`);
  }

  /**
   * Set custom message handler
   */
  setMessageHandler(handler: (message: TelegramMessage) => Promise<void>): void {
    this.onNewMessage = handler;
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    await this.bot.stop();
    logger.info('Telegram bot stopped');
  }

  /**
   * Check if the bot has access to the channel
   */
  async checkChannelAccess(): Promise<boolean> {
    try {
      // First test if bot token is valid
      const tokenValid = await this.testBotToken();
      if (!tokenValid) {
        return false;
      }

      // Then test channel access
      await this.getChannelInfo();
      return true;
    } catch (error) {
      logger.error('Bot does not have access to the channel:', error);
      logger.info('💡 Make sure:');
      logger.info('   1. Your bot token is correct');
      logger.info('   2. The bot is added to the channel as an admin');
      logger.info('   3. The channel ID/username is correct');
      logger.info(`   4. Current channel ID: ${this.channelId}`);
      return false;
    }
  }
}

// Graceful shutdown handling
process.once('SIGINT', () => {
  logger.info('SIGINT received, stopping bot...');
  process.exit(0);
});

process.once('SIGTERM', () => {
  logger.info('SIGTERM received, stopping bot...');
  process.exit(0);
});