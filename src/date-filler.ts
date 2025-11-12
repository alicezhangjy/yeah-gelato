import { GelatoSheetsIntegration } from './gelato-sheets.js';
import type { FilteredData, TelegramMessage } from './types.js';
import { logger } from './utils/logger.js';

export interface MissingDateInfo {
  date: string;
  dayOfWeek: string;
  rowNumber?: number;
}

export class DateFiller {
  private sheetsIntegration: GelatoSheetsIntegration;

  constructor(sheetsIntegration: GelatoSheetsIntegration) {
    this.sheetsIntegration = sheetsIntegration;
  }

  /**
   * Find missing dates and fill them with empty data
   */
  async fillMissingDates(): Promise<MissingDateInfo[]> {
    try {
      logger.info('🔍 Scanning for missing dates...');
      
      // Get all existing data from the sheet
      const allData = await this.sheetsIntegration.getAllGelatoData();
      
      if (allData.length <= 1) {
        logger.info('📊 No existing data found, will start from today');
        const today = new Date();
        const missingDates = this.generateMissingDates([], today);
        await this.fillDates(missingDates);
        return missingDates;
      }

      // Extract existing dates (skip header row)
      const existingDates = this.extractExistingDates(allData);
      logger.info(`📅 Found ${existingDates.length} existing dates in spreadsheet`);

      // Find the date range to fill
      const { startDate, endDate } = this.calculateDateRange(existingDates);
      logger.info(`📊 Checking date range: ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`);

      // Generate missing dates
      const missingDates = this.generateMissingDates(existingDates, endDate, startDate);
      
      if (missingDates.length === 0) {
        logger.info('✅ No missing dates found - spreadsheet is up to date!');
        return [];
      }

      logger.info(`❗ Found ${missingDates.length} missing dates:`);
      missingDates.forEach(dateInfo => {
        logger.info(`   📅 ${dateInfo.date} (${dateInfo.dayOfWeek})`);
      });

      // Fill the missing dates
      await this.fillDates(missingDates);
      
      return missingDates;

    } catch (error) {
      logger.error('❌ Error filling missing dates:', error);
      throw error;
    }
  }

  /**
   * Extract existing dates from spreadsheet data
   */
  private extractExistingDates(allData: any[][]): Date[] {
    const dates: Date[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row && row[0]) {
        const dateStr = row[0].toString();
        const date = this.parseDate(dateStr);
        if (date) {
          dates.push(date);
        }
      }
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Parse date string in DD-MMM-YYYY format
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Handle different date formats
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [day, monthStr, year] = parts;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          if (monthStr && day && year) {
            const monthIndex = months.indexOf(monthStr);
            if (monthIndex !== -1) {
              return new Date(parseInt(year), monthIndex, parseInt(day));
            }
          }
        }
      }
      
      // Try other formats if needed
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
      
    } catch (error) {
      logger.debug(`Could not parse date: ${dateStr}`);
      return null;
    }
  }

  /**
   * Calculate the date range to check for missing dates
   */
  private calculateDateRange(existingDates: Date[]): { startDate: Date; endDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to beginning of day
    
    let startDate: Date;
    let endDate: Date = today;

    if (existingDates.length === 0) {
      // If no dates exist, start from 30 days ago
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
    } else {
      // Start from the earliest existing date
      startDate = new Date(existingDates[0]!);
      
      // Check if we need to go back further (in case there are gaps at the beginning)
      const earliestDate = new Date(existingDates[0]!);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      if (earliestDate > thirtyDaysAgo) {
        startDate = thirtyDaysAgo;
      }
    }

    return { startDate, endDate };
  }

  /**
   * Generate list of missing dates
   */
  private generateMissingDates(existingDates: Date[], endDate: Date, startDate?: Date): MissingDateInfo[] {
    const missingDates: MissingDateInfo[] = [];
    const existingDateStrings = new Set(existingDates.map(d => this.formatDate(d)));
    
    const currentDate = new Date(startDate || endDate);
    if (!startDate) {
      // If no start date provided, go back 30 days from end date
      currentDate.setDate(endDate.getDate() - 30);
    }
    
    while (currentDate <= endDate) {
      const dateStr = this.formatDate(currentDate);
      
      if (!existingDateStrings.has(dateStr)) {
        missingDates.push({
          date: dateStr,
          dayOfWeek: this.getDayOfWeek(currentDate)
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return missingDates;
  }

  /**
   * Format date as DD-MMM-YYYY
   */
  private formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  /**
   * Get day of week from date
   */
  private getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 
                 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    return dayName || 'Unknown';
  }

  /**
   * Fill missing dates with empty data
   */
  private async fillDates(missingDates: MissingDateInfo[]): Promise<void> {
    if (missingDates.length === 0) return;

    logger.info(`📝 Adding ${missingDates.length} missing date rows...`);
    
    for (const dateInfo of missingDates) {
      // Create a dummy TelegramMessage for the date filler
      const dummyMessage: TelegramMessage = {
        id: 0,
        text: `No data available for ${dateInfo.date}`,
        date: new Date(),
        chat: {
          id: 0,
          title: 'Date Filler',
          type: 'channel'
        }
      };

      const formattedData: FilteredData = {
        originalMessage: dummyMessage,
        extractedData: {
          date: dateInfo.date,
          dayOfWeek: dateInfo.dayOfWeek,
          flavors: [], // Empty array indicates no data
          availabilityByFlavor: {}
        },
        matchedRules: [],
        priority: 0
      };

      // Use the existing addGelatoEntry method to maintain consistency
      await this.sheetsIntegration.addGelatoEntry(formattedData);
      logger.debug(`✅ Added empty row for ${dateInfo.date}`);
    }
    
    logger.info(`✅ Successfully added ${missingDates.length} missing date rows`);
    logger.info('💡 You can now manually fill in the flavor data for these dates');
  }

  /**
   * Get summary of date coverage
   */
  async getDateCoverageSummary(): Promise<{
    totalDates: number;
    filledDates: number;
    emptyDates: number;
    dateRange: string;
  }> {
    try {
      const allData = await this.sheetsIntegration.getAllGelatoData();
      
      if (allData.length <= 1) {
        return {
          totalDates: 0,
          filledDates: 0,
          emptyDates: 0,
          dateRange: 'No data'
        };
      }

      let filledDates = 0;
      let emptyDates = 0;
      const dates: Date[] = [];

      // Skip header row
      for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        if (row && row[0]) {
          const date = this.parseDate(row[0].toString());
          if (date) {
            dates.push(date);
            
            // Check if any flavor columns have data
            const hasFlavorData = row.slice(2).some((cell: any) => 
              cell && cell.toString().trim() !== ''
            );
            
            if (hasFlavorData) {
              filledDates++;
            } else {
              emptyDates++;
            }
          }
        }
      }

      const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
      const dateRange = sortedDates.length > 0 
        ? `${this.formatDate(sortedDates[0]!)} to ${this.formatDate(sortedDates[sortedDates.length - 1]!)}`
        : 'No dates';

      return {
        totalDates: dates.length,
        filledDates,
        emptyDates,
        dateRange
      };

    } catch (error) {
      logger.error('Error getting date coverage summary:', error);
      throw error;
    }
  }
}