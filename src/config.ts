import dotenv from 'dotenv';
import { LogLevel } from './utils/logger.js';
import type { FilterRule, TelegramMessage } from './types.js';

// Load environment variables
dotenv.config();

export interface Config {
  telegram: {
    botToken: string;
    channelId: string;
  };
  googleSheets: {
    spreadsheetId: string;
    sheetName: string;
    credentials: any;
    autoFormat: boolean;
  };
  filter: {
    rules: FilterRule[];
    customExtractors?: {
      [key: string]: (message: TelegramMessage) => any;
    };
  };
  app: {
    logLevel: LogLevel;
    batchProcessing: boolean;
    batchSize: number;
    batchTimeout: number;
    processHistoricalMessages: boolean;
    historicalMessageLimit: number;
  };
}

function loadGoogleCredentials(): any {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  
  if (credentialsJson) {
    try {
      return JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Invalid GOOGLE_CREDENTIALS_JSON format');
    }
  }
  
  if (credentialsPath) {
    try {
      // In a real implementation, you'd use fs.readFileSync here
      // For now, throw an error to remind the user to implement this
      throw new Error('File-based credentials loading not implemented. Use GOOGLE_CREDENTIALS_JSON instead.');
    } catch (error) {
      throw new Error(`Failed to load credentials from ${credentialsPath}: ${error}`);
    }
  }
  
  throw new Error('Google credentials not configured. Set either GOOGLE_CREDENTIALS_JSON or GOOGLE_CREDENTIALS_PATH');
}

function validateConfig(): void {
  const required = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHANNEL_ID',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate configuration on load
validateConfig();

export const config: Config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    channelId: process.env.TELEGRAM_CHANNEL_ID!,
  },
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'TelegramData',
    credentials: loadGoogleCredentials(),
    autoFormat: process.env.GOOGLE_SHEETS_AUTO_FORMAT !== 'false',
  },
  filter: {
    rules: [], // Will be populated from environment or defaults
  },
  app: {
    logLevel: (process.env.LOG_LEVEL as keyof typeof LogLevel) ? LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] : LogLevel.INFO,
    batchProcessing: process.env.BATCH_PROCESSING !== 'false',
    batchSize: parseInt(process.env.BATCH_SIZE || '10'),
    batchTimeout: parseInt(process.env.BATCH_TIMEOUT || '30000'),
    processHistoricalMessages: process.env.PROCESS_HISTORICAL_MESSAGES === 'true',
    historicalMessageLimit: parseInt(process.env.HISTORICAL_MESSAGE_LIMIT || '100'),
  },
};