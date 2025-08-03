import { NewsService } from '../services/newsService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { MarketDataItem } from '../types/marketData';

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
              text: `Error fetching news: ${result.error}`
            }
          ]
        };
      }

      if (!result.data || result.data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No news articles found for the specified criteria.'
            }
          ]
        };
      }

      // Score and enhance each news item
      const scoredNews = result.data.map(item => this.enhanceNewsItem(item));

      // Sort by relevance score
      scoredNews.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const response = this.formatNewsResponse(scoredNews, {
        timeframe,
        symbols,
        limit,
        cached: result.cached
      });

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
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
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

  private formatNewsResponse(news: MarketDataItem[], metadata: any): string {
    const lines: string[] = [];

    // Header
    lines.push('# Market News Summary');
    lines.push('');
    lines.push(`**Timeframe**: ${metadata.timeframe}`);
    lines.push(`**Articles Found**: ${news.length}`);
    if (metadata.symbols) {
      lines.push(`**Filtered by Symbols**: ${metadata.symbols.join(', ')}`);
    }
    if (metadata.cached) {
      lines.push('**Source**: Cached data');
    }
    lines.push('');

    // High relevance items first
    const highRelevance = news.filter(item => item.relevanceScore >= 70);
    const mediumRelevance = news.filter(item => item.relevanceScore >= 40 && item.relevanceScore < 70);
    const lowRelevance = news.filter(item => item.relevanceScore < 40);

    if (highRelevance.length > 0) {
      lines.push('## 🔥 High Relevance News');
      lines.push('');
      highRelevance.forEach(item => {
        lines.push(this.formatNewsItem(item));
      });
      lines.push('');
    }

    if (mediumRelevance.length > 0) {
      lines.push('## 📈 Medium Relevance News');
      lines.push('');
      mediumRelevance.forEach(item => {
        lines.push(this.formatNewsItem(item));
      });
      lines.push('');
    }

    if (lowRelevance.length > 0) {
      lines.push('## 📊 Other News');
      lines.push('');
      lowRelevance.forEach(item => {
        lines.push(this.formatNewsItem(item));
      });
    }

    // Summary statistics
    lines.push('');
    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **High Relevance**: ${highRelevance.length} articles`);
    lines.push(`- **Medium Relevance**: ${mediumRelevance.length} articles`);
    lines.push(`- **Low Relevance**: ${lowRelevance.length} articles`);

    const sentimentStats = this.calculateSentimentStats(news);
    lines.push(`- **Sentiment**: ${sentimentStats.positive} positive, ${sentimentStats.neutral} neutral, ${sentimentStats.negative} negative`);

    const uniqueSources = new Set(news.map(item => item.sourceDetails.name));
    lines.push(`- **Sources**: ${Array.from(uniqueSources).join(', ')}`);

    const allSymbols = news.flatMap(item => item.symbols || []);
    const uniqueSymbols = [...new Set(allSymbols)];
    if (uniqueSymbols.length > 0) {
      lines.push(`- **Mentioned Symbols**: ${uniqueSymbols.slice(0, 10).join(', ')}${uniqueSymbols.length > 10 ? '...' : ''}`);
    }

    return lines.join('\n');
  }

  private formatNewsItem(item: MarketDataItem): string {
    const lines: string[] = [];
    
    const sentimentEmoji = {
      positive: '📈',
      negative: '📉',
      neutral: '📊'
    }[item.sentiment || 'neutral'];

    const date = new Date(item.timestamp).toLocaleString();
    
    lines.push(`### ${sentimentEmoji} ${item.title}`);
    lines.push('');
    lines.push(`**Source**: ${item.sourceDetails.name}`);
    lines.push(`**Time**: ${date}`);
    lines.push(`**Relevance Score**: ${item.relevanceScore.toFixed(1)}/100`);
    
    if (item.symbols && item.symbols.length > 0) {
      lines.push(`**Symbols**: ${item.symbols.join(', ')}`);
    }
    
    if (item.marketTags.length > 0) {
      lines.push(`**Tags**: ${item.marketTags.join(', ')}`);
    }
    
    if (item.sentiment) {
      lines.push(`**Sentiment**: ${item.sentiment}`);
    }

    lines.push('');
    lines.push(`**Summary**: ${item.summary}`);

    if (item.sourceDetails.url) {
      lines.push(`**Link**: ${item.sourceDetails.url}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }

  private calculateSentimentStats(news: MarketDataItem[]): { positive: number; negative: number; neutral: number } {
    const stats = { positive: 0, negative: 0, neutral: 0 };
    
    news.forEach(item => {
      if (item.sentiment === 'positive') stats.positive++;
      else if (item.sentiment === 'negative') stats.negative++;
      else stats.neutral++;
    });

    return stats;
  }

  async searchNews(query: string, timeframe: string = '7d', minRelevance: number = 50): Promise<MarketDataItem[]> {
    const results = await this.newsService.searchNews(query, timeframe, 100);
    
    // Score each result
    const scoredResults = results.map(item => this.enhanceNewsItem(item));
    
    // Filter by minimum relevance
    return scoredResults.filter(item => item.relevanceScore >= minRelevance);
  }
}