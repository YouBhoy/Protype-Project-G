const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./database/pool');
const setupChatSocket = require('./sockets/chat.socket');
const conversationModel = require('./models/conversation.model');

async function bootstrap() {
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connection verified');
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ER_BAD_DB_ERROR') {
      console.warn('MySQL unavailable at startup; API will return 503 until credentials are fixed.');
    } else {
      console.warn('MySQL startup check failed:', error.message);
    }
  }

  // Ensure conversation schema exists
  try {
    await conversationModel.ensureSchema();
    console.log('Conversation schema ensured');
  } catch (err) {
    console.warn('Could not ensure conversation schema:', err.message || err);
  }

  // Create HTTP server and attach Socket.io
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins,
      credentials: true
    }
  });

  // Setup Socket.io event handlers
  setupChatSocket(io);

  httpServer.listen(env.port, () => {
    console.log(`SPARTAN-G API listening on port ${env.port}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});