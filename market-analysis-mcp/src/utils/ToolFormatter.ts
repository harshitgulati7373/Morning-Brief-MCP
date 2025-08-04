import { MarketDataItem } from '../types/marketData';

export class ToolFormatter {
  /**
   * Format a single market data item for display
   */
  static formatMarketItem(item: MarketDataItem): string {
    const relevanceIcon = this.getRelevanceIcon(item.relevanceScore);
    const timeAgo = this.formatTimeAgo(item.timestamp);
    const symbolsText = item.symbols && item.symbols.length > 0 
      ? `\n**Symbols**: ${item.symbols.join(', ')}`
      : '';

    return `### ${relevanceIcon} ${item.title}

**Source**: ${item.source}
**Time**: ${timeAgo}
**Relevance Score**: ${this.formatRelevanceScore(item.relevanceScore)}${symbolsText}

${this.truncateContent(item.content, 300)}

---`;
  }

  /**
   * Format relevance score with visual indicators
   */
  static formatRelevanceScore(score: number): string {
    const percentage = Math.round(score);
    let indicator = '';
    let category = '';

    if (score >= 70) {
      indicator = '🔥';
      category = 'High';
    } else if (score >= 40) {
      indicator = '📊';
      category = 'Medium';
    } else if (score >= 20) {
      indicator = '📋';
      category = 'Low';
    } else {
      indicator = '📄';
      category = 'Minimal';
    }

    return `${indicator} ${percentage}/100 (${category})`;
  }

  /**
   * Format error response consistently
   */
  static formatErrorResponse(error: Error, context?: string): string {
    const contextText = context ? ` in ${context}` : '';
    return `❌ **Error${contextText}**

${error.message}

*Please check your configuration and try again.*`;
  }

  /**
   * Generate markdown summary from multiple items
   */
  static generateMarkdownSummary(
    items: MarketDataItem[], 
    title: string,
    timeframe?: string,
    includeMetrics: boolean = true
  ): string {
    if (items.length === 0) {
      return `# ${title}

${timeframe ? `**Timeframe**: ${timeframe}\n` : ''}**Status**: No items found for the specified criteria.

*Try adjusting your search parameters or timeframe.*`;
    }

    // Sort by relevance score (descending)
    const sortedItems = [...items].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // Group by relevance categories
    const highRelevance = sortedItems.filter(item => (item.relevanceScore || 0) >= 70);
    const mediumRelevance = sortedItems.filter(item => (item.relevanceScore || 0) >= 40 && (item.relevanceScore || 0) < 70);
    const lowRelevance = sortedItems.filter(item => (item.relevanceScore || 0) < 40);

    let summary = `# ${title}

${timeframe ? `**Timeframe**: ${timeframe}\n` : ''}**Items Found**: ${items.length}\n`;

    if (includeMetrics) {
      summary += this.generateMetrics(items);
    }

    // Add sections by relevance
    if (highRelevance.length > 0) {
      summary += `\n## 🔥 High Relevance Items\n\n`;
      summary += highRelevance.map(item => this.formatMarketItem(item)).join('\n');
    }

    if (mediumRelevance.length > 0) {
      summary += `\n## 📊 Medium Relevance Items\n\n`;
      summary += mediumRelevance.map(item => this.formatMarketItem(item)).join('\n');
    }

    if (lowRelevance.length > 0 && lowRelevance.length <= 5) {
      summary += `\n## 📋 Additional Items\n\n`;
      summary += lowRelevance.map(item => this.formatMarketItem(item)).join('\n');
    }

    return summary;
  }

  /**
   * Generate metrics summary
   */
  static generateMetrics(items: MarketDataItem[]): string {
    if (items.length === 0) return '';

    const avgScore = items.reduce((sum, item) => sum + (item.relevanceScore || 0), 0) / items.length;
    const sources = [...new Set(items.map(item => item.source))];
    const symbols = [...new Set(items.flatMap(item => item.symbols || []))];
    const sentiments = items.map(item => item.sentiment).filter(Boolean);
    
    const sentimentCounts = {
      positive: sentiments.filter(s => s === 'positive').length,
      negative: sentiments.filter(s => s === 'negative').length,
      neutral: sentiments.filter(s => s === 'neutral').length
    };

    return `
## 📈 Summary Metrics

- **Average Relevance**: ${Math.round(avgScore)}/100
- **Sources**: ${sources.length} (${sources.slice(0, 3).join(', ')}${sources.length > 3 ? '...' : ''})
- **Symbols Mentioned**: ${symbols.length}${symbols.length > 0 ? ` (${symbols.slice(0, 5).join(', ')}${symbols.length > 5 ? '...' : ''})` : ''}
- **Sentiment**: ${sentimentCounts.positive}+ / ${sentimentCounts.negative}- / ${sentimentCounts.neutral}=

`;
  }

  /**
   * Format timeframe display
   */
  static formatTimeframe(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours < 168) {
      const days = Math.round(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else {
      const weeks = Math.round(hours / 168);
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Format symbols for display
   */
  static formatSymbols(symbols: string[]): string {
    if (!symbols || symbols.length === 0) return '';
    
    if (symbols.length <= 3) {
      return symbols.join(', ');
    }
    
    return `${symbols.slice(0, 3).join(', ')} and ${symbols.length - 3} more`;
  }

  /**
   * Private helper methods
   */
  private static getRelevanceIcon(score: number): string {
    if (score >= 70) return '🔥';
    if (score >= 40) return '📊';
    if (score >= 20) return '📋';
    return '📄';
  }

  private static formatTimeAgo(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 1) {
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        const hours = Math.round(diffHours);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 168) {
        const days = Math.round(diffHours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return timestamp;
    }
  }

  private static truncateContent(content: string, maxLength: number): string {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    
    return content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Create consistent section headers
   */
  static createSectionHeader(title: string, icon: string = '📊'): string {
    return `## ${icon} ${title}\n\n`;
  }

  /**
   * Format item count with appropriate pluralization
   */
  static formatItemCount(count: number, itemType: string): string {
    if (count === 0) return `No ${itemType}s found`;
    if (count === 1) return `1 ${itemType}`;
    return `${count} ${itemType}s`;
  }

  /**
   * Generate source breakdown
   */
  static generateSourceBreakdown(items: MarketDataItem[]): string {
    const sourceCounts = items.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([source, count]) => `- **${source}**: ${count}`)
      .join('\n');
  }

  /**
   * Generate loading message
   */
  static generateLoadingMessage(operation: string): string {
    return `🔄 ${operation}...\n\n*This may take a moment while we gather the latest data.*`;
  }

  /**
   * Generate success message
   */
  static generateSuccessMessage(operation: string, count: number): string {
    return `✅ ${operation} completed successfully! Found ${count} item${count !== 1 ? 's' : ''}.`;
  }
}