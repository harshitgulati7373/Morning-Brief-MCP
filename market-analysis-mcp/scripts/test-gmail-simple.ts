import { google } from 'googleapis';

async function testGmailSimple() {
  require('dotenv').config();
  
  console.log('🔍 Simple Gmail OAuth Test');
  console.log('==========================');
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('❌ Missing Google OAuth credentials');
    return;
  }
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3002/oauth/callback'
  );
  
  // Generate URL with minimal scope first
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent'
  });
  
  console.log('🌐 Test this URL in your browser:');
  console.log(authUrl);
  console.log('');
  console.log('If this works, we can proceed with the full setup.');
  console.log('If you get 403 error, check:');
  console.log('1. OAuth consent screen is set to "External"');
  console.log('2. Your email is added as a test user');
  console.log('3. Gmail API is enabled');
}

testGmailSimple().catch(console.error);