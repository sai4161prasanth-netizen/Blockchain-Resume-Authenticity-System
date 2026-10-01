require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const certRoutes = require('./routes/certRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set before starting the API');
}

// Middleware
app.set('trust proxy', 1);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'not_ready' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certs', certRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  });
