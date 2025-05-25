# LoadForge Backend Setup

## Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# LoadForge Backend Configuration

# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
# For local MongoDB instance:
MONGO_URI=mongodb://localhost:27017/loadforge

# For MongoDB Atlas (cloud):
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/loadforge?retryWrites=true&w=majority

# Load Testing Configuration
MAX_WORKERS=4
MAX_SOCKETS=1000
```

## MongoDB Setup

### Option 1: Local MongoDB
1. Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
2. Start MongoDB service:
   - Windows: `net start MongoDB` or start MongoDB Compass
   - macOS: `brew services start mongodb/brew/mongodb-community`
   - Linux: `sudo systemctl start mongod`

### Option 2: MongoDB Atlas (Cloud)
1. Create a free account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Get the connection string and update MONGO_URI in your .env file

## Starting the Server

1. Install dependencies: `npm install`
2. Create your `.env` file with the configuration above
3. Start the development server: `npm run dev`

## Troubleshooting

- **Connection Error**: Make sure MongoDB is running and accessible
- **Port in use**: Change the PORT in .env file
- **Permission denied**: Make sure you have proper MongoDB permissions 