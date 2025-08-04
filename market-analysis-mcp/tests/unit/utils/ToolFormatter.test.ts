import { ToolFormatter } from '../../../src/utils/ToolFormatter';
import { MarketDataItem } from '../../../src/types/marketData';

describe('ToolFormatter', () => {
  let mockMarketDataItem: MarketDataItem;

  beforeEach(() => {
    mockMarketDataItem = {
      id: 'test-1',
      source: 'news',
      sourceDetails: {
        name: 'Test News Source',
        url: 'https://example.com',
        author: 'Test Author'
      },
      timestamp: new Date().toISOString(),
      title: 'Test Market News',
      content: 'This is test market content about stocks and trading.',
      summary: 'Test summary of market news',
      relevanceScore: 75,
      marketTags: ['earnings', 'tech'],
      symbols: ['AAPL', 'MSFT'],
      sentiment: 'positive'
    };
  });

  describe('formatMarketItem', () => {
    it('should format a complete market item correctly', () => {
      const result = ToolFormatter.formatMarketItem(mockMarketDataItem);
      
      expect(result).toContain('### 🔥 Test Market News');
      expect(result).toContain('**Source**: news');
      expect(result).toContain('**Relevance Score**: 🔥 75/100 (High)');
      expect(result).toContain('**Symbols**: AAPL, MSFT');
      expect(result).toContain('This is test market content');
    });

    it('should handle item without symbols', () => {
      const itemWithoutSymbols = { ...mockMarketDataItem, symbols: undefined };
      const result = ToolFormatter.formatMarketItem(itemWithoutSymbols);
      
      expect(result).not.toContain('**Symbols**:');
      expect(result).toContain('**Source**: news');
    });

    it('should handle empty symbols array', () => {
      const itemWithEmptySymbols = { ...mockMarketDataItem, symbols: [] };
      const result = ToolFormatter.formatMarketItem(itemWithEmptySymbols);
      
      expect(result).not.toContain('**Symbols**:');
    });

    it('should truncate long content', () => {
      const longContent = 'A'.repeat(500);
      const itemWithLongContent = { ...mockMarketDataItem, content: longContent };
      const result = ToolFormatter.formatMarketItem(itemWithLongContent);
      
      expect(result).toContain('...');
      expect(result.indexOf('A')).not.toBe(-1);
      // Should not contain the full 500 characters
      expect(result.split('A').length - 1).toBeLessThan(500);
    });

    it('should format different relevance scores with correct icons', () => {
      // High relevance
      const highRelevanceItem = { ...mockMarketDataItem, relevanceScore: 80 };
      const highResult = ToolFormatter.formatMarketItem(highRelevanceItem);
      expect(highResult).toContain('🔥');

      // Medium relevance
      const mediumRelevanceItem = { ...mockMarketDataItem, relevanceScore: 50 };
      const mediumResult = ToolFormatter.formatMarketItem(mediumRelevanceItem);
      expect(mediumResult).toContain('📊');

      // Low relevance
      const lowRelevanceItem = { ...mockMarketDataItem, relevanceScore: 25 };
      const lowResult = ToolFormatter.formatMarketItem(lowRelevanceItem);
      expect(lowResult).toContain('📋');

      // Minimal relevance
      const minimalRelevanceItem = { ...mockMarketDataItem, relevanceScore: 10 };
      const minimalResult = ToolFormatter.formatMarketItem(minimalRelevanceItem);
      expect(minimalResult).toContain('📄');
    });
  });

  describe('formatRelevanceScore', () => {
    it('should format high relevance scores correctly', () => {
      const result = ToolFormatter.formatRelevanceScore(85);
      expect(result).toBe('🔥 85/100 (High)');
    });

    it('should format medium relevance scores correctly', () => {
      const result = ToolFormatter.formatRelevanceScore(55);
      expect(result).toBe('📊 55/100 (Medium)');
    });

    it('should format low relevance scores correctly', () => {
      const result = ToolFormatter.formatRelevanceScore(30);
      expect(result).toBe('📋 30/100 (Low)');
    });

    it('should format minimal relevance scores correctly', () => {
      const result = ToolFormatter.formatRelevanceScore(15);
      expect(result).toBe('📄 15/100 (Minimal)');
    });

    it('should round decimal scores', () => {
      const result = ToolFormatter.formatRelevanceScore(67.8);
      expect(result).toBe('📊 68/100 (Medium)');
    });

    it('should handle edge cases', () => {
      expect(ToolFormatter.formatRelevanceScore(0)).toBe('📄 0/100 (Minimal)');
      expect(ToolFormatter.formatRelevanceScore(100)).toBe('🔥 100/100 (High)');
      expect(ToolFormatter.formatRelevanceScore(70)).toBe('🔥 70/100 (High)');
      expect(ToolFormatter.formatRelevanceScore(40)).toBe('📊 40/100 (Medium)');
      expect(ToolFormatter.formatRelevanceScore(20)).toBe('📋 20/100 (Low)');
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error with context', () => {
      const error = new Error('Test error message');
      const result = ToolFormatter.formatErrorResponse(error, 'news service');
      
      expect(result).toContain('❌ **Error in news service**');
      expect(result).toContain('Test error message');
      expect(result).toContain('*Please check your configuration and try again.*');
    });

    it('should format error without context', () => {
      const error = new Error('Test error message');
      const result = ToolFormatter.formatErrorResponse(error);
      
      expect(result).toContain('❌ **Error**');
      expect(result).toContain('Test error message');
    });
  });

  describe('generateMarkdownSummary', () => {
    it('should generate summary for empty items array', () => {
      const result = ToolFormatter.generateMarkdownSummary([], 'Test Report');
      
      expect(result).toContain('# Test Report');
      expect(result).toContain('**Status**: No items found');
      expect(result).toContain('*Try adjusting your search parameters');
    });

    it('should generate summary with timeframe', () => {
      const items = [mockMarketDataItem];
      const result = ToolFormatter.generateMarkdownSummary(items, 'Test Report', '24 hours');
      
      expect(result).toContain('# Test Report');
      expect(result).toContain('**Timeframe**: 24 hours');
      expect(result).toContain('**Items Found**: 1');
    });

    it('should group items by relevance categories', () => {
      const highRelevanceItem = { ...mockMarketDataItem, relevanceScore: 80, id: 'high-1' };
      const mediumRelevanceItem = { ...mockMarketDataItem, relevanceScore: 50, id: 'medium-1' };
      const lowRelevanceItem = { ...mockMarketDataItem, relevanceScore: 25, id: 'low-1' };
      
      const items = [highRelevanceItem, mediumRelevanceItem, lowRelevanceItem];
      const result = ToolFormatter.generateMarkdownSummary(items, 'Test Report');
      
      expect(result).toContain('## 🔥 High Relevance Items');
      expect(result).toContain('## 📊 Medium Relevance Items');
      expect(result).toContain('## 📋 Additional Items');
    });

    it('should include metrics when requested', () => {
      const items = [mockMarketDataItem];
      const result = ToolFormatter.generateMarkdownSummary(items, 'Test Report', undefined, true);
      
      expect(result).toContain('## 📈 Summary Metrics');
      expect(result).toContain('**Average Relevance**:');
      expect(result).toContain('**Sources**:');
      expect(result).toContain('**Symbols Mentioned**:');
      expect(result).toContain('**Sentiment**:');
    });

    it('should exclude metrics when not requested', () => {
      const items = [mockMarketDataItem];
      const result = ToolFormatter.generateMarkdownSummary(items, 'Test Report', undefined, false);
      
      expect(result).not.toContain('## 📈 Summary Metrics');
    });

    it('should limit low relevance items display', () => {
      const lowRelevanceItems = Array.from({ length: 10 }, (_, i) => ({
        ...mockMarketDataItem,
        id: `low-${i}`,
        relevanceScore: 10,
        title: `Low relevance item ${i}`
      }));
      
      const result = ToolFormatter.generateMarkdownSummary(lowRelevanceItems, 'Test Report');
      
      // Should not include additional items section for more than 5 low relevance items
      expect(result).not.toContain('## 📋 Additional Items');
    });
  });

  describe('generateMetrics', () => {
    it('should generate metrics for multiple items', () => {
      const items = [
        mockMarketDataItem,
        { ...mockMarketDataItem, id: 'test-2', relevanceScore: 60, symbols: ['GOOGL'], sentiment: 'negative' as const }
      ];
      
      const result = ToolFormatter.generateMetrics(items);
      
      expect(result).toContain('## 📈 Summary Metrics');
      expect(result).toContain('**Average Relevance**: 68/100');
      expect(result).toContain('**Sources**: 1');
      expect(result).toContain('**Symbols Mentioned**: 3');
      expect(result).toContain('**Sentiment**: 1+ / 1- / 0=');
    });

    it('should handle empty items array', () => {
      const result = ToolFormatter.generateMetrics([]);
      expect(result).toBe('');
    });

    it('should handle items without symbols or sentiment', () => {
      const itemWithoutExtras = {
        ...mockMarketDataItem,
        symbols: undefined,
        sentiment: undefined
      };
      
      const result = ToolFormatter.generateMetrics([itemWithoutExtras]);
      
      expect(result).toContain('**Symbols Mentioned**: 0');
      expect(result).toContain('**Sentiment**: 0+ / 0- / 0=');
    });
  });

  describe('formatTimeframe', () => {
    it('should format minutes correctly', () => {
      expect(ToolFormatter.formatTimeframe(0.5)).toBe('30 minutes');
      expect(ToolFormatter.formatTimeframe(0.25)).toBe('15 minutes');
    });

    it('should format hours correctly', () => {
      expect(ToolFormatter.formatTimeframe(1)).toBe('1 hour');
      expect(ToolFormatter.formatTimeframe(2)).toBe('2 hours');
      expect(ToolFormatter.formatTimeframe(12)).toBe('12 hours');
    });

    it('should format days correctly', () => {
      expect(ToolFormatter.formatTimeframe(24)).toBe('1 day');
      expect(ToolFormatter.formatTimeframe(48)).toBe('2 days');
      expect(ToolFormatter.formatTimeframe(120)).toBe('5 days');
    });

    it('should format weeks correctly', () => {
      expect(ToolFormatter.formatTimeframe(168)).toBe('1 week');
      expect(ToolFormatter.formatTimeframe(336)).toBe('2 weeks');
    });
  });

  describe('formatSymbols', () => {
    it('should format small symbol arrays', () => {
      expect(ToolFormatter.formatSymbols(['AAPL'])).toBe('AAPL');
      expect(ToolFormatter.formatSymbols(['AAPL', 'MSFT'])).toBe('AAPL, MSFT');
      expect(ToolFormatter.formatSymbols(['AAPL', 'MSFT', 'GOOGL'])).toBe('AAPL, MSFT, GOOGL');
    });

    it('should truncate large symbol arrays', () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      const result = ToolFormatter.formatSymbols(symbols);
      expect(result).toBe('AAPL, MSFT, GOOGL and 2 more');
    });

    it('should handle empty arrays', () => {
      expect(ToolFormatter.formatSymbols([])).toBe('');
      expect(ToolFormatter.formatSymbols(undefined as any)).toBe('');
    });
  });

  describe('createSectionHeader', () => {
    it('should create section header with default icon', () => {
      const result = ToolFormatter.createSectionHeader('Test Section');
      expect(result).toBe('## 📊 Test Section\n\n');
    });

    it('should create section header with custom icon', () => {
      const result = ToolFormatter.createSectionHeader('Test Section', '🚀');
      expect(result).toBe('## 🚀 Test Section\n\n');
    });
  });

  describe('formatItemCount', () => {
    it('should handle zero items', () => {
      expect(ToolFormatter.formatItemCount(0, 'item')).toBe('No items found');
    });

    it('should handle single item', () => {
      expect(ToolFormatter.formatItemCount(1, 'item')).toBe('1 item');
    });

    it('should handle multiple items', () => {
      expect(ToolFormatter.formatItemCount(5, 'item')).toBe('5 items');
    });
  });

  describe('generateSourceBreakdown', () => {
    it('should generate source breakdown', () => {
      const items = [
        { ...mockMarketDataItem, source: 'news' as const },
        { ...mockMarketDataItem, source: 'news' as const },
        { ...mockMarketDataItem, source: 'podcast' as const }
      ];
      
      const result = ToolFormatter.generateSourceBreakdown(items);
      
      expect(result).toContain('**news**: 2');
      expect(result).toContain('**podcast**: 1');
    });

    it('should sort sources by count', () => {
      const items = [
        { ...mockMarketDataItem, source: 'podcast' as const },
        { ...mockMarketDataItem, source: 'news' as const },
        { ...mockMarketDataItem, source: 'news' as const }
      ];
      
      const result = ToolFormatter.generateSourceBreakdown(items);
      const lines = result.split('\n');
      
      expect(lines[0]).toContain('news');
      expect(lines[1]).toContain('podcast');
    });
  });

  describe('generateLoadingMessage', () => {
    it('should generate loading message', () => {
      const result = ToolFormatter.generateLoadingMessage('Fetching data');
      expect(result).toBe('🔄 Fetching data...\n\n*This may take a moment while we gather the latest data.*');
    });
  });

  describe('generateSuccessMessage', () => {
    it('should generate success message for single item', () => {
      const result = ToolFormatter.generateSuccessMessage('Data fetch', 1);
      expect(result).toBe('✅ Data fetch completed successfully! Found 1 item.');
    });

    it('should generate success message for multiple items', () => {
      const result = ToolFormatter.generateSuccessMessage('Data fetch', 5);
      expect(result).toBe('✅ Data fetch completed successfully! Found 5 items.');
    });
  });

  describe('private helper methods', () => {
    it('should format time ago correctly', () => {
      const now = new Date();
      const minutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const hoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const daysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      const minutesItem = { ...mockMarketDataItem, timestamp: minutesAgo.toISOString() };
      const hoursItem = { ...mockMarketDataItem, timestamp: hoursAgo.toISOString() };
      const daysItem = { ...mockMarketDataItem, timestamp: daysAgo.toISOString() };
      
      const minutesResult = ToolFormatter.formatMarketItem(minutesItem);
      const hoursResult = ToolFormatter.formatMarketItem(hoursItem);
      const daysResult = ToolFormatter.formatMarketItem(daysItem);
      
      expect(minutesResult).toContain('minutes ago');
      expect(hoursResult).toContain('hours ago');
      expect(daysResult).toContain('days ago');
    });

    it('should handle invalid timestamps gracefully', () => {
      const invalidItem = { ...mockMarketDataItem, timestamp: 'invalid-timestamp' };
      const result = ToolFormatter.formatMarketItem(invalidItem);
      
      expect(result).toContain('Invalid Date');
    });

    it('should truncate content at word boundaries when possible', () => {
      const longContent = 'A'.repeat(400) + ' This content should be truncated because it exceeds the maximum length limit of 300 characters that is set in the formatting function';
      const itemWithLongContent = { ...mockMarketDataItem, content: longContent };
      const result = ToolFormatter.formatMarketItem(itemWithLongContent);
      
      expect(result).toContain('...');
      // Should not contain the full 400+ character content
      expect(result.length).toBeLessThan(longContent.length + 100);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null or undefined input gracefully', () => {
      const nullItem = null as any;
      expect(() => ToolFormatter.formatMarketItem(nullItem)).toThrow();
    });

    it('should handle missing required fields', () => {
      const incompleteItem = {
        title: 'Test',
        source: 'Test Source'
      } as any;
      
      expect(() => ToolFormatter.formatMarketItem(incompleteItem)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const result = ToolFormatter.formatRelevanceScore(999999);
      expect(result).toContain('🔥 999999/100 (High)');
    });

    it('should handle negative scores', () => {
      const result = ToolFormatter.formatRelevanceScore(-10);
      expect(result).toContain('📄 -10/100 (Minimal)');
    });
  });
});