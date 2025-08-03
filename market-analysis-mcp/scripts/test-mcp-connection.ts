#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import path from 'path';

async function testMCPConnection() {
  console.log('🧪 Testing MCP Connection Protocol...\n');

  const serverPath = path.join(process.cwd(), 'dist', 'index.js');
  console.log(`Starting server: node ${serverPath}`);

  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let serverReady = false;

  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📡 Server Output:', output.trim());
    
    if (output.includes('Market Analysis MCP Server started')) {
      serverReady = true;
      console.log('✅ Server is ready for MCP connection');
      
      // Send a simple initialize message
      setTimeout(() => {
        console.log('📤 Sending initialize message...');
        const initMessage = {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: {
              name: "test-client",
              version: "1.0.0"
            }
          }
        };
        
        server.stdin.write(JSON.stringify(initMessage) + '\n');
      }, 1000);
    }
  });

  server.stderr.on('data', (data) => {
    const error = data.toString();
    console.log('❌ Server Error:', error.trim());
  });

  server.on('close', (code) => {
    console.log(`\n🏁 Server process exited with code ${code}`);
    if (code === 0) {
      console.log('✅ Test completed successfully');
    } else {
      console.log('❌ Test failed with exit code', code);
    }
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });

  // Let it run for 10 seconds then kill
  setTimeout(() => {
    console.log('\n⏱️  Test timeout, stopping server...');
    server.kill('SIGTERM');
  }, 10000);
}

if (require.main === module) {
  testMCPConnection().catch(console.error);
}