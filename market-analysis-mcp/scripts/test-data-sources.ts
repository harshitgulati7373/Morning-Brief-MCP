import { NewsService } from '../src/services/newsService';
import { PodcastService } from '../src/services/podcastService';
import { GmailService } from '../src/services/gmailService';
import { RelevanceScorer } from '../src/services/relevanceScorer';
import { CacheManager } from '../src/utils/cache';
import { RateLimiter } from '../src/utils/rateLimiter';
import { createLogger } from 'winston';
import * as fs from 'fs';

interface TestResult {
  source: string;
  success: boolean;
  dataCount: number;
  sampleData?: any;
  error?: string;
  timestamp: string;
}

class ComprehensiveDataSourceTester {
  private logger: any;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private relevanceScorer: RelevanceScorer;
  private config: any;
  private results: TestResult[] = [];

  constructor() {
    this.logger = createLogger({
      level: 'info',
      format: require('winston').format.simple(),
      transports: [new (require('winston').transports.Console)()]
    });

    this.cache = new CacheManager(process.env.DATABASE_PATH || './data/test_cache.db');
    this.rateLimiter = new RateLimiter();
    
    // Load configuration
    this.config = JSON.parse(fs.readFileSync('./config/sources.json', 'utf-8'));
    this.relevanceScorer = new RelevanceScorer(this.config.relevanceScoring);
  }

  async runComprehensiveTests(): Promise<void> {
    console.log('🧪 COMPREHENSIVE MCP DATA SOURCE TESTING');
    console.log('==========================================');
    console.log(`📅 Started: ${new Date().toLocaleString()}`);
    console.log('');

    // Phase 1.1: News Sources Testing
    await this.testNewsSources();
    
    // Phase 1.2: Podcast Sources Testing  
    await this.testPodcastSources();
    
    // Phase 1.3: Gmail Deep Dive Testing
    await this.testGmailSources();

    // Generate comprehensive report
    this.generateTestReport();
  }

  async testNewsSources(): Promise<void> {
    console.log('📰 PHASE 1.1: NEWS SOURCES TESTING');
    console.log('==================================');

    const newsService = new NewsService(
      { sources: this.config.news.sources },
      this.cache,
      this.rateLimiter,
      this.logger
    );

    // Test individual news sources
    for (const source of this.config.news.sources) {
      if (!source.enabled) {
        console.log(`⏭️  ${source.name}: Skipped (disabled)`);
        continue;
      }

      console.log(`\n🔍 Testing ${source.name} (${source.type})...`);
      
      try {
        const startTime = Date.now();
        
        // Test connection first
        const connectionResult = await newsService.testConnection(source.name);
        
        if (!connectionResult) {
          this.addResult({
            source: source.name,
            success: false,
            dataCount: 0,
            error: 'Connection test failed',
            timestamp: new Date().toISOString()
          });
          console.log(`❌ ${source.name}: Connection failed`);
          continue;
        }

        // Test data retrieval
        const result = await newsService.getNews('6h', undefined, 10);
        const duration = Date.now() - startTime;

        if (result.success && result.data) {
          const relevantItems = result.data.filter(item => 
            item.sourceDetails.name.includes(source.name.split(' ')[0])
          );

          console.log(`✅ ${source.name}: ${relevantItems.length} articles (${duration}ms)`);
          
          if (relevantItems.length > 0) {
            const sample = relevantItems[0];
            console.log(`   📄 Sample: "${sample.title}"`);
            console.log(`   🎯 Relevance: ${sample.relevanceScore}/100`);
            console.log(`   🕐 Age: ${this.getTimeAgo(sample.timestamp)}`);
            
            if (sample.symbols && sample.symbols.length > 0) {
              console.log(`   📈 Symbols: ${sample.symbols.join(', ')}`);
            }
          }

          this.addResult({
            source: source.name,
            success: true,
            dataCount: relevantItems.length,
            sampleData: relevantItems.length > 0 ? {
              title: relevantItems[0].title,
              relevanceScore: relevantItems[0].relevanceScore,
              symbols: relevantItems[0].symbols,
              timestamp: relevantItems[0].timestamp
            } : null,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`❌ ${source.name}: No data returned`);
          this.addResult({
            source: source.name,
            success: false,
            dataCount: 0,
            error: result.error || 'No data returned',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log(`❌ ${source.name}: Error - ${error}`);
        this.addResult({
          source: source.name,
          success: false,
          dataCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async testPodcastSources(): Promise<void> {
    console.log('');
    console.log('🎙️ PHASE 1.2: PODCAST SOURCES TESTING');
    console.log('=====================================');

    const podcastService = new PodcastService(
      this.config.podcasts,
      this.cache,
      this.rateLimiter,
      this.logger
    );

    for (const podcast of this.config.podcasts) {
      if (!podcast.enabled) {
        console.log(`⏭️  ${podcast.name}: Skipped (disabled)`);
        continue;
      }

      console.log(`\n🔍 Testing ${podcast.name}...`);

      try {
        const startTime = Date.now();
        
        // Test connection
        const connectionResult = await podcastService.testConnection(podcast.name);
        
        if (!connectionResult) {
          this.addResult({
            source: `Podcast: ${podcast.name}`,
            success: false,
            dataCount: 0,
            error: 'Connection test failed',
            timestamp: new Date().toISOString()
          });
          console.log(`❌ ${podcast.name}: Connection failed`);
          continue;
        }

        // Test data retrieval
        const result = await podcastService.getPodcasts('24h', false);
        const duration = Date.now() - startTime;

        if (result.success && result.data) {
          const podcastItems = result.data.filter(item => 
            item.sourceDetails.name.includes(podcast.name.split(' ')[0])
          );

          console.log(`✅ ${podcast.name}: ${podcastItems.length} episodes (${duration}ms)`);
          
          if (podcastItems.length > 0) {
            const sample = podcastItems[0];
            console.log(`   📄 Sample: "${sample.title}"`);
            console.log(`   🎯 Relevance: ${sample.relevanceScore}/100`);
            console.log(`   🕐 Age: ${this.getTimeAgo(sample.timestamp)}`);
          }

          this.addResult({
            source: `Podcast: ${podcast.name}`,
            success: true,
            dataCount: podcastItems.length,
            sampleData: podcastItems.length > 0 ? {
              title: podcastItems[0].title,
              relevanceScore: podcastItems[0].relevanceScore,
              timestamp: podcastItems[0].timestamp
            } : null,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`❌ ${podcast.name}: No data returned`);
          this.addResult({
            source: `Podcast: ${podcast.name}`,
            success: false,
            dataCount: 0,
            error: result.error || 'No data returned',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log(`❌ ${podcast.name}: Error - ${error}`);
        this.addResult({
          source: `Podcast: ${podcast.name}`,
          success: false,
          dataCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async testGmailSources(): Promise<void> {
    console.log('');
    console.log('📧 PHASE 1.3: GMAIL DEEP DIVE TESTING');
    console.log('=====================================');

    if (!this.config.gmail.enabled) {
      console.log('⏭️  Gmail: Skipped (disabled in config)');
      return;
    }

    const gmailService = new GmailService(
      this.config.gmail,
      this.cache,  
      this.rateLimiter,
      this.logger
    );

    console.log(`\n🔍 Testing Gmail with ${this.config.gmail.targetSenders.length} target senders...`);
    console.log(`📧 Target senders: ${this.config.gmail.targetSenders.join(', ')}`);

    try {
      const startTime = Date.now();

      // Test connection first
      const connectionResult = await gmailService.testConnection();
      
      if (!connectionResult) {
        this.addResult({
          source: 'Gmail',
          success: false,
          dataCount: 0,
          error: 'Gmail connection test failed',
          timestamp: new Date().toISOString()
        });
        console.log('❌ Gmail: Connection failed');
        return;
      }

      console.log('✅ Gmail: Connection successful');

      // Test email retrieval for different timeframes
      const timeframes = ['6h', '24h', '7d'];
      
      for (const timeframe of timeframes) {
        console.log(`\n📬 Testing ${timeframe} timeframe...`);
        
        const result = await gmailService.getRelevantEmails(timeframe);
        
        if (result.success && result.data) {
          console.log(`✅ Found ${result.data.length} relevant emails in ${timeframe}`);
          
          // Analyze by sender
          const senderCounts: Record<string, number> = {};
          result.data.forEach(email => {
            const sender = email.sourceDetails.author || 'Unknown';
            senderCounts[sender] = (senderCounts[sender] || 0) + 1;
          });

          console.log('   📊 Breakdown by sender:');
          Object.entries(senderCounts).forEach(([sender, count]) => {
            const isTargetSender = this.config.gmail.targetSenders.some((target: string) => 
              sender.includes(target.split('@')[0]) || target.includes(sender)
            );
            console.log(`     ${isTargetSender ? '🎯' : '📧'} ${sender}: ${count} emails`);
          });

          if (result.data.length > 0) {
            const sample = result.data[0];
            console.log(`   📄 Sample email: "${sample.title}"`);
            console.log(`   🎯 Relevance: ${sample.relevanceScore}/100`);
            console.log(`   🕐 Age: ${this.getTimeAgo(sample.timestamp)}`);
          }
        } else {
          console.log(`⚠️  No relevant emails found in ${timeframe}`);
        }
      }

      // Test specific sender filtering
      console.log('\n🎯 Testing specific sender filtering...');
      for (const sender of this.config.gmail.targetSenders.slice(0, 3)) { // Test first 3 senders
        const result = await gmailService.getRelevantEmails('30d', [sender]);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log(`✅ ${sender}: ${result.data.length} emails found`);
        } else {
          console.log(`⚠️  ${sender}: No emails found in last 30 days`);
        }
      }

      const duration = Date.now() - startTime;
      
      this.addResult({
        source: 'Gmail',
        success: true,
        dataCount: -1, // Will be filled with comprehensive data
        sampleData: {
          targetSenders: this.config.gmail.targetSenders.length,
          testDuration: duration
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.log(`❌ Gmail: Error - ${error}`);
      this.addResult({
        source: 'Gmail',
        success: false,
        dataCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  private addResult(result: TestResult): void {
    this.results.push(result);
  }

  private getTimeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMins}m ago`;
    }
  }

  private generateTestReport(): void {
    console.log('');
    console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('=====================================');

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`📈 Success Rate: ${successful.length}/${this.results.length} (${Math.round(successful.length/this.results.length*100)}%)`);
    console.log('');

    console.log('✅ SUCCESSFUL SOURCES:');
    successful.forEach(result => {
      console.log(`   ${result.source}: ${result.dataCount} items`);
    });

    if (failed.length > 0) {
      console.log('');
      console.log('❌ FAILED SOURCES:');
      failed.forEach(result => {
        console.log(`   ${result.source}: ${result.error}`);
      });
    }

    console.log('');
    console.log(`📅 Test completed: ${new Date().toLocaleString()}`);
    
    // Save detailed results to file
    const reportPath = './test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      testRun: {
        timestamp: new Date().toISOString(),
        duration: 'Phase 1 Complete',
        successRate: Math.round(successful.length/this.results.length*100)
      },
      results: this.results
    }, null, 2));
    
    console.log(`📄 Detailed results saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  try {
    require('dotenv').config();
    
    const tester = new ComprehensiveDataSourceTester();
    await tester.runComprehensiveTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}