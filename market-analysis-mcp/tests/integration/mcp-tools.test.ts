/**
 * Integration tests for MCP tools functionality
 * Tests the complete flow from tool invocation through service layers
 */

import { NewsTools } from '../../src/tools/news';
import { SearchTools } from '../../src/tools/search';
import { UnifiedTools } from '../../src/tools/unified';
import { NewsService } from '../../src/services/newsService';
import { RelevanceScorer } from '../../src/services/relevanceScorer';
import { CacheManager } from '../../src/utils/cache';
import { RateLimiter } from '../../src/utils/rateLimiter';
import { MarketDataItem } from '../../src/types/marketData';
import * as winston from 'winston';
import * as path from 'path';

describe('MCP Tools Integration', () => {
  let newsService: NewsService;
  let relevanceScorer: RelevanceScorer;
  let cache: CacheManager;
  let rateLimiter: RateLimiter;
  let logger: winston.Logger;
  let newsTools: NewsTools;
  let searchTools: SearchTools;
  let unifiedTools: UnifiedTools;

  const mockConfig = {
    news: {
      sources: [
        {
          name: 'Test News Source',
          type: 'rss' as const,
          endpoint: 'https://example.com/rss',
          auth: 'none' as const,
          rateLimit: '100/hour',
          enabled: true
        }
      ]
    },
    relevanceScoring: {
      marketKeywords: {
        high: ['earnings', 'IPO', 'merger', 'acquisition'],
        medium: ['stock', 'market', 'trading', 'investment'],
        low: ['price', 'volume', 'analysis', 'report']
      },
      weights: {
        marketKeywords: 30,
        stockSymbols: 25,
        sourceAuthority: 25,
        recency: 20
      }
    }
  };

  beforeAll(async () => {
    // Initialize test database
    const testDbPath = path.join(__dirname, '../fixtures/test-integration.db');
    cache = new CacheManager(testDbPath);
    await cache.initializeDatabase();

    // Initialize other components
    rateLimiter = new RateLimiter();
    logger = winston.createLogger({
      level: 'error', // Reduce noise in tests
      transports: [new winston.transports.Console({ silent: true })]
    });

    relevanceScorer = new RelevanceScorer(mockConfig.relevanceScoring);
    newsService = new NewsService(mockConfig.news, cache, rateLimiter, logger);

    // Initialize tools
    newsTools = new NewsTools(newsService, relevanceScorer);
    searchTools = new SearchTools(cache, relevanceScorer);
    unifiedTools = new UnifiedTools(newsService, undefined, undefined, relevanceScorer);
  });

  afterAll(async () => {
    // Cleanup test database
    if (cache) {
      await cache.cleanup?.();
    }
  });

  describe('NewsTools Integration', () => {
    beforeEach(() => {
      // Mock the news service to return controlled data
      jest.spyOn(newsService, 'getNews').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'test-news-1',
            source: 'news',
            sourceDetails: {
              name: 'Test News Source',
              url: 'https://example.com'
            },
            timestamp: new Date().toISOString(),
            title: 'AAPL Earnings Beat Expectations',
            content: 'Apple Inc. reported strong quarterly earnings with revenue growth exceeding market expectations.',
            summary: 'Apple beats earnings expectations',
            relevanceScore: 0, // Will be calculated by relevanceScorer
            marketTags: [],
            symbols: ['AAPL'],
            sentiment: 'positive'
          } as MarketDataItem,
          {
            id: 'test-news-2',
            source: 'news',
            sourceDetails: {
              name: 'Test News Source',
              url: 'https://example.com'
            },
            timestamp: new Date().toISOString(),
            title: 'Market Analysis Update',
            content: 'General market analysis with some trading insights.',
            summary: 'Market analysis update',
            relevanceScore: 0,
            marketTags: [],
            symbols: [],
            sentiment: 'neutral'
          } as MarketDataItem
        ]
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should successfully fetch and format market news', async () => {
      const args = { timeframe: '24h', limit: 10 };
      const result = await newsTools.getMarketNews(args);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      const text = result.content[0].text;
      expect(text).toContain('Market News Summary');
      expect(text).toContain('AAPL Earnings Beat Expectations');
      expect(text).toContain('Items Found: 2');
    });

    it('should handle news service errors gracefully', async () => {
      jest.spyOn(newsService, 'getNews').mockResolvedValue({
        success: false,
        error: 'Service unavailable'
      });

      const args = { timeframe: '24h', limit: 10 };
      const result = await newsTools.getMarketNews(args);

      expect(result.content[0].text).toContain('❌ **Error in fetching news**');
      expect(result.content[0].text).toContain('Service unavailable');
    });

    it('should handle empty news results', async () => {
      jest.spyOn(newsService, 'getNews').mockResolvedValue({
        success: true,
        data: []
      });

      const args = { timeframe: '24h', limit: 10 };
      const result = await newsTools.getMarketNews(args);

      const text = result.content[0].text;
      expect(text).toContain('Market News Summary');
      expect(text).toContain('No items found');
    });

    it('should filter news by symbols when specified', async () => {
      const args = { timeframe: '24h', symbols: ['AAPL'], limit: 10 };
      const result = await newsTools.getMarketNews(args);

      expect(newsService.getNews).toHaveBeenCalledWith('24h', ['AAPL'], 10);
    });

    it('should apply relevance scoring and sorting', async () => {
      const args = { timeframe: '24h', limit: 10 };
      const result = await newsTools.getMarketNews(args);

      const text = result.content[0].text;
      // The AAPL earnings news should score higher due to earnings keyword and AAPL symbol
      expect(text.indexOf('AAPL Earnings')).toBeLessThan(text.indexOf('Market Analysis'));
    });
  });

  describe('SearchTools Integration', () => {
    beforeEach(async () => {
      // Pre-populate cache with test data
      const testItems = [
        {
          id: 'search-test-1',
          source: 'news',
          sourceDetails: { name: 'Test Source' },
          timestamp: new Date().toISOString(),
          title: 'Tesla Stock Surges on Earnings',
          content: 'Tesla reports strong quarterly earnings with vehicle delivery growth.',
          summary: 'Tesla earnings strong',
          relevanceScore: 85,
          marketTags: ['earnings', 'automotive'],
          symbols: ['TSLA'],
          sentiment: 'positive'
        },
        {
          id: 'search-test-2',
          source: 'news',
          sourceDetails: { name: 'Test Source' },
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          title: 'Market Volatility Concerns',
          content: 'Analysts discuss market volatility and trading strategies.',
          summary: 'Market volatility analysis',
          relevanceScore: 60,
          marketTags: ['volatility', 'trading'],
          symbols: [],
          sentiment: 'neutral'
        }
      ];

      for (const item of testItems) {
        await cache.set(`market_data:${item.id}`, item, 3600);
      }

      // Mock cache search
      jest.spyOn(cache, 'searchMarketData').mockResolvedValue(testItems as MarketDataItem[]);
    });

    it('should search market data successfully', async () => {
      const args = {
        query: 'Tesla earnings',
        timeframe: '24h',
        minRelevance: 50,
        limit: 10
      };

      const result = await searchTools.searchMarketData(args);

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('Search Results');
      expect(result.content[0].text).toContain('Tesla Stock Surges');
      expect(result.content[0].text).toContain('Query: Tesla earnings');
    });

    it('should apply relevance filtering', async () => {
      const args = {
        query: 'market',
        timeframe: '24h',
        minRelevance: 70, // Should filter out the 60-score item
        limit: 10
      };

      const result = await searchTools.searchMarketData(args);
      const text = result.content[0].text;

      expect(text).toContain('Tesla Stock Surges'); // Score 85
      expect(text).not.toContain('Market Volatility Concerns'); // Score 60
    });

    it('should handle search errors gracefully', async () => {
      jest.spyOn(cache, 'searchMarketData').mockRejectedValue(new Error('Database error'));

      const args = { query: 'test', timeframe: '24h' };
      const result = await searchTools.searchMarketData(args);

      expect(result.content[0].text).toContain('❌ **Error in searching market data**');
      expect(result.content[0].text).toContain('Database error');
    });
  });

  describe('UnifiedTools Integration', () => {
    beforeEach(() => {
      // Mock news service for unified tools
      jest.spyOn(newsService, 'getNews').mockResolvedValue({
        success: true,
        data: [
          {
            id: 'unified-test-1',
            source: 'news',
            sourceDetails: { name: 'Financial Times' },
            timestamp: new Date().toISOString(),
            title: 'Fed Raises Interest Rates',
            content: 'Federal Reserve announces 0.25% rate increase amid inflation concerns.',
            summary: 'Fed rate hike announcement',
            relevanceScore: 90,
            marketTags: ['fed', 'rates', 'inflation'],
            symbols: [],
            sentiment: 'negative'
          } as MarketDataItem
        ]
      });
    });

    it('should create unified market snapshot', async () => {
      const args = { timeframe: '4h' };
      const result = await unifiedTools.getUnifiedSnapshot(args);

      expect(result).toHaveProperty('content');
      const text = result.content[0].text;

      expect(text).toContain('Unified Market Snapshot');
      expect(text).toContain('Fed Raises Interest Rates');
      expect(text).toContain('Summary Metrics');
      expect(text).toContain('Cross-Source Analysis');
    });

    it('should identify high-relevance alert items', async () => {
      const args = { timeframe: '4h', alertThreshold: 80 };
      const result = await unifiedTools.getUnifiedSnapshot(args);

      const text = result.content[0].text;
      expect(text).toContain('🚨 Alert Items'); // Should contain high-relevance section
      expect(text).toContain('Fed Raises Interest Rates'); // Score 90 > threshold 80
    });

    it('should handle partial service failures gracefully', async () => {
      // News service fails, but tool should still work with available data
      jest.spyOn(newsService, 'getNews').mockResolvedValue({
        success: false,
        error: 'News service unavailable'
      });

      const args = { timeframe: '4h' };
      const result = await unifiedTools.getUnifiedSnapshot(args);

      expect(result).toHaveProperty('content');
      const text = result.content[0].text;
      expect(text).toContain('Unified Market Snapshot');
      // Should still provide a snapshot even with failed services
    });
  });

  describe('Cross-Tool Data Flow', () => {
    it('should maintain data consistency across tools', async () => {
      // Test that data flows correctly between news retrieval and search
      const newsArgs = { timeframe: '24h', limit: 5 };
      const newsResult = await newsTools.getMarketNews(newsArgs);

      // Simulate data being cached by news service
      const mockCachedItems = [
        {
          id: 'flow-test-1',
          source: 'news',
          sourceDetails: { name: 'Test Source' },
          timestamp: new Date().toISOString(),
          title: 'Cross-tool Test Item',
          content: 'Test content for cross-tool verification.',
          summary: 'Test summary',
          relevanceScore: 75,
          marketTags: ['test'],
          symbols: ['TEST'],
          sentiment: 'neutral'
        } as MarketDataItem
      ];

      jest.spyOn(cache, 'searchMarketData').mockResolvedValue(mockCachedItems);

      const searchArgs = { query: 'Cross-tool', timeframe: '24h' };
      const searchResult = await searchTools.searchMarketData(searchArgs);

      // Both tools should work with consistent data structures
      expect(newsResult.content[0]).toHaveProperty('text');
      expect(searchResult.content[0]).toHaveProperty('text');
      expect(searchResult.content[0].text).toContain('Cross-tool Test Item');
    });

    it('should handle concurrent tool usage', async () => {
      // Test multiple tools running simultaneously
      const promises = [
        newsTools.getMarketNews({ timeframe: '24h', limit: 5 }),
        searchTools.searchMarketData({ query: 'test', timeframe: '24h' }),
        unifiedTools.getUnifiedSnapshot({ timeframe: '4h' })
      ];

      const results = await Promise.all(promises);

      // All tools should complete successfully
      results.forEach(result => {
        expect(result).toHaveProperty('content');
        expect(result.content[0]).toHaveProperty('text');
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete operations within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await newsTools.getMarketNews({ timeframe: '24h', limit: 10 });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);

    it('should handle rate limiting appropriately', async () => {
      // Test that rate limiter is respected
      const promises = Array.from({ length: 5 }, () => 
        newsTools.getMarketNews({ timeframe: '1h', limit: 5 })
      );

      const results = await Promise.allSettled(promises);
      
      // All should either succeed or be rate limited, not crash
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('content');
        }
      });
    });

    it('should maintain cache consistency', async () => {
      // Test that cache operations don't interfere with each other
      const cacheOps = [
        cache.set('test-key-1', { data: 'test1' }, 3600),
        cache.set('test-key-2', { data: 'test2' }, 3600),
        cache.get('test-key-1'),
        cache.get('test-key-2')
      ];

      const results = await Promise.all(cacheOps);
      
      // Cache operations should complete without conflicts
      expect(results[2]).toEqual({ data: 'test1' });
      expect(results[3]).toEqual({ data: 'test2' });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service failures', async () => {
      // First call fails
      jest.spyOn(newsService, 'getNews')
        .mockResolvedValueOnce({ success: false, error: 'Temporary failure' })
        .mockResolvedValueOnce({ success: true, data: [] });

      const args = { timeframe: '24h', limit: 10 };
      
      // First call should handle error gracefully
      const firstResult = await newsTools.getMarketNews(args);
      expect(firstResult.content[0].text).toContain('Error');

      // Second call should succeed
      const secondResult = await newsTools.getMarketNews(args);
      expect(secondResult.content[0].text).toContain('Market News Summary');
    });

    it('should validate input parameters', async () => {
      // Test invalid timeframe
      const invalidArgs = { timeframe: 'invalid', limit: 'not-a-number' };
      
      const result = await newsTools.getMarketNews(invalidArgs);
      
      // Should handle gracefully and not crash
      expect(result).toHaveProperty('content');
    });

    it('should handle database connection issues', async () => {
      // Mock database failure
      jest.spyOn(cache, 'searchMarketData').mockRejectedValue(new Error('Connection failed'));

      const args = { query: 'test', timeframe: '24h' };
      const result = await searchTools.searchMarketData(args);

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Connection failed');
    });
  });
});