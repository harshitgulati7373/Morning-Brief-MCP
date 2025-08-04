#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import winston from 'winston';
import { CacheManager } from './utils/cache.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { SecurityValidator } from './utils/SecurityValidator.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { NewsService } from './services/newsService.js';
import { PodcastService } from './services/podcastService.js';
import { GmailService } from './services/gmailService.js';
import { RelevanceScorer } from './services/relevanceScorer.js';
import { NewsTools } from './tools/news.js';
import { PodcastTools } from './tools/podcasts.js';
import { GmailTools } from './tools/gmail.js';
import { UnifiedTools } from './tools/unified.js';
import { SearchTools } from './tools/search.js';
import { SourcesConfig } from './types/marketData.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Setup logging
// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fsSync.existsSync(logsDir)) {
  fsSync.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Only log to file for MCP, not console (to avoid JSON parsing issues)
    new winston.transports.File({ filename: 'logs/market-mcp.log' })
  ],
});

class MarketAnalysisMCPServer {
  private server: Server;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private newsService!: NewsService;
  private podcastService!: PodcastService;
  private gmailService!: GmailService;
  private relevanceScorer!: RelevanceScorer;
  private config!: SourcesConfig;

  // Tool instances
  private newsTools!: NewsTools;
  private podcastTools!: PodcastTools;
  private gmailTools!: GmailTools;
  private unifiedTools!: UnifiedTools;
  private searchTools!: SearchTools;

  constructor() {
    this.server = new Server(
      {
        name: 'market-analysis-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cache = new CacheManager(process.env.DATABASE_PATH);
    this.rateLimiter = new RateLimiter();
    
    this.setupHandlers();
    
    // Setup periodic cleanup of expired rate limit entries
    setInterval(() => {
      SecurityValidator.cleanupExpiredEntries();
    }, 15 * 60 * 1000); // Cleanup every 15 minutes
  }

  async initialize(): Promise<void> {
    try {
      // Ensure all directories exist
      const directories = ['logs', 'data', 'config'];
      for (const dir of directories) {
        const dirPath = path.join(process.cwd(), dir);
        if (!fsSync.existsSync(dirPath)) {
          fsSync.mkdirSync(dirPath, { recursive: true });
        }
      }

      // Load configuration
      await this.loadConfig();
      
      // Initialize cache
      await this.cache.initializeDatabase();
      
      // Initialize services
      this.relevanceScorer = new RelevanceScorer(this.config.relevanceScoring);
      this.newsService = new NewsService(this.config.news, this.cache, this.rateLimiter, logger);
      this.podcastService = new PodcastService(this.config.podcasts, this.cache, this.rateLimiter, logger);
      this.gmailService = new GmailService(this.config.gmail, this.cache, this.rateLimiter, logger);
      
      // Initialize tools
      this.newsTools = new NewsTools(this.newsService, this.relevanceScorer);
      this.podcastTools = new PodcastTools(this.podcastService, this.relevanceScorer);
      this.gmailTools = new GmailTools(this.gmailService, this.relevanceScorer);
      this.unifiedTools = new UnifiedTools(
        this.newsService,
        this.podcastService,
        this.gmailService,
        this.relevanceScorer
      );
      this.searchTools = new SearchTools(
        this.newsService,
        this.podcastService,
        this.gmailService,
        this.relevanceScorer,
        this.cache
      );

      logger.info('Market Analysis MCP Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'config', 'sources.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
      logger.info('Configuration loaded successfully');
    } catch (error) {
      logger.error('Failed to load configuration:', error);
      throw error;
    }
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_market_news',
            description: 'Retrieve latest financial news articles',
            inputSchema: {
              type: 'object',
              properties: {
                timeframe: {
                  type: 'string',
                  enum: ['1h', '6h', '24h', '7d'],
                  description: 'Time range for news articles',
                  default: '24h'
                },
                symbols: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by stock symbols (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of articles to return',
                  default: 20,
                  minimum: 1,
                  maximum: 100
                }
              }
            }
          },
          {
            name: 'get_podcast_summaries',
            description: 'Get summaries from configured market podcasts',
            inputSchema: {
              type: 'object',
              properties: {
                timeframe: {
                  type: 'string',
                  enum: ['24h', '7d', '30d'],
                  description: 'Time range for podcast episodes',
                  default: '7d'
                },
                include_transcripts: {
                  type: 'boolean',
                  description: 'Include full transcripts in response',
                  default: false
                }
              }
            }
          },
          {
            name: 'get_relevant_emails',
            description: 'Extract market-relevant emails from Gmail',
            inputSchema: {
              type: 'object',
              properties: {
                timeframe: {
                  type: 'string',
                  enum: ['24h', '7d', '30d'],
                  description: 'Time range for emails',
                  default: '7d'
                },
                senders: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by specific sender emails (optional)'
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Search for specific market terms (optional)'
                }
              }
            }
          },
          {
            name: 'get_market_snapshot',
            description: 'Unified view across all sources with key highlights',
            inputSchema: {
              type: 'object',
              properties: {
                timeframe: {
                  type: 'string',
                  enum: ['1h', '6h', '24h'],
                  description: 'Time range for snapshot',
                  default: '6h'
                },
                priority_symbols: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Prioritize specific symbols (optional)'
                }
              }
            }
          },
          {
            name: 'search_market_data',
            description: 'Search across all historical collected data',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search terms'
                },
                sources: {
                  type: 'array',
                  items: { type: 'string', enum: ['news', 'podcast', 'email'] },
                  description: 'Limit to specific sources (optional)'
                },
                timeframe: {
                  type: 'string',
                  enum: ['1h', '6h', '24h', '7d', '30d'],
                  description: 'Time range to search (optional)',
                  default: '7d'
                },
                min_relevance: {
                  type: 'number',
                  description: 'Minimum relevance score (0-100)',
                  default: 50,
                  minimum: 0,
                  maximum: 100
                }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Generate client ID for rate limiting (based on request metadata or use default)
      const clientId = this.getClientId(request);
      
      try {
        // Security validations
        if (!SecurityValidator.validateRequestStructure(request.params)) {
          const error = ErrorHandler.createStructuredError(
            'INVALID_REQUEST_STRUCTURE',
            'Request structure validation failed',
            { tool: name }
          );
          logger.warn('Invalid request structure detected', error);
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Invalid request structure.'
              }
            ]
          };
        }

        // Rate limiting check
        if (SecurityValidator.isRateLimitExceeded(clientId, 1000)) { // 1000 requests per hour per client
          const error = ErrorHandler.createStructuredError(
            'RATE_LIMIT_EXCEEDED',
            'Rate limit exceeded for client',
            { clientId, tool: name, remaining: SecurityValidator.getRemainingRequests(clientId, 1000) }
          );
          logger.warn('Rate limit exceeded', error);
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Rate limit exceeded. Please try again later.'
              }
            ]
          };
        }

        // Sanitize input arguments
        const sanitizedArgs = SecurityValidator.sanitizeInput(args);

        switch (name) {
          case 'get_market_news':
            return await this.newsTools.getMarketNews(sanitizedArgs);

          case 'get_podcast_summaries':
            return await this.podcastTools.getPodcastSummaries(sanitizedArgs);

          case 'get_relevant_emails':
            return await this.gmailTools.getRelevantEmails(sanitizedArgs);

          case 'get_market_snapshot':
            return await this.unifiedTools.getMarketSnapshot(sanitizedArgs);

          case 'search_market_data':
            return await this.searchTools.searchMarketData(sanitizedArgs);

          default:
            const error = ErrorHandler.createStructuredError(
              'UNKNOWN_TOOL',
              `Unknown tool requested: ${name}`,
              { tool: name }
            );
            logger.error('Unknown tool requested', error);
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const structuredError = ErrorHandler.createStructuredError(
          'TOOL_EXECUTION_ERROR',
          `Tool execution error for ${name}`,
          { 
            tool: name, 
            clientId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }
        );
        ErrorHandler.logError(structuredError, logger);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private getClientId(request: any): string {
    // In a real implementation, you might extract client ID from request headers,
    // authentication tokens, or other metadata. For now, use a default.
    // This could be enhanced to use actual client identification.
    return request.id || request.clientId || 'default-client';
  }

  async start(): Promise<void> {
    await this.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('Market Analysis MCP Server started');
  }

  async stop(): Promise<void> {
    await this.cache.close();
    logger.info('Market Analysis MCP Server stopped');
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
const server = new MarketAnalysisMCPServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});