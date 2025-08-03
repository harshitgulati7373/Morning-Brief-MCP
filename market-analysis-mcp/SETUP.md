# Setup Guide

## Quick Start for Development

The Market Analysis MCP Server has been successfully built and is ready to use. Here's how to get started:

### 1. Basic Setup (Working Now)

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

**Demo Sources (need real credentials):**
- ⚠️ Bloomberg API (requires paid subscription)
- ⚠️ Reuters API (requires paid subscription)  
- ⚠️ Gmail integration (requires OAuth setup)

### 2. Testing the Server

You can test the server immediately:

```bash
# Test basic functionality
npm run test:connections

# Start the MCP server
npm start
```

### 3. Connect to Claude

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "market-analysis": {
      "command": "node",
      "args": ["/Users/harshitgulati/Coding Projects/Trading/market-analysis-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 4. Available MCP Tools

Once connected, you can use these tools in Claude:

- `get_market_news` - Get latest financial news from working sources
- `get_podcast_summaries` - Get financial podcast episode summaries
- `get_market_snapshot` - Unified analysis across all sources
- `search_market_data` - Search historical data
- `get_relevant_emails` - Gmail integration (requires setup)

### 5. Example Usage

Try these commands in Claude once connected:

```
"Get me the latest market news from the last 24 hours"
"Show me recent podcast episodes about trading"
"Give me a market snapshot for the last 6 hours"
"Search for mentions of 'Fed policy' in all sources"
```

## Advanced Setup (Optional)

### Enable Gmail Integration

1. **Get Google OAuth credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Gmail API
   - Create OAuth 2.0 credentials (Desktop application)

2. **Run OAuth setup:**
   ```bash
   npm run setup:auth
   ```

3. **Follow the prompts** to authorize access

### Add News API Keys

Edit `.env` file with real API keys:

```bash
BLOOMBERG_API_KEY=your_real_bloomberg_key
REUTERS_API_KEY=your_real_reuters_key
OPENAI_API_KEY=your_openai_key_for_transcription
```

### Customize Data Sources

Edit `config/sources.json` to:
- Enable/disable specific sources
- Add new RSS feeds
- Configure podcast sources
- Set Gmail filters

## Architecture Overview

```
📊 Market Analysis MCP Server
├── 📰 News Sources (RSS + APIs)
├── 🎙️ Podcast Processing (RSS + Transcription)
├── 📧 Gmail Integration (OAuth + Filtering)
├── 🧠 Relevance Scoring (AI-powered)
├── 💾 Caching Layer (SQLite)
└── 🔍 Unified Search & Analysis
```

## Features Implemented

✅ **Phase 1 Complete:**
- Core MCP server framework
- News aggregation with multiple sources
- Relevance scoring algorithm
- SQLite caching system

✅ **Phase 2 Complete:**
- Podcast RSS integration
- Gmail service (OAuth ready)
- Cross-source data correlation
- Smart rate limiting

✅ **Phase 3 Complete:**
- Unified market snapshots
- Advanced search functionality
- Sentiment analysis
- Performance optimization

✅ **Phase 4 Complete:**
- Full documentation
- Connection testing
- Error handling
- Production ready

## What's Working Right Now

Even with demo credentials, you get:

1. **Real market news** from MarketWatch RSS feed
2. **Real podcast data** from financial trading podcasts
3. **Full search capabilities** across collected data
4. **Relevance scoring** for all content
5. **Caching** for performance
6. **Market snapshots** combining all sources

The server is fully functional and can provide valuable market analysis immediately!

## Next Steps

1. **Test with Claude** - Connect and try the MCP tools
2. **Add real API keys** - For premium news sources
3. **Enable Gmail** - For email newsletter analysis
4. **Customize sources** - Add your preferred data sources

The foundation is complete and ready for use! 🚀