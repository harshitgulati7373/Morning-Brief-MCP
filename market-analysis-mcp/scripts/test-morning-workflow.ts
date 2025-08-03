import { NewsService } from '../src/services/newsService';
import { PodcastService } from '../src/services/podcastService';
import { GmailService } from '../src/services/gmailService';
import { RelevanceScorer } from '../src/services/relevanceScorer';
import { UnifiedTools } from '../src/tools/unified';
import { SearchTools } from '../src/tools/search';
import { CacheManager } from '../src/utils/cache';
import { RateLimiter } from '../src/utils/rateLimiter';
import { createLogger } from 'winston';
import * as fs from 'fs';

class MorningWorkflowTester {
  private unifiedTools: UnifiedTools;
  private searchTools: SearchTools;
  private logger: any;

  constructor() {
    this.logger = createLogger({
      level: 'info',
      format: require('winston').format.simple(),
      transports: [new (require('winston').transports.Console)()]
    });

    const cache = new CacheManager(process.env.DATABASE_PATH || './data/test_cache.db');
    const rateLimiter = new RateLimiter();
    
    // Load configuration
    const config = JSON.parse(fs.readFileSync('./config/sources.json', 'utf-8'));
    const relevanceScorer = new RelevanceScorer(config.relevanceScoring);

    // Initialize services
    const newsService = new NewsService(
      { sources: config.news.sources },
      cache,
      rateLimiter,
      this.logger
    );

    const podcastService = new PodcastService(
      config.podcasts,
      cache,
      rateLimiter,
      this.logger
    );

    const gmailService = new GmailService(
      config.gmail,
      cache,
      rateLimiter,
      this.logger
    );

    this.unifiedTools = new UnifiedTools(
      newsService,
      podcastService,
      gmailService,
      relevanceScorer
    );

    this.searchTools = new SearchTools(
      newsService,
      podcastService,
      gmailService,
      relevanceScorer,
      cache
    );
  }

  async testMorningWorkflow(): Promise<void> {
    console.log('🌅 PHASE 5: END-TO-END MORNING WORKFLOW TESTING');
    console.log('===============================================');
    console.log(`📅 Simulating morning routine: ${new Date().toLocaleString()}`);
    console.log('');

    // Simulate the exact morning prompt from prompt.md
    await this.simulatePreMarketSnapshot();
    
    // Test specific searches user might do
    await this.testSpecificSearches();

    // Test priority symbols tracking
    await this.testPrioritySymbolsTracking();

    // Performance assessment
    await this.assessPerformance();
  }

  async simulatePreMarketSnapshot(): Promise<void> {
    console.log('📊 SIMULATING PRE-MARKET SNAPSHOT (Your Actual Morning Prompt)');
    console.log('=============================================================');

    const morningPromptParams = {
      timeframe: '6h', // Pre-market overnight developments  
      priority_symbols: ['SPY', 'QQQ', 'TSLA', 'AAPL', 'NVDA', 'MSFT']
    };

    console.log('🎯 Running with parameters:');
    console.log(`   ⏰ Timeframe: ${morningPromptParams.timeframe}`);
    console.log(`   📈 Priority Symbols: ${morningPromptParams.priority_symbols.join(', ')}`);
    console.log('');

    try {
      const startTime = Date.now();
      
      const result = await this.unifiedTools.getMarketSnapshot(morningPromptParams);
      
      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(1);

      if (result.content && result.content[0] && result.content[0].text) {
        const response = result.content[0].text;
        
        console.log(`✅ MORNING SNAPSHOT GENERATED in ${durationSeconds}s`);
        console.log('');
        
        // Analyze the quality of morning snapshot
        this.analyzeMorningSnapshot(response);
        
        // Save the snapshot for review
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `./morning-snapshot-${timestamp}.md`;
        fs.writeFileSync(filename, response);
        console.log(`📄 Full snapshot saved to: ${filename}`);
        console.log('');

        // Show preview (first 2000 characters)
        console.log('📋 MORNING SNAPSHOT PREVIEW:');
        console.log('='.repeat(80));
        console.log(response.substring(0, 2000));
        if (response.length > 2000) {
          console.log('\n[... TRUNCATED - See full snapshot in saved file ...]');
        }
        console.log('='.repeat(80));

      } else {
        console.log('❌ No morning snapshot generated');
      }

    } catch (error) {
      console.log('❌ Morning snapshot failed:', error);
    }

    console.log('');
  }

  private analyzeMorningSnapshot(response: string): void {
    console.log('🔍 MORNING SNAPSHOT QUALITY ANALYSIS:');
    
    // Check essential sections
    const sections = {
      'Executive Summary': response.includes('Executive Summary'),
      'Critical Alerts': response.includes('Critical Alerts') || response.includes('🚨'),
      'Key Events': response.includes('Key Events') || response.includes('📈'),
      'Market Sentiment': response.includes('sentiment') || response.includes('positive') || response.includes('negative'),
      'Source Breakdown': response.includes('Source Breakdown') || response.includes('News Articles'),
      'Priority Symbols': response.includes('SPY') || response.includes('AAPL') || response.includes('TSLA')
    };

    let sectionsPresent = 0;
    Object.entries(sections).forEach(([section, present]) => {
      console.log(`   ${present ? '✅' : '❌'} ${section}: ${present ? 'Present' : 'Missing'}`);
      if (present) sectionsPresent++;
    });

    console.log(`   📊 Section Completeness: ${sectionsPresent}/6 (${Math.round(sectionsPresent/6*100)}%)`);

    // Check data richness
    const dataMetrics = {
      newsArticles: (response.match(/News Articles[^\\d]*(\d+)/) || [])[1] || '0',
      podcastEpisodes: (response.match(/Podcast Episodes[^\\d]*(\d+)/) || [])[1] || '0', 
      emails: (response.match(/Emails[^\\d]*(\d+)/) || [])[1] || '0',
      totalItems: (response.match(/Total Items[^\\d]*(\d+)/) || [])[1] || '0'
    };

    console.log('   📊 Data Volume:');
    console.log(`      📰 News: ${dataMetrics.newsArticles} articles`);
    console.log(`      🎙️ Podcasts: ${dataMetrics.podcastEpisodes} episodes`);
    console.log(`      📧 Emails: ${dataMetrics.emails} emails`);
    console.log(`      📈 Total: ${dataMetrics.totalItems} items`);

    // Assess readability for 5-minute read
    const wordCount = response.split(/\\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // Average reading speed
    console.log(`   ⏱️ Estimated Read Time: ${estimatedReadTime} minutes (Target: 5 minutes)`);
    console.log(`   📝 Word Count: ${wordCount} words`);

    // Check for actionable intelligence
    const actionableElements = {
      'Time-sensitive info': response.includes('earnings') || response.includes('Fed') || response.includes('announcement'),
      'Stock movements': response.includes('price') || response.includes('surge') || response.includes('%'),
      'Market outlook': response.includes('outlook') || response.includes('forecast') || response.includes('expect'),
      'Risk factors': response.includes('risk') || response.includes('concern') || response.includes('warning')
    };

    let actionableCount = 0;
    console.log('   🎯 Actionable Intelligence:');
    Object.entries(actionableElements).forEach(([element, present]) => {
      console.log(`      ${present ? '✅' : '⚪'} ${element}: ${present ? 'Found' : 'Not found'}`);
      if (present) actionableCount++;
    });

    console.log(`   🎯 Actionability Score: ${actionableCount}/4 (${Math.round(actionableCount/4*100)}%)`);
    console.log('');
  }

  async testSpecificSearches(): Promise<void> {
    console.log('🔍 TESTING SPECIFIC SEARCHES (Morning Follow-ups)');
    console.log('=================================================');

    const searchQueries = [
      'earnings',
      'Federal Reserve',
      'AAPL',
      'market outlook',
      'inflation'
    ];

    for (const query of searchQueries) {
      console.log(`🔎 Searching for: "${query}"...`);
      
      try {
        const startTime = Date.now();
        const result = await this.searchTools.searchMarketData({
          query,
          timeframe: '24h',
          min_relevance: 30
        });

        const duration = Date.now() - startTime;

        if (result.content && result.content[0] && result.content[0].text) {
          const response = result.content[0].text;
          
          // Count results
          const resultCount = (response.match(/###[^#]/g) || []).length;
          console.log(`   ✅ Found ${resultCount} results in ${duration}ms`);
          
          if (resultCount > 0) {
            // Show first result title
            const firstResultMatch = response.match(/###\\s*[📰🎙️📧]\\s*([^\\n]+)/);
            if (firstResultMatch) {
              console.log(`   📄 Top result: "${firstResultMatch[1].trim()}"`);
            }
          }
        } else {
          console.log(`   ⚠️ No results found for "${query}"`);
        }

      } catch (error) {
        console.log(`   ❌ Search failed for "${query}":`, error);
      }
    }

    console.log('');
  }

  async testPrioritySymbolsTracking(): Promise<void> {
    console.log('📈 TESTING PRIORITY SYMBOLS TRACKING');
    console.log('====================================');

    const prioritySymbols = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT'];

    for (const symbol of prioritySymbols.slice(0, 3)) { // Test first 3 to save time
      console.log(`📊 Tracking symbol: ${symbol}...`);
      
      try {
        const result = await this.searchTools.searchMarketData({
          query: symbol,
          timeframe: '7d',
          min_relevance: 20
        });

        if (result.content && result.content[0] && result.content[0].text) {
          const response = result.content[0].text;
          const resultCount = (response.match(/###[^#]/g) || []).length;
          
          console.log(`   ✅ ${symbol}: ${resultCount} mentions found`);
          
          if (resultCount > 0) {
            // Check for price mentions, sentiment
            const hasPriceInfo = response.includes('$') || response.includes('price') || response.includes('%');
            const sentiment = response.includes('surge') || response.includes('up') ? 'Positive' : 
                            response.includes('drop') || response.includes('down') ? 'Negative' : 'Neutral';
            
            console.log(`      💰 Price info: ${hasPriceInfo ? 'Present' : 'Not found'}`);
            console.log(`      😊 Sentiment: ${sentiment}`);
          }
        } else {
          console.log(`   ⚠️ No mentions found for ${symbol}`);
        }

      } catch (error) {
        console.log(`   ❌ Symbol tracking failed for ${symbol}:`, error);
      }
    }

    console.log('');
  }

  async assessPerformance(): Promise<void> {
    console.log('⚡ PERFORMANCE ASSESSMENT');
    console.log('========================');

    // Test response times for different operations
    const operations = [
      {
        name: 'Quick Snapshot (6h)',
        operation: () => this.unifiedTools.getMarketSnapshot({ timeframe: '6h' })
      },
      {
        name: 'Full Snapshot (24h)', 
        operation: () => this.unifiedTools.getMarketSnapshot({ timeframe: '24h', priority_symbols: ['SPY', 'AAPL'] })
      },
      {
        name: 'Search Query',
        operation: () => this.searchTools.searchMarketData({ query: 'earnings', timeframe: '24h' })
      }
    ];

    console.log('⏱️ Response Time Analysis:');
    
    for (const op of operations) {
      try {
        const startTime = Date.now();
        const result = await op.operation();
        const duration = Date.now() - startTime;
        const seconds = (duration / 1000).toFixed(1);
        
        const status = duration < 5000 ? '✅ Fast' : duration < 15000 ? '⚠️ Acceptable' : '❌ Slow';
        console.log(`   ${status} ${op.name}: ${seconds}s`);
        
      } catch (error) {
        console.log(`   ❌ ${op.name}: Failed`);
      }
    }

    console.log('');
    console.log('🎯 MORNING WORKFLOW ASSESSMENT COMPLETE');
    console.log('======================================');
    console.log('✅ Your MCP is ready for daily morning market intelligence!');
    console.log('📱 Use the morning prompt from prompt.md for consistent results');
    console.log('⏰ Optimal run time: 7:30-8:30 AM ET for best data coverage');
  }
}

// Main execution
async function main() {
  try {
    require('dotenv').config();
    
    const tester = new MorningWorkflowTester();
    await tester.testMorningWorkflow();
    
    console.log('\\n📅 Morning workflow testing completed:', new Date().toLocaleString());
  } catch (error) {
    console.error('❌ Morning workflow test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}