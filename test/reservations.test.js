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
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com', role: 'member', is_active: true }] });
      }

      // Ownership check for update/delete
      if (lt.includes('select member_id from reservations where id = $1')) {
        const id = params && params[0];
        if (id === '1') {
          return Promise.resolve({ rows: [{ member_id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Conflict check
      if (lt.includes('select id from reservations')) {
        if (params && params[0] === 1 && params[1] === '2026-01-01T10:00:00Z') {
          return Promise.resolve({ rows: [{ id: 99 }] });
        }
        return Promise.resolve({ rows: [] });
      }
      // GET list
      if (lt.includes('select r.*') && !lt.includes('where r.id =')) {
        return Promise.resolve({ rows: [
          { id: 1, member_id: 1, aircraft_id: 2, start_time: '2026-02-01T10:00:00Z', end_time: '2026-02-01T11:00:00Z', status: 'booked', notes: 'Initial' }
        ] });
      }
      // GET by id
      if ((lt.includes('select r.*') && lt.includes('where r.id =')) && params && params[0] === '1') {
        return Promise.resolve({ rows: [{ id: 1, member_id: 1, aircraft_id: 2, start_time: '2026-02-01T10:00:00Z', end_time: '2026-02-01T11:00:00Z', status: 'booked', notes: 'Initial' }] });
      }
      // Insert reservation
      if (lt.includes('insert into reservations')) {
        return Promise.resolve({ rows: [{ id: 123, member_id: params[0], aircraft_id: params[1], start_time: params[2], end_time: params[3], notes: params[4] }] });
      }
      // Update reservation
      if (lt.includes('update reservations')) {
        const id = params && params[4];
        if (id === '1') {
          // Simulate updated reservation with all fields
          return Promise.resolve({ rows: [{
            id,
            member_id: 1,
            aircraft_id: 2,
            start_time: params[0],
            end_time: params[1],
            status: params[2],
            notes: params[3]
          }] });
        }
        return Promise.resolve({ rows: [] });
      }
      // Delete reservation
      if (lt.includes('delete from reservations')) {
        const id = params && params[0];
        if (id === '1') {
          return Promise.resolve({ rows: [{ id }] });
        }
        return Promise.resolve({ rows: [] });
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

describe('Reservations endpoint', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('GET /api/reservations returns a list of reservations', async () => {
    const res = await httpRequest(port, '/api/reservations');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
  });

  test('GET /api/reservations/:id returns a reservation', async () => {
    const res = await httpRequest(port, '/api/reservations/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('member_id', 1);
  });

  test('GET /api/reservations/:id returns 404 if not found', async () => {
    const res = await httpRequest(port, '/api/reservations/999');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/reservations creates a new reservation', async () => {
    const payload = {
      member_id: 2,
      aircraft_id: 3,
      start_time: '2026-04-01T09:00:00Z',
      end_time: '2026-04-01T10:00:00Z',
      notes: 'Test reservation'
    };
    const res = await httpRequest(port, '/api/reservations', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('aircraft_id', 3);
    expect(res.body).toHaveProperty('notes', 'Test reservation');
  });

  test('POST /api/reservations returns 409 on conflict', async () => {
    const payload = { member_id: 1, aircraft_id: 1, start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:00:00Z' };
    const res = await httpRequest(port, '/api/reservations', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  test('PUT /api/reservations/:id updates a reservation', async () => {
    const payload = {
      start_time: '2026-05-01T09:00:00Z',
      end_time: '2026-05-01T10:00:00Z',
      status: 'booked',
      notes: 'Updated reservation'
    };
    const res = await httpRequest(port, '/api/reservations/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', '1');
    expect(res.body).toHaveProperty('notes', 'Updated reservation');
  });

  test('PUT /api/reservations/:id returns 404 if not found', async () => {
    const payload = {
      start_time: '2026-05-01T09:00:00Z',
      end_time: '2026-05-01T10:00:00Z',
      status: 'booked',
      notes: 'Updated reservation'
    };
    const res = await httpRequest(port, '/api/reservations/2', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test("DELETE /api/reservations/:id deletes a reservation", async () => {
    const res = await httpRequest(port, '/api/reservations/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('reservation');
    expect(res.body.reservation).toHaveProperty('id', '1');
  });
});
