require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts. Try again later.' } }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 300 }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api', require('./routes/api'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', db: 'mongodb', time: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 MFN Backend running on http://localhost:${PORT}`);
    console.log(`📦 Database: MongoDB`);
    console.log(`🌍 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
};

start();
