import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { CacheManager } from '../src/utils/cache';
import { RateLimiter } from '../src/utils/rateLimiter';
import { RelevanceScorer } from '../src/services/relevanceScorer';
import { NewsService } from '../src/services/newsService';
import { PodcastService } from '../src/services/podcastService';
import { GmailService } from '../src/services/gmailService';

export interface TestServices {
  cache: CacheManager;
  rateLimiter: RateLimiter;
  relevanceScorer: RelevanceScorer;
  newsService: NewsService;
  podcastService: PodcastService;
  gmailService?: GmailService;
  logger: winston.Logger;
}

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
  metrics?: {
    itemCount: number;
    avgRelevanceScore: number;
    sources: string[];
    symbols: string[];
  };
}

export interface TestSuite {
  suiteName: string;
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
    successRate: number;
  };
}

export class TestFramework {
  private static config: any;
  private static logger: winston.Logger;

  /**
   * Load configuration from sources.json
   */
  static loadConfig(): any {
    if (this.config) return this.config;
    
    const configPath = path.join(process.cwd(), 'config/sources.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Configuration file not found: config/sources.json');
    }

    this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return this.config;
  }

  /**
   * Initialize logger for testing
   */
  static createLogger(testName: string): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] ${level.toUpperCase()} [${testName}]: ${message} ${metaStr}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * Initialize all services for testing
   */
  static async initializeServices(testName: string = 'TestFramework'): Promise<TestServices> {
    console.log(`🔧 Initializing services for ${testName}...`);
    
    const config = this.loadConfig();
    const logger = this.createLogger(testName);
    
    // Initialize core utilities
    const cache = new CacheManager(process.env.DATABASE_PATH || './data/test_cache.db');
    const rateLimiter = new RateLimiter();
    
    await cache.initializeDatabase();
    console.log('✅ Cache initialized');

    const relevanceScorer = new RelevanceScorer(config.relevanceScoring);
    console.log('✅ Relevance scorer initialized');

    // Initialize services
    const newsService = new NewsService(
      { sources: config.news.sources },
      cache,
      rateLimiter,
      logger
    );
    console.log('✅ News service initialized');

    const podcastService = new PodcastService(
      { sources: config.podcasts },
      cache,
      rateLimiter,
      logger
    );
    console.log('✅ Podcast service initialized');

    let gmailService: GmailService | undefined;
    try {
      if (config.gmail && config.gmail.enabled) {
        gmailService = new GmailService(config.gmail, cache, rateLimiter, logger);
        console.log('✅ Gmail service initialized');
      }
    } catch (error) {
      console.log('⚠️ Gmail service not available (credentials missing)');
    }

    return {
      cache,
      rateLimiter,
      relevanceScorer,
      newsService,
      podcastService,
      gmailService,
      logger
    };
  }

  /**
   * Run a test with timeout and error handling
   */
  static async runWithTimeout<T>(
    testName: string,
    operation: () => Promise<T>,
    timeout: number = 30000
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Running test: ${testName}...`);
      
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Test passed: ${testName} (${duration}ms)`);

      return {
        testName,
        success: true,
        duration,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Test failed: ${testName} (${duration}ms)`, error);

      return {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Format test results in a consistent way
   */
  static formatTestResults(suite: TestSuite): string {
    const { suiteName, results, summary } = suite;
    
    let output = `\n📊 TEST SUITE: ${suiteName}\n`;
    output += `${'='.repeat(50)}\n\n`;

    // Summary
    output += `📈 SUMMARY:\n`;
    output += `- Total Tests: ${summary.totalTests}\n`;
    output += `- Passed: ${summary.passed} ✅\n`;
    output += `- Failed: ${summary.failed} ❌\n`;
    output += `- Success Rate: ${summary.successRate.toFixed(1)}%\n`;
    output += `- Total Duration: ${summary.duration}ms\n\n`;

    // Individual results
    output += `📋 DETAILED RESULTS:\n\n`;
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      output += `${index + 1}. ${status} ${result.testName} (${result.duration}ms)\n`;
      
      if (result.error) {
        output += `   Error: ${result.error}\n`;
      }
      
      if (result.metrics) {
        const { itemCount, avgRelevanceScore, sources, symbols } = result.metrics;
        output += `   📊 Items: ${itemCount}, Avg Score: ${avgRelevanceScore.toFixed(1)}/100\n`;
        output += `   📰 Sources: ${sources.length} (${sources.slice(0, 2).join(', ')}${sources.length > 2 ? '...' : ''})\n`;
        if (symbols.length > 0) {
          output += `   🏷️ Symbols: ${symbols.slice(0, 3).join(', ')}${symbols.length > 3 ? '...' : ''}\n`;
        }
      }
      
      output += `\n`;
    });

    return output;
  }

  /**
   * Calculate metrics from test data
   */
  static calculateMetrics(data: any[]): {
    itemCount: number;
    avgRelevanceScore: number;
    sources: string[];
    symbols: string[];
  } {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        itemCount: 0,
        avgRelevanceScore: 0,
        sources: [],
        symbols: []
      };
    }

    const items = data.filter(item => item && typeof item === 'object');
    const relevanceScores = items
      .map(item => item.relevanceScore || 0)
      .filter(score => typeof score === 'number' && score >= 0);
    
    const avgRelevanceScore = relevanceScores.length > 0 
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length
      : 0;

    const sources = [...new Set(items.map(item => item.source).filter(Boolean))];
    const symbols = [...new Set(items.flatMap(item => item.symbols || []).filter(Boolean))];

    return {
      itemCount: items.length,
      avgRelevanceScore,
      sources,
      symbols
    };
  }

  /**
   * Create a test suite and run multiple tests
   */
  static async runTestSuite(
    suiteName: string,
    tests: Array<{
      name: string;
      operation: () => Promise<any>;
      timeout?: number;
    }>
  ): Promise<TestSuite> {
    console.log(`\n🚀 Starting test suite: ${suiteName}`);
    const startTime = Date.now();
    
    const results: TestResult[] = [];
    
    for (const test of tests) {
      const result = await this.runWithTimeout(
        test.name,
        test.operation,
        test.timeout
      );
      
      // Add metrics if data is available
      if (result.success && result.data) {
        result.metrics = this.calculateMetrics(Array.isArray(result.data) ? result.data : [result.data]);
      }
      
      results.push(result);
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const suite: TestSuite = {
      suiteName,
      results,
      summary: {
        totalTests: results.length,
        passed,
        failed,
        duration,
        successRate: (passed / results.length) * 100
      }
    };

    console.log(this.formatTestResults(suite));
    return suite;
  }

  /**
   * Save test results to file
   */
  static async saveTestResults(suite: TestSuite, filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filename || `test-results-${timestamp}.json`;
    const filePath = path.join(process.cwd(), fileName);

    const reportData = {
      ...suite,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
    console.log(`💾 Test results saved to: ${filePath}`);
    
    return filePath;
  }

  /**
   * Clean up resources after testing
   */
  static async cleanup(services: TestServices): Promise<void> {
    try {
      // Close database connections
      if (services.cache) {
        // Cache cleanup if needed
      }
      
      console.log('🧹 Test cleanup completed');
    } catch (error) {
      console.error('⚠️ Error during cleanup:', error);
    }
  }

  /**
   * Validate test environment
   */
  static validateEnvironment(): boolean {
    const requiredFiles = [
      'config/sources.json',
      'package.json',
      'src/index.ts'
    ];

    let valid = true;
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        console.error(`❌ Required file missing: ${file}`);
        valid = false;
      }
    }

    if (valid) {
      console.log('✅ Test environment validation passed');
    }

    return valid;
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(suites: TestSuite[]): string {
    let report = `\n🚀 PERFORMANCE REPORT\n`;
    report += `${'='.repeat(40)}\n\n`;

    const allResults = suites.flatMap(suite => suite.results);
    const successfulResults = allResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return report + 'No successful tests to analyze.\n';
    }

    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const maxDuration = Math.max(...successfulResults.map(r => r.duration));
    const minDuration = Math.min(...successfulResults.map(r => r.duration));

    report += `📊 Timing Analysis:\n`;
    report += `- Average Duration: ${avgDuration.toFixed(0)}ms\n`;
    report += `- Fastest Test: ${minDuration}ms\n`;
    report += `- Slowest Test: ${maxDuration}ms\n\n`;

    // Performance targets
    const fastTests = successfulResults.filter(r => r.duration < 1000).length;
    const slowTests = successfulResults.filter(r => r.duration > 5000).length;

    report += `🎯 Performance Targets:\n`;
    report += `- Fast (<1s): ${fastTests}/${successfulResults.length} tests\n`;
    report += `- Slow (>5s): ${slowTests}/${successfulResults.length} tests\n`;

    if (slowTests > 0) {
      report += `\n⚠️ Slow Tests:\n`;
      successfulResults
        .filter(r => r.duration > 5000)
        .sort((a, b) => b.duration - a.duration)
        .forEach(r => {
          report += `- ${r.testName}: ${r.duration}ms\n`;
        });
    }

    return report;
  }
}