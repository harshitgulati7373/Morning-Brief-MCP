export interface MarketDataItem {
  id: string;
  source: 'news' | 'podcast' | 'email';
  sourceDetails: {
    name: string;
    url?: string;
    author?: string;
  };
  timestamp: string; // ISO 8601
  title: string;
  content: string;
  summary: string; // AI-generated summary
  relevanceScore: number; // 0-100
  marketTags: string[]; // e.g., ['earnings', 'fed', 'crypto']
  symbols?: string[]; // Stock symbols mentioned
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface MarketSnapshot {
  summary: string;
  keyEvents: MarketDataItem[];
  crossSourcePatterns: string[];
  alertItems: MarketDataItem[]; // High relevance items
  sourceBreakdown: {
    news: number;
    podcasts: number;
    emails: number;
  };
}

export interface NewsSource {
  name: string;
  type: 'api' | 'rss';
  endpoint: string;
  auth?: 'bearer' | 'api_key' | 'none';
  rateLimit: string;
  enabled: boolean;
}

export interface PodcastSource {
  name: string;
  rssUrl: string;
  transcriptionService: 'openai-whisper' | 'assembly-ai';
  enabled: boolean;
}

export interface GmailConfig {
  targetSenders: string[];
  labels: string[];
  excludePatterns: string[];
  enabled: boolean;
}

export interface SourcesConfig {
  news: {
    sources: NewsSource[];
  };
  podcasts: PodcastSource[];
  gmail: GmailConfig;
  relevanceScoring: {
    marketKeywords: {
      high: string[];
      medium: string[];
      low: string[];
    };
    weights: {
      marketKeywords: number;
      stockSymbols: number;
      sourceAuthority: number;
      recency: number;
    };
  };
}

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
}

export interface RateLimitEntry {
  source: string;
  requests: number;
  resetTime: number;
}

export interface ProcessingResult {
  success: boolean;
  data?: MarketDataItem[];
  error?: string;
  cached?: boolean;
}

export interface SearchQuery {
  query: string;
  sources?: string[];
  timeframe?: string;
  minRelevance?: number;
  limit?: number;
}

export interface EmailData {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  timestamp: string;
  labels: string[];
}

export interface PodcastEpisode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration?: string;
  transcript?: string;
}