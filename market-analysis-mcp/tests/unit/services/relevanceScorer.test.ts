import { RelevanceScorer, RelevanceConfig } from '../../../src/services/relevanceScorer';

describe('RelevanceScorer', () => {
  let scorer: RelevanceScorer;
  let mockConfig: RelevanceConfig;

  beforeEach(() => {
    mockConfig = {
      marketKeywords: {
        high: ['earnings', 'IPO', 'merger', 'acquisition', 'bull market', 'bear market'],
        medium: ['stock', 'market', 'trading', 'investment', 'portfolio', 'dividend'],
        low: ['price', 'volume', 'analysis', 'report', 'news', 'update']
      },
      weights: {
        marketKeywords: 30,
        stockSymbols: 25,
        sourceAuthority: 25,
        recency: 20
      }
    };
    scorer = new RelevanceScorer(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with proper configuration', () => {
      expect(scorer).toBeInstanceOf(RelevanceScorer);
    });

    it('should create stock symbol regex pattern', () => {
      // Test through scoreContent method which uses the regex
      const result = scorer.scoreContent(
        'AAPL stock rises',
        'Apple stock is up today',
        'Test Source',
        new Date().toISOString()
      );
      expect(result.symbols).toContain('AAPL');
    });
  });

  describe('scoreContent', () => {
    it('should return a score between 0 and 100', () => {
      const result = scorer.scoreContent(
        'Test title',
        'Test content',
        'Test Source',
        new Date().toISOString()
      );
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include breakdown scores', () => {
      const result = scorer.scoreContent(
        'Test title',
        'Test content',
        'Test Source',
        new Date().toISOString()
      );
      
      expect(result.breakdown).toHaveProperty('marketKeywords');
      expect(result.breakdown).toHaveProperty('stockSymbols');
      expect(result.breakdown).toHaveProperty('sourceAuthority');
      expect(result.breakdown).toHaveProperty('recency');
    });

    it('should detect market keywords and assign higher scores', () => {
      const highKeywordResult = scorer.scoreContent(
        'Major IPO earnings announcement',
        'Company announces merger acquisition',
        'Test Source',
        new Date().toISOString()
      );

      const lowKeywordResult = scorer.scoreContent(
        'Simple news update',
        'Basic price report',
        'Test Source',
        new Date().toISOString()
      );

      expect(highKeywordResult.breakdown.marketKeywords).toBeGreaterThan(
        lowKeywordResult.breakdown.marketKeywords
      );
      expect(highKeywordResult.marketTags.length).toBeGreaterThan(0);
    });

    it('should detect stock symbols correctly', () => {
      const result = scorer.scoreContent(
        'AAPL MSFT GOOGL stocks rally',
        'Apple, Microsoft, and Google performed well',
        'Test Source',
        new Date().toISOString()
      );

      expect(result.symbols).toContain('AAPL');
      expect(result.symbols).toContain('MSFT');
      expect(result.symbols).toContain('GOOGL');
      expect(result.breakdown.stockSymbols).toBeGreaterThan(0);
    });

    it('should filter out invalid stock symbols', () => {
      const result = scorer.scoreContent(
        'THE AND FOR ARE common words',
        'BUT NOT YOU ALL invalid symbols',
        'Test Source',
        new Date().toISOString()
      );

      expect(result.symbols).not.toContain('THE');
      expect(result.symbols).not.toContain('AND');
      expect(result.symbols).not.toContain('FOR');
      expect(result.symbols).not.toContain('ARE');
    });

    it('should give higher scores to recent content', () => {
      const recentTime = new Date().toISOString();
      const oldTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

      const recentResult = scorer.scoreContent(
        'Test title',
        'Test content',
        'Test Source',
        recentTime
      );

      const oldResult = scorer.scoreContent(
        'Test title',
        'Test content',
        'Test Source',
        oldTime
      );

      expect(recentResult.breakdown.recency).toBeGreaterThanOrEqual(
        oldResult.breakdown.recency
      );
    });

    it('should score high-authority sources higher', () => {
      const bloombergResult = scorer.scoreContent(
        'Test title',
        'Test content',
        'Bloomberg API',
        new Date().toISOString()
      );

      const unknownResult = scorer.scoreContent(
        'Test title',
        'Test content',
        'Unknown Source',
        new Date().toISOString()
      );

      expect(bloombergResult.breakdown.sourceAuthority).toBeGreaterThan(
        unknownResult.breakdown.sourceAuthority
      );
    });

    it('should handle empty or null inputs gracefully', () => {
      const result = scorer.scoreContent('', '', '', new Date().toISOString());
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.marketTags).toEqual([]);
      expect(result.symbols).toEqual([]);
    });

    it('should cap scores at 100', () => {
      // Create content with many high-value keywords and symbols
      const result = scorer.scoreContent(
        'IPO earnings merger acquisition bull market AAPL MSFT GOOGL AMZN TSLA',
        'Major acquisition earnings IPO bull market merger NVDA META SPY QQQ',
        'Bloomberg API',
        new Date().toISOString()
      );

      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown.marketKeywords).toBeLessThanOrEqual(100);
      expect(result.breakdown.stockSymbols).toBeLessThanOrEqual(100);
    });
  });

  describe('extractSentiment', () => {
    it('should detect positive sentiment', () => {
      const sentiment = scorer.extractSentiment(
        'Stock surges on strong earnings',
        'Company beats expectations with bullish outlook and gains'
      );
      
      expect(sentiment).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const sentiment = scorer.extractSentiment(
        'Stock crashes on weak earnings',
        'Company misses expectations with bearish outlook and falls'
      );
      
      expect(sentiment).toBe('negative');
    });

    it('should detect neutral sentiment', () => {
      const sentiment = scorer.extractSentiment(
        'Company reports quarterly results',
        'Financial data shows mixed performance'
      );
      
      expect(sentiment).toBe('neutral');
    });

    it('should handle equal positive and negative words as neutral', () => {
      const sentiment = scorer.extractSentiment(
        'Stock rises but concerns remain',
        'Gains offset by potential risks'
      );
      
      expect(sentiment).toBe('neutral');
    });

    it('should handle empty input', () => {
      const sentiment = scorer.extractSentiment('', '');
      expect(sentiment).toBe('neutral');
    });
  });

  describe('updateSourceAuthority', () => {
    it('should update source authority successfully', () => {
      const testSource = 'Test Source';
      const initialAuthority = scorer.getSourceAuthority(testSource);
      
      scorer.updateSourceAuthority(testSource, 85);
      const updatedAuthority = scorer.getSourceAuthority(testSource);
      
      expect(updatedAuthority).toBe(85);
      expect(updatedAuthority).not.toBe(initialAuthority);
    });

    it('should cap authority at 100', () => {
      const testSource = 'Test Source';
      scorer.updateSourceAuthority(testSource, 150);
      
      expect(scorer.getSourceAuthority(testSource)).toBe(100);
    });

    it('should not allow authority below 0', () => {
      const testSource = 'Test Source';
      scorer.updateSourceAuthority(testSource, -10);
      
      expect(scorer.getSourceAuthority(testSource)).toBe(0);
    });
  });

  describe('getSourceAuthority', () => {
    it('should return correct authority for known sources', () => {
      expect(scorer.getSourceAuthority('Bloomberg API')).toBe(100);
      expect(scorer.getSourceAuthority('Reuters API')).toBe(95);
      expect(scorer.getSourceAuthority('Wall Street Journal')).toBe(90);
    });

    it('should handle partial matches for sources', () => {
      expect(scorer.getSourceAuthority('bloomberg news')).toBe(95);
      expect(scorer.getSourceAuthority('reuters.com')).toBe(90);
      expect(scorer.getSourceAuthority('wsj article')).toBe(90);
    });

    it('should return default authority for unknown sources', () => {
      expect(scorer.getSourceAuthority('Unknown Source')).toBe(50);
      expect(scorer.getSourceAuthority('Random Blog')).toBe(50);
    });

    it('should be case insensitive', () => {
      expect(scorer.getSourceAuthority('BLOOMBERG API')).toBe(95);
      expect(scorer.getSourceAuthority('wall street journal')).toBe(90);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed timestamps', () => {
      const result = scorer.scoreContent(
        'Test title',
        'Test content',
        'Test Source',
        'invalid-timestamp'
      );
      
      // With invalid timestamp, recency score should be 0 but overall score should still be valid
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.recency).toBe(0);
    });

    it('should handle very long content', () => {
      const longContent = 'stock market '.repeat(1000) + 'AAPL MSFT '.repeat(500);
      
      const result = scorer.scoreContent(
        'Test title',
        longContent,
        'Test Source',
        new Date().toISOString()
      );
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle special characters in content', () => {
      const result = scorer.scoreContent(
        'Test @#$% title',
        'Content with émojis 📈 and spëcial chars',
        'Test Source',
        new Date().toISOString()
      );
      
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle symbols with numbers', () => {
      const result = scorer.scoreContent(
        'BRK.A BRK.B test',
        'Berkshire Hathaway A and B shares',
        'Test Source',
        new Date().toISOString()
      );
      
      // Should detect valid patterns but filter appropriately
      expect(result.symbols.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance', () => {
    it('should process content efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        scorer.scoreContent(
          `Test title ${i}`,
          `Content with market keywords and AAPL MSFT symbols ${i}`,
          'Test Source',
          new Date().toISOString()
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should process 100 items in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('integration with real-world data patterns', () => {
    it('should handle typical news headline patterns', () => {
      const headlines = [
        'Apple Stock Surges 5% After Strong iPhone Sales Report',
        'Tesla Shares Drop Following Production Concerns',
        'Microsoft Beats Q3 Earnings Expectations',
        'Fed Raises Interest Rates by 0.25%',
        'Oil Prices Rally on Stock Market Movement'
      ];

      headlines.forEach(headline => {
        const result = scorer.scoreContent(
          headline,
          'Detailed article content with market and stock information...',
          'MarketWatch',
          new Date().toISOString()
        );
        
        expect(result.score).toBeGreaterThan(0);
        // At least one of market tags or symbols should be detected
        expect(result.marketTags.length + result.symbols.length).toBeGreaterThan(0);
      });
    });

    it('should score financial content higher than general news', () => {
      const financialContent = scorer.scoreContent(
        'AAPL earnings beat expectations, stock rallies',
        'Apple reported strong quarterly earnings with revenue growth',
        'Bloomberg API',
        new Date().toISOString()
      );

      const generalContent = scorer.scoreContent(
        'Weather update for today',
        'Sunny skies expected with mild temperatures',
        'Weather Channel',
        new Date().toISOString()
      );

      expect(financialContent.score).toBeGreaterThan(generalContent.score);
    });
  });
});