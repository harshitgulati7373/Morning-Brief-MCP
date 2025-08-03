export class SecurityValidator {
  static validateApiKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (key.length < 10 || key.length > 100) return false;
    return /^[a-zA-Z0-9_-]+$/.test(key);
  }

  static sanitizeSearchQuery(query: string): string {
    if (!query) return '';
    return query
      .replace(/[<>"'&]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
  }

  static isRateLimitExceeded(clientId: string, limit: number = 100): boolean {
    // Basic rate limiting check - can be enhanced with Redis/memory store
    return false; // Placeholder implementation
  }
}