interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class SecurityValidator {
  private static rateLimitStore = new Map<string, RateLimitEntry>();
  private static readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

  static validateApiKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (key.length < 10 || key.length > 100) return false;
    
    // Enhanced validation to prevent common API key patterns that might be malicious
    if (key.includes('..') || key.includes('//') || key.includes('<') || key.includes('>')) {
      return false;
    }
    
    return /^[a-zA-Z0-9_-]+$/.test(key);
  }

  static sanitizeSearchQuery(query: string): string {
    if (!query) return '';
    
    // Enhanced sanitization for security
    return query
      .replace(/[<>"'&;(){}]/g, '') // Remove dangerous characters
      .replace(/\b(script|javascript|vbscript|onload|onerror|onclick)\b/gi, '') // Remove script-related terms
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 500); // Limit length
  }

  static isRateLimitExceeded(clientId: string, limit: number = 100): boolean {
    const now = Date.now();
    const entry = this.rateLimitStore.get(clientId);

    if (!entry || now > entry.resetTime) {
      // Create new or reset expired entry
      this.rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return false;
    }

    if (entry.count >= limit) {
      return true;
    }

    // Increment counter
    entry.count++;
    this.rateLimitStore.set(clientId, entry);
    return false;
  }

  static getRemainingRequests(clientId: string, limit: number = 100): number {
    const entry = this.rateLimitStore.get(clientId);
    if (!entry || Date.now() > entry.resetTime) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    } else if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    } else if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  private static sanitizeString(str: string): string {
    if (!str) return '';
    return str
      .replace(/[<>"'&;(){}]/g, '')
      .replace(/\b(script|javascript|vbscript|onload|onerror|onclick)\b/gi, '')
      .trim()
      .slice(0, 1000);
  }

  static validateRequestStructure(request: any): boolean {
    if (!request || typeof request !== 'object') {
      return false;
    }

    // Check for deep nesting that could indicate malicious payload
    const maxDepth = 10;
    const checkDepth = (obj: any, depth: number): boolean => {
      if (depth > maxDepth) return false;
      if (obj && typeof obj === 'object') {
        for (const value of Object.values(obj)) {
          if (!checkDepth(value, depth + 1)) return false;
        }
      }
      return true;
    };

    return checkDepth(request, 0);
  }

  static cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [clientId, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(clientId);
      }
    }
  }
}