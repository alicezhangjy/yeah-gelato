import type { TelegramMessage, FilterRule, FilteredData } from './types.js';
import { logger } from './utils/logger.js';

export type { FilterRule, FilteredData } from './types.js';

export class DataFilter {
  private rules: FilterRule[] = [];
  private extractors: Map<string, (message: TelegramMessage) => any> = new Map();

  constructor() {
    this.setupDefaultExtractors();
  }

  /**
   * Add a filter rule
   */
  addRule(rule: FilterRule): void {
    this.rules.push(rule);
    logger.info(`Added filter rule: ${rule.type} - ${rule.field} - ${rule.condition}`);
  }

  /**
   * Remove a filter rule by index
   */
  removeRule(index: number): boolean {
    if (index >= 0 && index < this.rules.length) {
      const removed = this.rules.splice(index, 1);
      if (removed[0]) {
        logger.info(`Removed filter rule: ${removed[0].type}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Clear all filter rules
   */
  clearRules(): void {
    this.rules = [];
    logger.info('Cleared all filter rules');
  }

  /**
   * Get all current rules
   */
  getRules(): FilterRule[] {
    return [...this.rules];
  }

  /**
   * Filter and process a message
   */
  async filterMessage(message: TelegramMessage): Promise<FilteredData | null> {
    try {
      const matchedRules: FilterRule[] = [];
      
      // Check each rule against the message
      for (const rule of this.rules) {
        if (await this.evaluateRule(rule, message)) {
          matchedRules.push(rule);
        }
      }

      // If no rules matched, return null (message doesn't pass filter)
      if (matchedRules.length === 0) {
        return null;
      }

      // Extract data from the message
      const extractedData = await this.extractData(message, matchedRules);
      
      // Calculate priority based on matched rules
      const priority = this.calculatePriority(matchedRules);

      return {
        originalMessage: message,
        extractedData,
        matchedRules,
        priority
      };
    } catch (error) {
      logger.error('Error filtering message:', error);
      return null;
    }
  }

  /**
   * Evaluate a single rule against a message
   */
  private async evaluateRule(rule: FilterRule, message: TelegramMessage): Promise<boolean> {
    const fieldValue = this.getFieldValue(rule.field, message);
    
    switch (rule.type) {
      case 'keyword':
        return this.evaluateKeywordRule(rule, fieldValue);
      case 'regex':
        return this.evaluateRegexRule(rule, fieldValue);
      case 'entity':
        return this.evaluateEntityRule(rule, message);
      case 'date':
        return this.evaluateDateRule(rule, message.date);
      case 'custom':
        return this.evaluateCustomRule(rule, message);
      default:
        return false;
    }
  }

  /**
   * Get field value from message
   */
  private getFieldValue(field: string, message: TelegramMessage): any {
    switch (field) {
      case 'text':
        return message.text || '';
      case 'from':
        return message.from?.username || message.from?.first_name || '';
      case 'date':
        return message.date;
      case 'entities':
        return message.entities || [];
      case 'all':
        return JSON.stringify(message);
      default:
        return '';
    }
  }

  /**
   * Evaluate keyword rule
   */
  private evaluateKeywordRule(rule: FilterRule, fieldValue: any): boolean {
    const text = String(fieldValue);
    const searchText = rule.caseSensitive ? text : text.toLowerCase();
    const keywords = Array.isArray(rule.value) ? rule.value : [rule.value];
    
    return keywords.some(keyword => {
      const searchKeyword = rule.caseSensitive ? String(keyword) : String(keyword).toLowerCase();
      
      switch (rule.condition) {
        case 'contains':
          return searchText.includes(searchKeyword);
        case 'equals':
          return searchText === searchKeyword;
        case 'startsWith':
          return searchText.startsWith(searchKeyword);
        case 'endsWith':
          return searchText.endsWith(searchKeyword);
        default:
          return false;
      }
    });
  }

  /**
   * Evaluate regex rule
   */
  private evaluateRegexRule(rule: FilterRule, fieldValue: any): boolean {
    const text = String(fieldValue);
    const regex = rule.value instanceof RegExp ? rule.value : new RegExp(String(rule.value), rule.caseSensitive ? 'g' : 'gi');
    
    return regex.test(text);
  }

  /**
   * Evaluate entity rule (URLs, mentions, hashtags, etc.)
   */
  private evaluateEntityRule(rule: FilterRule, message: TelegramMessage): boolean {
    if (!message.entities || message.entities.length === 0) {
      return false;
    }

    const entityTypes = Array.isArray(rule.value) ? rule.value : [rule.value];
    return message.entities.some(entity => entityTypes.includes(entity.type));
  }

  /**
   * Evaluate date rule
   */
  private evaluateDateRule(rule: FilterRule, messageDate: Date): boolean {
    const ruleDate = Array.isArray(rule.value) ? rule.value[0] : rule.value;
    
    if (!(ruleDate instanceof Date)) {
      return false;
    }

    switch (rule.condition) {
      case 'before':
        return messageDate < ruleDate;
      case 'after':
        return messageDate > ruleDate;
      case 'between':
        if (Array.isArray(rule.value) && rule.value.length === 2) {
          const [startDate, endDate] = rule.value;
          if (startDate instanceof Date && endDate instanceof Date) {
            return messageDate >= startDate && messageDate <= endDate;
          }
        }
        return false;
      case 'equals':
        return messageDate.toDateString() === ruleDate.toDateString();
      default:
        return false;
    }
  }

  /**
   * Evaluate custom rule (for complex logic)
   */
  private evaluateCustomRule(rule: FilterRule, message: TelegramMessage): boolean {
    // This can be extended to support custom functions
    // For now, return false as a placeholder
    logger.warn('Custom rule evaluation not implemented');
    return false;
  }

  /**
   * Extract data from message based on matched rules
   */
  private async extractData(message: TelegramMessage, matchedRules: FilterRule[]): Promise<{[key: string]: any}> {
    const extractedData: {[key: string]: any} = {
      // Always include basic info
      messageId: message.id,
      date: message.date,
      text: message.text || '',
      chatTitle: message.chat.title || '',
      fromUsername: message.from?.username || message.from?.first_name || 'Unknown'
    };

    // Run custom extractors
    for (const [key, extractor] of this.extractors) {
      try {
        extractedData[key] = await extractor(message);
      } catch (error) {
        logger.error(`Error in extractor ${key}:`, error);
      }
    }

    // Extract URLs if present
    if (message.entities) {
      const urls = message.entities
        .filter(entity => entity.type === 'url' || entity.type === 'text_link')
        .map(entity => {
          if (entity.url) {
            return entity.url;
          }
          if (message.text && entity.type === 'url') {
            return message.text.substring(entity.offset, entity.offset + entity.length);
          }
          return null;
        })
        .filter(url => url !== null);
      
      if (urls.length > 0) {
        extractedData.urls = urls;
      }
    }

    // Extract hashtags
    if (message.entities) {
      const hashtags = message.entities
        .filter(entity => entity.type === 'hashtag')
        .map(entity => {
          if (message.text) {
            return message.text.substring(entity.offset, entity.offset + entity.length);
          }
          return null;
        })
        .filter(hashtag => hashtag !== null);
      
      if (hashtags.length > 0) {
        extractedData.hashtags = hashtags;
      }
    }

    return extractedData;
  }

  /**
   * Calculate priority based on matched rules
   */
  private calculatePriority(matchedRules: FilterRule[]): number {
    // Simple priority calculation - more matched rules = higher priority
    // This can be customized based on specific rule types or weights
    return matchedRules.length;
  }

  /**
   * Add custom data extractor
   */
  addExtractor(name: string, extractor: (message: TelegramMessage) => any): void {
    this.extractors.set(name, extractor);
    logger.info(`Added custom extractor: ${name}`);
  }

  /**
   * Remove custom data extractor
   */
  removeExtractor(name: string): boolean {
    const removed = this.extractors.delete(name);
    if (removed) {
      logger.info(`Removed custom extractor: ${name}`);
    }
    return removed;
  }

  /**
   * Setup default extractors
   */
  private setupDefaultExtractors(): void {
    // Extract price information (common in many channels)
    this.addExtractor('price', (message: TelegramMessage) => {
      const text = message.text || '';
      const priceRegex = /\$([0-9,]+\.?\d*)|([0-9,]+\.?\d*)\s?(USD|usd|\$)/g;
      const matches = text.match(priceRegex);
      return matches ? matches.map(match => match.replace(/[,$]/g, '')) : null;
    });

    // Extract mentions
    this.addExtractor('mentions', (message: TelegramMessage) => {
      if (!message.entities) return null;
      
      return message.entities
        .filter(entity => entity.type === 'mention')
        .map(entity => {
          if (message.text) {
            return message.text.substring(entity.offset, entity.offset + entity.length);
          }
          return null;
        })
        .filter(mention => mention !== null);
    });

    // Extract numbers
    this.addExtractor('numbers', (message: TelegramMessage) => {
      const text = message.text || '';
      const numberRegex = /\b\d+(?:\.\d+)?\b/g;
      const matches = text.match(numberRegex);
      return matches ? matches.map(num => parseFloat(num)) : null;
    });
  }

  /**
   * Create common filter rules
   */
  static createCommonRules(): FilterRule[] {
    return [
      // Filter messages containing URLs
      {
        type: 'entity',
        field: 'entities',
        condition: 'contains',
        value: ['url', 'text_link']
      },
      // Filter messages with specific keywords
      {
        type: 'keyword',
        field: 'text',
        condition: 'contains',
        value: ['announcement', 'update', 'news'],
        caseSensitive: false
      },
      // Filter messages from last 24 hours
      {
        type: 'date',
        field: 'date',
        condition: 'after',
        value: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];
  }
}