const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./database/pool');
const setupChatSocket = require('./sockets/chat.socket');

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

  // Create HTTP server and attach Socket.io
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true
    }
  });

  // Setup Socket.io event handlers
  setupChatSocket(io);

  httpServer.listen(env.port, () => {
    console.log(`SPARTAN-G API listening on port ${env.port}`);
  });
}

bootstrap();