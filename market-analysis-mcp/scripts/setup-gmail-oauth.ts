import { google } from 'googleapis';
import { createServer } from 'http';
import { parse } from 'url';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const REDIRECT_URI = 'http://localhost:3002/oauth/callback';
const PORT = 3002;

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
}

class GmailOAuthSetup {
  private oauth2Client: any;
  private server: any;

  constructor(private config: OAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      REDIRECT_URI
    );
  }

  async setupOAuth(): Promise<string> {
    console.log('🔐 Gmail OAuth Setup');
    console.log('===================');
    
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file');
    }

    console.log('\n📋 Required Google Cloud Console Setup:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Gmail API');
    console.log('4. Create OAuth 2.0 credentials');
    console.log(`5. Add redirect URI: ${REDIRECT_URI}`);
    console.log('\n🚀 Starting OAuth flow...\n');

    return new Promise((resolve, reject) => {
      // Generate authorization URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force consent screen to get refresh token
      });

      console.log(`🌐 Opening browser to: ${authUrl}`);
      console.log('\nIf browser doesn\'t open automatically, copy and paste the URL above.');

      // Start local server to handle OAuth callback
      this.server = createServer(async (req, res) => {
        const parsedUrl = parse(req.url || '', true);
        
        if (parsedUrl.pathname === '/oauth/callback') {
          const { code, error } = parsedUrl.query;
          
          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>OAuth Error</h1><p>Error: ${error}</p>`);
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (code && typeof code === 'string') {
            try {
              // Exchange code for tokens
              const { tokens } = await this.oauth2Client.getToken(code);
              
              if (!tokens.refresh_token) {
                throw new Error('No refresh token received. Try revoking app permissions and running setup again.');
              }

              // Success page
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <h1>✅ Gmail OAuth Setup Complete!</h1>
                <p>You can close this browser window and return to the terminal.</p>
                <p>Refresh token has been saved to your .env file.</p>
              `);

              this.server.close();
              resolve(tokens.refresh_token);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`<h1>Setup Error</h1><p>${err}</p>`);
              reject(err);
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Missing authorization code</h1>');
            reject(new Error('Missing authorization code'));
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>Not Found</h1>');
        }
      });

      this.server.listen(PORT, () => {
        console.log(`🔄 Local server started on port ${PORT}`);
        console.log('Waiting for OAuth callback...\n');
        
        // Try to open browser automatically
        const open = require('child_process').exec;
        open(`open "${authUrl}"`, (error: any) => {
          if (error) {
            console.log('Could not open browser automatically. Please open the URL manually.');
          }
        });
      });

      // Handle server errors
      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${PORT} is already in use. Please close other applications using this port.`));
        } else {
          reject(err);
        }
      });
    });
  }

  async updateEnvFile(refreshToken: string): Promise<void> {
    const envPath = path.join(process.cwd(), '.env');
    
    try {
      let envContent = await fs.readFile(envPath, 'utf-8');
      
      // Update or add the refresh token
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        // Replace existing line (commented or not)
        envContent = envContent.replace(
          /^#?GOOGLE_REFRESH_TOKEN=.*$/m,
          `GOOGLE_REFRESH_TOKEN=${refreshToken}`
        );
      } else {
        // Add new line
        envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
      }

      await fs.writeFile(envPath, envContent);
      console.log('✅ Updated .env file with refresh token');
    } catch (error) {
      console.error('❌ Failed to update .env file:', error);
      console.log(`\n📝 Please manually add this line to your .env file:`);
      console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
    }
  }

  async testConnection(refreshToken: string): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const response = await gmail.users.getProfile({ userId: 'me' });
      
      console.log(`✅ Gmail connection successful!`);
      console.log(`📧 Connected to: ${response.data.emailAddress}`);
      console.log(`📊 Total messages: ${response.data.messagesTotal}`);
      
      return true;
    } catch (error) {
      console.error('❌ Gmail connection test failed:', error);
      return false;
    }
  }
}

async function main() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    const config: OAuthConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    };

    const setup = new GmailOAuthSetup(config);
    
    // Run OAuth setup
    const refreshToken = await setup.setupOAuth();
    
    console.log('\n🔐 OAuth Setup Complete!');
    console.log('=======================');
    
    // Update .env file
    await setup.updateEnvFile(refreshToken);
    
    // Test connection
    console.log('\n🧪 Testing Gmail connection...');
    const connectionWorking = await setup.testConnection(refreshToken);
    
    if (connectionWorking) {
      console.log('\n🎉 Gmail integration is now fully configured!');
      console.log('\nNext steps:');
      console.log('1. Update target senders in config/sources.json');
      console.log('2. Run: npm run test:connections');
      console.log('3. Test Gmail integration with your MCP server');
    } else {
      console.log('\n⚠️  Setup completed but connection test failed.');
      console.log('Please check your Google Cloud Console configuration.');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Setup cancelled by user');
  process.exit(0);
});

if (require.main === module) {
  main();
}