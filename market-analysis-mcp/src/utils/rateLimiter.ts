import { RateLimitEntry } from '../types/marketData';

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  parseRateLimit(rateLimit: string): { requests: number; windowMs: number } {
    // Parse formats like "100/hour", "60/minute", "10/second"
    const [requestsStr, period] = rateLimit.split('/');
    const requests = parseInt(requestsStr, 10);

    const periodMap: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };

    const windowMs = periodMap[period] || 60 * 60 * 1000; // Default to 1 hour

    return { requests, windowMs };
  }

  async checkLimit(source: string, rateLimit: string): Promise<boolean> {
    const { requests: maxRequests, windowMs } = this.parseRateLimit(rateLimit);
    const now = Date.now();

    const entry = this.limits.get(source);

    if (!entry) {
      // First request for this source
      this.limits.set(source, {
        source,
        requests: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Check if the window has reset
    if (now >= entry.resetTime) {
      this.limits.set(source, {
        source,
        requests: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Check if we're within the limit
    if (entry.requests < maxRequests) {
      entry.requests++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  async waitForReset(source: string): Promise<number> {
    const entry = this.limits.get(source);
    if (!entry) return 0;

    const now = Date.now();
    const waitTime = Math.max(0, entry.resetTime - now);
    return waitTime;
  }

  getRemainingRequests(source: string, rateLimit: string): number {
    const { requests: maxRequests } = this.parseRateLimit(rateLimit);
    const entry = this.limits.get(source);

    if (!entry) return maxRequests;

    const now = Date.now();
    if (now >= entry.resetTime) return maxRequests;

    return Math.max(0, maxRequests - entry.requests);
  }

  getResetTime(source: string): number {
    const entry = this.limits.get(source);
    return entry?.resetTime || 0;
  }

  reset(source: string): void {
    this.limits.delete(source);
  }

  resetAll(): void {
    this.limits.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [source, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(source);
      }
    }
  }

  async withRateLimit<T>(
    source: string,
    rateLimit: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const canProceed = await this.checkLimit(source, rateLimit);

    if (!canProceed) {
      const waitTime = await this.waitForReset(source);
      throw new Error(
        `Rate limit exceeded for ${source}. Reset in ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }

    return operation();
  }

  async withRetry<T>(
    source: string,
    rateLimit: string,
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.withRateLimit(source, rateLimit, operation);
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) break;

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  getStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [source, entry] of this.limits.entries()) {
      const now = Date.now();
      status[source] = {
        requests: entry.requests,
        resetTime: entry.resetTime,
        resetIn: Math.max(0, entry.resetTime - now),
        isReset: now >= entry.resetTime,
      };
    }

    return status;
  }
}