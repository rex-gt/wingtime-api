const http = require('http');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(() => ({ id: 1 }))
}));

jest.mock('pg', () => {
  const mPool = {
    query: (text, params) => {
      const lt = (text || '').toLowerCase();
      if (lt.includes('select id from members where email')) {
        // simulate no existing user on register, and existing user for login
        if (params && params[0] === 'exists@example.com') {
          return Promise.resolve({ rows: [{ id: 5, email: 'exists@example.com', password: '$2a$10$hash', role: 'pilot', first_name: 'Ex', last_name: 'Ist' }] });
        }
        return Promise.resolve({ rows: [] });
      }
      if (lt.includes('insert into members')) {
        return Promise.resolve({ rows: [{ id: 10, member_number: params[0], first_name: params[1], last_name: params[2], email: params[3] }] });
      }
      if (lt.includes('select id, member_number') && lt.includes('where id = $1')) {
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com', role: 'admin', is_active: true }] });
      }
      return Promise.resolve({ rows: [] });
    }
  };
  return { Pool: jest.fn(() => mPool) };
});

const app = require('../src/index');

function httpRequest(port, path, method = 'GET', data = null, headers = {}) {
  const options = { port, path, method, host: '127.0.0.1', headers: Object.assign({ 'Content-Type': 'application/json' }, headers) };
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

describe('Auth endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('POST /api/users/register creates a user', async () => {
    const payload = { member_number: 'M-200', first_name: 'New', last_name: 'User', email: 'new@example.com', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', 'new@example.com');
    expect(res.body).toHaveProperty('token', 'signed-token');
  });

  test('POST /api/users/login fails with invalid creds', async () => {
    const payload = { email: 'noone@example.com', password: 'wrong' };
    const res = await httpRequest(port, '/api/users/login', 'POST', payload);
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  test('GET /api/users/profile returns user profile when authenticated', async () => {
    const res = await httpRequest(port, '/api/users/profile', 'GET', null, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('member_number', 'M-1');
    expect(res.body).toHaveProperty('first_name', 'Auth');
    expect(res.body).toHaveProperty('email', 'auth@example.com');
  });

  test('GET /api/users/profile fails without authentication', async () => {
    const res = await httpRequest(port, '/api/users/profile', 'GET');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message');
  });
});
