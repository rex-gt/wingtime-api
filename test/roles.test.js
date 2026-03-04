const http = require('http');

// We'll vary the mocked user role by using a variable
let mockUserRole = 'member';
let mockUserId = 1;

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ id: mockUserId }))
}));

jest.mock('pg', () => {
  const mPool = {
    query: (text, params) => {
      const lt = (text || '').toLowerCase();

      // Auth middleware user lookup
      if (lt.includes('select id, member_number') && lt.includes('where id = $1')) {
        return Promise.resolve({ rows: [{ id: mockUserId, member_number: 'M-1', first_name: 'Test', last_name: 'User', email: 'test@example.com', role: mockUserRole, is_active: true }] });
      }

      // Ownership check for reservation update/delete
      if (lt.includes('select member_id from reservations where id = $1')) {
        const id = params && params[0];
        if (id === '1') {
          return Promise.resolve({ rows: [{ member_id: 1 }] });
        }
        if (id === '99') {
          return Promise.resolve({ rows: [{ member_id: 99 }] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Insert member
      if (lt.includes('insert into members')) {
        return Promise.resolve({ rows: [{ id: 10, member_number: params[0], first_name: params[1], last_name: params[2], email: params[3] }] });
      }

      // Insert aircraft
      if (lt.includes('insert into aircraft')) {
        return Promise.resolve({ rows: [{ id: 5, tail_number: params[0], make: params[1], model: params[2] }] });
      }

      // Update aircraft
      if (lt.includes('update aircraft')) {
        return Promise.resolve({ rows: [{ id: 1, tail_number: 'N100', make: params[0], model: params[1] }] });
      }

      // Delete member
      if (lt.includes('delete from members')) {
        return Promise.resolve({ rows: [{ id: 1 }] });
      }

      // Delete aircraft
      if (lt.includes('delete from aircraft')) {
        return Promise.resolve({ rows: [{ id: 1 }] });
      }

      // Conflict check for reservations
      if (lt.includes('select id from reservations')) {
        return Promise.resolve({ rows: [] });
      }

      // Insert reservation
      if (lt.includes('insert into reservations')) {
        return Promise.resolve({ rows: [{ id: 123, member_id: params[0], aircraft_id: params[1], start_time: params[2], end_time: params[3] }] });
      }

      // Update reservation
      if (lt.includes('update reservations')) {
        const id = params && params[4];
        if (id === '1') {
          return Promise.resolve({ rows: [{ id, member_id: 1, start_time: params[0], end_time: params[1], status: params[2], notes: params[3] }] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Update member (admin: params[6]=id; member: params[4]=id)
      if (lt.includes('update members')) {
        const id = params && (params[6] !== undefined ? params[6] : params[4]);
        return Promise.resolve({ rows: [{ id, first_name: params[0] }] });
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

describe('Role-based access control', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  // ---- Admin-only operations ----

  test('Admin can create a member', async () => {
    mockUserRole = 'admin';
    mockUserId = 1;
    const payload = { member_number: 'M-300', first_name: 'New', last_name: 'Member', email: 'new@example.com', phone: '555-0000' };
    const res = await httpRequest(port, '/api/members', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
  });

  test('Member cannot create another member (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { member_number: 'M-301', first_name: 'Bad', last_name: 'Actor', email: 'bad@example.com', phone: '555-0001' };
    const res = await httpRequest(port, '/api/members', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Operator cannot create a member (403)', async () => {
    mockUserRole = 'operator';
    mockUserId = 2;
    const payload = { member_number: 'M-302', first_name: 'Op', last_name: 'Attempt', email: 'op@example.com', phone: '555-0002' };
    const res = await httpRequest(port, '/api/members', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Admin can delete a member', async () => {
    mockUserRole = 'admin';
    mockUserId = 1;
    const res = await httpRequest(port, '/api/members/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  test('Member cannot delete a member (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const res = await httpRequest(port, '/api/members/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Admin can update any member profile including role and is_active', async () => {
    mockUserRole = 'admin';
    mockUserId = 1;
    const payload = { first_name: 'Updated', last_name: 'Name', email: 'u@example.com', phone: '555-9999', is_active: false, role: 'operator' };
    const res = await httpRequest(port, '/api/members/2', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  // ---- Member self-service ----

  test('Member can update own profile', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { first_name: 'Self', last_name: 'Update', email: 'self@example.com', phone: '555-1111' };
    const res = await httpRequest(port, '/api/members/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  test('Member cannot update another member profile (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { first_name: 'Hack', last_name: 'Attempt', email: 'hack@example.com', phone: '555-0000' };
    const res = await httpRequest(port, '/api/members/99', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  // ---- Aircraft operations ----

  test('Operator can create aircraft', async () => {
    mockUserRole = 'operator';
    mockUserId = 2;
    const payload = { tail_number: 'N300', make: 'Cessna', model: '172', year: 2005, hourly_rate: 120 };
    const res = await httpRequest(port, '/api/aircraft', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(201);
  });

  test('Member cannot create aircraft (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { tail_number: 'N400', make: 'Piper', model: 'PA-28', year: 2000, hourly_rate: 100 };
    const res = await httpRequest(port, '/api/aircraft', 'POST', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Operator can update aircraft (e.g. take offline)', async () => {
    mockUserRole = 'operator';
    mockUserId = 2;
    const payload = { make: 'Piper', model: 'PA-28', year: 1998, hourly_rate: 95, current_tach_hours: 1000, is_available: false };
    const res = await httpRequest(port, '/api/aircraft/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  test('Member cannot update aircraft (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { make: 'Piper', model: 'PA-28', year: 1998, hourly_rate: 95, current_tach_hours: 1000, is_available: false };
    const res = await httpRequest(port, '/api/aircraft/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Member cannot delete aircraft (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const res = await httpRequest(port, '/api/aircraft/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Operator cannot delete aircraft (403)', async () => {
    mockUserRole = 'operator';
    mockUserId = 2;
    const res = await httpRequest(port, '/api/aircraft/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Admin can delete aircraft', async () => {
    mockUserRole = 'admin';
    mockUserId = 1;
    const res = await httpRequest(port, '/api/aircraft/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  // ---- Reservation ownership ----

  test('Member can update their own reservation', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { start_time: '2026-06-01T09:00:00Z', end_time: '2026-06-01T10:00:00Z', status: 'scheduled', notes: 'Mine' };
    const res = await httpRequest(port, '/api/reservations/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  test('Member cannot update another member reservation (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { start_time: '2026-06-01T09:00:00Z', end_time: '2026-06-01T10:00:00Z', status: 'scheduled', notes: 'Hack' };
    const res = await httpRequest(port, '/api/reservations/99', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Operator can update any reservation (maintenance override)', async () => {
    mockUserRole = 'operator';
    mockUserId = 2;
    const payload = { start_time: '2026-06-01T09:00:00Z', end_time: '2026-06-01T10:00:00Z', status: 'cancelled', notes: 'Maintenance override' };
    const res = await httpRequest(port, '/api/reservations/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  test('Member can delete their own reservation', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const res = await httpRequest(port, '/api/reservations/1', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
  });

  test('Member cannot delete another member reservation (403)', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const res = await httpRequest(port, '/api/reservations/99', 'DELETE', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('Unauthenticated request to write reservation returns 401', async () => {
    const payload = { member_id: 1, aircraft_id: 1, start_time: '2026-07-01T09:00:00Z', end_time: '2026-07-01T10:00:00Z' };
    const res = await httpRequest(port, '/api/reservations', 'POST', payload);
    expect(res.statusCode).toBe(401);
  });
});
