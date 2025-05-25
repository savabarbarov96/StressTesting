const { io } = require('socket.io-client');

console.log('🔌 Testing WebSocket connection...');

// Test connection to WebSocket server
const socket = io('http://localhost:3002/runs', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server!');
  console.log('Socket ID:', socket.id);
  
  // Test joining a room
  socket.emit('join-run', 'test-run-123');
  console.log('🏠 Joined test room: test-run-123');
  
  // Disconnect after 5 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_error', (error) => {
  console.error('❌ Reconnection error:', error.message);
});

// Listen for test events
socket.on('progress', (data) => {
  console.log('📊 Received progress:', data);
});

socket.on('logLine', (data) => {
  console.log('📝 Received log:', data);
});

socket.on('runCompleted', (data) => {
  console.log('✅ Run completed:', data);
});

socket.on('runFailed', (data) => {
  console.log('❌ Run failed:', data);
});

socket.on('runStopped', (data) => {
  console.log('🛑 Run stopped:', data);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('❌ Connection timeout');
  process.exit(1);
}, 10000); 