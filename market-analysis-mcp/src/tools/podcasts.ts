import { PodcastService } from '../services/podcastService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { MarketDataItem } from '../types/marketData';
import { ToolFormatter } from '../utils/ToolFormatter';

export class PodcastTools {
  constructor(
    private podcastService: PodcastService,
    private relevanceScorer: RelevanceScorer
  ) {}

  async getPodcastSummaries(args: any): Promise<any> {
    const { timeframe = '7d', include_transcripts = false } = args;

    try {
      const result = await this.podcastService.getPodcasts(timeframe, include_transcripts);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching podcasts: ${result.error}`
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
              text: ToolFormatter.generateMarkdownSummary([], 'Podcast Episode Summary', timeframeFormatted, false)
            }
          ]
        };
      }

      const scoredPodcasts = result.data.map(item => this.enhancePodcastItem(item));
      scoredPodcasts.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const timeframeFormatted = ToolFormatter.formatTimeframe(this.parseTimeframe(timeframe));
      const response = ToolFormatter.generateMarkdownSummary(
        scoredPodcasts,
        'Podcast Episode Summary',
        timeframeFormatted,
        result.cached || false
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
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }

  private enhancePodcastItem(item: MarketDataItem): MarketDataItem {
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
    if (!match) return 168; // Default to 7 days for podcasts
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return value;
      case 'd': return value * 24;
      case 'w': return value * 24 * 7;
      default: return 168;
    }
  }

}