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
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com', role: 'member', is_active: true }] });
      }

      // Get all flight logs
      if (lt.includes('select fl.*,') && !params) {
        return Promise.resolve({ rows: [{ id: 77, reservation_id: 1, member_id: 1, aircraft_id: 2, tach_end: 120 }] });
      }
      // Get flight log by id
      if (lt.includes('select fl.*,') && params && params[0] === '77') {
        return Promise.resolve({ rows: [{ id: 77, reservation_id: 1, member_id: 1, aircraft_id: 2, tach_end: 120 }] });
      }
      // Get flight log by id - not found
      if (lt.includes('select fl.*,') && params && params[0] === '9999') {
        return Promise.resolve({ rows: [] });
      }
      // Insert flight log
      if (lt.includes('insert into flight_logs')) {
        return Promise.resolve({ rows: [{ id: 77, reservation_id: params[0], member_id: params[1], aircraft_id: params[2], tach_end: params[4] }] });
      }
      // Update flight log
      if (lt.includes('update flight_logs')) {
        const id = params && params[5]; // id is the 6th parameter
        if (id === '77') {
          return Promise.resolve({ rows: [{ id: 77, reservation_id: 1, member_id: 1, aircraft_id: 2, tach_start: params[0], tach_end: params[1], flight_date: params[2], departure_time: params[3], arrival_time: params[4] }] });
        }
        return Promise.resolve({ rows: [] });
      }
      // Update aircraft tach
      if (lt.includes('update aircraft set current_tach_hours')) {
        return Promise.resolve({ rows: [] });
      }
      // Delete flight log
      if (lt.includes('delete from flight_logs')) {
        const id = params && params[0];
        if (id === '77') {
          return Promise.resolve({ rows: [{ id: 77, reservation_id: 1, member_id: 1, aircraft_id: 2, tach_end: 120 }] });
        }
        return Promise.resolve({ rows: [] });
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

describe('Flight logs endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('GET /api/flight-logs returns a list of flight logs', async () => {
    const res = await httpRequest(port, '/api/flight-logs', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
      
  test('GET /api/flight-logs/:id returns a flight log', async () => {
    const res = await httpRequest(port, '/api/flight-logs/77', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 77);
    expect(res.body).toHaveProperty('tach_end', 120);
  });

  test('GET /api/flight-logs/:id returns 404 when not found', async () => {
    const res = await httpRequest(port, '/api/flight-logs/9999', 'GET', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/flight-logs creates a flight log and updates aircraft tach', async () => {
    const payload = { reservation_id: 1, member_id: 1, aircraft_id: 2, tach_start: 100, tach_end: 110, flight_date: '2026-02-02', departure_time: '10:00', arrival_time: '11:00' };
    const res = await httpRequest(port, '/api/flight-logs', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('tach_end', 110);
  });

  test('PUT /api/flight-logs/:id updates a flight log and aircraft tach', async () => {
    const payload = { tach_start: 110, tach_end: 120, flight_date: '2026-02-03', departure_time: '12:00', arrival_time: '13:00' };
    const res = await httpRequest(port, '/api/flight-logs/77', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 77);
    expect(res.body).toHaveProperty('tach_end', 120);
  });
  
  test('PUT /api/flight-logs/:id returns 404 when not found', async () => {
    const payload = { tach_start: 110, tach_end: 120, flight_date: '2026-02-03', departure_time: '12:00', arrival_time: '13:00' };
    const res = await httpRequest(port, '/api/flight-logs/9999', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('DELETE /api/flight-logs/:id deletes a flight log', async () => {
    const res = await httpRequest(port, '/api/flight-logs/77', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('flight_log');
    expect(res.body.flight_log).toHaveProperty('id', 77);
  });

  test('DELETE /api/flight-logs/:id returns 404 when not found', async () => {
    const res = await httpRequest(port, '/api/flight-logs/9999', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
