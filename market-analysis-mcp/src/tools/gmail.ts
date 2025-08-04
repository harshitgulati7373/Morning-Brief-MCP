import { GmailService } from '../services/gmailService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { MarketDataItem } from '../types/marketData';
import { ToolFormatter } from '../utils/ToolFormatter';

export class GmailTools {
  constructor(
    private gmailService: GmailService,
    private relevanceScorer: RelevanceScorer
  ) {}

  async getRelevantEmails(args: any): Promise<any> {
    const { timeframe = '7d', senders, keywords } = args;

    try {
      const result = await this.gmailService.getRelevantEmails(timeframe, senders, keywords);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: ToolFormatter.formatErrorResponse(new Error(result.error), 'fetching emails')
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
              text: ToolFormatter.generateMarkdownSummary([], 'Relevant Email Summaries', timeframeFormatted, false)
            }
          ]
        };
      }

      const scoredEmails = result.data.map(item => this.enhanceEmailItem(item));
      scoredEmails.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const timeframeFormatted = ToolFormatter.formatTimeframe(this.parseTimeframe(timeframe));
      const response = ToolFormatter.generateMarkdownSummary(
        scoredEmails,
        'Relevant Email Summaries',
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

  private enhanceEmailItem(item: MarketDataItem): MarketDataItem {
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
    if (!match) return 168; // Default to 7 days for emails
    
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