const autocannon = require('autocannon');

// Simulate the exact configuration from the worker
function translateLoadProfile(loadProfile) {
  const { rampUp, users, steady, rampDown } = loadProfile;
  
  // Validate load profile
  if (!users || users <= 0) {
    throw new Error('Invalid number of users');
  }
  
  if (!steady || steady <= 0) {
    throw new Error('Invalid steady duration');
  }
  
  const totalDuration = (rampUp || 0) + steady + (rampDown || 0);
  
  return {
    connections: Math.min(users, 1000), // Cap connections to prevent system overload
    duration: totalDuration,
    // Use a more reasonable request calculation
    amount: undefined // Let autocannon determine based on duration and connections
  };
}

// Test the exact configuration from the worker
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

console.log('🧪 Testing exact worker autocannon configuration...');
console.log('📋 Original spec:', JSON.stringify(testSpec, null, 2));

const autocannonConfig = translateLoadProfile(testSpec.loadProfile);
console.log('🔧 Translated config:', JSON.stringify(autocannonConfig, null, 2));

// Prepare request configuration exactly like the worker
const requestConfig = {
  url: testSpec.request.url,
  method: testSpec.request.method.toUpperCase(),
  connections: autocannonConfig.connections,
  duration: autocannonConfig.duration,
  headers: testSpec.request.headers || {},
  // Enable better progress tracking
  renderProgressBar: false,
  renderLatencyTable: false,
  renderResultsTable: false,
};

console.log('🎯 Final autocannon config:', JSON.stringify(requestConfig, null, 2));

// Test this exact configuration
console.log('🚀 Starting autocannon with worker configuration...');

const instance = autocannon(requestConfig, (err, result) => {
  if (err) {
    console.error('❌ Autocannon error:', err);
    process.exit(1);
  }
  
  console.log('✅ Autocannon completed!');
  console.log('📊 Full result:', JSON.stringify(result, null, 2));
  
  if (result.requests?.total > 0) {
    console.log('🎉 Requests were sent successfully!');
  } else {
    console.log('❌ No requests were sent - configuration issue detected!');
  }
  
  process.exit(0);
});

// Add event listeners for debugging
instance.on('tick', () => {
  console.log('📊 Tick event - checking instance state...');
  if (instance.opts) {
    console.log('📈 Current stats:', {
      requests: instance.opts.requests,
      errors: instance.opts.errors,
      latency: instance.opts.latency
    });
  }
});

instance.on('done', () => {
  console.log('✅ Done event received');
});

instance.on('error', (error) => {
  console.error('❌ Instance error:', error);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - stopping autocannon');
  instance.stop();
}, 15000); 