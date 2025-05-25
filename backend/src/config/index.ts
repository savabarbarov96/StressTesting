// Load environment variables from .env file
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  console.log('✅ Environment variables loaded from .env');
} catch (error) {
  // dotenv not installed, continue with process.env
  console.log('⚠️ dotenv not found, using process.env directly');
}

export const config = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/loadforge',
  maxWorkers: parseInt(process.env.MAX_WORKERS || '4'),
  maxSockets: parseInt(process.env.MAX_SOCKETS || '1000'),
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Debug configuration
console.log('🔧 Configuration loaded:');
console.log('  PORT:', config.port);
console.log('  MONGO_URI:', config.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
console.log('  MAX_WORKERS:', config.maxWorkers);
console.log('  MAX_SOCKETS:', config.maxSockets);
console.log('  NODE_ENV:', config.nodeEnv); 