export class TimeUtils {
  static parseTimeframe(timeframe: string): { hours: number; milliseconds: number } {
    const timeMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    };

    const hours = timeMap[timeframe] || 24;
    return {
      hours,
      milliseconds: hours * 60 * 60 * 1000,
    };
  }

  static getTimeframeStart(timeframe: string): Date {
    const { milliseconds } = this.parseTimeframe(timeframe);
    return new Date(Date.now() - milliseconds);
  }

  static isWithinTimeframe(timestamp: string, timeframe: string): boolean {
    const targetTime = new Date(timestamp);
    const startTime = this.getTimeframeStart(timeframe);
    return targetTime >= startTime;
  }

  static formatTimestamp(date: Date): string {
    return date.toISOString();
  }

  static parseTimestamp(timestamp: string): Date {
    return new Date(timestamp);
  }

  static getRecencyScore(timestamp: string, maxHours: number = 24): number {
    const now = Date.now();
    const targetTime = new Date(timestamp).getTime();
    const ageHours = (now - targetTime) / (1000 * 60 * 60);

    if (ageHours < 0) return 0; // Future dates get 0 score
    if (ageHours > maxHours) return 0; // Too old gets 0 score

    // Exponential decay: newer content gets higher scores
    return Math.exp(-ageHours / (maxHours / 3)) * 100;
  }

  static isMarketHours(date: Date = new Date()): boolean {
    // Simple US market hours check (9:30 AM - 4:00 PM ET, Monday-Friday)
    // This is a simplified version - in production you'd want to handle holidays
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) return false; // Weekend

    // Convert to ET (simplified - doesn't handle DST perfectly)
    const etHour = date.getUTCHours() - 5;
    const etMinutes = date.getUTCMinutes();
    const totalMinutes = etHour * 60 + etMinutes;

    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    return totalMinutes >= marketOpen && totalMinutes <= marketClose;
  }

  static getNextMarketOpen(): Date {
    const now = new Date();
    let nextOpen = new Date(now);

    // Set to 9:30 AM ET
    nextOpen.setUTCHours(14, 30, 0, 0); // 9:30 AM ET in UTC (simplified)

    // If it's already past market open today, move to next weekday
    if (now >= nextOpen || !this.isMarketHours(nextOpen)) {
      do {
        nextOpen.setDate(nextOpen.getDate() + 1);
        nextOpen.setUTCHours(14, 30, 0, 0);
      } while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6); // Skip weekends
    }

    return nextOpen;
  }

  static getUpdateFrequency(timeframe: string): number {
    // Return update frequency in minutes based on timeframe
    const frequencyMap: Record<string, number> = {
      '1h': 5,    // Update every 5 minutes for 1-hour window
      '6h': 15,   // Update every 15 minutes for 6-hour window
      '24h': 30,  // Update every 30 minutes for 24-hour window
      '7d': 60,   // Update every hour for 7-day window
      '30d': 240, // Update every 4 hours for 30-day window
    };

    return frequencyMap[timeframe] || 30;
  }

  static shouldUpdateDuringMarketHours(): boolean {
    return this.isMarketHours();
  }

  static getOptimalCacheTTL(contentType: 'news' | 'podcast' | 'email'): number {
    // Return TTL in seconds
    const ttlMap: Record<string, number> = {
      news: 3600,     // 1 hour for news
      podcast: 86400, // 24 hours for podcasts
      email: 7200,    // 2 hours for emails
    };

    return ttlMap[contentType] || 3600;
  }
}