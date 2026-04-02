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
        return Promise.resolve({ rows: [{ id: mockUserId, member_number: 'M-1', role: mockUserRole, is_active: true }] });
      }
      if (lt.includes('select m.*') && !lt.includes('where m.id =')) {
        return Promise.resolve({ rows: [{ id: 1, aircraft_id: 1, title: 'Annual Inspection', status: 'open' }] });
      }
      if (lt.includes('select m.*') && lt.includes('where m.id = $1')) {
        return Promise.resolve({ rows: [{ id: params[0], aircraft_id: 1, title: 'Annual Inspection', status: 'open' }] });
      }
      if (lt.includes('insert into maintenance_items')) {
        return Promise.resolve({ rows: [{ id: 10, title: params[1], aircraft_id: params[0], created_by: params[3] }] });
      }
      if (lt.includes('update maintenance_items')) {
        return Promise.resolve({ rows: [{ id: params[5], title: params[0] || 'Updated' }] });
      }
      if (lt.includes('delete from maintenance_items')) {
        return Promise.resolve({ rows: [{ id: params[0] }] });
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

describe('Maintenance endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('GET /api/maintenance returns list', async () => {
    const res = await httpRequest(port, '/api/maintenance', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/maintenance creates item (Admin)', async () => {
    mockUserRole = 'admin';
    const payload = { aircraft_id: 1, title: 'Check Oil', status: 'open' };
    const res = await httpRequest(port, '/api/maintenance', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('title', 'Check Oil');
  });

  test('POST /api/maintenance creates item (Operator)', async () => {
    mockUserRole = 'operator';
    const payload = { aircraft_id: 1, title: 'Check Fuel', status: 'open' };
    const res = await httpRequest(port, '/api/maintenance', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
  });

  test('POST /api/maintenance fails for Member (403)', async () => {
    mockUserRole = 'member';
    const payload = { aircraft_id: 1, title: 'Check Tires', status: 'open' };
    const res = await httpRequest(port, '/api/maintenance', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('PUT /api/maintenance/:id updates item (Operator)', async () => {
    mockUserRole = 'operator';
    const payload = { title: 'Updated Title' };
    const res = await httpRequest(port, '/api/maintenance/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  test('DELETE /api/maintenance/:id fails for Operator (403)', async () => {
    mockUserRole = 'operator';
    const res = await httpRequest(port, '/api/maintenance/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('DELETE /api/maintenance/:id succeeds for Admin', async () => {
    mockUserRole = 'admin';
    const res = await httpRequest(port, '/api/maintenance/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });
});
