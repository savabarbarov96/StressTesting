const mongoose = require('mongoose');

// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not found, using default values');
}

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/loadforge';

console.log('Testing MongoDB connection...');
console.log('MongoDB URI:', mongoUri);

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Connection state:', mongoose.connection.readyState);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 MongoDB server is not running. Please start MongoDB:');
      console.error('   - Windows: net start MongoDB');
      console.error('   - macOS: brew services start mongodb/brew/mongodb-community');
      console.error('   - Linux: sudo systemctl start mongod');
    } else if (error.message.includes('authentication')) {
      console.error('💡 Authentication failed. Check your MongoDB credentials.');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Connection timeout. Check if MongoDB is accessible at:', mongoUri);
    }
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

testConnection(); 