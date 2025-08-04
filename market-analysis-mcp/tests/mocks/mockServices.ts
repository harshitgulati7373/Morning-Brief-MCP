/**
 * Mock services for testing external dependencies
 */

import { MarketDataItem, ProcessingResult } from '../../src/types/marketData';

export class MockNewsService {
  private mockData: MarketDataItem[] = [];
  private shouldFail = false;
  private failureMessage = 'Mock service failure';

  setMockData(data: MarketDataItem[]): void {
    this.mockData = data;
  }

  setShouldFail(fail: boolean, message?: string): void {
    this.shouldFail = fail;
    if (message) this.failureMessage = message;
  }

  async getNews(timeframe?: string, symbols?: string[], limit?: number): Promise<ProcessingResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failureMessage
      };
    }

    let filteredData = [...this.mockData];

    // Apply symbol filtering if specified
    if (symbols && symbols.length > 0) {
      filteredData = filteredData.filter(item => 
        item.symbols?.some(symbol => symbols.includes(symbol))
      );
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      filteredData = filteredData.slice(0, limit);
    }

    return {
      success: true,
      data: filteredData,
      cached: false
    };
  }
}

export class MockPodcastService {
  private mockEpisodes: any[] = [];
  private shouldFail = false;

  setMockEpisodes(episodes: any[]): void {
    this.mockEpisodes = episodes;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async getRecentEpisodes(timeframe?: string, limit?: number): Promise<ProcessingResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock podcast service failure'
      };
    }

    const limitedEpisodes = limit ? this.mockEpisodes.slice(0, limit) : this.mockEpisodes;
    return {
      success: true,
      data: limitedEpisodes,
      cached: false
    };
  }
}

export class MockGmailService {
  private mockEmails: any[] = [];
  private shouldFail = false;

  setMockEmails(emails: any[]): void {
    this.mockEmails = emails;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async getRecentEmails(timeframe?: string, limit?: number): Promise<ProcessingResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock Gmail service failure'
      };
    }

    const limitedEmails = limit ? this.mockEmails.slice(0, limit) : this.mockEmails;
    return {
      success: true,
      data: limitedEmails,
      cached: false
    };
  }
}

export class MockCacheManager {
  private cache = new Map<string, any>();
  private shouldFail = false;

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async initializeDatabase(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock cache initialization failed');
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock cache set failed');
    }
    this.cache.set(key, value);
  }

  async get(key: string): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Mock cache get failed');
    }
    return this.cache.get(key);
  }

  async searchMarketData(query: string, options?: any): Promise<MarketDataItem[]> {
    if (this.shouldFail) {
      throw new Error('Mock cache search failed');
    }

    // Simple mock search - return items with query in title
    const allItems = Array.from(this.cache.values()).filter(item => 
      item && item.title && item.title.toLowerCase().includes(query.toLowerCase())
    );

    return allItems as MarketDataItem[];
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
  }

  clear(): void {
    this.cache.clear();
  }
}

export class MockRateLimiter {
  private limits = new Map<string, number>();
  private shouldBlock = false;

  setShouldBlock(block: boolean): void {
    this.shouldBlock = block;
  }

  async checkLimit(source: string, limit: number): Promise<boolean> {
    if (this.shouldBlock) {
      return false; // Rate limited
    }

    const current = this.limits.get(source) || 0;
    this.limits.set(source, current + 1);
    return current < limit;
  }

  async waitForReset(source: string): Promise<void> {
    // Mock implementation - just wait a short time
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  reset(): void {
    this.limits.clear();
  }
}

export class MockLogger {
  private logs: Array<{ level: string; message: string; meta?: any }> = [];

  info(message: string, meta?: any): void {
    this.logs.push({ level: 'info', message, meta });
  }

  error(message: string, meta?: any): void {
    this.logs.push({ level: 'error', message, meta });
  }

  warn(message: string, meta?: any): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  debug(message: string, meta?: any): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  getLogs(): Array<{ level: string; message: string; meta?: any }> {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export class MockAxios {
  private responses = new Map<string, any>();
  private shouldFail = false;
  private failureError = new Error('Mock HTTP request failed');

  setResponse(url: string, response: any): void {
    this.responses.set(url, response);
  }

  setShouldFail(fail: boolean, error?: Error): void {
    this.shouldFail = fail;
    if (error) this.failureError = error;
  }

  async get(url: string, config?: any): Promise<any> {
    if (this.shouldFail) {
      throw this.failureError;
    }

    const response = this.responses.get(url);
    if (!response) {
      throw new Error(`No mock response configured for URL: ${url}`);
    }

    return { data: response, status: 200, statusText: 'OK' };
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    if (this.shouldFail) {
      throw this.failureError;
    }

    return { data: { success: true }, status: 200, statusText: 'OK' };
  }

  reset(): void {
    this.responses.clear();
    this.shouldFail = false;
  }
}

// Factory functions for creating pre-configured mocks
export const createMockMarketDataItem = (overrides: Partial<MarketDataItem> = {}): MarketDataItem => {
  return {
    id: 'mock-item-1',
    source: 'news',
    sourceDetails: {
      name: 'Mock News Source',
      url: 'https://mock-source.com',
      author: 'Mock Author'
    },
    timestamp: new Date().toISOString(),
    title: 'Mock Market News Title',
    content: 'This is mock content for testing purposes. It contains market-related keywords.',
    summary: 'Mock summary of market news',
    relevanceScore: 75,
    marketTags: ['mock', 'testing'],
    symbols: ['MOCK'],
    sentiment: 'neutral',
    ...overrides
  };
};

export const createMockProcessingResult = (overrides: Partial<ProcessingResult> = {}): ProcessingResult => {
  return {
    success: true,
    data: [createMockMarketDataItem()],
    cached: false,
    ...overrides
  };
};