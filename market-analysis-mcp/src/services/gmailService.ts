import { google } from 'googleapis';
import { Logger } from 'winston';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import { TimeUtils } from '../utils/timeUtils';
import { MarketDataItem, GmailConfig, ProcessingResult, EmailData } from '../types/marketData';

export class GmailService {
  private gmail: any;
  private auth: any;

  constructor(
    private config: GmailConfig,
    private cache: CacheManager,
    private rateLimiter: RateLimiter,
    private logger: Logger
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (!this.config.enabled) {
      this.logger.info('Gmail service disabled in config');
      return;
    }

    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      this.logger.error('Missing required Google OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
      return;
    }

    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      this.logger.error('Missing GOOGLE_REFRESH_TOKEN. Run: npm run setup:gmail-oauth');
      return;
    }

    try {
      // Use proper redirect URI for web applications  
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3002/oauth/callback'
      );

      this.auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      // Set up auto-refresh for access tokens
      this.auth.on('tokens', (tokens: any) => {
        if (tokens.access_token) {
          this.logger.debug('Gmail access token refreshed');
        }
      });

      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.logger.info('Gmail service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gmail service:', error);
      this.logger.info('Try running: npm run setup:gmail-oauth');
    }
  }

  async getRelevantEmails(
    timeframe: string = '7d',
    senders?: string[],
    keywords?: string[]
  ): Promise<ProcessingResult> {
    if (!this.config.enabled) {
      return { 
        success: false, 
        error: 'Gmail service disabled in configuration. Set gmail.enabled to true in config/sources.json' 
      };
    }

    if (!this.gmail) {
      return { 
        success: false, 
        error: 'Gmail service not initialized. Run: npm run setup:gmail-oauth' 
      };
    }

    try {
      const cacheKey = this.cache.generateKey('emails', { timeframe, senders, keywords });
      
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Returning cached email data');
        return { success: true, data: cached, cached: true };
      }

      const emails = await this.fetchEmails(timeframe, senders, keywords);
      const marketDataItems = emails.map(email => this.convertEmailToMarketData(email));

      const filteredEmails = marketDataItems.filter(item => 
        TimeUtils.isWithinTimeframe(item.timestamp, timeframe)
      );

      filteredEmails.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const ttl = TimeUtils.getOptimalCacheTTL('email');
      await this.cache.set(cacheKey, filteredEmails, ttl);

      this.logger.info(`Fetched ${filteredEmails.length} relevant emails`);
      
      return { success: true, data: filteredEmails };
    } catch (error) {
      this.logger.error('Error fetching emails:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error fetching emails' 
      };
    }
  }

  private async fetchEmails(
    timeframe: string,
    senders?: string[],
    keywords?: string[]
  ): Promise<EmailData[]> {
    return this.rateLimiter.withRetry(
      'gmail-api',
      '250/second', // Gmail API quota
      async () => {
        const query = this.buildSearchQuery(timeframe, senders, keywords);
        
        const response = await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 100
        });

        const messages = response.data.messages || [];
        const emailDetails: EmailData[] = [];

        // Fetch details for each message
        for (const message of messages.slice(0, 50)) { // Limit to avoid quota issues
          try {
            const details = await this.gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date']
            });

            const email = this.parseEmailDetails(details.data);
            if (email && this.isRelevantEmail(email)) {
              emailDetails.push(email);
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch email ${message.id}:`, error);
          }
        }

        return emailDetails;
      }
    );
  }

  private buildSearchQuery(
    timeframe: string,
    senders?: string[],
    keywords?: string[]
  ): string {
    const queryParts: string[] = [];

    // Add timeframe
    const startDate = TimeUtils.getTimeframeStart(timeframe);
    const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    queryParts.push(`after:${dateStr}`);

    // Add sender filters
    if (senders && senders.length > 0) {
      const senderQuery = senders.map(sender => `from:${sender}`).join(' OR ');
      queryParts.push(`(${senderQuery})`);
    } else if (this.config.targetSenders && this.config.targetSenders.length > 0) {
      const senderQuery = this.config.targetSenders.map(sender => `from:${sender}`).join(' OR ');
      queryParts.push(`(${senderQuery})`);
    }

    // Add keyword filters
    if (keywords && keywords.length > 0) {
      const keywordQuery = keywords.map(keyword => `"${keyword}"`).join(' OR ');
      queryParts.push(`(${keywordQuery})`);
    }

    // Add label filters
    if (this.config.labels && this.config.labels.length > 0) {
      const labelQuery = this.config.labels.map(label => `label:${label}`).join(' OR ');
      queryParts.push(`(${labelQuery})`);
    }

    // Exclude patterns
    if (this.config.excludePatterns && this.config.excludePatterns.length > 0) {
      this.config.excludePatterns.forEach(pattern => {
        queryParts.push(`-"${pattern}"`);
      });
    }

    return queryParts.join(' ');
  }

  private parseEmailDetails(emailData: any): EmailData | null {
    try {
      const headers = emailData.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

      return {
        id: emailData.id,
        sender: getHeader('From'),
        subject: getHeader('Subject'),
        snippet: emailData.snippet || '',
        timestamp: new Date(getHeader('Date')).toISOString(),
        labels: emailData.labelIds || []
      };
    } catch (error) {
      this.logger.error('Error parsing email details:', error);
      return null;
    }
  }

  private isRelevantEmail(email: EmailData): boolean {
    const content = `${email.subject} ${email.snippet}`.toLowerCase();
    
    // Check for market-related keywords
    const marketKeywords = [
      'market', 'trading', 'stock', 'earnings', 'financial', 'investment',
      'portfolio', 'analysis', 'research', 'economy', 'fed', 'interest rate',
      'inflation', 'gdp', 'unemployment', 'dividend', 'options', 'futures'
    ];

    return marketKeywords.some(keyword => content.includes(keyword));
  }

  private convertEmailToMarketData(email: EmailData): MarketDataItem {
    const redactedContent = this.redactSensitiveInfo(email.snippet);
    
    return {
      id: email.id,
      source: 'email',
      sourceDetails: {
        name: 'Gmail',
        author: this.extractSenderName(email.sender)
      },
      timestamp: email.timestamp,
      title: email.subject,
      content: redactedContent,
      summary: this.generateSummary(redactedContent),
      relevanceScore: 0, // Will be calculated by RelevanceScorer
      marketTags: [],
      symbols: [],
      sentiment: undefined
    };
  }

  private redactSensitiveInfo(content: string): string {
    // Remove potential sensitive information
    return content
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]') // Credit cards
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]') // SSN
      .replace(/\$[\d,]+\.?\d*/g, '[AMOUNT_REDACTED]') // Dollar amounts
      .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL_REDACTED]') // Email addresses
      .replace(/\b\d{10,}\b/g, '[NUMBER_REDACTED]'); // Long numbers
  }

  private extractSenderName(sender: string): string {
    // Extract name from "Name <email@domain.com>" format
    const match = sender.match(/^([^<]+)</);
    return match ? match[1].trim() : sender;
  }

  private generateSummary(content: string): string {
    if (!content || content.length <= 150) return content;
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return content.slice(0, 150) + '...';
    
    return sentences[0].trim().slice(0, 150) + '...';
  }

  async searchEmails(query: string, timeframe: string = '30d'): Promise<MarketDataItem[]> {
    try {
      const result = await this.getRelevantEmails(timeframe, undefined, [query]);
      return result.success && result.data ? result.data : [];
    } catch (error) {
      this.logger.error('Error searching emails:', error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.gmail) return false;

    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return !!response.data.emailAddress;
    } catch (error) {
      this.logger.error('Gmail connection test failed:', error);
      return false;
    }
  }
}