const path = require('path');
require('dotenv').config(); // Load .env first
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local'), override: true }); // Override with .env.local

// Force IPv4 DNS resolution - Railway doesn't support IPv6 outbound
const dns = require('dns');
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    options = options || {};
    options.family = 4;
    return originalLookup(hostname, options, callback);
};

const fs = require('fs');
const http = require('http');
const https = require('https');
const cron = require('node-cron');
const app = require('./src/app');
const { processReminders } = require('./src/controllers/reservationsController');

const PORT = process.env.PORT || 3000;

// Schedule reminders check every hour (only in staging/production)
if (process.env.NODE_ENV !== 'development') {
  cron.schedule('0 * * * *', () => {
    console.log('[Scheduler] Running reservation reminders job...');
    processReminders();
  });
} else {
  console.log('[Scheduler] Reminders job is disabled in development mode.');
}

if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  let sslOptions;
  try {
    sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
  } catch (err) {
    console.error(`Failed to load SSL certificate files: ${err.message}`);
    process.exit(1);
  }
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Tower, we are clear for takeoff on HTTPS port ${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`Tower, we are clear for takeoff on port ${PORT}`);
  });
}
