import { TimeUtils } from '../utils/timeUtils';

export interface RelevanceConfig {
  marketKeywords: {
    high: string[];
    medium: string[];
    low: string[];
  };
  weights: {
    marketKeywords: number;
    stockSymbols: number;
    sourceAuthority: number;
    recency: number;
  };
}

export class RelevanceScorer {
  private stockSymbolRegex: RegExp;
  private sourceAuthorityMap: Map<string, number>;

  constructor(private config: RelevanceConfig) {
    // Common stock symbol pattern: 1-5 uppercase letters, optionally followed by digits
    this.stockSymbolRegex = /\b[A-Z]{1,5}(?:\d{0,2})?\b/g;
    
    // Initialize source authority mapping
    this.sourceAuthorityMap = new Map([
      ['Bloomberg API', 100],
      ['Reuters API', 95],
      ['Financial Times', 90],
      ['Wall Street Journal', 90],
      ['MarketWatch', 80],
      ['Yahoo Finance', 75],
      ['CNBC', 70],
      ['Chat with Traders', 85],
      ['The Meb Faber Research Podcast', 80],
      ['Gmail', 60], // Variable based on sender
    ]);
  }

  scoreContent(
    title: string,
    content: string,
    sourceName: string,
    timestamp: string
  ): {
    score: number;
    breakdown: {
      marketKeywords: number;
      stockSymbols: number;
      sourceAuthority: number;
      recency: number;
    };
    marketTags: string[];
    symbols: string[];
  } {
    const text = `${title} ${content}`.toLowerCase();
    
    // Calculate individual scores
    const marketKeywordScore = this.calculateMarketKeywordScore(text);
    const stockSymbolScore = this.calculateStockSymbolScore(title + ' ' + content);
    const sourceAuthorityScore = this.calculateSourceAuthorityScore(sourceName);
    const recencyScore = this.calculateRecencyScore(timestamp);

    // Apply weights
    const weights = this.config.weights;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    const weightedScores = {
      marketKeywords: (marketKeywordScore.score / 100) * weights.marketKeywords,
      stockSymbols: (stockSymbolScore.score / 100) * weights.stockSymbols,
      sourceAuthority: (sourceAuthorityScore / 100) * weights.sourceAuthority,
      recency: (recencyScore / 100) * weights.recency,
    };

    const finalScore = (Object.values(weightedScores).reduce((sum, score) => sum + score, 0) / totalWeight) * 100;

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      breakdown: {
        marketKeywords: marketKeywordScore.score,
        stockSymbols: stockSymbolScore.score,
        sourceAuthority: sourceAuthorityScore,
        recency: recencyScore,
      },
      marketTags: marketKeywordScore.tags,
      symbols: stockSymbolScore.symbols,
    };
  }

  private calculateMarketKeywordScore(text: string): { score: number; tags: string[] } {
    const foundTags: string[] = [];
    let score = 0;

    // Check high-value keywords (worth more points)
    for (const keyword of this.config.marketKeywords.high) {
      if (text.includes(keyword.toLowerCase())) {
        foundTags.push(keyword);
        score += 15; // High-value keywords worth 15 points each
      }
    }

    // Check medium-value keywords
    for (const keyword of this.config.marketKeywords.medium) {
      if (text.includes(keyword.toLowerCase())) {
        foundTags.push(keyword);
        score += 8; // Medium-value keywords worth 8 points each
      }
    }

    // Check low-value keywords
    for (const keyword of this.config.marketKeywords.low) {
      if (text.includes(keyword.toLowerCase())) {
        foundTags.push(keyword);
        score += 3; // Low-value keywords worth 3 points each
      }
    }

    // Cap at 100 and remove duplicates
    return {
      score: Math.min(100, score),
      tags: [...new Set(foundTags)]
    };
  }

  private calculateStockSymbolScore(text: string): { score: number; symbols: string[] } {
    const matches = text.match(this.stockSymbolRegex) || [];
    const symbols = this.filterValidStockSymbols([...new Set(matches)]);
    
    if (symbols.length === 0) return { score: 0, symbols: [] };

    // Score based on number of valid symbols mentioned
    // Major companies (market cap tiers) could be weighted differently
    let score = Math.min(100, symbols.length * 20); // 20 points per symbol, max 100

    // Boost score for major symbols (simplified list)
    const majorSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ'];
    const majorSymbolsFound = symbols.filter(symbol => majorSymbols.includes(symbol));
    score += majorSymbolsFound.length * 10; // Extra 10 points for major symbols

    return {
      score: Math.min(100, score),
      symbols
    };
  }

  private filterValidStockSymbols(candidates: string[]): string[] {
    // Filter out common false positives
    const excludeList = [
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
      'WAS', 'ONE', 'OUR', 'HAD', 'BUT', 'HAS', 'HIS', 'HIM', 'WHO', 'OIL',
      'GAS', 'NEW', 'NOW', 'TWO', 'WAY', 'ITS', 'MAY', 'DAY', 'GET', 'USE',
      'MAN', 'OLD', 'SEE', 'HOW', 'ILL', 'BIG', 'PUT', 'END', 'WHY', 'LET',
      'SAY', 'SHE', 'TRY', 'FAR', 'RUN', 'OWN', 'BACK', 'CALL', 'CAME',
      'EACH', 'FIND', 'GOOD', 'HAND', 'HIGH', 'KEEP', 'LAST', 'LEFT',
      'LIFE', 'LIVE', 'LONG', 'LOOK', 'MADE', 'MAKE', 'MANY', 'MOST',
      'MOVE', 'MUCH', 'NAME', 'NEED', 'NEXT', 'OPEN', 'OVER', 'PART',
      'PLAY', 'SAID', 'SAME', 'SEEM', 'SHOW', 'SIDE', 'TAKE', 'TELL',
      'THAN', 'THAT', 'THEM', 'THIS', 'TIME', 'TURN', 'USED', 'VERY',
      'WANT', 'WAYS', 'WELL', 'WENT', 'WERE', 'WHAT', 'WHEN', 'WHERE',
      'WILL', 'WITH', 'WORD', 'WORK', 'YEAR', 'YOUR'
    ];

    return candidates.filter(candidate => {
      // Must be 1-5 characters
      if (candidate.length < 1 || candidate.length > 5) return false;
      
      // Must be all uppercase
      if (candidate !== candidate.toUpperCase()) return false;
      
      // Must not be in exclude list
      if (excludeList.includes(candidate)) return false;
      
      // Must contain at least one letter
      if (!/[A-Z]/.test(candidate)) return false;
      
      return true;
    });
  }

  private calculateSourceAuthorityScore(sourceName: string): number {
    // Check for exact match first
    if (this.sourceAuthorityMap.has(sourceName)) {
      return this.sourceAuthorityMap.get(sourceName)!;
    }

    // Check for partial matches (for email sources)
    const sourceNameLower = sourceName.toLowerCase();
    
    if (sourceNameLower.includes('bloomberg')) return 95;
    if (sourceNameLower.includes('reuters')) return 90;
    if (sourceNameLower.includes('financial times') || sourceNameLower.includes('ft.com')) return 90;
    if (sourceNameLower.includes('wall street journal') || sourceNameLower.includes('wsj')) return 90;
    if (sourceNameLower.includes('marketwatch')) return 80;
    if (sourceNameLower.includes('yahoo finance')) return 75;
    if (sourceNameLower.includes('cnbc')) return 70;
    if (sourceNameLower.includes('seeking alpha')) return 65;
    if (sourceNameLower.includes('motley fool')) return 60;
    
    // Default for unknown sources
    return 50;
  }

  private calculateRecencyScore(timestamp: string): number {
    return TimeUtils.getRecencyScore(timestamp, 48); // 48-hour window for full recency score
  }

  extractSentiment(title: string, content: string): 'positive' | 'negative' | 'neutral' {
    const text = `${title} ${content}`.toLowerCase();
    
    const positiveWords = [
      'bull', 'bullish', 'gain', 'gains', 'rise', 'rises', 'rising', 'up',
      'surge', 'surges', 'surging', 'jump', 'jumps', 'jumping', 'rally',
      'rallies', 'rallying', 'boost', 'boosts', 'strong', 'strength',
      'outperform', 'beat', 'beats', 'exceed', 'exceeds', 'growth',
      'positive', 'optimistic', 'upgrade', 'upgrades', 'buy', 'recommend'
    ];

    const negativeWords = [
      'bear', 'bearish', 'fall', 'falls', 'falling', 'drop', 'drops',
      'dropping', 'decline', 'declines', 'declining', 'down', 'plunge',
      'plunges', 'plunging', 'crash', 'crashes', 'crashing', 'weak',
      'weakness', 'underperform', 'miss', 'misses', 'below', 'concern',
      'concerns', 'worry', 'worries', 'risk', 'risks', 'negative',
      'pessimistic', 'downgrade', 'downgrades', 'sell'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }

    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  updateSourceAuthority(sourceName: string, authority: number): void {
    this.sourceAuthorityMap.set(sourceName, Math.max(0, Math.min(100, authority)));
  }

  getSourceAuthority(sourceName: string): number {
    return this.calculateSourceAuthorityScore(sourceName);
  }
}