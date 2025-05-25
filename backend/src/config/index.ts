// Load environment variables from .env file
try {
  const path = require('path');
  const fs = require('fs');
  
  // Try different possible paths for .env file
  const possiblePaths = [
    path.join(__dirname, '../../.env'),           // backend/.env (from dist/config)
    path.join(__dirname, '../../../.env'),        // root .env (from dist/config)
    path.join(process.cwd(), 'backend/.env'),     // backend/.env (from project root)
    path.join(process.cwd(), '.env'),             // root .env (from project root)
  ];
  
  let envLoaded = false;
  for (const envPath of possiblePaths) {
    console.log(`🔍 Checking for .env at: ${envPath}`);
    if (fs.existsSync(envPath)) {
      console.log(`📁 Found .env file at: ${envPath}`);
      require('dotenv').config({ path: envPath });
      console.log('✅ Environment variables loaded successfully');
      envLoaded = true;
      break;
    }
  }
  
  if (!envLoaded) {
    console.log('⚠️ No .env file found, using default dotenv behavior');
    require('dotenv').config();
  }
} catch (error) {
  console.log('⚠️ dotenv error:', error instanceof Error ? error.message : String(error));
  console.log('⚠️ Continuing with process.env directly');
}

// Debug environment variables
console.log('🔍 Debug environment variables:');
console.log('  process.env.MONGO_URI:', process.env.MONGO_URI);
console.log('  process.env.PORT:', process.env.PORT);

export const config = {
  port: process.env.PORT || 3001,
  websocketPort: process.env.WEBSOCKET_PORT || 3002,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/loadforge',
  maxWorkers: parseInt(process.env.MAX_WORKERS || '4'),
  maxSockets: parseInt(process.env.MAX_SOCKETS || '1000'),
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Debug configuration
console.log('🔧 Configuration loaded:');
console.log('  PORT:', config.port);
console.log('  WEBSOCKET_PORT:', config.websocketPort);
console.log('  MONGO_URI:', config.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
console.log('  MAX_WORKERS:', config.maxWorkers);
console.log('  MAX_SOCKETS:', config.maxSockets);
console.log('  NODE_ENV:', config.nodeEnv); 