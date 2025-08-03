# Gmail Integration Setup Guide

## 📧 Overview

The Gmail integration allows your market analysis system to automatically scan and analyze relevant financial emails from brokers, financial news services, and trading platforms.

## 🔧 Prerequisites

1. Google account with Gmail access
2. Google Cloud Console project
3. Node.js environment with the project dependencies installed

## 🚀 Step-by-Step Setup

### Step 1: Google Cloud Console Setup

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

### Step 2: Environment Configuration

1. **Update .env file**
   ```bash
   # Add your Google OAuth credentials
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   # GOOGLE_REFRESH_TOKEN will be added automatically by setup script
   ```

### Step 3: Run OAuth Setup

1. **Install dependencies** (if not done already)
   ```bash
   npm install
   ```

2. **Run the Gmail OAuth setup script**
   ```bash
   npm run setup:gmail-oauth
   ```

3. **Follow the interactive prompts**
   - The script will open your browser automatically
   - Sign in to your Google account
   - Grant permissions to access Gmail
   - The refresh token will be saved automatically

### Step 4: Configure Email Sources

1. **Edit config/sources.json**
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

2. **Customize target senders** based on your subscriptions:
   - Financial news services you subscribe to
   - Broker research emails
   - Trading platform alerts
   - Economic newsletter subscriptions

### Step 5: Test the Integration

1. **Test Gmail connection**
   ```bash
   npm run test:connections
   ```

2. **Verify Gmail service in logs**
   - Look for "Gmail service initialized successfully"
   - Check for any authentication errors

## 📋 Package.json Scripts

Add this script to your package.json if not present:

```json
{
  "scripts": {
    "setup:gmail-oauth": "ts-node scripts/setup-gmail-oauth.ts"
  }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"Missing GOOGLE_REFRESH_TOKEN" Error**
   - Solution: Run `npm run setup:gmail-oauth`
   - Make sure to complete the OAuth flow in the browser

2. **"OAuth error: access_denied"**
   - Check OAuth consent screen configuration
   - Ensure redirect URI is exactly: `http://localhost:3000/oauth/callback`
   - Try revoking app permissions and re-running setup

3. **"Port 3000 is already in use"**
   - Close other applications using port 3000
   - Or modify the PORT constant in the setup script

4. **"No refresh token received"**
   - The OAuth flow must show a consent screen
   - Try adding `?prompt=consent` to force consent screen
   - Delete existing app permissions in Google Account settings and retry

5. **Gmail API quota exceeded**
   - Default quota: 1 billion quota units per day
   - Each email fetch uses ~5-10 quota units
   - Monitor usage in Google Cloud Console

### Debug Steps

1. **Check environment variables**
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET  
   echo $GOOGLE_REFRESH_TOKEN
   ```

2. **Verify Google Cloud Console settings**
   - Gmail API is enabled
   - OAuth credentials are correctly configured
   - Redirect URI matches exactly

3. **Test with minimal permissions**
   - Start with just `gmail.readonly` scope
   - Add `gmail.modify` only if needed for labeling

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit .env file to version control
   - Use separate credentials for development/production
   - Rotate refresh tokens periodically

2. **Permissions**
   - Request minimal necessary scopes
   - Consider using `gmail.readonly` if you don't need to modify emails
   - Review OAuth consent screen regularly

3. **Data Handling**
   - Email content is automatically redacted for sensitive information
   - Personal information is filtered before processing
   - Consider additional privacy measures for production use

## 📊 Usage Examples

Once configured, you can:

1. **Get relevant financial emails**
   ```typescript
   const emails = await gmailService.getRelevantEmails('7d');
   ```

2. **Search for specific topics**
   ```typescript
   const results = await gmailService.searchEmails('earnings report', '30d');
   ```

3. **Filter by specific senders**
   ```typescript
   const brokerEmails = await gmailService.getRelevantEmails(
     '7d', 
     ['research@schwab.com', 'alerts@fidelity.com']
   );
   ```

## 📈 Expected Performance

With Gmail integration enabled:
- **~50-200 relevant emails per day** (depending on subscriptions)
- **Automatic relevance scoring** for market-related content
- **Privacy-focused content filtering** 
- **Cross-source correlation** with news and podcast data
- **Historical email search** capabilities

The system automatically filters for market-relevant content and excludes promotional/spam emails based on your configuration.