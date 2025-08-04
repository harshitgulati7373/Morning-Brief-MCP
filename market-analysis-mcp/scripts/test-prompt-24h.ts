#!/usr/bin/env ts-node

import { UnifiedTools } from '../src/tools/unified';
import { NewsService } from '../src/services/newsService';
import { PodcastService } from '../src/services/podcastService';
import { GmailService } from '../src/services/gmailService';
import { RelevanceScorer } from '../src/services/relevanceScorer';
import { CacheManager } from '../src/utils/cache';
import { RateLimiter } from '../src/utils/rateLimiter';
import { SourcesConfig } from '../src/types/marketData';
import { writeFileSync } from 'fs';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function testMCPWith24HTimeframe() {
    console.log('📊 Starting comprehensive MCP test with 24h timeframe...\n');
    
    const testStartTime = new Date().toISOString();
    
    // Test parameters based on prompt.md
    const testParams = {
        timeframe: '24h',
        prioritySymbols: ['SPY', 'QQQ', 'TSLA', 'AAPL', 'NVDA', 'MSFT'],
        relevanceThreshold: 70,
        criticalThreshold: 80
    };
    
    console.log(`🎯 Test Parameters:
    - Timeframe: ${testParams.timeframe}
    - Priority Symbols: ${testParams.prioritySymbols.join(', ')}
    - Relevance Threshold: ${testParams.relevanceThreshold}+
    - Critical Threshold: ${testParams.criticalThreshold}+
    `);
    
    try {
        // Setup logger
        const logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console()
            ],
        });

        // Load configuration
        const configPath = path.join(process.cwd(), 'config', 'sources.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config: SourcesConfig = JSON.parse(configData);

        // Initialize cache and rate limiter
        const cache = new CacheManager(process.env.DATABASE_PATH);
        await cache.initializeDatabase();
        const rateLimiter = new RateLimiter();

        // Initialize services
        const relevanceScorer = new RelevanceScorer(config.relevanceScoring);
        const newsService = new NewsService(config.news, cache, rateLimiter, logger);
        const podcastService = new PodcastService(config.podcasts, cache, rateLimiter, logger);
        const gmailService = new GmailService(config.gmail, cache, rateLimiter, logger);

        // Initialize unified tools
        const unifiedTools = new UnifiedTools(
            newsService,
            podcastService,
            gmailService,
            relevanceScorer
        );

        // Test the getMarketSnapshot function
        console.log('🔄 Calling getMarketSnapshot...\n');
        
        const result = await unifiedTools.getMarketSnapshot({
            timeframe: testParams.timeframe,
            priority_symbols: testParams.prioritySymbols
        });
        
        console.log('✅ Market snapshot generated successfully!\n');
        
        // Extract text content from MCP response
        const resultText = result.content?.[0]?.text || JSON.stringify(result);
        
        // Parse the result to extract resource information
        const resourceBreakdown = {
            successful: {
                newsArticles: 0,
                podcastEpisodes: 0,
                emailItems: 0,
                rssFeeds: 0
            },
            failed: {
                newsAPI: [] as string[],
                alphaVantage: [] as string[],
                rssFeeds: [] as string[],
                gmail: [] as string[],
                podcasts: [] as string[]
            },
            totalItems: 0,
            highRelevanceItems: 0,
            criticalItems: 0
        };
        
        // Count successful fetches from the result
        if (resultText.includes('News Articles:')) {
            const newsMatch = resultText.match(/News Articles:\s*(\d+)/);
            if (newsMatch) resourceBreakdown.successful.newsArticles = parseInt(newsMatch[1]);
        }
        
        if (resultText.includes('Podcast Episodes:')) {
            const podcastMatch = resultText.match(/Podcast Episodes:\s*(\d+)/);
            if (podcastMatch) resourceBreakdown.successful.podcastEpisodes = parseInt(podcastMatch[1]);
        }
        
        if (resultText.includes('Emails:')) {
            const emailMatch = resultText.match(/Emails:\s*(\d+)/);
            if (emailMatch) resourceBreakdown.successful.emailItems = parseInt(emailMatch[1]);
        }
        
        // Count relevance items
        const highRelevanceMatches = resultText.match(/\((\d+)\)/g);
        if (highRelevanceMatches) {
            highRelevanceMatches.forEach((match: string) => {
                const score = parseInt(match.replace(/[()]/g, ''));
                if (score >= testParams.relevanceThreshold) {
                    resourceBreakdown.highRelevanceItems++;
                }
                if (score >= testParams.criticalThreshold) {
                    resourceBreakdown.criticalItems++;
                }
            });
        }
        
        // Save detailed results
        const detailedResults = {
            testParams,
            testStartTime,
            testEndTime: new Date().toISOString(),
            resourceBreakdown,
            fullResult: resultText,
            success: true
        };
        
        const fileName = `test-results-24h-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        writeFileSync(fileName, JSON.stringify(detailedResults, null, 2));
        
        console.log('📊 RESOURCE BREAKDOWN:');
        console.log('========================');
        console.log(`✅ Successful Fetches:`);
        console.log(`   📰 News Articles: ${resourceBreakdown.successful.newsArticles}`);
        console.log(`   🎧 Podcast Episodes: ${resourceBreakdown.successful.podcastEpisodes}`);
        console.log(`   📧 Email Items: ${resourceBreakdown.successful.emailItems}`);
        console.log(`   📡 RSS Feeds: ${resourceBreakdown.successful.rssFeeds}`);
        console.log('');
        console.log(`📈 Content Analysis:`);
        console.log(`   🎯 High Relevance Items (${testParams.relevanceThreshold}+): ${resourceBreakdown.highRelevanceItems}`);
        console.log(`   🚨 Critical Items (${testParams.criticalThreshold}+): ${resourceBreakdown.criticalItems}`);
        console.log('');
        console.log(`💾 Detailed results saved to: ${fileName}`);
        console.log('');
        console.log('📝 MARKET SNAPSHOT RESULT:');
        console.log('==========================');
        console.log(resultText);
        
        // Close cache connection
        await cache.close();
        
        return detailedResults;
        
    } catch (error: any) {
        console.error('❌ Test failed:', error);
        
        const errorResults = {
            testParams,
            testStartTime,
            testEndTime: new Date().toISOString(),
            error: error?.message || 'Unknown error',
            success: false
        };
        
        const fileName = `test-error-24h-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        writeFileSync(fileName, JSON.stringify(errorResults, null, 2));
        
        console.log(`💾 Error details saved to: ${fileName}`);
        throw error;
    }
}

// Run the test
testMCPWith24HTimeframe()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });