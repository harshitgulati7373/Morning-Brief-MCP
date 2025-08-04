import { NewsService } from '../services/newsService';
import { PodcastService } from '../services/podcastService';
import { GmailService } from '../services/gmailService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { MarketDataItem, MarketSnapshot } from '../types/marketData';
import { ToolFormatter } from '../utils/ToolFormatter';

export class UnifiedTools {
  constructor(
    private newsService: NewsService,
    private podcastService: PodcastService,
    private gmailService: GmailService,
    private relevanceScorer: RelevanceScorer
  ) {}

  async getMarketSnapshot(args: any): Promise<any> {
    const { timeframe = '6h', priority_symbols } = args;

    try {
      // Fetch data from all sources in parallel
      const [newsResult, podcastResult, emailResult] = await Promise.allSettled([
        this.newsService.getNews(timeframe, priority_symbols, 50),
        this.podcastService.getPodcasts(timeframe, false),
        this.gmailService.getRelevantEmails(timeframe, undefined, undefined)
      ]);

      const allData: MarketDataItem[] = [];
      const sourceBreakdown = { news: 0, podcasts: 0, emails: 0 };

      // Process news results
      if (newsResult.status === 'fulfilled' && newsResult.value.success && newsResult.value.data) {
        const enhancedNews = newsResult.value.data.map(item => this.enhanceItem(item));
        allData.push(...enhancedNews);
        sourceBreakdown.news = enhancedNews.length;
      }

      // Process podcast results
      if (podcastResult.status === 'fulfilled' && podcastResult.value.success && podcastResult.value.data) {
        const enhancedPodcasts = podcastResult.value.data.map(item => this.enhanceItem(item));
        allData.push(...enhancedPodcasts);
        sourceBreakdown.podcasts = enhancedPodcasts.length;
      }

      // Process email results
      if (emailResult.status === 'fulfilled' && emailResult.value.success && emailResult.value.data) {
        const enhancedEmails = emailResult.value.data.map(item => this.enhanceItem(item));
        allData.push(...enhancedEmails);
        sourceBreakdown.emails = enhancedEmails.length;
      }

      if (allData.length === 0) {
        const timeframeFormatted = ToolFormatter.formatTimeframe(this.parseTimeframe(timeframe));
        return {
          content: [
            {
              type: 'text',
              text: ToolFormatter.generateMarkdownSummary([], 'Market Snapshot', timeframeFormatted, false)
            }
          ]
        };
      }

      // Sort by relevance score
      allData.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Create market snapshot
      const snapshot = this.createMarketSnapshot(allData, sourceBreakdown, priority_symbols);
      const response = this.formatSnapshotResponse(snapshot, timeframe);

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
            text: ToolFormatter.formatErrorResponse(
              error instanceof Error ? error : new Error('Unknown error occurred'),
              'generating market snapshot'
            )
          }
        ]
      };
    }
  }

  private enhanceItem(item: MarketDataItem): MarketDataItem {
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

  private createMarketSnapshot(
    allData: MarketDataItem[], 
    sourceBreakdown: { news: number; podcasts: number; emails: number },
    prioritySymbols?: string[]
  ): MarketSnapshot {
    // Identify high-relevance items (alert-worthy)
    const alertItems = allData.filter(item => item.relevanceScore >= 80);

    // Get key events (top relevance items from each source)
    const keyEvents: MarketDataItem[] = [];
    
    const newsByRelevance = allData.filter(item => item.source === 'news').slice(0, 3);
    const podcastsByRelevance = allData.filter(item => item.source === 'podcast').slice(0, 2);
    const emailsByRelevance = allData.filter(item => item.source === 'email').slice(0, 2);
    
    keyEvents.push(...newsByRelevance, ...podcastsByRelevance, ...emailsByRelevance);

    // Sort key events by relevance
    keyEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Identify cross-source patterns
    const crossSourcePatterns = this.identifyCrossSourcePatterns(allData);

    // Generate summary
    const summary = this.generateSummary(allData, alertItems, crossSourcePatterns, prioritySymbols);

    return {
      summary,
      keyEvents: keyEvents.slice(0, 10), // Top 10 key events
      crossSourcePatterns,
      alertItems: alertItems.slice(0, 5), // Top 5 alerts
      sourceBreakdown
    };
  }

  private identifyCrossSourcePatterns(allData: MarketDataItem[]): string[] {
    const patterns: string[] = [];
    
    // Find symbols mentioned across multiple sources
    const symbolCounts: Record<string, { sources: Set<string>; count: number }> = {};
    
    allData.forEach(item => {
      if (item.symbols) {
        item.symbols.forEach(symbol => {
          if (!symbolCounts[symbol]) {
            symbolCounts[symbol] = { sources: new Set(), count: 0 };
          }
          symbolCounts[symbol].sources.add(item.source);
          symbolCounts[symbol].count++;
        });
      }
    });

    // Identify symbols mentioned across multiple sources
    Object.entries(symbolCounts).forEach(([symbol, data]) => {
      if (data.sources.size >= 2 && data.count >= 3) {
        patterns.push(`${symbol} mentioned across ${data.sources.size} sources (${Array.from(data.sources).join(', ')})`);
      }
    });

    // Find common tags across sources
    const tagCounts: Record<string, { sources: Set<string>; count: number }> = {};
    
    allData.forEach(item => {
      item.marketTags.forEach(tag => {
        if (!tagCounts[tag]) {
          tagCounts[tag] = { sources: new Set(), count: 0 };
        }
        tagCounts[tag].sources.add(item.source);
        tagCounts[tag].count++;
      });
    });

    Object.entries(tagCounts).forEach(([tag, data]) => {
      if (data.sources.size >= 2 && data.count >= 4) {
        patterns.push(`"${tag}" trending across ${data.sources.size} sources`);
      }
    });

    return patterns.slice(0, 5); // Limit to top 5 patterns
  }

  private generateSummary(
    allData: MarketDataItem[], 
    alertItems: MarketDataItem[], 
    patterns: string[],
    prioritySymbols?: string[]
  ): string {
    const lines: string[] = [];

    // Overall activity
    const totalItems = allData.length;
    const highRelevanceItems = allData.filter(item => item.relevanceScore >= 70).length;
    
    lines.push(`Market activity analysis shows ${totalItems} total items with ${highRelevanceItems} high-relevance items.`);

    // Alert summary
    if (alertItems.length > 0) {
      lines.push(`${alertItems.length} critical alerts identified requiring immediate attention.`);
    }

    // Priority symbols summary
    if (prioritySymbols && prioritySymbols.length > 0) {
      const priorityMentions = allData.filter(item => 
        item.symbols?.some(symbol => prioritySymbols.includes(symbol))
      ).length;
      
      if (priorityMentions > 0) {
        lines.push(`${priorityMentions} items mention priority symbols: ${prioritySymbols.join(', ')}.`);
      }
    }

    // Cross-source patterns
    if (patterns.length > 0) {
      lines.push(`Key cross-source patterns: ${patterns[0]}.`);
    }

    // Sentiment overview
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    allData.forEach(item => {
      if (item.sentiment) sentimentCounts[item.sentiment]++;
    });

    const totalWithSentiment = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0);
    if (totalWithSentiment > 0) {
      const positivePct = Math.round((sentimentCounts.positive / totalWithSentiment) * 100);
      const negativePct = Math.round((sentimentCounts.negative / totalWithSentiment) * 100);
      
      if (positivePct > negativePct) {
        lines.push(`Overall sentiment is positive (${positivePct}% positive vs ${negativePct}% negative).`);
      } else if (negativePct > positivePct) {
        lines.push(`Overall sentiment is negative (${negativePct}% negative vs ${positivePct}% positive).`);
      } else {
        lines.push('Market sentiment appears mixed with balanced positive and negative coverage.');
      }
    }

    return lines.join(' ');
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)([hdw])/);
    if (!match) return 6; // Default to 6 hours for snapshots
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return value;
      case 'd': return value * 24;
      case 'w': return value * 24 * 7;
      default: return 6;
    }
  }

  private formatSnapshotResponse(snapshot: MarketSnapshot, timeframe: string): string {
    const timeframeFormatted = ToolFormatter.formatTimeframe(this.parseTimeframe(timeframe));
    const lines: string[] = [];

    lines.push('# 📊 Market Snapshot');
    lines.push('');
    lines.push(`**Timeframe**: ${timeframeFormatted}`);
    lines.push(`**Generated**: ${new Date().toLocaleString()}`);
    lines.push('');

    // Summary
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(snapshot.summary);
    lines.push('');

    // Source breakdown  
    lines.push(ToolFormatter.createSectionHeader('Source Breakdown', '📁'));
    lines.push(ToolFormatter.generateSourceBreakdown(this.flattenSnapshotItems(snapshot)));
    lines.push('');

    // Alert items
    if (snapshot.alertItems.length > 0) {
      lines.push(ToolFormatter.createSectionHeader('Critical Alerts', '🚨'));
      snapshot.alertItems.forEach(item => {
        lines.push(ToolFormatter.formatMarketItem(item));
      });
    }

    // Cross-source patterns
    if (snapshot.crossSourcePatterns.length > 0) {
      lines.push(ToolFormatter.createSectionHeader('Cross-Source Patterns', '🔗'));
      snapshot.crossSourcePatterns.forEach(pattern => {
        lines.push(`- ${pattern}`);
      });
      lines.push('');
    }

    // Key events
    if (snapshot.keyEvents.length > 0) {
      lines.push(ToolFormatter.createSectionHeader('Key Events', '📈'));
      snapshot.keyEvents.forEach(item => {
        lines.push(ToolFormatter.formatMarketItem(item));
      });
    }

    return lines.join('\n');
  }

  private flattenSnapshotItems(snapshot: MarketSnapshot): MarketDataItem[] {
    return [...snapshot.keyEvents, ...snapshot.alertItems];
  }

}