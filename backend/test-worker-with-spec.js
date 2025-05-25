const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Test worker with a real spec
function testWorkerWithSpec() {
  console.log('🧪 Testing worker with spec...');
  
  const workerPath = path.join(__dirname, 'dist/workers/loadWorker.js');
  
  if (!fs.existsSync(workerPath)) {
    console.error('❌ Worker file not found at:', workerPath);
    return false;
  }
  
  console.log('✅ Worker file found at:', workerPath);
  
  try {
    // Create a test worker
    const worker = new Worker(workerPath, {
      workerData: { runId: 'test-run-123' }
    });
    
    console.log('✅ Worker created successfully');
    
    // Set up event handlers
    worker.on('message', (message) => {
      console.log('📨 Worker message:', JSON.stringify(message, null, 2));
    });
    
    worker.on('error', (error) => {
      console.error('❌ Worker error:', error);
    });
    
    worker.on('exit', (code) => {
      console.log(`🔄 Worker exited with code: ${code}`);
    });
    
    // Create a test spec
    const testSpec = {
      name: 'Test Load Test',
      request: {
        method: 'GET',
        url: 'https://httpbin.org/get',
        headers: {
          'User-Agent': 'LoadForge-Test'
        }
      },
      loadProfile: {
        rampUp: 0,
        users: 2,
        steady: 5,
        rampDown: 0
      }
    };
    
    console.log('📤 Sending test spec to worker...');
    console.log('🎯 Target:', testSpec.request.method, testSpec.request.url);
    console.log('👥 Load profile:', testSpec.loadProfile.users, 'users for', testSpec.loadProfile.steady, 'seconds');
    
    // Send the spec to start the load test
    worker.postMessage({
      type: 'start',
      spec: testSpec
    });
    
    // Set a timeout to terminate the worker if it doesn't complete
    setTimeout(() => {
      console.log('⏰ Test timeout - terminating worker...');
      worker.terminate();
    }, 15000); // 15 seconds timeout
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create worker:', error);
    return false;
  }
}

// Run the test
testWorkerWithSpec(); 