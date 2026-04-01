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
      // processReminders lookup
      if (lt.includes('select r.*, m.first_name') && lt.includes('reminder_hours')) {
        return Promise.resolve({ rows: [{ id: 101, first_name: 'Test', email: 'test@example.com', tail_number: 'N100' }] });
      }
      if (lt.includes('update reservations set reminder_sent = true')) {
        return Promise.resolve({ rows: [{ id: params[0], reminder_sent: true }] });
      }
      // member update
      if (lt.includes('update members set')) {
        return Promise.resolve({ rows: [{ id: 1, reminder_hours: 12 }] });
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

describe('Reminder endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('POST /api/jobs/process-reminders succeeds for Admin', async () => {
    mockUserRole = 'admin';
    const res = await httpRequest(port, '/api/jobs/process-reminders', 'POST', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Reminders processed successfully');
  });

  test('POST /api/jobs/process-reminders fails for Member (403)', async () => {
    mockUserRole = 'member';
    const res = await httpRequest(port, '/api/jobs/process-reminders', 'POST', null, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(403);
  });

  test('PUT /api/members/:id can update reminder_hours', async () => {
    mockUserRole = 'member';
    mockUserId = 1;
    const payload = { reminder_hours: 12 };
    const res = await httpRequest(port, '/api/members/1', 'PUT', payload, { Authorization: 'Bearer faketoken' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('reminder_hours', 12);
  });
});
