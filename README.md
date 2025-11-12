# Telegram channel to Google Sheets

A TypeScript application that monitors a Telegram channel and automatically adds filtered messages to a Google Sheets spreadsheet.

## Features

- **Real-time monitoring** of Telegram channels
- **Configurable filtering** with multiple rule types (keywords, regex, entities, date ranges)
- **Automatic data extraction** (URLs, hashtags, mentions, prices, numbers)
- **Batch processing** for efficient Google Sheets updates
- **Error handling and logging**
- **Historical message processing**
- **Graceful shutdown**

## Prerequisites

1. **Telegram Bot Token**: Create a bot with [@BotFather](https://t.me/botfather)
2. **Telegram Channel Access**: Add your bot to the channel as an admin
3. **Google Cloud Project**: Set up a project with Sheets API enabled
4. **Service Account**: Create a service account with access to your spreadsheet

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Copy the environment template:
   ```bash
   cp env.template .env
   ```

2. Configure your environment variables in `.env`:

### Telegram Configuration

- `TELEGRAM_BOT_TOKEN`: Your bot token from BotFather
- `TELEGRAM_CHANNEL_ID`: Channel username (e.g., `@mychannel`) or chat ID (e.g., `-1001234567890`)

### Google Sheets Configuration

- `GOOGLE_SHEETS_SPREADSHEET_ID`: The ID from your spreadsheet URL
- `GOOGLE_SHEETS_SHEET_NAME`: Sheet name (default: "TelegramData")
- `GOOGLE_CREDENTIALS_JSON`: Service account credentials as JSON string

### Application Settings

- `LOG_LEVEL`: DEBUG, INFO, WARN, or ERROR
- `BATCH_PROCESSING`: Enable batch processing (recommended: true)
- `BATCH_SIZE`: Number of messages to batch together
- `BATCH_TIMEOUT`: Max time to wait for batch completion (ms)
- `PROCESS_HISTORICAL_MESSAGES`: Process existing messages on startup
- `HISTORICAL_MESSAGE_LIMIT`: Max historical messages to process

## Google Cloud Setup

1. **Create a Google Cloud Project**
2. **Enable the Google Sheets API**
3. **Create a Service Account**:
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Download the JSON credentials
4. **Share your spreadsheet** with the service account email

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Watch Mode (for development)
```bash
npm run watch
```

## Filter Configuration

The application supports various filter types:

### Keyword Filters
```typescript
{
  type: 'keyword',
  field: 'text',
  condition: 'contains',
  value: ['announcement', 'update'],
  caseSensitive: false
}
```

### Regex Filters
```typescript
{
  type: 'regex',
  field: 'text',
  condition: 'matches',
  value: /\$[0-9,]+/g
}
```

### Entity Filters
```typescript
{
  type: 'entity',
  field: 'entities',
  condition: 'contains',
  value: ['url', 'hashtag']
}
```

### Date Filters
```typescript
{
  type: 'date',
  field: 'date',
  condition: 'after',
  value: new Date('2024-01-01')
}
```

## Data Structure

Messages that pass the filter are stored in Google Sheets with these columns:

- **Timestamp**: When the message was processed
- **Message ID**: Telegram message ID
- **Date**: Original message date
- **Text**: Message content (truncated to 1000 chars)
- **From**: Sender information
- **Chat Title**: Channel/chat name
- **URLs**: Extracted URLs
- **Hashtags**: Extracted hashtags
- **Mentions**: Extracted @mentions
- **Numbers**: Extracted numbers
- **Price**: Extracted price information
- **Priority**: Filter match priority
- **Matched Rules**: Which filter rules matched

## API Reference

### TelegramDataFetcher
- `initialize()`: Start the Telegram bot
- `setMessageHandler()`: Set custom message handler
- `fetchHistoricalMessages()`: Get past messages
- `checkChannelAccess()`: Verify bot permissions

### DataFilter
- `addRule()`: Add filter rule
- `removeRule()`: Remove filter rule
- `filterMessage()`: Filter a single message
- `addExtractor()`: Add custom data extractor

### GoogleSheetsIntegration
- `initialize()`: Set up sheets connection
- `addEntry()`: Add single message
- `addBatch()`: Add multiple messages
- `createBackup()`: Backup current data
- `formatSheet()`: Apply formatting

### TelegramToSheetsApp (Main Application)
- `start()`: Start the application
- `stop()`: Stop gracefully
- `getStats()`: Get runtime statistics
- `addFilterRule()`: Add filter at runtime
- `createBackup()`: Create data backup

## Troubleshooting

### Common Issues

1. **Bot not receiving messages**:
   - Ensure bot is added to channel as admin
   - Check channel ID format
   - Verify bot token

2. **Google Sheets authentication**:
   - Verify service account JSON format
   - Check spreadsheet sharing permissions
   - Ensure Sheets API is enabled

3. **No messages being filtered**:
   - Check filter rules configuration
   - Verify message content matches filters
   - Check log level for debugging

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=DEBUG npm run dev
```

Check application statistics:
```typescript
const app = new TelegramToSheetsApp();
await app.start();
console.log(app.getStats());
```

## Security Notes

- Keep your bot token secure and never commit it to version control
- Use environment variables for all sensitive data
- Regularly rotate your service account credentials
- Limit spreadsheet sharing to necessary accounts only

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Create an issue with detailed information about your setup and the problem