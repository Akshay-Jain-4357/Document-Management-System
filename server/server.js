require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const versionRoutes = require('./routes/versions');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Security ----------
app.use(helmet());

// CORS — allow localhost (dev) + Vercel frontend (prod)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://document-management-system-nine-beryl.vercel.app',
];
// If a FRONTEND_URL env var is set (e.g. your Vercel URL), add it
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ---------- Rate Limiting ----------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', limiter);

// ---------- Body Parsing ----------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (Render uses this to know your app is alive)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'OfficeGit API is running', docs: '/api/health' });
});

// ---------- API Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/versions', versionRoutes);

// ---------- 404 Handler ----------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File size exceeds ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1048576)}MB limit` });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.message && err.message.includes('files are allowed')) {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} already exists` });
  }

  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ---------- Start Server ----------
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 OfficeGit API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

module.exports = app;
