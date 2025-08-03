#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { NewsService } from '../src/services/newsService';
import { PodcastService } from '../src/services/podcastService';
import { GmailService } from '../src/services/gmailService';
import { CacheManager } from '../src/utils/cache';
import { RateLimiter } from '../src/utils/rateLimiter';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

// Setup basic logger
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

async function testNewsConnections(newsService: NewsService, config: any) {
  console.log('\n📰 Testing News Source Connections...');
  
  const newsConfig = config.news;
  let successCount = 0;
  let totalCount = newsConfig.sources.length;

  for (const source of newsConfig.sources) {
    if (!source.enabled) {
      console.log(`⏭️  ${source.name}: Skipped (disabled)`);
      totalCount--;
      continue;
    }

    try {
      const isConnected = await newsService.testConnection(source.name);
      if (isConnected) {
        console.log(`✅ ${source.name}: Connected`);
        successCount++;
      } else {
        console.log(`❌ ${source.name}: Failed to connect`);
      }
    } catch (error) {
      console.log(`❌ ${source.name}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`📊 News Sources: ${successCount}/${totalCount} successful`);
  return { success: successCount, total: totalCount };
}

async function testPodcastConnections(podcastService: PodcastService, config: any) {
  console.log('\n🎙️ Testing Podcast Source Connections...');
  
  const podcastConfig = config.podcasts;
  let successCount = 0;
  let totalCount = podcastConfig.length;

  for (const source of podcastConfig) {
    if (!source.enabled) {
      console.log(`⏭️  ${source.name}: Skipped (disabled)`);
      totalCount--;
      continue;
    }

    try {
      const isConnected = await podcastService.testConnection(source.name);
      if (isConnected) {
        console.log(`✅ ${source.name}: Connected`);
        successCount++;
      } else {
        console.log(`❌ ${source.name}: Failed to connect`);
      }
    } catch (error) {
      console.log(`❌ ${source.name}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`📊 Podcast Sources: ${successCount}/${totalCount} successful`);
  return { success: successCount, total: totalCount };
}

async function testGmailConnection(gmailService: GmailService, config: any) {
  console.log('\n📧 Testing Gmail Connection...');
  
  if (!config.gmail.enabled) {
    console.log('⏭️  Gmail: Skipped (disabled in config)');
    return { success: 0, total: 0 };
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('❌ Gmail: Missing OAuth credentials in environment variables');
    return { success: 0, total: 1 };
  }

  try {
    const isConnected = await gmailService.testConnection();
    if (isConnected) {
      console.log('✅ Gmail: Connected');
      return { success: 1, total: 1 };
    } else {
      console.log('❌ Gmail: Failed to connect');
      return { success: 0, total: 1 };
    }
  } catch (error) {
    console.log(`❌ Gmail: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: 0, total: 1 };
  }
}

async function testCache(cache: CacheManager) {
  console.log('\n💾 Testing Cache System...');
  
  try {
    await cache.initializeDatabase();
    
    // Test basic operations
    const testKey = 'test-connection-key';
    const testValue = { message: 'test', timestamp: Date.now() };
    
    await cache.set(testKey, testValue, 60);
    const retrieved = await cache.get(testKey);
    
    if (retrieved && retrieved.message === testValue.message) {
      console.log('✅ Cache: Read/Write operations successful');
      await cache.delete(testKey);
      return { success: 1, total: 1 };
    } else {
      console.log('❌ Cache: Data integrity test failed');
      return { success: 0, total: 1 };
    }
  } catch (error) {
    console.log(`❌ Cache: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: 0, total: 1 };
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔐 Checking Environment Variables...');
  
  const requiredVars = [
    'MCP_SERVER_PORT',
    'LOG_LEVEL',
    'DATABASE_PATH'
  ];

  const optionalVars = [
    'BLOOMBERG_API_KEY',
    'REUTERS_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN'
  ];

  let found = 0;
  let missing = 0;

  console.log('\nRequired Variables:');
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
      found++;
    } else {
      console.log(`❌ ${varName}: Missing`);
      missing++;
    }
  }

  console.log('\nOptional Variables:');
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
      found++;
    } else {
      console.log(`⚠️  ${varName}: Not set`);
    }
  }

  return { found, missing };
}

async function main() {
  try {
    console.log('🔍 Market Analysis MCP - Connection Testing\n');
    console.log('=' .repeat(50));

    // Test environment variables
    const envResults = await testEnvironmentVariables();

    if (envResults.missing > 0) {
      console.log('\n⚠️  Some required environment variables are missing.');
      console.log('📝 Please check your .env file and run setup:auth if needed.');
    }

    // Load configuration
    const config = await loadConfig();
    console.log('\n✅ Configuration loaded successfully');

    // Initialize services
    const cache = new CacheManager(process.env.DATABASE_PATH);
    const rateLimiter = new RateLimiter();

    const newsService = new NewsService(config.news, cache, rateLimiter, logger);
    const podcastService = new PodcastService(config.podcasts, cache, rateLimiter, logger);
    const gmailService = new GmailService(config.gmail, cache, rateLimiter, logger);

    // Test cache
    const cacheResults = await testCache(cache);

    // Test all connections
    const newsResults = await testNewsConnections(newsService, config);
    const podcastResults = await testPodcastConnections(podcastService, config);
    const gmailResults = await testGmailConnection(gmailService, config);

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 CONNECTION TEST SUMMARY');
    console.log('=' .repeat(50));

    const totalSuccess = newsResults.success + podcastResults.success + gmailResults.success + cacheResults.success;
    const totalAttempted = newsResults.total + podcastResults.total + gmailResults.total + cacheResults.total;

    console.log(`✅ Successful connections: ${totalSuccess}`);
    console.log(`❌ Failed connections: ${totalAttempted - totalSuccess}`);
    console.log(`📈 Success rate: ${totalAttempted > 0 ? Math.round((totalSuccess / totalAttempted) * 100) : 0}%`);

    if (totalSuccess === totalAttempted && envResults.missing === 0) {
      console.log('\n🎉 All systems ready! Your MCP server should work perfectly.');
    } else if (totalSuccess > 0) {
      console.log('\n⚠️  Partial setup detected. Some features may not work.');
      console.log('💡 Check the failed connections above and verify your configuration.');
    } else {
      console.log('\n❌ No connections successful. Please check your configuration and network.');
    }

    console.log('\n🚀 Run `npm start` to launch the MCP server when ready.');

    // Clean up
    await cache.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}