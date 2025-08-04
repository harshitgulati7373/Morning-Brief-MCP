import RSSParser from 'rss-parser';
import axios from 'axios';
import { Logger } from 'winston';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import { TimeUtils } from '../utils/timeUtils';
import { MarketDataItem, PodcastSource, ProcessingResult, PodcastEpisode } from '../types/marketData';
import { BaseService } from './BaseService';

export class PodcastService extends BaseService {
  private rssParser: RSSParser;

  constructor(
    private config: PodcastSource[],
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

  async getPodcasts(
    timeframe: string = '7d',
    includeTranscripts: boolean = false
  ): Promise<ProcessingResult> {
    try {
      const cacheKey = this.generateCacheKey('podcasts', { timeframe, includeTranscripts });
      
      const data = await this.cacheOperation(cacheKey, async () => {
        return await this.fetchPodcastData(timeframe, includeTranscripts);
      }, TimeUtils.getOptimalCacheTTL('podcast'));

      this.logger.info(`Fetched ${data.length} podcast episodes`);
      return { success: true, data };
    } catch (error) {
      this.handleError(error as Error, 'getPodcasts');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error fetching podcasts' 
      };
    }
  }

  private async fetchPodcastData(
    timeframe: string,
    includeTranscripts: boolean
  ): Promise<MarketDataItem[]> {
    const enabledSources = this.config.filter(source => source.enabled);
    const allPodcasts: MarketDataItem[] = [];

    for (const source of enabledSources) {
      try {
        const episodes = await this.fetchFromSource(source, timeframe, includeTranscripts);
        allPodcasts.push(...episodes);
      } catch (error) {
        this.handleError(error as Error, `fetchFromSource:${source.name}`);
        // Continue with other sources
      }
    }

    const filteredPodcasts = allPodcasts.filter(item => 
      TimeUtils.isWithinTimeframe(item.timestamp, timeframe)
    );

    filteredPodcasts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return filteredPodcasts;
  }

  private async fetchFromSource(
    source: PodcastSource, 
    timeframe: string, 
    includeTranscripts: boolean
  ): Promise<MarketDataItem[]> {
    const sourceId = `podcast-${source.name}`;
    
    return this.executeWithRateLimit(async () => {
        const feed = await this.rssParser.parseURL(source.rssUrl);
        const items: MarketDataItem[] = [];

        for (const item of feed.items) {
          const episode = await this.convertRSSItemToMarketData(item, source, includeTranscripts);
          if (episode) {
            items.push(episode);
          }
        }

        return items;
      }, sourceId, '10/hour'); // Default rate limit for podcasts
  }

  private async convertRSSItemToMarketData(
    item: any, 
    source: PodcastSource, 
    includeTranscripts: boolean
  ): Promise<MarketDataItem | null> {
    if (!item.title || !item.pubDate) {
      return null;
    }

    const id = item.guid || `${source.name}-${Date.now()}-${Math.random()}`;
    const timestamp = new Date(item.pubDate).toISOString();
    
    let content = item.content || item.contentSnippet || item.summary || '';
    let summary = this.generateSummary(content);

    // If transcripts are requested and we have audio URL, generate transcript
    if (includeTranscripts && item.enclosure?.url) {
      try {
        const transcript = await this.generateTranscript(item.enclosure.url, source.transcriptionService);
        if (transcript) {
          content = transcript;
          summary = this.generateSummary(transcript);
        }
      } catch (error) {
        this.logger.warn(`Failed to generate transcript for ${item.title}:`, error);
      }
    }

    return {
      id,
      source: 'podcast',
      sourceDetails: {
        name: source.name,
        url: item.link,
        author: item.creator || item.author
      },
      timestamp,
      title: item.title,
      content,
      summary,
      relevanceScore: 0, // Will be calculated by RelevanceScorer
      marketTags: [],
      symbols: [],
      sentiment: undefined
    };
  }

  private async generateTranscript(audioUrl: string, service: string): Promise<string | null> {
    // This is a placeholder for transcript generation
    // In a real implementation, you would integrate with OpenAI Whisper or Assembly AI
    
    try {
      if (service === 'openai-whisper' && process.env.OPENAI_API_KEY) {
        // Placeholder for OpenAI Whisper integration
        this.logger.info(`Would generate transcript for ${audioUrl} using OpenAI Whisper`);
        return null; // Return null for now
      } else if (service === 'assembly-ai') {
        // Placeholder for Assembly AI integration
        this.logger.info(`Would generate transcript for ${audioUrl} using Assembly AI`);
        return null; // Return null for now
      }
    } catch (error) {
      this.logger.error('Error generating transcript:', error);
    }

    return null;
  }

  private generateSummary(content: string): string {
    if (!content) return '';
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return content.slice(0, 300) + '...';
    
    let summary = sentences[0].trim();
    let currentLength = summary.length;
    
    for (let i = 1; i < sentences.length && currentLength < 250; i++) {
      const nextSentence = sentences[i].trim();
      if (currentLength + nextSentence.length + 2 <= 300) {
        summary += '. ' + nextSentence;
        currentLength += nextSentence.length + 2;
      } else {
        break;
      }
    }
    
    return summary.length > 300 ? summary.slice(0, 300) + '...' : summary;
  }

  async searchPodcasts(query: string, timeframe: string = '30d'): Promise<MarketDataItem[]> {
    try {
      const result = await this.getPodcasts(timeframe, false);
      
      if (!result.success || !result.data) {
        return [];
      }

      const queryLower = query.toLowerCase();
      return result.data.filter(item => 
        item.title.toLowerCase().includes(queryLower) ||
        item.content.toLowerCase().includes(queryLower) ||
        item.summary.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      this.logger.error('Error searching podcasts:', error);
      return [];
    }
  }

  async testConnection(sourceName: string): Promise<boolean> {
    const source = this.config.find(s => s.name === sourceName);
    if (!source) {
      throw new Error(`Podcast source ${sourceName} not found`);
    }

    try {
      const feed = await this.rssParser.parseURL(source.rssUrl);
      return !!feed.title;
    } catch (error) {
      this.logger.error(`Connection test failed for ${sourceName}:`, error);
      return false;
    }
  }
}