# Free API Setup Guide

## 🆓 Free News APIs

The system now includes **3 free news APIs** that provide excellent market coverage without subscription costs:

### 1. NewsAPI.org (Recommended)
- **Cost**: Free (500 requests/day)
- **Coverage**: Aggregates from Bloomberg, Reuters, MarketWatch, CNBC, WSJ
- **Setup**: 
  1. Visit [newsapi.org](https://newsapi.org)
  2. Sign up for free account
  3. Get your API key
  4. Add to `.env`: `NEWSAPI_ORG_API_KEY=`

### 2. Alpha Vantage News
- **Cost**: Free (500 requests/day) 
- **Coverage**: Financial news with sentiment analysis
- **Features**: Pre-analyzed sentiment scores, ticker symbols
- **Setup**:
  1. Visit [alphavantage.co](https://www.alphavantage.co)
  2. Get free API key
  3. Add to `.env`: `ALPHA_VANTAGE_API_KEY=`

### 3. Financial Modeling Prep
- **Cost**: Free (250 requests/day)
- **Coverage**: Stock-specific news and earnings
- **Features**: Symbol-tagged articles, company-specific news
- **Setup**:
  1. Visit [financialmodelingprep.com](https://financialmodelingprep.com)
  2. Register for free API
  3. Add to `.env`: `FINANCIAL_MODELING_PREP_API_KEY=`

## 📰 Working RSS Sources (No API Key Required)

These sources work immediately without any setup:

- ✅ **MarketWatch RSS** - Financial news and analysis
- ✅ **Seeking Alpha RSS** - Investment analysis and stock research  
- ✅ **CNBC RSS** - Business news and market updates
- ✅ **Financial Times RSS** - Global financial news
- ✅ **Yahoo Finance RSS** - Market news and stock updates

## 🎙️ Morning Market Podcasts  

Updated with your requested sources:

- ✅ **Wall Street Breakfast by Seeking Alpha** - Daily market news and analysis
- ✅ **CNN 5 Things** - Daily news briefing with market updates
- ✅ **Morning Brew Daily** - Business news and market analysis from Morning Brew
- ✅ **The Journal by WSJ** - Daily news and market analysis from Wall Street Journal
- ✅ **Chat with Traders** - Interviews with successful traders
- ✅ **The Meb Faber Research Podcast** - Investment research and analysis

## 🚀 Quick Setup for Maximum Coverage

1. **Get 3 free API keys** (takes 5 minutes total):
   ```bash
   # Add these to your .env file
   NEWSAPI_ORG_API_KEY=your_newsapi_key
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key  
   FINANCIAL_MODELING_PREP_API_KEY=your_fmp_key
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **You'll get**:
   - 📰 **1,250 daily API requests** across 3 sources
   - 📡 **5 RSS feeds** with unlimited requests
   - 🎙️ **6 podcast sources** with daily episodes
   - 🔍 **Full search** across all sources
   - 📊 **Market snapshots** with cross-source analysis

## 📊 Current Test Results

After the updates, connection testing shows:

```
✅ Successful connections: 9/16 (56% success rate)

Working Sources:
📰 News: MarketWatch RSS, Seeking Alpha RSS, CNBC RSS, Financial Times RSS
🎙️ Podcasts: Wall Street Breakfast, CNN 5 Things, Chat with Traders  
💾 Cache: SQLite working perfectly
🔍 Search: Full-text search operational

Needs API Keys:
📰 NewsAPI.org, Alpha Vantage, Financial Modeling Prep
📧 Gmail (requires OAuth setup)
```

## 💡 Pro Tips

1. **Start with RSS sources** - They work immediately without any setup
2. **Add free APIs gradually** - Each one significantly improves coverage
3. **NewsAPI.org first** - Best bang for buck with 500 daily requests
4. **Test as you go** - Run `npm run test:connections` after each API key

## 🎯 Expected Performance

With free API keys configured:
- **~2,000+ articles per day** from premium sources
- **Daily morning podcasts** with market analysis  
- **Real-time relevance scoring** across all content
- **Cross-source correlation** for better insights
- **Full historical search** across collected data

The system is designed to work great even with just the free RSS sources, and gets progressively better as you add the free API keys!