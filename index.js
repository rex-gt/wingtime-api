require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

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
