const http = require('http');

let mockUserRole = 'member';
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
      if (lt.includes('select s.*') && !lt.includes('where s.id =')) {
        return Promise.resolve({ rows: [{ id: 1, aircraft_id: 1, severity: 'Low', description: 'Radio static', status: 'open' }] });
      }
      if (lt.includes('select s.*') && lt.includes('where s.id = $1')) {
        return Promise.resolve({ rows: [{ id: params[0], aircraft_id: 1, severity: 'Low', description: 'Radio static', status: 'open' }] });
      }
      if (lt.includes('select c.*')) {
        return Promise.resolve({ rows: [{ id: 1, squawk_id: 1, comment: 'I also heard it' }] });
      }
      if (lt.includes('insert into squawks')) {
        return Promise.resolve({ rows: [{ id: 10, description: params[2] }] });
      }
      if (lt.includes('insert into squawk_comments')) {
        return Promise.resolve({ rows: [{ id: 20, comment: params[2] }] });
      }
      if (lt.includes('select id from squawks where id = $1')) {
        return Promise.resolve({ rows: [{ id: params[0] }] });
      }
      if (lt.includes('update squawks set status = \'closed\'')) {
        return Promise.resolve({ rows: [{ id: params[0], status: 'closed' }] });
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

describe('Squawk endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('GET /api/squawks returns list', async () => {
    const res = await httpRequest(port, '/api/squawks', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/squawks creates squawk', async () => {
    const payload = { aircraft_id: 1, severity: 'Low', description: 'Bumpy seat', observed_date: '2026-03-01' };
    const res = await httpRequest(port, '/api/squawks', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('description', 'Bumpy seat');
  });

  test('POST /api/squawks/:id/comments adds comment', async () => {
    const payload = { comment: 'Confirmed' };
    const res = await httpRequest(port, '/api/squawks/1/comments', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('comment', 'Confirmed');
  });

  test('PUT /api/squawks/:id/close fails for Member (403)', async () => {
    mockUserRole = 'member';
    const res = await httpRequest(port, '/api/squawks/1/close', 'PUT', {}, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('PUT /api/squawks/:id/close succeeds for Operator', async () => {
    mockUserRole = 'operator';
    const res = await httpRequest(port, '/api/squawks/1/close', 'PUT', {}, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'closed');
  });
});
