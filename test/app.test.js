const http = require('http');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(() => ({ id: 1 }))
}));

// Mock 'pg' so tests don't require a real database
jest.mock('pg', () => {
  const mPool = {
    query: (text, params) => {
      const lt = (text || '').toLowerCase();
      if (lt.includes('select id, member_number') && lt.includes('where id = $1')) {
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com', role: 'admin', is_active: true }] });
      }
      if (text && text.toLowerCase().includes('from aircraft')) {
        return Promise.resolve({ rows: [{ id: 1, tail_number: 'N12345', make: 'Cessna', model: '172' }] });
      }
      if (text && text.toLowerCase().includes('from members where id = $1')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    }
  };
  return { Pool: jest.fn(() => mPool), types: { setTypeParser: jest.fn() } };
});

const app = require('../src/index');

function httpGet(port, path, headers = {}) {
  const options = { port, path, method: 'GET', host: '127.0.0.1', headers };
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let body = null;
        try { body = JSON.parse(data); } catch (e) { body = data; }
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('API smoke tests', () => {
  let server;
  let port;

  beforeAll(() => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  test('GET /api/aircraft returns 200 and an array', async () => {
    const res = await httpGet(port, '/api/aircraft', { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('tail_number');
  });

  test('GET /api/members/:id returns 404 when not found', async () => {
    const res = await httpGet(port, '/api/members/9999', { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
