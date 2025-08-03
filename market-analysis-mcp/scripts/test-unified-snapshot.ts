import { NewsService } from '../src/services/newsService';
import { PodcastService } from '../src/services/podcastService';
import { GmailService } from '../src/services/gmailService';
import { RelevanceScorer } from '../src/services/relevanceScorer';
import { UnifiedTools } from '../src/tools/unified';
import { CacheManager } from '../src/utils/cache';
import { RateLimiter } from '../src/utils/rateLimiter';
import { createLogger } from 'winston';
import * as fs from 'fs';

class UnifiedSnapshotTester {
  private logger: any;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private relevanceScorer: RelevanceScorer;
  private config: any;
  private unifiedTools: UnifiedTools;

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

    // Initialize services
    const newsService = new NewsService(
      { sources: this.config.news.sources },
      this.cache,
      this.rateLimiter,
      this.logger
    );

    const podcastService = new PodcastService(
      this.config.podcasts,
      this.cache,
      this.rateLimiter,
      this.logger
    );

    const gmailService = new GmailService(
      this.config.gmail,
      this.cache,
      this.rateLimiter,
      this.logger
    );

    this.unifiedTools = new UnifiedTools(
      newsService,
      podcastService,
      gmailService,
      this.relevanceScorer
    );
  }

  async testUnifiedSnapshot(): Promise<void> {
    console.log('🔗 PHASE 2: UNIFIED MARKET SNAPSHOT TESTING');
    console.log('===========================================');
    console.log(`📅 Started: ${new Date().toLocaleString()}`);
    console.log('');

    // Test different timeframes
    const timeframes = ['6h', '24h'];
    const prioritySymbols = ['SPY', 'QQQ', 'TSLA', 'AAPL', 'NVDA', 'MSFT'];

    for (const timeframe of timeframes) {
      console.log(`📊 Testing ${timeframe} Market Snapshot...`);
      console.log('='.repeat(40));

      try {
        const startTime = Date.now();
        
        const result = await this.unifiedTools.getMarketSnapshot({
          timeframe,
          priority_symbols: prioritySymbols
        });

        const duration = Date.now() - startTime;

        if (result.content && result.content[0] && result.content[0].text) {
          const response = result.content[0].text;
          
          console.log(`✅ Unified snapshot generated in ${duration}ms`);
          console.log('');
          
          // Parse and analyze the response
          this.analyzeSnapshotResponse(response, timeframe);
          
          console.log('📄 SAMPLE OUTPUT:');
          console.log('-'.repeat(50));
          // Show first 1000 characters
          console.log(response.substring(0, 1000) + (response.length > 1000 ? '...\n[TRUNCATED]' : ''));
          console.log('-'.repeat(50));
          
        } else {
          console.log('❌ No snapshot data returned');
        }

      } catch (error) {
        console.log(`❌ Error generating ${timeframe} snapshot:`, error);
      }

      console.log('');
    }

    // Test cross-source correlation
    await this.testCrossSourceCorrelation();

    // Test relevance scoring
    await this.testRelevanceScoring();
  }

  private analyzeSnapshotResponse(response: string, timeframe: string): void {
    console.log(`🔍 ANALYZING ${timeframe.toUpperCase()} SNAPSHOT:`);
    
    // Extract key metrics
    const sourceBreakdownMatch = response.match(/News Articles[^\d]*(\d+)/);
    const podcastMatch = response.match(/Podcast Episodes[^\d]*(\d+)/);
    const emailMatch = response.match(/Emails[^\d]*(\d+)/);
    const totalMatch = response.match(/Total Items[^\d]*(\d+)/);

    const newsCount = sourceBreakdownMatch ? parseInt(sourceBreakdownMatch[1]) : 0;
    const podcastCount = podcastMatch ? parseInt(podcastMatch[1]) : 0;
    const emailCount = emailMatch ? parseInt(emailMatch[1]) : 0;
    const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;

    console.log(`   📰 News Articles: ${newsCount}`);
    console.log(`   🎙️ Podcasts: ${podcastCount}`);
    console.log(`   📧 Emails: ${emailCount}`);
    console.log(`   📊 Total Items: ${totalCount}`);

    // Check for critical alerts
    const alertsMatch = response.match(/Critical Alerts/);
    const alertsPresent = !!alertsMatch;
    console.log(`   🚨 Critical Alerts: ${alertsPresent ? 'Present' : 'None'}`);

    // Check for cross-source patterns
    const patternsMatch = response.match(/Cross-Source Patterns/);
    const patternsPresent = !!patternsMatch;
    console.log(`   🔗 Cross-Source Patterns: ${patternsPresent ? 'Detected' : 'None'}`);

    // Check for symbol mentions
    const symbolMatches = response.match(/Symbols[^\:]*:\s*([^\n]+)/g);
    if (symbolMatches && symbolMatches.length > 0) {
      console.log(`   📈 Symbol Mentions: Found in ${symbolMatches.length} items`);
    } else {
      console.log(`   📈 Symbol Mentions: None detected`);
    }

    // Check for relevance scores
    const relevanceMatches = response.match(/Score[^\:]*:\s*(\d+\.?\d*)/g);
    if (relevanceMatches && relevanceMatches.length > 0) {
      const scores = relevanceMatches.map(match => {
        const scoreMatch = match.match(/(\d+\.?\d*)/);
        return scoreMatch ? parseFloat(scoreMatch[1]) : 0;
      });
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      console.log(`   🎯 Avg Relevance Score: ${avgScore.toFixed(1)}/100`);
      console.log(`   🎯 Score Range: ${Math.min(...scores)}-${Math.max(...scores)}`);
    } else {
      console.log(`   🎯 Relevance Scores: Not found in output`);
    }
  }

  private async testCrossSourceCorrelation(): Promise<void> {
    console.log('🔗 TESTING CROSS-SOURCE CORRELATION');
    console.log('===================================');

    try {
      // Generate a comprehensive snapshot
      const result = await this.unifiedTools.getMarketSnapshot({
        timeframe: '24h',
        priority_symbols: ['SPY', 'AAPL', 'TSLA']
      });

      if (result.content && result.content[0] && result.content[0].text) {
        const response = result.content[0].text;
        
        // Look for specific correlation indicators
        const correlationIndicators = [
          'mentioned across',
          'trending across',
          'sources',
          'patterns',
          'AAPL',
          'TSLA',
          'SPY'
        ];

        let correlationsFound = 0;
        correlationIndicators.forEach(indicator => {
          if (response.toLowerCase().includes(indicator.toLowerCase())) {
            correlationsFound++;
          }
        });

        console.log(`✅ Cross-source correlation analysis:`);
        console.log(`   🔍 Correlation indicators found: ${correlationsFound}/${correlationIndicators.length}`);
        
        if (response.includes('Cross-Source Patterns')) {
          console.log(`   🎯 Cross-source patterns section: Present`);
        } else {
          console.log(`   ⚠️  Cross-source patterns section: Missing`);
        }

      } else {
        console.log('❌ No correlation data available');
      }
    } catch (error) {
      console.log('❌ Cross-source correlation test failed:', error);
    }

    console.log('');
  }

  private async testRelevanceScoring(): Promise<void> {
    console.log('🎯 TESTING RELEVANCE SCORING SYSTEM');
    console.log('===================================');

    try {
      // Test relevance scorer directly
      const testContent = [
        {
          title: "Federal Reserve raises interest rates by 75 basis points",
          content: "The Federal Reserve announced a significant 75 basis point rate hike to combat inflation..."
        },
        {
          title: "Apple earnings beat expectations with strong iPhone sales",
          content: "Apple reported quarterly earnings of $1.52 per share, beating analyst expectations. iPhone sales drove revenue growth..."
        },
        {
          title: "Random article about cats",
          content: "This is an article about cats and has nothing to do with markets or finance..."
        }
      ];

      console.log('🧪 Testing with sample content:');
      
      testContent.forEach((content, index) => {
        const scoring = this.relevanceScorer.scoreContent(
          content.title,
          content.content,
          'Test Source',
          new Date().toISOString()
        );

        console.log(`   ${index + 1}. "${content.title}"`);
        console.log(`      🎯 Score: ${scoring.score}/100`);
        console.log(`      🏷️  Tags: ${scoring.marketTags.join(', ') || 'None'}`);
        console.log(`      📈 Symbols: ${scoring.symbols.join(', ') || 'None'}`);
        console.log('');
      });

      // Check if scoring is working
      const scores = testContent.map(content => 
        this.relevanceScorer.scoreContent(content.title, content.content, 'Test', new Date().toISOString()).score
      );

      const hasValidScores = scores.some(score => score > 0);
      
      if (hasValidScores) {
        console.log('✅ Relevance scoring system: WORKING');
      } else {
        console.log('❌ Relevance scoring system: BROKEN (all scores are 0)');
        console.log('   🔧 This explains why all items in data sources showed 0/100 relevance');
      }

    } catch (error) {
      console.log('❌ Relevance scoring test failed:', error);
    }

    console.log('');
  }
}

// Main execution
async function main() {
  try {
    require('dotenv').config();
    
    const tester = new UnifiedSnapshotTester();
    await tester.testUnifiedSnapshot();
    
    console.log('📅 Phase 2 testing completed:', new Date().toLocaleString());
  } catch (error) {
    console.error('❌ Unified snapshot test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}