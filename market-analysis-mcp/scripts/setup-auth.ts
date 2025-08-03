#!/usr/bin/env ts-node

import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGoogleAuth(): Promise<void> {
  console.log('🔐 Setting up Google OAuth for Gmail access...\n');

  const clientId = await question('Enter your Google Client ID: ');
  const clientSecret = await question('Enter your Google Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('❌ Client ID and Client Secret are required');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  console.log('\n📱 Please visit this URL to authorize the application:');
  console.log(authUrl);
  console.log('\n');

  const code = await question('Enter the authorization code: ');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.error('❌ No refresh token received. Make sure to request offline access.');
      process.exit(1);
    }

    // Read existing .env file or create new one
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch {
      // File doesn't exist, start with empty content
    }

    // Update or add Google credentials
    const envLines = envContent.split('\n');
    const updatedLines: string[] = [];
    let foundClientId = false;
    let foundClientSecret = false;
    let foundRefreshToken = false;

    for (const line of envLines) {
      if (line.startsWith('GOOGLE_CLIENT_ID=')) {
        updatedLines.push(`GOOGLE_CLIENT_ID=${clientId}`);
        foundClientId = true;
      } else if (line.startsWith('GOOGLE_CLIENT_SECRET=')) {
        updatedLines.push(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
        foundClientSecret = true;
      } else if (line.startsWith('GOOGLE_REFRESH_TOKEN=')) {
        updatedLines.push(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        foundRefreshToken = true;
      } else if (line.trim() !== '') {
        updatedLines.push(line);
      }
    }

    // Add missing variables
    if (!foundClientId) {
      updatedLines.push(`GOOGLE_CLIENT_ID=${clientId}`);
    }
    if (!foundClientSecret) {
      updatedLines.push(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    }
    if (!foundRefreshToken) {
      updatedLines.push(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    }

    await fs.writeFile(envPath, updatedLines.join('\n') + '\n');

    console.log('\n✅ Google OAuth setup completed successfully!');
    console.log('🔑 Credentials saved to .env file');
    console.log('\n📧 Your Gmail integration is now ready to use.');

  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Market Analysis MCP - Authentication Setup\n');
    
    const setupType = await question('What would you like to set up? (gmail/api-keys/all): ');
    
    switch (setupType.toLowerCase()) {
      case 'gmail':
        await setupGoogleAuth();
        break;
      case 'api-keys':
        console.log('\n📝 Please manually add your API keys to the .env file:');
        console.log('- BLOOMBERG_API_KEY=your_bloomberg_key');
        console.log('- REUTERS_API_KEY=your_reuters_key');
        console.log('- OPENAI_API_KEY=your_openai_key');
        break;
      case 'all':
        await setupGoogleAuth();
        console.log('\n📝 Don\'t forget to add your other API keys to the .env file!');
        break;
      default:
        console.log('❌ Invalid option. Please choose gmail, api-keys, or all');
        break;
    }
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}