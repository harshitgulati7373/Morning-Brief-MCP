import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface AppConfig {
  environment: 'development' | 'production' | 'test';
  port: number;
  database: {
    path: string;
    options: any;
  };
  apis: {
    newsApi?: {
      key: string;
      baseUrl: string;
      rateLimit: number;
    };
    gmail?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    podcast?: {
      baseUrl: string;
      rateLimit: number;
    };
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  logging: {
    level: string;
    filePath: string;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    const environment = process.env.NODE_ENV || 'development';
    const configPath = join(process.cwd(), 'config', `${environment}.json`);
    
    // Default configuration
    const defaultConfig: AppConfig = {
      environment: environment as 'development' | 'production' | 'test',
      port: parseInt(process.env.PORT || '3000'),
      database: {
        path: './data/market_data.db',
        options: {}
      },
      apis: {
        newsApi: {
          key: process.env.NEWS_API_KEY || '',
          baseUrl: 'https://newsapi.org/v2',
          rateLimit: 100
        },
        gmail: {
          clientId: process.env.GMAIL_CLIENT_ID || '',
          clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
          redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/callback'
        },
        podcast: {
          baseUrl: 'https://api.podcastindex.org',
          rateLimit: 50
        }
      },
      cache: {
        ttl: 300000, // 5 minutes
        maxSize: 1000
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: './logs/market-mcp.log'
      }
    };

    // Try to load environment-specific config
    if (existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...fileConfig };
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using defaults:`, error);
      }
    }

    return defaultConfig;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isTest(): boolean {
    return this.config.environment === 'test';
  }
}