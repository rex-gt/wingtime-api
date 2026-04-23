const http = require('http');

let mockUserRole = 'admin';
let mockUserId = 1;

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(() => ({ id: mockUserId }))
}));

jest.mock('pg', () => {
  const mPool = {
    query: (text, params) => {
      const lt = (text || '').toLowerCase();
      // Auth middleware user lookup
      if (lt.includes('select id, member_number') && lt.includes('where id = $1')) {
        return Promise.resolve({ rows: [{ id: mockUserId, role: mockUserRole, is_active: true }] });
      }
      // API Key Auth lookup
      if (lt.includes('select ak.*') && lt.includes('where ak.key_value = $1')) {
        if (params[0] === 'valid-key') {
          return Promise.resolve({ rows: [{ id: 1, key_value: 'valid-key', created_by: 1, role: 'admin', is_active: true, name: 'Test Key' }] });
        }
        return Promise.resolve({ rows: [] });
      }
      // CRUD mocks
      if (lt.includes('select ak.*') && !lt.includes('where ak.key_value =')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'My Key', key_value: 'abc' }] });
      }
      if (lt.includes('insert into api_keys')) {
        return Promise.resolve({ rows: [{ id: 5, name: params[1], key_value: params[0] }] });
      }
      if (lt.includes('delete from api_keys')) {
        return Promise.resolve({ rows: [{ id: params[0] }] });
      }
      // Member lookup for specific tests
      if (lt.includes('select * from members')) {
        return Promise.resolve({ rows: [{ id: 1, first_name: 'Admin' }] });
      }
      return Promise.resolve({ rows: [] });
    }
  };
  return { Pool: jest.fn(() => mPool), types: { setTypeParser: jest.fn() } };
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

describe('API Key endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('GET /api/api-keys returns list (Admin)', async () => {
    mockUserRole = 'admin';
    const res = await httpRequest(port, '/api/api-keys', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/api-keys creates key (Admin)', async () => {
    mockUserRole = 'admin';
    const payload = { name: 'External App' };
    const res = await httpRequest(port, '/api/api-keys', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('name', 'External App');
    expect(res.body).toHaveProperty('key_value');
  });

  test('GET /api/members succeeds with valid X-API-Key', async () => {
    // No Authorization header, only X-API-Key
    const res = await httpRequest(port, '/api/members', 'GET', null, { 'X-API-Key': 'valid-key' });
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/members fails with invalid X-API-Key', async () => {
    const res = await httpRequest(port, '/api/members', 'GET', null, { 'X-API-Key': 'invalid-key' });
    expect(res.statusCode).toBe(401);
  });
});
