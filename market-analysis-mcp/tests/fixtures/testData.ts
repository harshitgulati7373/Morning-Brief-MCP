/**
 * Test fixtures with realistic market data for testing
 */

import { MarketDataItem, RelevanceConfig, NewsSource, PodcastSource } from '../../src/types/marketData';

export const mockRelevanceConfig: RelevanceConfig = {
  marketKeywords: {
    high: [
      'earnings', 'IPO', 'merger', 'acquisition', 'bull market', 'bear market',
      'fed rate', 'interest rate', 'inflation', 'recession', 'GDP'
    ],
    medium: [
      'stock', 'market', 'trading', 'investment', 'portfolio', 'dividend',
      'revenue', 'profit', 'quarterly', 'analyst', 'forecast'
    ],
    low: [
      'price', 'volume', 'analysis', 'report', 'news', 'update',
      'company', 'business', 'financial', 'economic'
    ]
  },
  weights: {
    marketKeywords: 30,
    stockSymbols: 25,
    sourceAuthority: 25,
    recency: 20
  }
};

export const mockNewsItems: MarketDataItem[] = [
  {
    id: 'news-1',
    source: 'news',
    sourceDetails: {
      name: 'Bloomberg API',
      url: 'https://bloomberg.com/api',
      author: 'Bloomberg News'
    },
    timestamp: new Date().toISOString(),
    title: 'Apple Reports Record Q4 Earnings, Beats Wall Street Expectations',
    content: 'Apple Inc. (AAPL) reported record fourth-quarter earnings that exceeded Wall Street expectations, driven by strong iPhone sales and services revenue growth. The company posted earnings per share of $1.46, beating analyst estimates of $1.39. Revenue came in at $94.9 billion, up 8% year-over-year.',
    summary: 'Apple beats Q4 earnings expectations with strong iPhone and services performance',
    relevanceScore: 92,
    marketTags: ['earnings', 'tech', 'revenue'],
    symbols: ['AAPL'],
    sentiment: 'positive'
  },
  {
    id: 'news-2',
    source: 'news',
    sourceDetails: {
      name: 'Reuters API',
      url: 'https://reuters.com/api'
    },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    title: 'Federal Reserve Signals Potential Rate Pause Amid Economic Uncertainty',
    content: 'Federal Reserve officials indicated they may pause interest rate hikes at their next meeting, citing concerns about economic growth and labor market conditions. The central bank has raised rates aggressively this year to combat inflation, but recent economic data suggests the pace of tightening may slow.',
    summary: 'Fed considers pausing rate hikes due to economic uncertainty',
    relevanceScore: 88,
    marketTags: ['fed rate', 'monetary policy', 'inflation'],
    symbols: [],
    sentiment: 'neutral'
  },
  {
    id: 'news-3',
    source: 'news',
    sourceDetails: {
      name: 'MarketWatch',
      url: 'https://marketwatch.com'
    },
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    title: 'Tesla Stock Drops 5% on Production Concerns Despite Strong Delivery Numbers',
    content: 'Tesla (TSLA) shares fell 5% in after-hours trading despite reporting record vehicle deliveries for the quarter. Investors remain concerned about production challenges at the company\'s new factories and increasing competition in the electric vehicle market.',
    summary: 'Tesla stock falls on production concerns despite delivery records',
    relevanceScore: 78,
    marketTags: ['automotive', 'production', 'delivery'],
    symbols: ['TSLA'],
    sentiment: 'negative'
  },
  {
    id: 'news-4',
    source: 'news',
    sourceDetails: {
      name: 'Financial Times',
      url: 'https://ft.com'
    },
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    title: 'Microsoft and Google Race to Dominate AI Market with New Product Launches',
    content: 'Microsoft (MSFT) and Google (GOOGL) are intensifying their competition in artificial intelligence, with both companies announcing major product updates and partnerships. Microsoft\'s integration of AI into Office products and Google\'s advances in cloud AI services are driving significant market interest.',
    summary: 'Microsoft and Google compete in AI market with new products',
    relevanceScore: 82,
    marketTags: ['AI', 'technology', 'competition'],
    symbols: ['MSFT', 'GOOGL'],
    sentiment: 'positive'
  },
  {
    id: 'news-5',
    source: 'news',
    sourceDetails: {
      name: 'Yahoo Finance',
      url: 'https://finance.yahoo.com'
    },
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    title: 'Market Volatility Expected as Q4 Earnings Season Approaches',
    content: 'Financial analysts predict increased market volatility as fourth-quarter earnings season begins. Key sectors to watch include technology, healthcare, and financial services, with particular attention on how companies navigate ongoing economic headwinds.',
    summary: 'Analysts expect market volatility during Q4 earnings season',
    relevanceScore: 65,
    marketTags: ['volatility', 'earnings season', 'market outlook'],
    symbols: [],
    sentiment: 'neutral'
  }
];

export const mockPodcastItems: MarketDataItem[] = [
  {
    id: 'podcast-1',
    source: 'podcast',
    sourceDetails: {
      name: 'Chat with Traders',
      url: 'https://chatwithtraders.com',
      author: 'Aaron Fifield'
    },
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    title: 'Episode 301: Options Strategies for Volatile Markets',
    content: 'In this episode, we discuss advanced options strategies that can help traders navigate volatile market conditions. Our guest, a former hedge fund manager, shares insights on using covered calls, protective puts, and iron condors to manage risk while maintaining upside potential.',
    summary: 'Discussion of options strategies for managing volatility and risk',
    relevanceScore: 74,
    marketTags: ['options', 'volatility', 'risk management'],
    symbols: [],
    sentiment: 'neutral'
  },
  {
    id: 'podcast-2',
    source: 'podcast',
    sourceDetails: {
      name: 'The Meb Faber Research Podcast',
      url: 'https://mebfaber.com/podcast',
      author: 'Meb Faber'
    },
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    title: 'The Future of Value Investing in a Tech-Dominated Market',
    content: 'Meb discusses the challenges and opportunities for value investors in today\'s market environment. The conversation covers the performance of value versus growth strategies, the impact of technology disruption on traditional valuation metrics, and potential opportunities in emerging markets.',
    summary: 'Analysis of value investing strategies in modern tech-focused markets',
    relevanceScore: 71,
    marketTags: ['value investing', 'growth', 'technology'],
    symbols: [],
    sentiment: 'neutral'
  }
];

export const mockEmailItems: MarketDataItem[] = [
  {
    id: 'email-1',
    source: 'email',
    sourceDetails: {
      name: 'Morning Brew',
      author: 'Morning Brew Newsletter',
      url: 'https://morningbrew.com'
    },
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    title: 'Tech Earnings Roundup: Winners and Losers',
    content: 'This week\'s tech earnings revealed a mixed bag of results. While some companies like Apple and Microsoft exceeded expectations, others faced headwinds from slowing consumer spending and supply chain issues. Key takeaways include the resilience of cloud computing revenues and the impact of AI investments on profit margins.',
    summary: 'Weekly tech earnings analysis showing mixed results across the sector',
    relevanceScore: 79,
    marketTags: ['earnings', 'technology', 'cloud computing'],
    symbols: ['AAPL', 'MSFT'],
    sentiment: 'neutral'
  }
];

export const mockNewsSource: NewsSource = {
  name: 'Test News API',
  type: 'api',
  endpoint: 'https://test-news-api.com/v1/news',
  auth: 'api_key',
  rateLimit: '100/hour',
  enabled: true
};

export const mockPodcastSource: PodcastSource = {
  name: 'Test Podcast Feed',
  rssUrl: 'https://test-podcast.com/feed.xml',
  transcriptionService: 'openai-whisper',
  enabled: true
};

export const createMockTimeSeriesData = (symbol: string, days: number = 30) => {
  const data = [];
  const basePrice = 100;
  let currentPrice = basePrice;

  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility * 2;
    currentPrice *= (1 + change);

    data.push({
      symbol,
      date: date.toISOString().split('T')[0],
      price: Number(currentPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 500000,
      change: Number((change * 100).toFixed(2))
    });
  }

  return data;
};

export const mockRSSFeedResponse = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Market News</title>
    <description>Mock RSS feed for testing</description>
    <link>https://test-market-news.com</link>
    <item>
      <title>Stock Market Reaches New Highs on Earnings Optimism</title>
      <description>Major indices closed at record levels as investors anticipate strong quarterly earnings reports.</description>
      <link>https://test-market-news.com/article/1</link>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Oil Prices Surge on Supply Concerns</title>
      <description>Crude oil futures jumped 3% amid geopolitical tensions and supply chain disruptions.</description>
      <link>https://test-market-news.com/article/2</link>
      <pubDate>Sun, 31 Dec 2023 18:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

export const mockApiResponse = {
  status: 'success',
  data: [
    {
      id: 'api-article-1',
      headline: 'Breaking: Major Bank Reports Quarterly Loss',
      content: 'A major financial institution reported unexpected losses for the quarter, citing increased loan defaults and regulatory costs.',
      source: 'Financial News API',
      published_at: new Date().toISOString(),
      symbols: ['JPM', 'BAC', 'WFC']
    },
    {
      id: 'api-article-2',
      headline: 'Cryptocurrency Rally Continues with Bitcoin Surge',
      content: 'Bitcoin and other major cryptocurrencies continue their upward trajectory as institutional adoption increases.',
      source: 'Crypto News API',
      published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      symbols: ['BTC', 'ETH']
    }
  ]
};

export const mockErrorResponses = {
  networkError: new Error('Network request failed'),
  authError: new Error('Authentication failed'),
  rateLimitError: new Error('Rate limit exceeded'),
  serverError: new Error('Internal server error'),
  timeoutError: new Error('Request timeout')
};

export const createMockEmailData = (count: number = 5) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `email-${index + 1}`,
    sender: `newsletter${index + 1}@finance-news.com`,
    subject: `Market Update #${index + 1}: Weekly Analysis`,
    snippet: `This week's market analysis covers earnings reports, economic indicators, and sector performance...`,
    timestamp: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
    labels: ['INBOX', 'Finance', 'Newsletter']
  }));
};

export const createMockPodcastEpisode = (overrides: any = {}) => ({
  title: 'Market Analysis: Q4 Outlook',
  description: 'Our experts discuss the market outlook for the fourth quarter, including key earnings to watch and economic indicators.',
  pubDate: new Date().toISOString(),
  audioUrl: 'https://podcast-cdn.com/episode-123.mp3',
  duration: '45:30',
  transcript: 'Welcome to today\'s market analysis. We\'re discussing the Q4 outlook...',
  ...overrides
});

// Helper function to create test data with specific characteristics
export const createTestDataSet = (options: {
  highRelevanceCount?: number;
  mediumRelevanceCount?: number;
  lowRelevanceCount?: number;
  symbols?: string[];
  timeSpread?: number; // hours
}) => {
  const {
    highRelevanceCount = 2,
    mediumRelevanceCount = 3,
    lowRelevanceCount = 2,
    symbols = ['AAPL', 'MSFT', 'GOOGL'],
    timeSpread = 24
  } = options;

  const items: MarketDataItem[] = [];
  let idCounter = 1;

  // Create high relevance items
  for (let i = 0; i < highRelevanceCount; i++) {
    items.push({
      id: `test-high-${idCounter++}`,
      source: 'news',
      sourceDetails: { name: 'Bloomberg API' },
      timestamp: new Date(Date.now() - (Math.random() * timeSpread * 60 * 60 * 1000)).toISOString(),
      title: `High Relevance News ${i + 1}: Major Earnings Report`,
      content: 'This is high relevance content with earnings and acquisition keywords.',
      summary: `High relevance summary ${i + 1}`,
      relevanceScore: 75 + Math.random() * 25, // 75-100
      marketTags: ['earnings', 'acquisition'],
      symbols: symbols.slice(0, 2),
      sentiment: 'positive'
    });
  }

  // Create medium relevance items
  for (let i = 0; i < mediumRelevanceCount; i++) {
    items.push({
      id: `test-medium-${idCounter++}`,
      source: 'news',
      sourceDetails: { name: 'MarketWatch' },
      timestamp: new Date(Date.now() - (Math.random() * timeSpread * 60 * 60 * 1000)).toISOString(),
      title: `Medium Relevance News ${i + 1}: Market Analysis`,
      content: 'This is medium relevance content with market and trading keywords.',
      summary: `Medium relevance summary ${i + 1}`,
      relevanceScore: 40 + Math.random() * 35, // 40-75
      marketTags: ['market', 'trading'],
      symbols: symbols.slice(1, 2),
      sentiment: 'neutral'
    });
  }

  // Create low relevance items
  for (let i = 0; i < lowRelevanceCount; i++) {
    items.push({
      id: `test-low-${idCounter++}`,
      source: 'news',
      sourceDetails: { name: 'Generic News' },
      timestamp: new Date(Date.now() - (Math.random() * timeSpread * 60 * 60 * 1000)).toISOString(),
      title: `Low Relevance News ${i + 1}: General Update`,
      content: 'This is low relevance content with basic financial keywords.',
      summary: `Low relevance summary ${i + 1}`,
      relevanceScore: Math.random() * 40, // 0-40
      marketTags: ['update', 'report'],
      symbols: [],
      sentiment: 'neutral'
    });
  }

  return items;
};