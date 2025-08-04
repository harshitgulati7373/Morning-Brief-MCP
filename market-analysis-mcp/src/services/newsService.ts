import axios, { AxiosResponse } from 'axios';
import RSSParser from 'rss-parser';
import { Logger } from 'winston';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import { TimeUtils } from '../utils/timeUtils';
import { SecurityValidator } from '../utils/SecurityValidator';
import { ErrorHandler } from '../utils/ErrorHandler';
import { MarketDataItem, NewsSource, ProcessingResult } from '../types/marketData';
import { BaseService } from './BaseService';

interface NewsConfig {
  sources: NewsSource[];
}

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
}

export class NewsService extends BaseService {
  private rssParser: RSSParser;

  constructor(
    private config: NewsConfig,
    cache: CacheManager,
    rateLimiter: RateLimiter,
    logger: Logger
  ) {
    super(cache, rateLimiter, logger);
    this.rssParser = new RSSParser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Market-Analysis-MCP/1.0'
      }
    });
  }

  async getNews(
    timeframe: string = '24h',
    symbols?: string[],
    limit: number = 20
  ): Promise<ProcessingResult> {
    try {
      const cacheKey = this.generateCacheKey('news', { timeframe, symbols, limit });
      
      const data = await this.cacheOperation(cacheKey, async () => {
        return await this.fetchNewsData(timeframe, symbols, limit);
      }, TimeUtils.getOptimalCacheTTL('news'));

      this.logger.info(`Fetched ${data.length} news articles`);
      return { success: true, data };
    } catch (error) {
      this.handleError(error as Error, 'getNews');
      return { 
        success: false, 
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error fetching news' 
      };
    }
  }

  private async fetchNewsData(
    timeframe: string,
    symbols?: string[],
    limit: number = 20
  ): Promise<MarketDataItem[]> {
    const enabledSources = this.config.sources.filter(source => source.enabled);
    const allNews: MarketDataItem[] = [];

    // Fetch from all enabled sources
    for (const source of enabledSources) {
      try {
        const news = await this.fetchFromSource(source, timeframe);
        allNews.push(...news);
      } catch (error) {
        this.handleError(error as Error, `fetchFromSource:${source.name}`);
        // Continue with other sources
      }
    }

    // Filter by symbols if provided
    let filteredNews = allNews;
    if (symbols && symbols.length > 0) {
      filteredNews = allNews.filter(item => 
        symbols.some(symbol => 
          item.symbols?.includes(symbol) ||
          item.title.toUpperCase().includes(symbol) ||
          item.content.toUpperCase().includes(symbol)
        )
      );
    }

    // Filter by timeframe
    filteredNews = filteredNews.filter(item => 
      TimeUtils.isWithinTimeframe(item.timestamp, timeframe)
    );

    // Sort by relevance score and timestamp
    filteredNews.sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limit results
    return filteredNews.slice(0, limit);
  }

  private async fetchFromSource(source: NewsSource, timeframe: string): Promise<MarketDataItem[]> {
    const sourceId = `news-${source.name}`;
    
    return this.executeWithRateLimit(async () => {
      if (source.type === 'rss') {
        return this.fetchFromRSS(source);
      } else if (source.type === 'api') {
        return this.fetchFromAPI(source, timeframe);
      }
      throw new Error(`Unsupported source type: ${source.type}`);
    }, sourceId, source.rateLimit);
  }

  private async fetchFromRSS(source: NewsSource): Promise<MarketDataItem[]> {
    try {
      const feed = await this.rssParser.parseURL(source.endpoint);
      const items: MarketDataItem[] = [];

      for (const item of feed.items) {
        const newsItem = this.convertRSSItemToMarketData(item, source);
        if (newsItem) {
          items.push(newsItem);
        }
      }

      return items;
    } catch (error) {
      this.logger.error(`Error fetching RSS from ${source.name}:`, error);
      throw error;
    }
  }

  private async fetchFromAPI(source: NewsSource, timeframe: string): Promise<MarketDataItem[]> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Market-Analysis-MCP/1.0'
      };

      let params: Record<string, any> = {};
      let apiKey = '';

      // Configure API-specific parameters and authentication
      switch (source.name) {
        case 'NewsAPI.org':
          apiKey = process.env.NEWSAPI_ORG_API_KEY || '';
          if (!SecurityValidator.validateApiKey(apiKey)) {
            const error = ErrorHandler.createStructuredError(
              'INVALID_API_KEY',
              `Invalid or missing API key for ${source.name}`,
              { source: source.name }
            );
            throw new Error(`Invalid or missing API key for ${source.name}`);
          }
          params = {
            apiKey,
            q: 'stock market OR economy OR earnings OR fed OR trading OR nasdaq OR s&p OR dow OR stocks',
            domains: 'bloomberg.com,reuters.com,marketwatch.com,cnbc.com,wsj.com',
            sortBy: 'publishedAt',
            language: 'en',
            pageSize: 50,
            from: this.getTimeframeDate(timeframe)
          };
          break;

        case 'Alpha Vantage News':
          apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
          if (!SecurityValidator.validateApiKey(apiKey)) {
            const error = ErrorHandler.createStructuredError(
              'INVALID_API_KEY',
              `Invalid or missing API key for ${source.name}`,
              { source: source.name }
            );
            throw new Error(`Invalid or missing API key for ${source.name}`);
          }
          params = {
            function: 'NEWS_SENTIMENT',
            apikey: apiKey,
            topics: 'technology,finance,economy,real_estate,manufacturing,financial_markets',
            limit: 50,
            time_from: this.getTimeframeDate(timeframe)
          };
          break;

        case 'Financial Modeling Prep':
          apiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY || '';
          if (!SecurityValidator.validateApiKey(apiKey)) {
            const error = ErrorHandler.createStructuredError(
              'INVALID_API_KEY',
              `Invalid or missing API key for ${source.name}`,
              { source: source.name }
            );
            throw new Error(`Invalid or missing API key for ${source.name}`);
          }
          params = {
            apikey: apiKey,
            limit: 50
          };
          break;

        default:
          // Legacy API handling
          if (source.auth === 'bearer') {
            const envKey = `${source.name.toUpperCase().replace(/\s+/g, '_')}_API_KEY`;
            const legacyApiKey = process.env[envKey] || '';
            if (legacyApiKey && SecurityValidator.validateApiKey(legacyApiKey)) {
              headers['Authorization'] = `Bearer ${legacyApiKey}`;
            } else if (legacyApiKey) {
              const error = ErrorHandler.createStructuredError(
                'INVALID_API_KEY',
                `Invalid API key format for ${source.name}`,
                { source: source.name, envKey }
              );
              this.logger.warn('Invalid API key format detected', error);
            }
          }
          params = { limit: 50, timeframe: timeframe };
          break;
      }

      const response: AxiosResponse = await axios.get(source.endpoint, {
        headers,
        timeout: 10000,
        params
      });

      return this.convertAPIResponseToMarketData(response.data, source);
    } catch (error) {
      this.logger.error(`Error fetching from ${source.name} API:`, error);
      throw error;
    }
  }

  private getTimeframeDate(timeframe: string): string {
    const hours = TimeUtils.parseTimeframe(timeframe).hours;
    const date = new Date(Date.now() - hours * 60 * 60 * 1000);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private convertRSSItemToMarketData(item: RSSItem, source: NewsSource): MarketDataItem | null {
    if (!item.title || !item.pubDate) {
      return null;
    }

    const id = item.guid || item.link || `${source.name}-${Date.now()}-${Math.random()}`;
    const timestamp = new Date(item.pubDate).toISOString();
    const content = item.content || item.contentSnippet || '';

    return {
      id,
      source: 'news',
      sourceDetails: {
        name: source.name,
        url: item.link,
        author: item.creator
      },
      timestamp,
      title: item.title,
      content,
      summary: this.generateSummary(content),
      relevanceScore: 0, // Will be calculated by RelevanceScorer
      marketTags: [],
      symbols: [],
      sentiment: undefined
    };
  }

  private convertAPIResponseToMarketData(data: any, source: NewsSource): MarketDataItem[] {
    const items: MarketDataItem[] = [];

    try {
      let articles: any[] = [];

      // Handle different API response formats
      switch (source.name) {
        case 'NewsAPI.org':
          articles = data.articles || [];
          break;

        case 'Alpha Vantage News':
          articles = data.feed || [];
          break;

        case 'Financial Modeling Prep':
          articles = Array.isArray(data) ? data : [];
          break;

        default:
          // Generic handling
          articles = Array.isArray(data) ? data : data.articles || data.data || [];
          break;
      }

      for (const article of articles) {
        let item: MarketDataItem;

        switch (source.name) {
          case 'NewsAPI.org':
            item = {
              id: `newsapi-${Date.now()}-${Math.random()}`,
              source: 'news',
              sourceDetails: {
                name: source.name,
                url: article.url,
                author: article.author
              },
              timestamp: new Date(article.publishedAt).toISOString(),
              title: article.title || '',
              content: article.content || article.description || '',
              summary: this.generateSummary(article.content || article.description || ''),
              relevanceScore: 0,
              marketTags: [],
              symbols: [],
              sentiment: undefined
            };
            break;

          case 'Alpha Vantage News':
            item = {
              id: `alphavantage-${Date.now()}-${Math.random()}`,
              source: 'news',
              sourceDetails: {
                name: source.name,
                url: article.url,
                author: article.authors?.[0] || 'Alpha Vantage'
              },
              timestamp: new Date(article.time_published).toISOString(),
              title: article.title || '',
              content: article.summary || '',
              summary: this.generateSummary(article.summary || ''),
              relevanceScore: 0,
              marketTags: [],
              symbols: article.ticker_sentiment?.map((t: any) => t.ticker) || [],
              sentiment: this.mapAlphaVantageSentiment(article.overall_sentiment_label)
            };
            break;

          case 'Financial Modeling Prep':
            item = {
              id: `fmp-${Date.now()}-${Math.random()}`,
              source: 'news',
              sourceDetails: {
                name: source.name,
                url: article.url,
                author: article.site || 'Financial Modeling Prep'
              },
              timestamp: new Date(article.publishedDate).toISOString(),
              title: article.title || '',
              content: article.text || '',
              summary: this.generateSummary(article.text || ''),
              relevanceScore: 0,
              marketTags: [],
              symbols: article.symbol ? [article.symbol] : [],
              sentiment: undefined
            };
            break;

          default:
            // Generic handling for legacy APIs
            item = {
              id: article.id || article.uuid || `${source.name}-${Date.now()}-${Math.random()}`,
              source: 'news',
              sourceDetails: {
                name: source.name,
                url: article.url || article.link,
                author: article.author || article.byline
              },
              timestamp: new Date(article.publishedAt || article.date || article.timestamp).toISOString(),
              title: article.title || article.headline || '',
              content: article.content || article.body || article.description || '',
              summary: this.generateSummary(article.content || article.body || article.description || ''),
              relevanceScore: 0,
              marketTags: [],
              symbols: [],
              sentiment: undefined
            };
            break;
        }

        if (item.title && item.timestamp) {
          items.push(item);
        }
      }
    } catch (error) {
      this.logger.error(`Error converting API response from ${source.name}:`, error);
    }

    return items;
  }

  private mapAlphaVantageSentiment(sentimentLabel: string): 'positive' | 'negative' | 'neutral' | undefined {
    switch (sentimentLabel?.toLowerCase()) {
      case 'bullish':
      case 'somewhat-bullish':
        return 'positive';
      case 'bearish':
      case 'somewhat-bearish':
        return 'negative';
      case 'neutral':
        return 'neutral';
      default:
        return undefined;
    }
  }

  private generateSummary(content: string): string {
    if (!content) return '';
    
    // Simple extractive summary - take first 2 sentences or 200 characters
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return content.slice(0, 200) + '...';
    
    let summary = sentences[0].trim();
    if (sentences.length > 1 && summary.length < 150) {
      summary += '. ' + sentences[1].trim();
    }
    
    return summary.length > 200 ? summary.slice(0, 200) + '...' : summary;
  }

  async searchNews(query: string, timeframe: string = '7d', limit: number = 50): Promise<MarketDataItem[]> {
    try {
      // Sanitize search query for security
      const sanitizedQuery = SecurityValidator.sanitizeSearchQuery(query);
      
      if (sanitizedQuery.length === 0) {
        this.logger.warn('Search query contained only invalid characters', { originalQuery: query });
        return [];
      }
      
      const cacheKey = this.generateCacheKey('news-search', { query: sanitizedQuery, timeframe, limit });
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get all news and filter by query
      const newsResult = await this.getNews(timeframe, undefined, 1000); // Get more for search
      
      if (!newsResult.success || !newsResult.data) {
        return [];
      }

      const queryLower = sanitizedQuery.toLowerCase();
      const filteredNews = newsResult.data.filter(item => 
        item.title.toLowerCase().includes(queryLower) ||
        item.content.toLowerCase().includes(queryLower) ||
        item.marketTags.some(tag => tag.toLowerCase().includes(queryLower)) ||
        item.symbols?.some(symbol => symbol.toLowerCase().includes(queryLower))
      );

      const results = filteredNews.slice(0, limit);

      // Cache search results for shorter time
      await this.cache.set(cacheKey, results, 900); // 15 minutes

      return results;
    } catch (error) {
      this.logger.error('Error searching news:', error);
      return [];
    }
  }

  async getSourceStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const source of this.config.sources) {
      const sourceId = `news-${source.name}`;
      const remaining = this.rateLimiter.getRemainingRequests(sourceId, source.rateLimit);
      const resetTime = this.rateLimiter.getResetTime(sourceId);

      status[source.name] = {
        enabled: source.enabled,
        type: source.type,
        remainingRequests: remaining,
        resetTime: resetTime,
        rateLimitStatus: remaining > 0 ? 'OK' : 'Limited'
      };
    }

    return status;
  }

  async testConnection(sourceName: string): Promise<boolean> {
    const source = this.config.sources.find(s => s.name === sourceName);
    if (!source) {
      throw new Error(`Source ${sourceName} not found`);
    }

    try {
      if (source.type === 'rss') {
        const feed = await this.rssParser.parseURL(source.endpoint);
        return !!feed.title;
      } else if (source.type === 'api') {
        // Use the same authentication logic as fetchFromAPI
        const headers: Record<string, string> = {
          'User-Agent': 'Market-Analysis-MCP/1.0'
        };

        let params: Record<string, any> = {};
        
        switch (source.name) {
          case 'NewsAPI.org':
            params = { apiKey: process.env.NEWSAPI_ORG_API_KEY, q: 'market', pageSize: 1 };
            break;
          case 'Alpha Vantage News':
            params = { function: 'NEWS_SENTIMENT', apikey: process.env.ALPHA_VANTAGE_API_KEY, limit: 1 };
            break;
          case 'Financial Modeling Prep':
            params = { apikey: process.env.FINANCIAL_MODELING_PREP_API_KEY, limit: 1 };
            break;
          default:
            params = { limit: 1 };
            break;
        }

        const response = await axios.get(source.endpoint, { 
          headers, 
          params,
          timeout: 10000 
        });
        return response.status === 200 && !response.data.error;
      }
      return false;
    } catch (error) {
      this.logger.error(`Connection test failed for ${sourceName}:`, error);
      return false;
    }
  }
}