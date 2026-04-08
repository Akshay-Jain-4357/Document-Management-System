const mongoose = require('mongoose');
const path = require('path');

let mongod = null;

async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    
    // We remove the explicit hardcoded Windows path to prevent EPERM lock errors 
    // when 'node --watch' restarts the server faster than MongoDB can clean up lockfiles.
    mongod = await MongoMemoryServer.create();
    
    uri = mongod.getUri();
    console.log('📦 Using ephemeral memory MongoDB (Data resets on restart)');
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

module.exports = { connectDB, disconnectDB };
