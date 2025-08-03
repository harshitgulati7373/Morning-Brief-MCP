import { NewsService } from '../services/newsService';
import { PodcastService } from '../services/podcastService';
import { GmailService } from '../services/gmailService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { CacheManager } from '../utils/cache';
import { MarketDataItem, SearchQuery } from '../types/marketData';

export class SearchTools {
  constructor(
    private newsService: NewsService,
    private podcastService: PodcastService,
    private gmailService: GmailService,
    private relevanceScorer: RelevanceScorer,
    private cache: CacheManager
  ) {}

  async searchMarketData(args: any): Promise<any> {
    const { 
      query, 
      sources, 
      timeframe = '7d', 
      min_relevance = 50 
    }: SearchQuery & { min_relevance: number } = args;

    if (!query || query.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Search query cannot be empty.'
          }
        ]
      };
    }

    try {
      const cacheKey = this.cache.generateKey('search', { query, sources, timeframe, min_relevance });
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return {
          content: [
            {
              type: 'text',
              text: this.formatSearchResponse(cached, { query, sources, timeframe, min_relevance, cached: true })
            }
          ]
        };
      }

      const searchSources = sources || ['news', 'podcast', 'email'];
      const allResults: MarketDataItem[] = [];

      // Search each enabled source
      const searchPromises: Promise<MarketDataItem[]>[] = [];

      if (searchSources.includes('news')) {
        searchPromises.push(this.searchNews(query, timeframe));
      }

      if (searchSources.includes('podcast')) {
        searchPromises.push(this.searchPodcasts(query, timeframe));
      }

      if (searchSources.includes('email')) {
        searchPromises.push(this.searchEmails(query, timeframe));
      }

      // Execute searches in parallel
      const results = await Promise.allSettled(searchPromises);

      // Collect successful results
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          allResults.push(...result.value);
        }
      });

      if (allResults.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for query: "${query}"`
            }
          ]
        };
      }

      // Enhance each result with scoring
      const enhancedResults = allResults.map(item => this.enhanceSearchResult(item, query));

      // Filter by minimum relevance
      const filteredResults = enhancedResults.filter(item => item.relevanceScore >= min_relevance);

      // Sort by relevance and recency
      filteredResults.sort((a, b) => {
        if (Math.abs(a.relevanceScore - b.relevanceScore) < 5) {
          // If relevance scores are close, sort by recency
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return b.relevanceScore - a.relevanceScore;
      });

      // Cache results for 15 minutes
      await this.cache.set(cacheKey, filteredResults, 900);

      const response = this.formatSearchResponse(filteredResults, { query, sources, timeframe, min_relevance });

      return {
        content: [
          {
            type: 'text',
            text: response
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching market data: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }

  private async searchNews(query: string, timeframe: string): Promise<MarketDataItem[]> {
    try {
      return await this.newsService.searchNews(query, timeframe, 100);
    } catch (error) {
      // Silent error handling for MCP - errors are logged in the service layer
      return [];
    }
  }

  private async searchPodcasts(query: string, timeframe: string): Promise<MarketDataItem[]> {
    try {
      return await this.podcastService.searchPodcasts(query, timeframe);
    } catch (error) {
      // Silent error handling for MCP - errors are logged in the service layer
      return [];
    }
  }

  private async searchEmails(query: string, timeframe: string): Promise<MarketDataItem[]> {
    try {
      return await this.gmailService.searchEmails(query, timeframe);
    } catch (error) {
      // Silent error handling for MCP - errors are logged in the service layer
      return [];
    }
  }

  private enhanceSearchResult(item: MarketDataItem, query: string): MarketDataItem {
    const scoring = this.relevanceScorer.scoreContent(
      item.title,
      item.content,
      item.sourceDetails.name,
      item.timestamp
    );

    // Boost relevance score for direct query matches
    let queryBoost = 0;
    const queryLower = query.toLowerCase();
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();

    // Title matches get higher boost
    if (titleLower.includes(queryLower)) {
      queryBoost += 15;
    }

    // Content matches get moderate boost
    if (contentLower.includes(queryLower)) {
      queryBoost += 10;
    }

    // Symbol matches get high boost
    if (item.symbols?.some(symbol => symbol.toLowerCase() === queryLower)) {
      queryBoost += 20;
    }

    const finalScore = Math.min(100, scoring.score + queryBoost);

    return {
      ...item,
      relevanceScore: finalScore,
      marketTags: scoring.marketTags,
      symbols: scoring.symbols,
      sentiment: this.relevanceScorer.extractSentiment(item.title, item.content)
    };
  }

  private formatSearchResponse(
    results: MarketDataItem[], 
    searchParams: { query: string; sources?: string[]; timeframe: string; min_relevance: number; cached?: boolean }
  ): string {
    const lines: string[] = [];

    lines.push('# 🔍 Market Data Search Results');
    lines.push('');
    lines.push(`**Query**: "${searchParams.query}"`);
    lines.push(`**Timeframe**: ${searchParams.timeframe}`);
    lines.push(`**Sources**: ${searchParams.sources?.join(', ') || 'All sources'}`);
    lines.push(`**Min Relevance**: ${searchParams.min_relevance}/100`);
    lines.push(`**Results Found**: ${results.length}`);
    if (searchParams.cached) {
      lines.push('**Source**: Cached data');
    }
    lines.push('');

    if (results.length === 0) {
      lines.push('No results found matching your search criteria.');
      lines.push('');
      lines.push('**Suggestions**:');
      lines.push('- Try broadening your search query');
      lines.push('- Increase the timeframe');
      lines.push('- Lower the minimum relevance score');
      lines.push('- Check if the sources contain relevant data');
      return lines.join('\n');
    }

    // Group results by source
    const resultsBySource = {
      news: results.filter(item => item.source === 'news'),
      podcast: results.filter(item => item.source === 'podcast'),
      email: results.filter(item => item.source === 'email')
    };

    // Summary stats
    lines.push('## Search Summary');
    lines.push('');
    lines.push(`- **News Articles**: ${resultsBySource.news.length}`);
    lines.push(`- **Podcast Episodes**: ${resultsBySource.podcast.length}`);
    lines.push(`- **Email Messages**: ${resultsBySource.email.length}`);

    const avgRelevance = results.reduce((sum, item) => sum + item.relevanceScore, 0) / results.length;
    lines.push(`- **Average Relevance**: ${avgRelevance.toFixed(1)}/100`);

    const uniqueSymbols = [...new Set(results.flatMap(item => item.symbols || []))];
    if (uniqueSymbols.length > 0) {
      lines.push(`- **Symbols Mentioned**: ${uniqueSymbols.slice(0, 10).join(', ')}${uniqueSymbols.length > 10 ? '...' : ''}`);
    }

    lines.push('');

    // Show top results from each source
    if (resultsBySource.news.length > 0) {
      lines.push('## 📰 News Results');
      lines.push('');
      resultsBySource.news.slice(0, 5).forEach(item => {
        lines.push(this.formatSearchResultItem(item, searchParams.query));
      });
      lines.push('');
    }

    if (resultsBySource.podcast.length > 0) {
      lines.push('## 🎙️ Podcast Results');
      lines.push('');
      resultsBySource.podcast.slice(0, 3).forEach(item => {
        lines.push(this.formatSearchResultItem(item, searchParams.query));
      });
      lines.push('');
    }

    if (resultsBySource.email.length > 0) {
      lines.push('## 📧 Email Results');
      lines.push('');
      resultsBySource.email.slice(0, 3).forEach(item => {
        lines.push(this.formatSearchResultItem(item, searchParams.query));
      });
      lines.push('');
    }

    // Show additional results if many found
    const totalShown = Math.min(5, resultsBySource.news.length) + 
                     Math.min(3, resultsBySource.podcast.length) + 
                     Math.min(3, resultsBySource.email.length);
    
    if (results.length > totalShown) {
      lines.push(`*Showing top ${totalShown} of ${results.length} results. Refine your search for more specific results.*`);
    }

    return lines.join('\n');
  }

  private formatSearchResultItem(item: MarketDataItem, query: string): string {
    const lines: string[] = [];
    
    const date = new Date(item.timestamp).toLocaleString();
    const sourceEmoji = this.getSourceEmoji(item.source);
    
    lines.push(`### ${sourceEmoji} ${item.title}`);
    lines.push('');
    lines.push(`**Score**: ${item.relevanceScore.toFixed(1)}/100 | **Source**: ${item.sourceDetails.name} | **Date**: ${date}`);
    
    if (item.symbols && item.symbols.length > 0) {
      lines.push(`**Symbols**: ${item.symbols.join(', ')}`);
    }
    
    if (item.marketTags.length > 0) {
      lines.push(`**Tags**: ${item.marketTags.join(', ')}`);
    }

    // Highlight query terms in summary
    const highlightedSummary = this.highlightQuery(item.summary, query);
    lines.push(`**Summary**: ${highlightedSummary}`);

    if (item.sourceDetails.url && item.source !== 'email') {
      lines.push(`**Link**: ${item.sourceDetails.url}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }

  private highlightQuery(text: string, query: string): string {
    const queryLower = query.toLowerCase();
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '**$1**');
  }

  private getSourceEmoji(source: string): string {
    switch (source) {
      case 'news': return '📰';
      case 'podcast': return '🎙️';
      case 'email': return '📧';
      default: return '📄';
    }
  }
}