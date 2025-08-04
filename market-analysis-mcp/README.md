# Market Analysis MCP Server

A unified Model Context Protocol (MCP) server that aggregates market-relevant information from news sources, podcasts, and Gmail to provide comprehensive market analysis data to Claude for trading decisions.

## Features

- **📰 News Aggregation**: Fetch from Bloomberg, Reuters, Yahoo Finance, MarketWatch and other financial news sources
- **🎙️ Podcast Processing**: Monitor financial podcasts with optional transcription
- **📧 Gmail Integration**: Extract market-relevant information from email newsletters and research reports
- **🔍 Unified Search**: Search across all data sources with relevance scoring
- **📊 Market Snapshots**: Get comprehensive overviews with cross-source pattern analysis
- **⚡ Smart Caching**: Intelligent caching system with SQLite for optimal performance
- **🎯 Relevance Scoring**: AI-powered relevance scoring for market content

## Quick Start

### Prerequisites

- Node.js 18+ 
- TypeScript
- Valid API keys for news sources (optional but recommended)
- Google OAuth credentials for Gmail integration (optional)

### Installation

1. **Clone and install dependencies**:
```bash
cd market-analysis-mcp
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

3. **Configure authentication** (optional but recommended):
```bash
npm run setup:auth
```

4. **Test connections**:
```bash
npm run test:connections
```

5. **Build and start**:
```bash
npm run build
npm start
```

## 🆓 Free API Setup

### Free News APIs

The system includes **3 free news APIs** that provide excellent market coverage without subscription costs:

#### 1. NewsAPI.org (Recommended)
- **Cost**: Free (500 requests/day)
- **Coverage**: Aggregates from Bloomberg, Reuters, MarketWatch, CNBC, WSJ
- **Setup**: 
  1. Visit [newsapi.org](https://newsapi.org)
  2. Sign up for free account
  3. Get your API key
  4. Add to `.env`: `NEWSAPI_ORG_API_KEY=your_key`

#### 2. Alpha Vantage News
- **Cost**: Free (500 requests/day) 
- **Coverage**: Financial news with sentiment analysis
- **Features**: Pre-analyzed sentiment scores, ticker symbols
- **Setup**:
  1. Visit [alphavantage.co](https://www.alphavantage.co)
  2. Get free API key
  3. Add to `.env`: `ALPHA_VANTAGE_API_KEY=your_key`

#### 3. Financial Modeling Prep
- **Cost**: Free (250 requests/day)
- **Coverage**: Stock-specific news and earnings
- **Features**: Symbol-tagged articles, company-specific news
- **Setup**:
  1. Visit [financialmodelingprep.com](https://financialmodelingprep.com)
  2. Register for free API
  3. Add to `.env`: `FINANCIAL_MODELING_PREP_API_KEY=your_key`

### Working RSS Sources (No API Key Required)

These sources work immediately without any setup:

- ✅ **MarketWatch RSS** - Financial news and analysis
- ✅ **Seeking Alpha RSS** - Investment analysis and stock research  
- ✅ **Financial Times RSS** - Global financial news
- ✅ **CNBC RSS** - Business news and market updates
- ✅ **Yahoo Finance RSS** - Market news and stock updates

## 📧 Gmail Integration Setup

### Prerequisites
1. Google account with Gmail access
2. Google Cloud Console project
3. Node.js environment with project dependencies installed

### Step-by-Step Setup

#### 1. Google Cloud Console Setup
1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select a Project**
3. **Enable Gmail API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and click "Enable"
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URI: `http://localhost:3000/oauth/callback`
5. **Configure OAuth Consent Screen**:
   - Choose "External" user type
   - Fill in application name: "Market Analysis MCP"
   - Add scopes: `gmail.readonly`, `gmail.modify`

#### 2. Environment Configuration
Update your `.env` file:
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
# GOOGLE_REFRESH_TOKEN will be added automatically by setup script
```

#### 3. Run OAuth Setup
```bash
npm run setup:gmail-oauth
```
Follow the interactive prompts to complete OAuth authorization.

#### 4. Configure Email Sources
Edit `config/sources.json`:
```json
{
  "gmail": {
    "targetSenders": [
      "morningbrief@wsj.com",
      "newsletters@seekingalpha.com", 
      "news@marketwatch.com",
      "newsletters@bloomberg.com",
      "updates@morningbrew.com"
    ],
    "labels": ["Finance", "Trading", "Market Research"],
    "excludePatterns": ["unsubscribe", "promotional offer", "spam"],
    "enabled": true
  }
}
```

### Troubleshooting Gmail Setup

1. **"Missing GOOGLE_REFRESH_TOKEN" Error**:
   - Run `npm run setup:gmail-oauth`
   - Complete the OAuth flow in browser

2. **"OAuth error: access_denied"**:
   - Check OAuth consent screen configuration
   - Ensure redirect URI is exactly: `http://localhost:3000/oauth/callback`

3. **"No refresh token received"**:
   - Delete existing app permissions in Google Account settings
   - Re-run setup to force consent screen

## 🔧 Advanced Configuration

### Customize Data Sources
Edit `config/sources.json` to:
- Enable/disable specific sources
- Add new RSS feeds
- Configure podcast sources
- Set Gmail filters

### Environment Variables
Create a `.env` file with:
```bash
# News API Keys (optional but recommended)
NEWSAPI_ORG_API_KEY=your_newsapi_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key  
FINANCIAL_MODELING_PREP_API_KEY=your_fmp_key

# Gmail OAuth (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=auto_generated_by_setup

# Optional: OpenAI for transcription
OPENAI_API_KEY=your_openai_key

# Database
DATABASE_PATH=./data/market_data.db

# Logging
LOG_LEVEL=info
```
npm start
```

## Setup & Configuration

### Basic Setup (Working Now)

The server is pre-configured to work with free/demo sources:

```bash
cd market-analysis-mcp
npm start
```

**Working Sources:**
- ✅ MarketWatch RSS (news)
- ✅ Chat with Traders (podcast)
- ✅ The Meb Faber Research Podcast (podcast)
- ✅ Caching system with SQLite

### Free API Setup

#### 🆓 Free News APIs

The system includes **3 free news APIs** that provide excellent market coverage without subscription costs:

**1. NewsAPI.org (Recommended)**
- **Cost**: Free (500 requests/day)
- **Coverage**: Aggregates from Bloomberg, Reuters, MarketWatch, CNBC, WSJ
- **Setup**: 
  1. Visit [newsapi.org](https://newsapi.org)
  2. Sign up for free account
  3. Get your API key
  4. Add to `.env`: `NEWSAPI_ORG_API_KEY=`

**2. Alpha Vantage News**
- **Cost**: Free (500 requests/day) 
- **Coverage**: Financial news with sentiment analysis
- **Features**: Pre-analyzed sentiment scores, ticker symbols
- **Setup**:
  1. Visit [alphavantage.co](https://www.alphavantage.co)
  2. Get free API key
  3. Add to `.env`: `ALPHA_VANTAGE_API_KEY=`

**3. Financial Modeling Prep**
- **Cost**: Free (250 requests/day)
- **Coverage**: Stock-specific news and earnings
- **Features**: Symbol-tagged articles, company-specific news
- **Setup**:
  1. Visit [financialmodelingprep.com](https://financialmodelingprep.com)
  2. Register for free API
  3. Add to `.env`: `FINANCIAL_MODELING_PREP_API_KEY=`

#### 📰 Working RSS Sources (No API Key Required)

These sources work immediately without any setup:

- ✅ **MarketWatch RSS** - Financial news and analysis
- ✅ **Seeking Alpha RSS** - Investment analysis and stock research  
- ✅ **CNBC RSS** - Business news and market updates
- ✅ **Financial Times RSS** - Global financial news
- ✅ **Yahoo Finance RSS** - Market news and stock updates

#### 🎙️ Morning Market Podcasts  

- ✅ **Wall Street Breakfast by Seeking Alpha** - Daily market news and analysis
- ✅ **CNN 5 Things** - Daily news briefing with market updates
- ✅ **Morning Brew Daily** - Business news and market analysis from Morning Brew
- ✅ **The Journal by WSJ** - Daily news and market analysis from Wall Street Journal
- ✅ **Chat with Traders** - Interviews with successful traders
- ✅ **The Meb Faber Research Podcast** - Investment research and analysis

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Free News APIs
NEWSAPI_ORG_API_KEY=your_newsapi_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key  
FINANCIAL_MODELING_PREP_API_KEY=your_fmp_key

# Premium News APIs (optional)
BLOOMBERG_API_KEY=your_bloomberg_key
REUTERS_API_KEY=your_reuters_key

# Google Services (for Gmail integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# AI Services (for transcription and summarization)
OPENAI_API_KEY=your_openai_key

# Server Configuration
MCP_SERVER_PORT=3001
CACHE_TTL_HOURS=24
LOG_LEVEL=info
DATABASE_PATH=./data/market_data.db
```

### Data Sources Configuration

Edit `config/sources.json` to customize your data sources:

```json
{
  "news": {
    "sources": [
      {
        "name": "Yahoo Finance RSS",
        "type": "rss",
        "endpoint": "https://feeds.finance.yahoo.com/rss/2.0/headline",
        "enabled": true
      }
    ]
  },
  "podcasts": [
    {
      "name": "Chat with Traders",
      "rssUrl": "https://chatwithtraders.libsyn.com/rss",
      "enabled": true
    }
  ],
  "gmail": {
    "targetSenders": ["newsletter@marketwatch.com"],
    "labels": ["Finance", "Trading"],
    "enabled": false
  }
}
```

## Gmail Integration Setup

### 📧 Step-by-Step Setup

**Step 1: Google Cloud Console Setup**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Create a new project or select an existing one
   - Note the project ID for reference

3. **Enable Gmail API**
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add these authorized redirect URIs:
     ```
     http://localhost:3000/oauth/callback
     ```
   - Download the credentials JSON or copy the Client ID and Client Secret

5. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (unless you have G Suite)
   - Fill in application name: "Market Analysis MCP"
   - Add your email in developer contact information
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`

**Step 2: Run OAuth Setup**

1. **Run the Gmail OAuth setup script**
   ```bash
   npm run setup:gmail-oauth
   ```

2. **Follow the interactive prompts**
   - The script will open your browser automatically
   - Sign in to your Google account
   - Grant permissions to access Gmail
   - The refresh token will be saved automatically

**Step 3: Configure Email Sources**

Edit `config/sources.json`:
```json
{
  "gmail": {
    "targetSenders": [
      "morningbrief@wsj.com",
      "newsletters@seekingalpha.com", 
      "news@marketwatch.com",
      "newsletters@bloomberg.com",
      "updates@morningbrew.com"
    ],
    "labels": ["Finance", "Trading", "Market Research"],
    "excludePatterns": ["unsubscribe", "promotional offer", "spam"],
    "enabled": true
  }
}
```

## MCP Integration

### Connect to Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "market-analysis": {
      "command": "node",
      "args": ["/path/to/market-analysis-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Available MCP Tools

#### `get_market_news`
Retrieve latest financial news articles with filtering and relevance scoring.

**Parameters**:
- `timeframe` (optional): "1h", "6h", "24h", "7d" (default: "24h")
- `symbols` (optional): Array of stock symbols to filter by
- `limit` (optional): Maximum articles to return (default: 20)

#### `get_podcast_summaries`
Get summaries from configured market podcasts.

**Parameters**:
- `timeframe` (optional): "24h", "7d", "30d" (default: "7d")
- `include_transcripts` (optional): Include full transcripts (default: false)

#### `get_relevant_emails`
Extract market-relevant emails from Gmail.

**Parameters**:
- `timeframe` (optional): "24h", "7d", "30d" (default: "7d")
- `senders` (optional): Filter by specific sender emails
- `keywords` (optional): Search for specific market terms

#### `get_market_snapshot`
Unified view across all sources with key highlights and cross-source analysis.

**Parameters**:
- `timeframe` (optional): "1h", "6h", "24h" (default: "6h")
- `priority_symbols` (optional): Prioritize specific symbols

#### `search_market_data`
Search across all historical collected data.

**Parameters**:
- `query` (required): Search terms
- `sources` (optional): Limit to specific sources ["news", "podcast", "email"]
- `timeframe` (optional): Time range (default: "7d")
- `min_relevance` (optional): Minimum relevance score 0-100 (default: 50)

### Sample Queries

- "Get me a market snapshot for the last 6 hours"
- "Search for any mentions of Fed policy across all sources this week"
- "What are the latest news articles about NVDA earnings?"
- "Show me podcast episodes discussing crypto from the last month"

## Architecture

```
market-analysis-mcp/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── tools/                # MCP tool implementations
│   ├── services/             # Data source services
│   ├── types/                # TypeScript interfaces
│   └── utils/                # Utility functions
├── config/
│   └── sources.json          # Data source configuration
├── scripts/                  # Setup and maintenance scripts
└── data/                     # Cache and database files
```

## Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing
```bash
npm run test:connections
```

### Linting
```bash
npm run lint
```

## Relevance Scoring

The system uses a sophisticated relevance scoring algorithm that considers:

- **Market Keywords** (40%): Earnings, Fed, interest rates, inflation, etc.
- **Stock Symbols** (30%): Mentioned ticker symbols weighted by market cap
- **Source Authority** (20%): Bloomberg > Reuters > Yahoo Finance, etc.
- **Recency** (10%): Exponential decay based on content age

## Privacy & Security

- **Email Content**: Sensitive information is automatically redacted
- **API Keys**: Stored securely in environment variables
- **OAuth**: Secure OAuth 2.0 flow for Gmail access
- **Rate Limiting**: Respects API quotas and implements backoff strategies

## Troubleshooting

### Common Issues

1. **Gmail authentication fails**:
   - Run `npm run setup:gmail-oauth` to reconfigure OAuth
   - Ensure correct scopes are granted

2. **News sources not working**:
   - Check API keys in `.env` file
   - Verify rate limits aren't exceeded
   - Test connections with `npm run test:connections`

3. **Cache issues**:
   - Delete `data/cache.db` to reset cache
   - Check database permissions

### Expected Performance

With free API keys configured:
- **~2,000+ articles per day** from premium sources
- **Daily morning podcasts** with market analysis  
- **Real-time relevance scoring** across all content
- **Cross-source correlation** for better insights
- **Full historical search** across collected data

### Logs

Check logs in `logs/market-mcp.log` for detailed error information.

## What's Working Right Now

Even with demo credentials, you get:

1. **Real market news** from MarketWatch RSS feed
2. **Real podcast data** from financial trading podcasts
3. **Full search capabilities** across collected data
4. **Relevance scoring** for all content
5. **Caching** for performance
6. **Market snapshots** combining all sources

The server is fully functional and can provide valuable market analysis immediately!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please check the troubleshooting section above or review the configuration files.