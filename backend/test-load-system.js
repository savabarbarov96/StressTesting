const mongoose = require('mongoose');
const { RunManager } = require('./dist/services/RunManager');
const { Spec } = require('./dist/models/Spec');
const { config } = require('./dist/config');

async function testLoadSystem() {
  try {
    console.log('🧪 Starting load testing system test...');
    
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Create a test spec
    const testSpec = new Spec({
      name: 'Test Load Test',
      description: 'A simple test to verify the load testing system',
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
        steady: 10,
        rampDown: 0
      }
    });
    
    await testSpec.save();
    console.log('✅ Test spec created:', testSpec.id);
    
    // Create RunManager
    const runManager = new RunManager(1);
    console.log('✅ RunManager created');
    
    // Set up event listeners
    runManager.on('progress', ({ runId, data }) => {
      console.log(`📊 Progress for ${runId}:`, data);
    });
    
    runManager.on('log', ({ runId, data }) => {
      console.log(`📝 Log for ${runId}:`, data.message);
    });
    
    runManager.on('runCompleted', ({ runId, summary }) => {
      console.log(`✅ Run ${runId} completed:`, summary);
      cleanup();
    });
    
    runManager.on('runFailed', ({ runId, error }) => {
      console.log(`❌ Run ${runId} failed:`, error);
      cleanup();
    });
    
    // Start the test run
    console.log('🚀 Starting test run...');
    const runId = await runManager.startRun(testSpec.id);
    console.log('✅ Test run started:', runId);
    
    // Set up cleanup function
    async function cleanup() {
      console.log('🧹 Cleaning up...');
      try {
        await runManager.shutdown();
        await testSpec.deleteOne();
        await mongoose.connection.close();
        console.log('✅ Cleanup completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Cleanup error:', error);
        process.exit(1);
      }
    }
    
    // Set up timeout
    setTimeout(() => {
      console.log('⏰ Test timeout reached');
      cleanup();
    }, 60000); // 1 minute timeout
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLoadSystem(); 