const app = require('./app');
const env = require('./config/env');
const { pool } = require('./database/pool');

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

  app.listen(env.port, () => {
    console.log(`SPARTAN-G API listening on port ${env.port}`);
  });
}

bootstrap();