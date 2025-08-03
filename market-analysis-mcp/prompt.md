# 🌅 Perfect Morning Market Snapshot Prompt

Use this prompt with your Market Analysis MCP tool every morning before market open to get a comprehensive 5-minute market intelligence briefing.

## 📋 The Prompt

```
Generate my morning pre-market snapshot using getMarketSnapshot with the following parameters:

**Timeframe**: 6h (to capture overnight and early morning developments)

**Priority Symbols**: [Add your watchlist symbols here, e.g., "SPY,QQQ,TSLA,AAPL,NVDA,MSFT"]

**Requirements for the snapshot:**

1. **COMPREHENSIVE SOURCE ANALYSIS**:
   - Aggregate ALL available sources (news APIs, RSS feeds, podcasts, Gmail)
   - Prioritize items with relevance score 70+ for key events
   - Flag any items with relevance score 80+ as critical alerts

2. **CROSS-SOURCE VALIDATION**:
   - Identify themes/stories appearing across multiple sources
   - Highlight any contradictory information between sources
   - Note convergence patterns on specific stocks or market themes

3. **PRE-MARKET FOCUS**:
   - Emphasize overnight developments (Asia/Europe market impacts)
   - Highlight earnings announcements, Fed communications, economic data
   - Flag any breaking news or unexpected events

4. **5-MINUTE READ FORMAT**:
   - Lead with 2-3 sentence executive summary
   - List top 5 critical alerts requiring immediate attention
   - Provide market sentiment analysis (positive/negative/neutral with percentages)
   - Include key events section with relevance scores
   - End with priority symbols activity summary

5. **ACTIONABLE INTELLIGENCE**:
   - Highlight time-sensitive information (earnings calls, Fed speeches, data releases)
   - Note any significant after-hours price movements mentioned
   - Flag unusual volume or activity patterns discussed

Please format the response for quick scanning with clear headers, bullet points, and emoji indicators for different types of information.
```

## 🎯 How to Use This Prompt

1. **Copy the prompt above**
2. **Update Priority Symbols** with your current watchlist
3. **Run it with your MCP tool** each morning around 7:30-8:30 AM ET
4. **Scan the output** for critical alerts first, then read the full summary

## ⚙️ Customization Options

**Adjust Timeframe**:
- Use `12h` for more comprehensive overnight coverage
- Use `3h` for just early morning developments
- Use `24h` on Mondays to catch weekend news

**Priority Symbols Examples**:
- **Index Tracking**: `"SPY,QQQ,DIA,IWM,VIX"`
- **Tech Focus**: `"AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA"`
- **Sector Specific**: `"XLF,XLE,XLK,XLV,XLI"` (sector ETFs)
- **Custom Watchlist**: Add your specific stock picks

**Relevance Score Thresholds**:
- Change `70+` to `60+` for more comprehensive coverage
- Change `80+` to `85+` for only the most critical alerts

## 📊 Expected Output Structure

Your MCP tool will return:

```
# 📊 Market Snapshot

**Executive Summary**: [2-3 sentences on market outlook]

## 🚨 Critical Alerts (80+ relevance)
- [High-priority items requiring immediate attention]

## 📈 Key Events (70+ relevance)  
- [Important developments with context]

## 💭 Market Sentiment
- [Positive/Negative/Neutral breakdown with percentages]

## 🔗 Cross-Source Patterns
- [Themes appearing across multiple sources]

## 📍 Priority Symbols Activity
- [Your watchlist activity summary]

## 📊 Source Breakdown
- News Articles: X | Podcast Episodes: X | Emails: X
```

## 🕐 Optimal Timing

**Best times to run this prompt**:
- **7:30 AM ET**: After European markets are active, before US pre-market volume picks up
- **8:30 AM ET**: After key economic data releases (if scheduled)
- **8:45 AM ET**: Final check before market open

## 💡 Pro Tips

1. **Save Critical Alerts**: Copy any 80+ relevance items to your trading notes
2. **Check Cross-Source Patterns**: These often indicate emerging market themes
3. **Monitor Sentiment Shifts**: Significant changes from previous days can signal market direction
4. **Use Priority Symbols**: Focus on stocks you're actively trading or monitoring
5. **Set Up Routine**: Make this part of your daily pre-market routine for consistent intelligence

---

*This prompt leverages all your MCP tool's capabilities: NewsAPI.org, Alpha Vantage, RSS feeds from MarketWatch/Seeking Alpha/Financial Times, podcast analysis from WSJ/Seeking Alpha/Chat with Traders, and Gmail scanning for broker research and financial newsletters.*