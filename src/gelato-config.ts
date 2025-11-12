import type { TelegramMessage, FilterRule, FilteredData } from '../src/types.js';

/**
 * Gelato-specific configuration for flavor tracking
 */

// Define all possible gelato flavors with their variations/translations
export const GELATO_FLAVORS = {
  'Premium Rice': ['Premium Rice', '五常大米', 'rice'],
  'Pistachio': ['Pistachio', '开心果', 'pistachio'],
  'Kiwi': ['Kiwi', '奇异果', 'kiwi'],
  'Durian': ['Durian', '榴莲', 'durian'],
  'Vanilla': ['Vanilla', '香草', 'vanilla'],
  'Earl Grey Tea': ['Earl Grey Tea', '伯爵茶', 'earl grey'],
  'Matcha': ['Matcha', '抹茶', 'matcha'],
  'Dark Chocolate': ['Dark Chocolate', '黑巧克力', 'dark chocolate', 'chocolate'],
  'Sea Salt Caramel': ['Sea Salt Caramel', '海盐焦糖', 'caramel'],
  'Honey Jasmine': ['Honey Jasmine', '蜂蜜茉莉', 'jasmine', 'honey'],
  'Hazelnut Chocolate': ['Hazelnut Chocolate', '榛果巧克力', 'hazelnut'],
  'Black Tea': ['Black Tea', '红茶', 'black tea'],
  'Hawthorn': ['Hawthorn', '山楂', 'hawthorn']
};

// Filter rules specific to gelato flavor announcements
export const gelatoFilters: FilterRule[] = [
  // Filter messages that contain "Today's" and "Gelato" or "Flavors"
  {
    type: 'keyword',
    field: 'text',
    condition: 'contains',
    value: ['Today\'s', '今日', 'Gelato', 'Flavors', '口味'],
    caseSensitive: false
  },
  
  // Filter messages with sparkle emoji (common in announcements)
  {
    type: 'keyword',
    field: 'text',
    condition: 'contains',
    value: ['✨'],
    caseSensitive: true
  },
  
  // Filter messages with ice cream/gelato emojis
  {
    type: 'keyword',
    field: 'text',
    condition: 'contains',
    value: ['🍨', '🍦', '🍧'],
    caseSensitive: true
  }
];

// Custom data extractor for gelato flavors
export const gelatoExtractors = {
  // Extract date from the message
  extractDate: (message: TelegramMessage) => {
    const text = message.text || '';
    
    // Look for date patterns like "10/11/25", "10-11-25", etc.
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g
    ];
    
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        try {
          const dateStr = matches[0];
          // Parse and format the date
          const parts = dateStr.split(/[\/\-]/);
          if (parts.length === 3) {
            let [day, month, year] = parts;
            
            // Handle 2-digit years
            if (year && year.length === 2) {
              year = '20' + year;
            }
            
            // Ensure all parts exist
            if (day && month && year) {
              // Create date and format as DD-MMM-YYYY
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              
              return `${day}-${months[date.getMonth()]}-${year}`;
            }
          }
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }
    }
    
    // If no date found in message, use message date
    const msgDate = message.date;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${msgDate.getDate()}-${months[msgDate.getMonth()]}-${msgDate.getFullYear()}`;
  },

  // Extract available flavors from the message
  extractFlavors: (message: TelegramMessage) => {
    const text = message.text || '';
    const availableFlavors: { [key: string]: boolean } = {};
    
    // Initialize all flavors as not available
    Object.keys(GELATO_FLAVORS).forEach(flavor => {
      availableFlavors[flavor] = false;
    });
    
    // Check each flavor and its variations
    Object.entries(GELATO_FLAVORS).forEach(([flavorName, variations]) => {
      const found = variations.some(variation => {
        // Case-insensitive search for flavor variations
        return text.toLowerCase().includes(variation.toLowerCase());
      });
      
      if (found) {
        availableFlavors[flavorName] = true;
      }
    });
    
    return availableFlavors;
  },

  // Extract day of week
  extractDayOfWeek: (message: TelegramMessage) => {
    const text = message.text || '';
    
    // First try to find date and calculate day of week
    const extractDate = gelatoExtractors.extractDate(message);
    if (extractDate) {
      try {
        // Parse the date format "DD-MMM-YYYY"
        const parts = extractDate.split('-');
        if (parts.length === 3) {
          const [day, monthStr, year] = parts;
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          if (day && monthStr && year) {
            const monthIndex = months.indexOf(monthStr);
            
            if (monthIndex !== -1) {
              const date = new Date(parseInt(year), monthIndex, parseInt(day));
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 
                           'Thursday', 'Friday', 'Saturday'];
              return days[date.getDay()];
            }
          }
        }
      } catch (error) {
        console.error('Error calculating day of week:', error);
      }
    }
    
    return '';
  }
};

// Custom function to format data for the specific spreadsheet structure
export function formatGelatoData(filteredData: FilteredData): any[] {
  const { extractedData } = filteredData;
  
  const extractedDate = extractedData.extractDate || '';
  const dayOfWeek = extractedData.extractDayOfWeek || '';
  const flavors = extractedData.extractFlavors || {};
  
  // Create row data matching the spreadsheet columns
  return [
    extractedDate,                    // Date
    dayOfWeek,                       // Day of week
    flavors['Premium Rice'] ? 'Yes' : 'No',     // Premium Rice
    flavors['Pistachio'] ? 'Yes' : 'No',        // Pistachio
    flavors['Kiwi'] ? 'Yes' : 'No',             // Kiwi
    flavors['Durian'] ? 'Yes' : 'No',           // Durian
    flavors['Vanilla'] ? 'Yes' : 'No',          // Vanilla
    flavors['Earl Grey Tea'] ? 'Yes' : 'No',    // Earl Grey Tea
    flavors['Matcha'] ? 'Yes' : 'No',           // Matcha
    flavors['Dark Chocolate'] ? 'Yes' : 'No',   // Dark Chocolate
    flavors['Sea Salt Caramel'] ? 'Yes' : 'No', // Sea Salt Caramel
    flavors['Honey Jasmine'] ? 'Yes' : 'No',    // Honey Jasmine
    flavors['Hazelnut Chocolate'] ? 'Yes' : 'No', // Hazelnut Chocolate
    flavors['Black Tea'] ? 'Yes' : 'No',        // Black Tea
    flavors['Hawthorn'] ? 'Yes' : 'No'          // Hawthorn
  ];
}