import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import * as winston from 'winston';
import { ErrorHandler, StructuredError } from '../utils/ErrorHandler';

export abstract class BaseService {
  protected cache: CacheManager;
  protected rateLimiter: RateLimiter;
  protected logger: winston.Logger;

  constructor(cache: CacheManager, rateLimiter: RateLimiter, logger: winston.Logger) {
    this.cache = cache;
    this.rateLimiter = rateLimiter;
    this.logger = logger;
  }

  /**
   * Execute an operation with rate limiting and retry logic
   */
  protected async executeWithRateLimit<T>(
    operation: () => Promise<T>, 
    key: string,
    rateLimit: string = '60/hour',
    maxRetries: number = 3
  ): Promise<T> {
    try {
      return await this.rateLimiter.withRetry(key, rateLimit, operation, maxRetries);
    } catch (error) {
      const structuredError = ErrorHandler.createStructuredError(
        'RATE_LIMIT_EXCEEDED',
        `Operation failed after ${maxRetries} attempts`,
        { key, error: (error as Error).message }
      );
      
      ErrorHandler.logError(structuredError, this.logger);
      throw error;
    }
  }

  /**
   * Execute operation with caching
   */
  protected async cacheOperation<T>(
    key: string, 
    operation: () => Promise<T>, 
    ttl: number = 3600
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.cache.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        try {
          return JSON.parse(cached);
        } catch (parseError) {
          this.logger.warn(`Cache corruption detected for key: ${key}, clearing and regenerating`);
          await this.cache.delete(key);
          // Continue to cache miss logic
        }
      }

      // Cache miss - execute operation
      this.logger.debug(`Cache miss for key: ${key}`);
      const result = await operation();

      // Store in cache
      await this.cache.set(key, JSON.stringify(result), ttl);
      
      return result;
    } catch (error) {
      this.handleError(error as Error, `cacheOperation:${key}`);
      throw error;
    }
  }

  /**
   * Standardized error handling
   */
  protected handleError(error: Error, context: string): void {
    const structuredError = ErrorHandler.createStructuredError(
      this.getErrorCode(error),
      error.message,
      { context, stack: error.stack }
    );

    ErrorHandler.logError(structuredError, this.logger);
  }

  /**
   * Get appropriate error code based on error type
   */
  private getErrorCode(error: Error): string {
    if (error.message.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED';
    if (error.message.includes('ENOTFOUND')) return 'DNS_RESOLUTION_FAILED';
    if (error.message.includes('timeout')) return 'REQUEST_TIMEOUT';
    if (error.message.includes('401')) return 'UNAUTHORIZED';
    if (error.message.includes('403')) return 'FORBIDDEN';
    if (error.message.includes('404')) return 'NOT_FOUND';
    if (error.message.includes('429')) return 'RATE_LIMITED';
    if (error.message.includes('500')) return 'SERVER_ERROR';
    return 'UNKNOWN_ERROR';
  }

  /**
   * Utility method for sleeping
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate consistent cache keys
   */
  protected generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Validate required configuration
   */
  protected validateConfig(config: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  /**
   * Safe JSON parsing with error handling
   */
  protected safeJsonParse<T>(jsonString: string, defaultValue: T): T {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.warn(`Failed to parse JSON: ${error}`);
      return defaultValue;
    }
  }

  /**
   * Format response with metadata
   */
  protected formatResponse<T>(data: T, metadata: Record<string, any> = {}): {
    data: T;
    metadata: {
      timestamp: string;
      source: string;
      [key: string]: any;
    };
  } {
    return {
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: this.constructor.name,
        ...metadata
      }
    };
  }
}