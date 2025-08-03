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

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# News APIs (optional)
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

## MCP Tools

### `get_market_news`
Retrieve latest financial news articles with filtering and relevance scoring.

**Parameters**:
- `timeframe` (optional): "1h", "6h", "24h", "7d" (default: "24h")
- `symbols` (optional): Array of stock symbols to filter by
- `limit` (optional): Maximum articles to return (default: 20)

### `get_podcast_summaries`
Get summaries from configured market podcasts.

**Parameters**:
- `timeframe` (optional): "24h", "7d", "30d" (default: "7d")
- `include_transcripts` (optional): Include full transcripts (default: false)

### `get_relevant_emails`
Extract market-relevant emails from Gmail.

**Parameters**:
- `timeframe` (optional): "24h", "7d", "30d" (default: "7d")
- `senders` (optional): Filter by specific sender emails
- `keywords` (optional): Search for specific market terms

### `get_market_snapshot`
Unified view across all sources with key highlights and cross-source analysis.

**Parameters**:
- `timeframe` (optional): "1h", "6h", "24h" (default: "6h")
- `priority_symbols` (optional): Prioritize specific symbols

### `search_market_data`
Search across all historical collected data.

**Parameters**:
- `query` (required): Search terms
- `sources` (optional): Limit to specific sources ["news", "podcast", "email"]
- `timeframe` (optional): Time range (default: "7d")
- `min_relevance` (optional): Minimum relevance score 0-100 (default: 50)

## Usage Examples

### With Claude Desktop

Add to your Claude Desktop MCP configuration:

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
   - Run `npm run setup:auth` to reconfigure OAuth
   - Ensure correct scopes are granted

2. **News sources not working**:
   - Check API keys in `.env` file
   - Verify rate limits aren't exceeded
   - Test connections with `npm run test:connections`

3. **Cache issues**:
   - Delete `data/cache.db` to reset cache
   - Check database permissions

### Logs

Check logs in `logs/market-mcp.log` for detailed error information.

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