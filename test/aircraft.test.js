const http = require('http');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
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
      if (lt.includes('select * from aircraft order by')) {
        return Promise.resolve({ rows: [ { id: 1, tail_number: 'N100', make: 'Piper', model: 'PA-28' } ] });
      }
      if (lt.includes('where a.is_available') || lt.includes('left join reservations') || lt.includes('is_available_for_timeframe') || lt.includes('from aircraft a')) {
        return Promise.resolve({ rows: [ { id: 1, tail_number: 'N100', make: 'Piper', model: 'PA-28', is_available_for_timeframe: true } ] });
      }
      if (lt.includes('insert into aircraft')) {
        return Promise.resolve({ rows: [{ id: 5, tail_number: params[0], make: params[1], model: params[2] }] });
      }
      if (lt.includes('select * from aircraft where id = $1')) {
        const idRaw = params && params[0];
        const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
        return Promise.resolve({ rows: [{ id, tail_number: 'N100', make: 'Piper', model: 'PA-28' }] });
      }
      if (lt.includes('update aircraft')) {
        const idRaw = params && params[5];
        const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
        return Promise.resolve({ rows: [{ id, tail_number: 'N100', make: params[0], model: params[1] }] });
      }
      if (lt.includes('delete from aircraft')) {
        const idRaw = params && params[0];
        const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
        return Promise.resolve({ rows: [{ id }] });
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

describe('Aircraft endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('GET /api/aircraft returns list', async () => {
    const res = await httpRequest(port, '/api/aircraft', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('tail_number');
  });

  test('POST /api/aircraft creates aircraft', async () => {
    const payload = { tail_number: 'N200', make: 'Cessna', model: '172', year: 2000, hourly_rate: 100 };
    const res = await httpRequest(port, '/api/aircraft', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('tail_number', 'N200');
  });

  test('GET /api/aircraft/:id returns aircraft', async () => {
    const res = await httpRequest(port, '/api/aircraft/1', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('tail_number');
  });

  test('PUT /api/aircraft/:id updates aircraft', async () => {
    const payload = { make: 'Beech', model: 'Bonanza', year: 1999, hourly_rate: 150, current_tach_hours: 1200, is_available: true };
    const res = await httpRequest(port, '/api/aircraft/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('make', 'Beech');
  });

  test('DELETE /api/aircraft/:id deletes aircraft', async () => {
    const res = await httpRequest(port, '/api/aircraft/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('aircraft');
    expect(res.body.aircraft).toHaveProperty('id', 1);
  });

  test('GET /api/aircraft/availability returns availability', async () => {
    const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-02-25T10:00:00Z&end_time=2026-02-25T12:00:00Z', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    const body = Array.isArray(res.body) ? res.body : (res.body ? [res.body] : []);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('is_available_for_timeframe');
  });
});
