export interface TelegramMessage {
  id: number;
  text?: string;
  date: Date;
  from?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  } | undefined;
  chat: {
    id: number;
    title?: string;
    type: string;
  };
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
  }>;
}

export interface FilterRule {
  type: 'keyword' | 'regex' | 'entity' | 'date' | 'custom';
  field: 'text' | 'from' | 'date' | 'entities' | 'all';
  condition: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'matches' | 'before' | 'after' | 'between';
  value: string | string[] | Date | Date[] | RegExp;
  caseSensitive?: boolean;
}

export interface FilteredData {
  originalMessage: TelegramMessage;
  extractedData: {
    [key: string]: any;
  };
  matchedRules: FilterRule[];
  priority: number;
}