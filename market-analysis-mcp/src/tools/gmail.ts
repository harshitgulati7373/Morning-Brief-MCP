import { GmailService } from '../services/gmailService';
import { RelevanceScorer } from '../services/relevanceScorer';
import { MarketDataItem } from '../types/marketData';

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
              text: `Error fetching emails: ${result.error}`
            }
          ]
        };
      }

      if (!result.data || result.data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No relevant emails found for the specified criteria.'
            }
          ]
        };
      }

      const scoredEmails = result.data.map(item => this.enhanceEmailItem(item));
      scoredEmails.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const response = this.formatEmailResponse(scoredEmails, {
        timeframe,
        senders,
        keywords,
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

  private formatEmailResponse(emails: MarketDataItem[], metadata: any): string {
    const lines: string[] = [];

    lines.push('# Relevant Email Summaries');
    lines.push('');
    lines.push(`**Timeframe**: ${metadata.timeframe}`);
    lines.push(`**Emails Found**: ${emails.length}`);
    if (metadata.senders) {
      lines.push(`**Filtered by Senders**: ${metadata.senders.join(', ')}`);
    }
    if (metadata.keywords) {
      lines.push(`**Keywords**: ${metadata.keywords.join(', ')}`);
    }
    if (metadata.cached) {
      lines.push('**Source**: Cached data');
    }
    lines.push('');

    const highRelevance = emails.filter(item => item.relevanceScore >= 70);
    const mediumRelevance = emails.filter(item => item.relevanceScore >= 40 && item.relevanceScore < 70);
    const lowRelevance = emails.filter(item => item.relevanceScore < 40);

    if (highRelevance.length > 0) {
      lines.push('## 📧 High Relevance Emails');
      lines.push('');
      highRelevance.forEach(item => {
        lines.push(this.formatEmailItem(item));
      });
      lines.push('');
    }

    if (mediumRelevance.length > 0) {
      lines.push('## 📨 Medium Relevance Emails');
      lines.push('');
      mediumRelevance.forEach(item => {
        lines.push(this.formatEmailItem(item));
      });
      lines.push('');
    }

    if (lowRelevance.length > 0) {
      lines.push('## 📬 Other Emails');
      lines.push('');
      lowRelevance.forEach(item => {
        lines.push(this.formatEmailItem(item));
      });
    }

    lines.push('');
    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **High Relevance**: ${highRelevance.length} emails`);
    lines.push(`- **Medium Relevance**: ${mediumRelevance.length} emails`);
    lines.push(`- **Low Relevance**: ${lowRelevance.length} emails`);

    const uniqueSenders = new Set(emails.map(item => item.sourceDetails.author || 'Unknown'));
    lines.push(`- **Unique Senders**: ${uniqueSenders.size}`);

    const allSymbols = emails.flatMap(item => item.symbols || []);
    const uniqueSymbols = [...new Set(allSymbols)];
    if (uniqueSymbols.length > 0) {
      lines.push(`- **Mentioned Symbols**: ${uniqueSymbols.slice(0, 10).join(', ')}${uniqueSymbols.length > 10 ? '...' : ''}`);
    }

    return lines.join('\n');
  }

  private formatEmailItem(item: MarketDataItem): string {
    const lines: string[] = [];
    
    const date = new Date(item.timestamp).toLocaleString();
    const author = item.sourceDetails.author || 'Unknown Sender';
    
    lines.push(`### 💌 ${item.title}`);
    lines.push('');
    lines.push(`**From**: ${author}`);
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

    // Note about privacy
    lines.push('');
    lines.push('*Note: Sensitive information has been redacted for privacy*');

    lines.push('');
    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }
}