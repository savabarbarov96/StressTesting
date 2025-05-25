# LoadForge MVP

LoadForge is a developer-first, GUI-enabled load testing platform built with Node.js, React, and MongoDB. It enables QA engineers and backend developers to simulate heavy traffic to an API or service, define custom request payloads, and analyze system behavior under load.

## Features Implemented

✅ **Backend - High-Volume Load Engine**
- Core dependencies installed (Fastify, Socket.io, Autocannon, Mongoose, etc.)
- Environment configuration
- Mongoose models (Spec, Run)
- GridFS helper for file attachments
- Worker script for load testing with Autocannon
- RunManager class for orchestrating test runs
- Complete API routes (specs, runs, attachments)
- WebSocket integration for real-time updates

✅ **Frontend - Spec Builder & Live Console**
- React + TypeScript + Material-UI setup
- Axios API service with error handling
- Socket.io service for real-time communication
- Spec List page with CRUD operations
- Spec Editor page with form validation
- Run Dashboard with real-time metrics and console logs
- Routing setup with React Router

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd StressTesting
```

2. **Setup Backend**
```bash
cd backend
npm install
npm run build
npm start
```

3. **Setup Frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

4. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- WebSocket Server: http://localhost:3002

### Environment Variables

The backend uses these default values (can be overridden with environment variables):
- `PORT=3001` - Main backend API server port
- `WEBSOCKET_PORT=3002` - WebSocket server port (separate from API for load testing)
- `MONGO_URI=mongodb://localhost:27017/loadforge`
- `MAX_WORKERS=4`
- `MAX_SOCKETS=1000`
- `NODE_ENV=development`

The frontend can be configured with these environment variables:
- `VITE_BACKEND_URL=http://localhost:3001` - Backend API URL
- `VITE_WEBSOCKET_URL=http://localhost:3002` - WebSocket server URL

## Usage

1. **Create a Test Specification**
   - Navigate to "Test Specs" in the UI
   - Click "New Test Spec"
   - Configure your HTTP request (method, URL, body, etc.)
   - Set load profile (users, duration, ramp times)
   - Save the specification

2. **Run a Load Test**
   - From the specs list, click the play button
   - Monitor real-time metrics in the Run Dashboard
   - View console logs and performance metrics
   - Stop the test manually if needed

3. **View Results**
   - Real-time metrics: RPS, latency, success rate
   - Console logs with timestamps
   - Download CSV reports (when implemented)

## Architecture

### Backend
- **Fastify** - High-performance web framework
- **Worker Threads** - Isolated load test execution
- **Autocannon** - HTTP benchmarking tool
- **Socket.io** - Real-time communication (runs on separate port to avoid conflicts during load testing)
- **MongoDB + GridFS** - Data storage and file handling

### Frontend
- **React 18** - Modern UI framework
- **Material-UI** - Component library
- **Socket.io-client** - Real-time updates
- **Formik + Yup** - Form handling and validation
- **Axios** - HTTP client

## Development

### Backend Development
```bash
cd backend
npm run dev    # Start with ts-node
npm run watch  # Start with nodemon
```

### Frontend Development
```bash
cd frontend
npm run dev    # Start Vite dev server
```

## Next Steps

- [ ] File attachment flow implementation
- [ ] Performance testing validation
- [ ] Enhanced error handling
- [ ] Load profile visualization with Recharts
- [ ] CSV export functionality
- [ ] Scheduling system (optional)

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI, Socket.io-client
- **Backend**: Node.js 18, Fastify, Worker Threads, Autocannon, Socket.io
- **Database**: MongoDB + GridFS
- **Build Tools**: Vite, TypeScript

LoadForge brings together developer-centric tooling, GUI simplicity, and real-time observability to enable fast and repeatable load testing.

