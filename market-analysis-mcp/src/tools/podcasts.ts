import { PodcastService } from '../services/podcastService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { MarketDataItem } from '../types/marketData';

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
        return {
          content: [
            {
              type: 'text',
              text: 'No podcast episodes found for the specified timeframe.'
            }
          ]
        };
      }

      const scoredPodcasts = result.data.map(item => this.enhancePodcastItem(item));
      scoredPodcasts.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const response = this.formatPodcastResponse(scoredPodcasts, {
        timeframe,
        include_transcripts,
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

  private formatPodcastResponse(podcasts: MarketDataItem[], metadata: any): string {
    const lines: string[] = [];

    lines.push('# Podcast Episode Summaries');
    lines.push('');
    lines.push(`**Timeframe**: ${metadata.timeframe}`);
    lines.push(`**Episodes Found**: ${podcasts.length}`);
    lines.push(`**Transcripts Included**: ${metadata.include_transcripts ? 'Yes' : 'No'}`);
    if (metadata.cached) {
      lines.push('**Source**: Cached data');
    }
    lines.push('');

    const highRelevance = podcasts.filter(item => item.relevanceScore >= 70);
    const mediumRelevance = podcasts.filter(item => item.relevanceScore >= 40 && item.relevanceScore < 70);
    const lowRelevance = podcasts.filter(item => item.relevanceScore < 40);

    if (highRelevance.length > 0) {
      lines.push('## 🎙️ High Relevance Episodes');
      lines.push('');
      highRelevance.forEach(item => {
        lines.push(this.formatPodcastItem(item, metadata.include_transcripts));
      });
      lines.push('');
    }

    if (mediumRelevance.length > 0) {
      lines.push('## 📻 Medium Relevance Episodes');
      lines.push('');
      mediumRelevance.forEach(item => {
        lines.push(this.formatPodcastItem(item, metadata.include_transcripts));
      });
      lines.push('');
    }

    if (lowRelevance.length > 0) {
      lines.push('## 🔊 Other Episodes');
      lines.push('');
      lowRelevance.forEach(item => {
        lines.push(this.formatPodcastItem(item, metadata.include_transcripts));
      });
    }

    lines.push('');
    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **High Relevance**: ${highRelevance.length} episodes`);
    lines.push(`- **Medium Relevance**: ${mediumRelevance.length} episodes`);
    lines.push(`- **Low Relevance**: ${lowRelevance.length} episodes`);

    const uniqueShows = new Set(podcasts.map(item => item.sourceDetails.name));
    lines.push(`- **Shows**: ${Array.from(uniqueShows).join(', ')}`);

    const allSymbols = podcasts.flatMap(item => item.symbols || []);
    const uniqueSymbols = [...new Set(allSymbols)];
    if (uniqueSymbols.length > 0) {
      lines.push(`- **Mentioned Symbols**: ${uniqueSymbols.slice(0, 10).join(', ')}${uniqueSymbols.length > 10 ? '...' : ''}`);
    }

    return lines.join('\n');
  }

  private formatPodcastItem(item: MarketDataItem, includeTranscripts: boolean): string {
    const lines: string[] = [];
    
    const date = new Date(item.timestamp).toLocaleDateString();
    
    lines.push(`### 🎧 ${item.title}`);
    lines.push('');
    lines.push(`**Show**: ${item.sourceDetails.name}`);
    lines.push(`**Date**: ${date}`);
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

    if (includeTranscripts && item.content && item.content.length > item.summary.length) {
      lines.push('');
      lines.push('**Transcript Excerpt**:');
      lines.push('```');
      lines.push(item.content.slice(0, 500) + (item.content.length > 500 ? '...' : ''));
      lines.push('```');
    }

    if (item.sourceDetails.url) {
      lines.push(`**Link**: ${item.sourceDetails.url}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }
}