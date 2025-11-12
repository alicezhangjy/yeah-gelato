import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import type { FilteredData } from './types.js';
import { logger } from './utils/logger.js';
import { formatGelatoData } from './gelato-config.js';

export interface GelatoSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  credentials: any;
}

export class GelatoSheetsIntegration {
  private sheets: sheets_v4.Sheets;
  private auth: GoogleAuth;
  private config: GelatoSheetsConfig;

  constructor(config: GelatoSheetsConfig) {
    this.config = config;
    this.auth = new GoogleAuth({
      credentials: config.credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Initialize and test the connection to Google Sheets
   */
  async initialize(): Promise<void> {
    try {
      // Test authentication and access to the spreadsheet
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });
      
      logger.info(`Successfully connected to spreadsheet: ${response.data.properties?.title}`);
      
      // Check if the specified sheet exists
      const sheet = response.data.sheets?.find(s => s.properties?.title === this.config.sheetName);
      if (!sheet) {
        logger.warn(`Sheet '${this.config.sheetName}' not found. Creating new sheet...`);
        await this.createSheet();
      }
      
      // Set up headers if needed
      await this.setupGelatoHeaders();
      
    } catch (error) {
      logger.error('Failed to initialize Gelato Sheets integration:', error);
      throw error;
    }
  }

  /**
   * Create a new sheet if it doesn't exist
   */
  async createSheet(): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.config.spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: this.config.sheetName,
              },
            },
          }],
        },
      });
      logger.info(`Created new sheet: ${this.config.sheetName}`);
    } catch (error) {
      logger.error('Error creating sheet:', error);
      throw error;
    }
  }

  /**
   * Set up gelato-specific column headers
   */
  async setupGelatoHeaders(): Promise<void> {
    try {
      const range = `${this.config.sheetName}!A1:O1`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range,
      });

      // If headers don't exist, create them
      if (!response.data.values || response.data.values.length === 0) {
        const headers = [
          'Date',
          'Day of week',
          'Premium Rice',
          'Pistachio',
          'Kiwi',
          'Durian',
          'Vanilla',
          'Earl Grey Tea',
          'Matcha',
          'Dark Chocolate',
          'Sea Salt Caramel',
          'Honey Jasmine',
          'Hazelnut Chocolate',
          'Black Tea',
          'Hawthorn'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers],
          },
        });

        logger.info('Set up gelato column headers in the sheet');
      }
    } catch (error) {
      logger.error('Error setting up gelato headers:', error);
      throw error;
    }
  }

  /**
   * Add or update gelato flavor data for a specific date
   */
  async addGelatoEntry(filteredData: FilteredData): Promise<void> {
    try {
      const rowData = formatGelatoData(filteredData);
      const extractedDate = filteredData.extractedData.extractDate;
      
      if (!extractedDate) {
        logger.error('No date found in gelato data');
        return;
      }

      // Check if this date already exists
      const existingRow = await this.findRowByDate(extractedDate);
      
      if (existingRow > 0) {
        // Update existing row
        await this.updateRow(existingRow, rowData);
        logger.info(`Updated gelato data for ${extractedDate}`);
      } else {
        // Add new row
        await this.appendRow(rowData);
        logger.info(`Added new gelato data for ${extractedDate}`);
      }
    } catch (error) {
      logger.error('Error adding gelato entry:', error);
      throw error;
    }
  }

  /**
   * Find row number by date (returns 0 if not found)
   */
  private async findRowByDate(date: string): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.sheetName}!A:A`,
      });

      const values = response.data.values;
      if (!values) return 0;

      // Look for the date (skip header row)
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row && row.length > 0 && row[0] === date) {
          return i + 1; // Return 1-based row number
        }
      }
      return 0; // Not found
    } catch (error) {
      logger.error('Error finding row by date:', error);
      return 0;
    }
  }

  /**
   * Update an existing row
   */
  private async updateRow(rowNumber: number, rowData: any[]): Promise<void> {
    try {
      const range = `${this.config.sheetName}!A${rowNumber}:O${rowNumber}`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      logger.error('Error updating row:', error);
      throw error;
    }
  }

  /**
   * Append a new row
   */
  private async appendRow(rowData: any[]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.sheetName}!A:O`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      logger.error('Error appending row:', error);
      throw error;
    }
  }

  /**
   * Append multiple rows
   */
  async appendRows(rows: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.sheetName}!A:O`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    } catch (error) {
      logger.error('Error appending rows:', error);
      throw error;
    }
  }

  /**
   * Update a specific range with data
   */
  async updateRowRange(range: string, values: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
          values: values,
        },
      });
    } catch (error) {
      logger.error('Error updating range:', error);
      throw error;
    }
  }

  /**
   * Get all gelato data
   */
  async getAllGelatoData(): Promise<any[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.sheetName}!A:O`,
      });

      return response.data.values || [];
    } catch (error) {
      logger.error('Error getting all gelato data:', error);
      throw error;
    }
  }

  /**
   * Format the sheet with colors and styles
   */
  async formatGelatoSheet(): Promise<void> {
    try {
      const sheetId = await this.getSheetId();
      
      const requests = [
        // Format header row
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.8,
                  green: 0.6,
                  blue: 1.0,
                },
                textFormat: {
                  foregroundColor: {
                    red: 0.0,
                    green: 0.0,
                    blue: 0.0,
                  },
                  bold: true,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
            },
          },
        },
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.config.spreadsheetId,
        requestBody: { requests },
      });

      logger.info('Applied gelato sheet formatting');
    } catch (error) {
      logger.error('Error formatting gelato sheet:', error);
    }
  }

  /**
   * Get sheet ID by name
   */
  private async getSheetId(): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const sheet = response.data.sheets?.find(s => s.properties?.title === this.config.sheetName);
      return sheet?.properties?.sheetId || 0;
    } catch (error) {
      logger.error('Error getting sheet ID:', error);
      return 0;
    }
  }
}