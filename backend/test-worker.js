const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Test worker loading
function testWorkerLoading() {
  console.log('🧪 Testing worker loading...');
  
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
      console.log('📨 Worker message:', message);
    });
    
    worker.on('error', (error) => {
      console.error('❌ Worker error:', error);
    });
    
    worker.on('exit', (code) => {
      console.log(`🔄 Worker exited with code: ${code}`);
    });
    
    // Test sending a message (this should fail gracefully since we don't have a real spec)
    setTimeout(() => {
      console.log('🛑 Terminating test worker...');
      worker.terminate();
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create worker:', error);
    return false;
  }
}

// Run the test
testWorkerLoading(); 