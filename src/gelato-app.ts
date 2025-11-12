import { config } from './config.js';
import { TelegramDataFetcher } from './telegram.js';
import { DataFilter } from './filter.js';
import { GelatoSheetsIntegration } from './gelato-sheets.js';
import { gelatoFilters, gelatoExtractors } from './gelato-config.js';
import { logger, LogLevel } from './utils/logger.js';
import type { TelegramMessage, FilteredData } from './types.js';

export class GelatoTrackingApp {
  private telegramFetcher: TelegramDataFetcher;
  private dataFilter: DataFilter;
  private sheetsIntegration: GelatoSheetsIntegration;
  private isRunning: boolean = false;
  private isInitialized: boolean = false;
  private processedMessageIds: Set<number> = new Set();

  constructor() {
    // Initialize components with configuration
    this.telegramFetcher = new TelegramDataFetcher(
      config.telegram.botToken,
      config.telegram.channelId
    );

    this.dataFilter = new DataFilter();
    
    this.sheetsIntegration = new GelatoSheetsIntegration({
      spreadsheetId: config.googleSheets.spreadsheetId,
      sheetName: config.googleSheets.sheetName,
      credentials: config.googleSheets.credentials,
    });

    this.setupGelatoFilters();
    this.setupGracefulShutdown();
  }

  /**
   * Initialize and start the gelato tracking application
   */
  async start(): Promise<void> {
    try {
      logger.info('🍦 Starting Gelato Tracking Application...');
      
      // Set log level
      logger.setLogLevel(config.app.logLevel || LogLevel.INFO);

      // Initialize components if not already done
      if (!this.isInitialized) {
        await this.initializeComponents();
        this.isInitialized = true;
      }

      // Set up message handler
      this.telegramFetcher.setMessageHandler(this.handleNewMessage.bind(this));

      this.isRunning = true;
      logger.info('✅ Gelato tracking application started successfully!');
      logger.info('📱 Monitoring @yeahgelato channel for daily flavor updates...');
      logger.info('📊 Data will be automatically updated in your Google Sheet');

    } catch (error) {
      logger.error('❌ Failed to start gelato tracking application:', error);
      throw error;
    }
  }

  /**
   * Stop the application gracefully
   */
  async stop(): Promise<void> {
    try {
      logger.info('🛑 Stopping gelato tracking application...');
      this.isRunning = false;

      // Stop Telegram bot
      await this.telegramFetcher.stop();

      logger.info('✅ Gelato tracking application stopped successfully');
    } catch (error) {
      logger.error('❌ Error stopping application:', error);
      throw error;
    }
  }

  /**
   * Initialize the application components
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeComponents();
      this.isInitialized = true;
    }
  }

  /**
   * Get sheets integration instance for external tools
   */
  getSheetsIntegration(): GelatoSheetsIntegration {
    return this.sheetsIntegration;
  }

  /**
   * Initialize all components
   */
  private async initializeComponents(): Promise<void> {
    logger.info('🔧 Initializing components...');

    // Initialize Google Sheets integration
    await this.sheetsIntegration.initialize();
    logger.info('✅ Google Sheets integration initialized');

    // Check Telegram channel access
    logger.info('🔍 Checking Telegram channel access...');
    const hasAccess = await this.telegramFetcher.checkChannelAccess();
    if (!hasAccess) {
      throw new Error('Bot does not have access to the specified Telegram channel');
    }
    logger.info('✅ Telegram channel access confirmed');

    // Initialize Telegram bot
    logger.info('🤖 Initializing Telegram bot...');
    await this.telegramFetcher.initialize();
    logger.info('✅ Telegram bot initialized');

    // Apply sheet formatting (disabled to prevent hanging)
    logger.info(`🎨 Sheet formatting disabled to prevent initialization delays`);
    logger.info('⏩ Sheet formatting skipped');

    logger.info('🎉 All components initialized successfully');
  }

  /**
   * Set up gelato-specific filters and extractors
   */
  private setupGelatoFilters(): void {
    // Clear any existing rules
    this.dataFilter.clearRules();

    // Add gelato-specific filter rules
    gelatoFilters.forEach(rule => {
      this.dataFilter.addRule(rule);
    });

    // Add gelato-specific data extractors
    Object.entries(gelatoExtractors).forEach(([name, extractor]) => {
      this.dataFilter.addExtractor(name, extractor);
    });

    logger.info(`🎯 Gelato filters set up with ${gelatoFilters.length} rules`);
    logger.info('🔍 Monitoring for: Daily flavor announcements, Today\'s flavors, Gelato updates');
  }

  /**
   * Handle new Telegram messages
   */
  private async handleNewMessage(message: TelegramMessage): Promise<void> {
    try {
      // Skip if already processed
      if (this.processedMessageIds.has(message.id)) {
        return;
      }

      logger.debug(`🔍 Processing new message: ${message.id}`);
      logger.info(`📥 New message: ${message.text?.substring(0, 100)}...`);

      // Filter the message
      const filteredData = await this.dataFilter.filterMessage(message);
      
      if (filteredData) {
        logger.info(`✅ Message ${message.id} matched gelato flavor filters!`);
        
        // Add to processed set
        this.processedMessageIds.add(message.id);

        // Extract and log flavor information
        const extractedFlavors = filteredData.extractedData.extractFlavors || {};
        const extractedDate = filteredData.extractedData.extractDate || '';
        const dayOfWeek = filteredData.extractedData.extractDayOfWeek || '';
        
        logger.info(`📅 Date: ${extractedDate} (${dayOfWeek})`);
        
        const availableFlavors = Object.entries(extractedFlavors)
          .filter(([_, available]) => available)
          .map(([flavor, _]) => flavor);
        
        logger.info(`🍦 Available flavors: ${availableFlavors.join(', ')}`);

        // Update Google Sheets
        await this.sheetsIntegration.addGelatoEntry(filteredData);
        logger.info(`📊 Google Sheet updated with flavor data`);
      } else {
        logger.debug(`⏭️  Message ${message.id} did not match gelato filters`);
      }

    } catch (error) {
      logger.error(`❌ Error processing message ${message.id}:`, error);
    }
  }

  /**
   * Get application statistics
   */
  getStats(): {
    isRunning: boolean;
    processedMessages: number;
    filterRules: number;
  } {
    return {
      isRunning: this.isRunning,
      processedMessages: this.processedMessageIds.size,
      filterRules: this.dataFilter.getRules().length,
    };
  }

  /**
   * Create a backup of current Google Sheets data
   */
  async createBackup(): Promise<string> {
    logger.info('💾 Creating backup...');
    // This would create a backup sheet - simplified for now
    logger.info('💾 Backup functionality would be implemented here');
    return 'backup_' + new Date().toISOString();
  }

  /**
   * Get all gelato data from the sheet
   */
  async getGelatoData(): Promise<any[][]> {
    return await this.sheetsIntegration.getAllGelatoData();
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`📡 Received ${signal}. Shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('🚨 Uncaught Exception:', error);
      process.exit(1);
    });
  }
}