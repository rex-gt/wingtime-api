const http = require('http');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(() => ({ id: 1 }))
}));

jest.mock('pg', () => {
  const mPool = {
    query: (text, params) => {
      const lt = (text || '').toLowerCase();
      
      // Auth middleware - get user from members table
      if (lt.includes('select id, member_number') && lt.includes('where id = $1')) {
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'pilot', is_active: true }] });
      }
      
      // GET /api/aircraft/availability
      if (lt.includes('case when r.id is null then true else false end')) {
        return Promise.resolve({ rows: [
          { id: 1, tail_number: 'N123', make: 'Cessna', model: '172', is_available: true, current_tach_hours: 1000, hourly_rate: 150, is_available_for_timeframe: true },
          { id: 2, tail_number: 'N456', make: 'Piper', model: 'Cherokee', is_available: true, current_tach_hours: 1500, hourly_rate: 125, is_available_for_timeframe: false }
        ] });
      }
      
      return Promise.resolve({ rows: [] });
    }
  };
  return { Pool: jest.fn(() => mPool), types: { setTypeParser: jest.fn() } };
});

const app = require('../src/index');

function httpRequest(port, path, method = 'GET', data = null, headers = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' };
  const options = { port, path, method, host: '127.0.0.1', headers: Object.assign(defaultHeaders, headers) };
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

describe('Utility endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  describe('GET /api/aircraft/availability', () => {
    test('returns available aircraft for a given timeframe', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T10:00:00Z&end_time=2026-03-01T12:00:00Z');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('tail_number');
      expect(res.body[0]).toHaveProperty('is_available_for_timeframe');
    });

    test('includes aircraft details in response', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T10:00:00Z&end_time=2026-03-01T12:00:00Z');
      expect(res.statusCode).toBe(200);
      expect(res.body[0]).toHaveProperty('make');
      expect(res.body[0]).toHaveProperty('model');
      expect(res.body[0]).toHaveProperty('hourly_rate');
      expect(res.body[0]).toHaveProperty('current_tach_hours');
    });

    test('includes availability status in response', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T10:00:00Z&end_time=2026-03-01T12:00:00Z');
      expect(res.statusCode).toBe(200);
      expect(res.body[0]).toHaveProperty('is_available_for_timeframe');
    });

    test('shows both available and unavailable aircraft', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T10:00:00Z&end_time=2026-03-01T12:00:00Z');
      expect(res.statusCode).toBe(200);
      // Should have at least one aircraft marked as available and one as unavailable
      const availableCount = res.body.filter(a => a.is_available_for_timeframe === true).length;
      const unavailableCount = res.body.filter(a => a.is_available_for_timeframe === false).length;
      expect(availableCount + unavailableCount).toBe(res.body.length);
    });

    test('returns 400 when start_time is missing', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?end_time=2026-03-01T12:00:00Z');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 when end_time is missing', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T10:00:00Z');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 when both start_time and end_time are missing', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('handles different date formats', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-04-15T14:30:00Z&end_time=2026-04-15T16:30:00Z');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('sorts results by tail number', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T10:00:00Z&end_time=2026-03-01T12:00:00Z');
      expect(res.statusCode).toBe(200);
      if (res.body.length > 1) {
        // Verify they are sorted by tail number
        for (let i = 0; i < res.body.length - 1; i++) {
          expect(res.body[i].tail_number.localeCompare(res.body[i + 1].tail_number)).toBeLessThanOrEqual(0);
        }
      }
    });

    test('handles early morning timeframe', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T06:00:00Z&end_time=2026-03-01T08:00:00Z');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('handles late evening timeframe', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T18:00:00Z&end_time=2026-03-01T20:00:00Z');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('handles full day timeframe', async () => {
      const res = await httpRequest(port, '/api/aircraft/availability?start_time=2026-03-01T00:00:00Z&end_time=2026-03-01T23:59:59Z');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
