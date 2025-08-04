import { NewsService } from '../services/newsService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { MarketDataItem } from '../types/marketData';
import { ToolFormatter } from '../utils/ToolFormatter';

export class NewsTools {
  constructor(
    private newsService: NewsService,
    private relevanceScorer: RelevanceScorer
  ) {}

  async getMarketNews(args: any): Promise<any> {
    const { timeframe = '24h', symbols, limit = 20 } = args;

    try {
      const result = await this.newsService.getNews(timeframe, symbols, limit);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: ToolFormatter.formatErrorResponse(new Error(result.error), 'fetching news')
            }
          ]
        };
      }

      if (!result.data || result.data.length === 0) {
        const timeframeFormatted = ToolFormatter.formatTimeframe(this.parseTimeframe(timeframe));
        return {
          content: [
            {
              type: 'text',
              text: ToolFormatter.generateMarkdownSummary([], 'Market News Summary', timeframeFormatted, false)
            }
          ]
        };
      }

      // Score and enhance each news item
      const scoredNews = result.data.map(item => this.enhanceNewsItem(item));

      // Sort by relevance score
      scoredNews.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const timeframeFormatted = ToolFormatter.formatTimeframe(this.parseTimeframe(timeframe));
      const response = ToolFormatter.generateMarkdownSummary(
        scoredNews,
        'Market News Summary',
        timeframeFormatted
      );

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
            text: ToolFormatter.formatErrorResponse(error instanceof Error ? error : new Error('Unknown error occurred'))
          }
        ]
      };
    }
  }

  private enhanceNewsItem(item: MarketDataItem): MarketDataItem {
    const scoring = this.relevanceScorer.scoreContent(
      item.title,
      item.content,
      item.sourceDetails.name,
      item.timestamp
    );

    return {
      ...item,
      relevanceScore: scoring.score,
      marketTags: scoring.marketTags,
      symbols: scoring.symbols,
      sentiment: this.relevanceScorer.extractSentiment(item.title, item.content)
    };
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)([hdw])/);
    if (!match) return 24; // Default to 24 hours
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return value;
      case 'd': return value * 24;
      case 'w': return value * 24 * 7;
      default: return 24;
    }
  }



  async searchNews(query: string, timeframe: string = '7d', minRelevance: number = 50): Promise<MarketDataItem[]> {
    const results = await this.newsService.searchNews(query, timeframe, 100);
    
    // Score each result
    const scoredResults = results.map(item => this.enhanceNewsItem(item));
    
    // Filter by minimum relevance
    return scoredResults.filter(item => item.relevanceScore >= minRelevance);
  }
}