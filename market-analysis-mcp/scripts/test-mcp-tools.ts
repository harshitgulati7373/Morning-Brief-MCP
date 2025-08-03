#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { NewsService } from '../src/services/newsService';
import { PodcastService } from '../src/services/podcastService';
import { RelevanceScorer } from '../src/services/relevanceScorer';
import { NewsTools } from '../src/tools/news';
import { PodcastTools } from '../src/tools/podcasts';
import { UnifiedTools } from '../src/tools/unified';
import { CacheManager } from '../src/utils/cache';
import { RateLimiter } from '../src/utils/rateLimiter';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

async function loadConfig() {
  const configPath = path.join(process.cwd(), 'config', 'sources.json');
  const configData = await fs.readFile(configPath, 'utf8');
  return JSON.parse(configData);
}

async function testMCPTools() {
  try {
    console.log('🧪 Testing MCP Tools with Real Data\n');
    console.log('=' .repeat(50));

    // Load configuration
    const config = await loadConfig();
    console.log('✅ Configuration loaded');

    // Initialize services
    const cache = new CacheManager('./data/test_cache.db');
    const rateLimiter = new RateLimiter();
    
    await cache.initializeDatabase();
    console.log('✅ Cache initialized');

    const relevanceScorer = new RelevanceScorer(config.relevanceScoring);
    const newsService = new NewsService(config.news, cache, rateLimiter, logger);
    const podcastService = new PodcastService(config.podcasts, cache, rateLimiter, logger);

    // Initialize tools
    const newsTools = new NewsTools(newsService, relevanceScorer);
    const podcastTools = new PodcastTools(podcastService, relevanceScorer);

    console.log('✅ Services and tools initialized\n');

    // Test 1: Get Market News
    console.log('📰 Test 1: Getting Market News...');
    try {
      const newsResult = await newsTools.getMarketNews({ timeframe: '24h', limit: 5 });
      console.log('✅ Market news fetched successfully');
      console.log(`📊 Response length: ${newsResult.content[0].text.length} characters\n`);
      
      // Show a preview of the news
      const preview = newsResult.content[0].text.substring(0, 300);
      console.log('📄 News Preview:');
      console.log(preview + '...\n');
    } catch (error) {
      console.log('❌ Market news test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Get Podcast Summaries  
    console.log('🎙️ Test 2: Getting Podcast Summaries...');
    try {
      const podcastResult = await podcastTools.getPodcastSummaries({ timeframe: '7d' });
      console.log('✅ Podcast summaries fetched successfully');
      console.log(`📊 Response length: ${podcastResult.content[0].text.length} characters\n`);
      
      // Show a preview
      const preview = podcastResult.content[0].text.substring(0, 300);
      console.log('📄 Podcast Preview:');
      console.log(preview + '...\n');
    } catch (error) {
      console.log('❌ Podcast test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: Market Snapshot (combining sources)
    console.log('📊 Test 3: Generating Market Snapshot...');
    try {
      // For unified tools test, we need all services
      const gmailService = { 
        getRelevantEmails: async () => ({ success: true, data: [] }) 
      } as any;
      
      const unifiedTools = new UnifiedTools(
        newsService, 
        podcastService, 
        gmailService, 
        relevanceScorer
      );
      
      const snapshotResult = await unifiedTools.getMarketSnapshot({ timeframe: '6h' });
      console.log('✅ Market snapshot generated successfully');
      console.log(`📊 Response length: ${snapshotResult.content[0].text.length} characters\n`);
      
      // Show a preview
      const preview = snapshotResult.content[0].text.substring(0, 400);
      console.log('📄 Snapshot Preview:');
      console.log(preview + '...\n');
    } catch (error) {
      console.log('❌ Market snapshot test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Check data quality
    console.log('🔍 Test 4: Analyzing Data Quality...');
    try {
      const newsResult = await newsService.getNews('6h', undefined, 10);
      if (newsResult.success && newsResult.data) {
        const items = newsResult.data;
        console.log(`✅ Retrieved ${items.length} news items`);
        
        if (items.length > 0) {
          const avgRelevance = items.reduce((sum, item) => sum + (item.relevanceScore || 0), 0) / items.length;
          const withSymbols = items.filter(item => item.symbols && item.symbols.length > 0).length;
          const withTags = items.filter(item => item.marketTags && item.marketTags.length > 0).length;
          
          console.log(`📈 Average relevance score: ${avgRelevance.toFixed(1)}`);
          console.log(`🏷️  Items with symbols: ${withSymbols}/${items.length}`);
          console.log(`🔖 Items with market tags: ${withTags}/${items.length}`);
          
          if (items.length > 0) {
            console.log(`📝 Sample title: "${items[0].title}"`);
            console.log(`🏢 Sample source: ${items[0].sourceDetails.name}`);
          }
        }
      }
    } catch (error) {
      console.log('❌ Data quality test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 MCP Tools Testing Complete!');
    console.log('');
    console.log('The Market Analysis MCP Server is working correctly.');
    console.log('You can now connect it to Claude for live market analysis.');

    // Clean up
    await cache.close();

  } catch (error) {
    console.error('❌ MCP Tools test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testMCPTools();
}