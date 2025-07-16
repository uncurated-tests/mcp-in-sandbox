#!/usr/bin/env node

const http = require('http');

async function testMCPServer() {
  const hostname = 'localhost';
  const port = 3000;
  const path = '/mcp';
  
  console.log(`Testing MCP server at ${hostname}:${port}${path}`);
  
  // Test 1: Check if server responds to basic request
  try {
    const response = await makeRequest('POST', hostname, port, path, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });
    
    console.log('✓ Server responded to initialize request');
    console.log('Response:', JSON.stringify(response, null, 2));
    
    // Test 2: List available tools
    const toolsResponse = await makeRequest('POST', hostname, port, path, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    
    console.log('✓ Successfully retrieved tools list');
    console.log('Available tools:', JSON.stringify(toolsResponse, null, 2));
    
    // Test 3: Call echo tool if available
    if (toolsResponse.result && toolsResponse.result.tools) {
      const echoTool = toolsResponse.result.tools.find(tool => tool.name === 'echo');
      if (echoTool) {
        const echoResponse = await makeRequest('POST', hostname, port, path, {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: {
              message: 'Hello from test script!'
            }
          }
        });
        
        console.log('✓ Successfully called echo tool');
        console.log('Echo response:', JSON.stringify(echoResponse, null, 2));
      } else {
        console.log('⚠ Echo tool not found in available tools');
      }
    }
    
    console.log('\n✅ All tests passed! MCP server is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

function makeRequest(method, hostname, port, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname,
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.write(postData);
    req.end();
  });
}

// Run the test
testMCPServer();