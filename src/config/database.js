const { Pool, types } = require('pg');
require('dotenv').config();

// TIMESTAMP WITHOUT TIME ZONE (OID 1114) — this app always writes UTC values,
// but pg interprets bare timestamp strings as local time, shifting dates by the
// server's UTC offset on the way out. Append 'Z' so it is parsed as UTC.
types.setTypeParser(1114, (val) => {
  if (!val) return null;
  return new Date(val.replace(' ', 'T') + 'Z');
});

// Railway provides DATABASE_URL, which should be used in production
// For local development, fall back to individual env variables
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        // Production (Railway) - use connection string
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        // Local development - use individual parameters
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'flying_club',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432
      }
);

// Test the database connection (guarded for test environments where `pg` may be mocked)
if (typeof pool.on === 'function') {
  pool.on('connect', () => {
    console.log('✅ Database connected successfully');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
  });
}

// Test connection on startup if available
if (typeof pool.connect === 'function') {
  try {
    pool.connect((err, client, release) => {
      if (err) {
        console.error('❌ Error acquiring client:', err.stack);
      } else {
        console.log('✅ Database pool initialized');
        if (typeof release === 'function') release();
      }
    });
  } catch (err) {
    // Some test mocks may not support connect; ignore in that case
  }
}

module.exports = pool;