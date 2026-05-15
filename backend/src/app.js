const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facilitatorRoutes = require('./routes/facilitatorRoutes');
const publicRoutes = require('./routes/publicRoutes');
const messagesRoutes = require('./routes/messagesRoutes');

const app = express();

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (env.clientOrigins.includes(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SPARTAN-G API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/facilitator', facilitatorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/messages', messagesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;