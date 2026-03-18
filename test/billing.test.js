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
      
      // GET /api/billing - list all billing records
      if (lt.includes('select br.*') && !lt.includes('where member_id') && !lt.includes('delete')) {
        return Promise.resolve({ rows: [
          { id: 1, member_id: 1, flight_log_id: 1, aircraft_id: 2, tach_hours: 10, hourly_rate: 150, amount: 1500, is_paid: false, billing_date: '2026-02-01', member_name: 'John Doe', member_email: 'john@example.com', tail_number: 'N123' }
        ] });
      }
      
      // GET /api/billing/summary/:member_id
      if (lt.includes('count(*) as total_flights')) {
        if (params && (params[0] === 1 || params[0] === '1')) {
          return Promise.resolve({ rows: [{
            total_flights: '2',
            total_hours: '20',
            total_amount: '3000',
            paid_amount: '1500',
            unpaid_amount: '1500'
          }] });
        }
        return Promise.resolve({ rows: [{}] });
      }
      
      // POST /api/billing/generate - get flight log
      if (lt.includes('select fl.*') && lt.includes('where fl.id')) {
        if (params && params[0] === 1) {
          return Promise.resolve({ rows: [{
            id: 1,
            member_id: 1,
            aircraft_id: 2,
            tach_start: 100,
            tach_end: 110,
            hourly_rate: 150
          }] });
        }
        return Promise.resolve({ rows: [] });
      }
      
      // POST /api/billing/generate - check existing billing
      if (lt.includes('select id from billing_records')) {
        if (params && params[0] === 1) {
          return Promise.resolve({ rows: [] }); // No existing billing
        }
        return Promise.resolve({ rows: [] });
      }
      
      // POST /api/billing/generate - insert billing record
      if (lt.includes('insert into billing_records')) {
        return Promise.resolve({ rows: [{
          id: 99,
          member_id: params[0],
          flight_log_id: params[1],
          aircraft_id: params[2],
          tach_hours: params[3],
          hourly_rate: params[4],
          amount: params[5],
          is_paid: false,
          billing_date: '2026-02-02'
        }] });
      }
      
      // PUT /api/billing/:id/pay
      if (lt.includes('update billing_records') && lt.includes('is_paid = true')) {
        if (params && params[0] === '1') {
          return Promise.resolve({ rows: [{
            id: 1,
            member_id: 1,
            flight_log_id: 1,
            aircraft_id: 2,
            tach_hours: 10,
            hourly_rate: 150,
            amount: 1500,
            is_paid: true,
            billing_date: '2026-02-01',
            payment_date: '2026-02-02'
          }] });
        }
        return Promise.resolve({ rows: [] });
      }
      
      // DELETE /api/billing/:id
      if (lt.includes('delete from billing_records')) {
        if (params && params[0] === '1') {
          return Promise.resolve({ rows: [{
            id: 1,
            member_id: 1,
            flight_log_id: 1,
            aircraft_id: 2,
            tach_hours: 10,
            hourly_rate: 150,
            amount: 1500,
            is_paid: false,
            billing_date: '2026-02-01'
          }] });
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

describe('Billing endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  describe('GET /api/billing', () => {
    test('returns a list of billing records', async () => {
      const res = await httpRequest(port, '/api/billing', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('member_name');
      expect(res.body[0]).toHaveProperty('amount');
    });

    test('filters by member_id', async () => {
      const res = await httpRequest(port, '/api/billing?member_id=1', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('filters by is_paid', async () => {
      const res = await httpRequest(port, '/api/billing?is_paid=false', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('filters by start_date', async () => {
      const res = await httpRequest(port, '/api/billing?start_date=2026-01-01', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('filters by end_date', async () => {
      const res = await httpRequest(port, '/api/billing?end_date=2026-12-31', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('applies multiple filters', async () => {
      const res = await httpRequest(port, '/api/billing?member_id=1&is_paid=false&start_date=2026-01-01&end_date=2026-12-31', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/billing/generate', () => {
    test('creates a billing record from a flight log', async () => {
      const payload = { flight_log_id: 1 };
      const res = await httpRequest(port, '/api/billing/generate', 'POST', payload, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('member_id', 1);
      expect(res.body).toHaveProperty('flight_log_id', 1);
      expect(res.body).toHaveProperty('amount');
      expect(res.body).toHaveProperty('is_paid', false);
    });

    test('returns 404 if flight log not found', async () => {
      const payload = { flight_log_id: 9999 };
      const res = await httpRequest(port, '/api/billing/generate', 'POST', payload, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    test('validates that tach_end is completed', async () => {
      // This test validates the business logic in the endpoint
      // The mock returns a log with tach_end, so we expect success
      const payload = { flight_log_id: 1 };
      const res = await httpRequest(port, '/api/billing/generate', 'POST', payload, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('PUT /api/billing/:id/pay', () => {
    test('marks a billing record as paid', async () => {
      const res = await httpRequest(port, '/api/billing/1/pay', 'PUT', {}, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('is_paid', true);
      expect(res.body).toHaveProperty('payment_date');
    });

    test('returns 404 if billing record not found', async () => {
      const res = await httpRequest(port, '/api/billing/9999/pay', 'PUT', {}, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/billing/summary/:member_id', () => {
    test('returns billing summary for a member', async () => {
      const res = await httpRequest(port, '/api/billing/summary/1', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('total_flights');
      expect(res.body).toHaveProperty('total_hours');
      expect(res.body).toHaveProperty('total_amount');
      expect(res.body).toHaveProperty('paid_amount');
      expect(res.body).toHaveProperty('unpaid_amount');
    });

    test('returns empty summary for member with no billing', async () => {
      const res = await httpRequest(port, '/api/billing/summary/9999', 'GET', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      // Should return an object with null/zero values
    });
  });

  describe('DELETE /api/billing/:id', () => {
    test('deletes a billing record', async () => {
      const res = await httpRequest(port, '/api/billing/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('billing');
      expect(res.body.billing).toHaveProperty('id', 1);
    });

    test('returns 404 if billing record not found', async () => {
      const res = await httpRequest(port, '/api/billing/9999', 'DELETE', null, { Authorization: 'Bearer faketoken' });
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
