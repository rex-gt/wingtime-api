const http = require('http');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ id: 1 }))
}));

jest.mock('pg', () => {
  const mPool = {
    query: (text, params) => {
      const lt = (text || '').toLowerCase();

      // Auth middleware user lookup
      if (lt.includes('select id, member_number') && lt.includes('where id = $1')) {
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com', role: 'admin', is_active: true }] });
      }

      // Get single member by id
      if (lt.includes('select * from members where id = $1')) {
        const idRaw = params && params[0];
        const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
        if (id === 1) {
          return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com' }] });
        }
        return Promise.resolve({ rows: [] });
      }

      // List members
      if (lt.includes('select * from members order by')) {
        return Promise.resolve({ rows: [
          { id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com' },
          { id: 2, member_number: 'M-2', first_name: 'Bob', last_name: 'Jones', email: 'bob@example.com' }
        ] });
      }

      // Insert member
      if (lt.includes('insert into members')) {
        return Promise.resolve({ rows: [{ id: 2, member_number: params[0], first_name: params[1], last_name: params[2], email: params[3], phone: params[4] }] });
      }

      // Update member (admin: 7 params [fn,ln,email,phone,is_active,role,id]; member: 5 params [fn,ln,email,phone,id])
      if (lt.includes('update members')) {
        const id = params && (params[6] !== undefined ? params[6] : params[4]);
        return Promise.resolve({ rows: [{ id, member_number: 'M-1', first_name: params[0], last_name: params[1], email: params[2], phone: params[3], is_active: params[4] }] });
      }

      // Delete member
      if (lt.includes('delete from members')) {
        const idRaw = params && params[0];
        const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
        return Promise.resolve({ rows: [{ id, member_number: 'M-1', first_name: 'Deleted', last_name: 'User', email: 'deleted@example.com' }] });
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

describe('Members endpoint', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('POST /api/members creates a member', async () => {
    const payload = { member_number: 'M-100', first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', phone: '555-1234' };
    const res = await httpRequest(port, '/api/members', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('member_number', 'M-100');
    expect(res.body).toHaveProperty('email', 'alice@example.com');
  });

  test('GET /api/members returns list when authorized', async () => {
    const headers = { Authorization: 'Bearer faketoken' };
    const res = await httpRequest(port, '/api/members', 'GET', null, headers);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('member_number');
  });

  test('GET /api/members/:id returns a member when found', async () => {
    const headers = { Authorization: 'Bearer faketoken' };
    const res = await httpRequest(port, '/api/members/1', 'GET', null, headers);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('member_number');
  });

  test('PUT /api/members/:id updates a member', async () => {
    const payload = { first_name: 'AliceUpdated', last_name: 'Smith', email: 'aliceu@example.com', phone: '555-1111', is_active: true };
    const res = await httpRequest(port, '/api/members/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('first_name', 'AliceUpdated');
  });

  test('DELETE /api/members/:id deletes a member', async () => {
    const res = await httpRequest(port, '/api/members/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('member');
    expect(res.body.member).toHaveProperty('id', 1);
  });
});
