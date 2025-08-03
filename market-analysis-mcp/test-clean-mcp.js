#!/usr/bin/env node

// Test script to verify clean MCP communication
const { spawn } = require('child_process');

console.log('🧪 Testing Clean MCP Communication...\n');

const server = spawn('node', ['start-mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname
});

let outputReceived = false;
let cleanCommunication = true;

server.stdout.on('data', (data) => {
  const output = data.toString();
  outputReceived = true;
  
  console.log('📡 Raw output:', JSON.stringify(output));
  
  // Check if it contains ANSI color codes or non-JSON content
  if (output.includes('\x1B[') || output.includes('error') && !output.startsWith('{')) {
    console.log('❌ Found problematic output that could interfere with MCP');
    cleanCommunication = false;
  } else {
    console.log('✅ Output looks clean for MCP communication');
  }
});

server.stderr.on('data', (data) => {
  const error = data.toString();
  console.log('⚠️  Stderr output:', JSON.stringify(error));
  if (error.includes('\x1B[')) {
    console.log('❌ Found color codes in stderr');
    cleanCommunication = false;
  }
});

// Send a test initialize message
setTimeout(() => {
  console.log('\n📤 Sending MCP initialize message...');
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  };
  
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 1000);

// Test timeout
setTimeout(() => {
  console.log('\n🏁 Test Results:');
  console.log(`Output received: ${outputReceived}`);
  console.log(`Clean communication: ${cleanCommunication}`);
  
  if (cleanCommunication && outputReceived) {
    console.log('✅ MCP server is ready for Claude connection!');
  } else {
    console.log('❌ Issues detected that may interfere with Claude connection');
  }
  
  server.kill('SIGTERM');
}, 3000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('close', (code) => {
  console.log(`\n🔚 Server exited with code ${code}`);
  process.exit(0);
});