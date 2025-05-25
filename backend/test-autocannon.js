const autocannon = require('autocannon');

console.log('🧪 Testing autocannon directly...');

// Test against a simple HTTP endpoint
const config = {
  url: 'https://httpbin.org/get',
  connections: 2,
  duration: 5,
  method: 'GET',
  headers: {
    'User-Agent': 'LoadForge-Test'
  }
};

console.log(`🎯 Target: ${config.method} ${config.url}`);
console.log(`👥 Connections: ${config.connections}, Duration: ${config.duration}s`);

const instance = autocannon(config, (err, result) => {
  if (err) {
    console.error('❌ Autocannon error:', err);
    process.exit(1);
  }
  
  console.log('✅ Autocannon test completed!');
  console.log(`📊 Total requests: ${result.requests?.total || 0}`);
  console.log(`📈 Average RPS: ${result.requests?.average || 0}`);
  console.log(`⚡ Average latency: ${result.latency?.average || 0}ms`);
  console.log(`❌ Errors: ${result.errors || 0}`);
  
  if (result.requests?.total > 0) {
    console.log('🎉 Autocannon is working correctly!');
  } else {
    console.log('⚠️ No requests were sent - there might be an issue');
  }
  
  process.exit(0);
});

// Add event listeners for debugging
instance.on('tick', () => {
  console.log('📊 Tick event received');
});

instance.on('done', () => {
  console.log('✅ Done event received');
});

instance.on('error', (error) => {
  console.error('❌ Instance error:', error);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - stopping autocannon');
  instance.stop();
}, 30000); 