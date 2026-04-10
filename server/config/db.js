const mongoose = require('mongoose');

let mongod = null;

async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    // DEV ONLY: Use in-memory MongoDB when no MONGO_URI is set
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log('📦 Using ephemeral memory MongoDB (Data resets on restart)');
    } catch (err) {
      console.error('❌ mongodb-memory-server not available. Set MONGO_URI in .env');
      process.exit(1);
    }
  } else {
    console.log('🌐 Connecting to MongoDB Atlas...');
  }

  try {
    const opts = {};
    // Add TLS for Atlas connections
    if (uri.includes('mongodb+srv') || uri.includes('ssl=true')) {
      opts.tls = true;
      opts.tlsAllowInvalidCertificates = false;
    }
    opts.serverSelectionTimeoutMS = 10000;
    opts.connectTimeoutMS = 10000;

    await mongoose.connect(uri, opts);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Hint: If using Atlas, whitelist your IP at Atlas → Network Access → 0.0.0.0/0');
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
