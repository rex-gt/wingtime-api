const http = require('http');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn((token) => {
    if (token === 'valid-reset-token') {
      return { id: 1, purpose: 'password-reset' };
    }
    if (token === 'expired-token') {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    }
    if (token === 'invalid-purpose-token') {
      return { id: 1, purpose: 'other' };
    }
    return { id: 1 };
  })
}));

jest.mock('pg', () => {
  const mPool = {
    query: (text, params) => {
      const lt = (text || '').toLowerCase();
      if (lt.includes('select id from members where email')) {
        // simulate no existing user on register, and existing user for login
        if (params && params[0] === 'exists@example.com') {
          return Promise.resolve({ rows: [{ id: 5, email: 'exists@example.com', password: '$2a$10$hash', role: 'pilot', first_name: 'Ex', last_name: 'Ist' }] });
        }
        if (params && params[0] === 'valid@example.com') {
          return Promise.resolve({ rows: [{ id: 5, email: 'valid@example.com', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye', role: 'member', first_name: 'Valid', last_name: 'User' }] });
        }
        if (params && params[0] === 'taken@example.com') {
          return Promise.resolve({ rows: [{ id: 99, email: 'taken@example.com' }] });
        }
        return Promise.resolve({ rows: [] });
      }
      if (lt.includes('select * from members where email')) {
        if (params && params[0] === 'valid@example.com') {
          return Promise.resolve({ rows: [{ id: 5, email: 'valid@example.com', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye', role: 'member', first_name: 'Valid', last_name: 'User' }] });
        }
        return Promise.resolve({ rows: [] });
      }
      if (lt.includes('insert into members')) {
        return Promise.resolve({ rows: [{ id: 10, member_number: params[0], first_name: params[1], last_name: params[2], email: params[3], role: params[6] || 'member' }] });
      }
      if (lt.includes('select id, member_number') && lt.includes('where id = $1')) {
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Auth', last_name: 'User', email: 'auth@example.com', role: 'admin', is_active: true }] });
      }
      if (lt.includes('select id from members where id')) {
        return Promise.resolve({ rows: [{ id: 1 }] });
      }
      if (lt.includes('select password from members where id')) {
        return Promise.resolve({ rows: [{ password: '$2a$10$N9qo8uLOickgx2ZMRZoMye' }] });
      }
      if (lt.includes('update members') && lt.includes('set')) {
        return Promise.resolve({ rows: [{ id: 1, member_number: 'M-1', first_name: 'Updated', last_name: 'User', email: 'updated@example.com', role: 'admin', is_active: true }] });
      }
      return Promise.resolve({ rows: [] });
    }
  };
  return { Pool: jest.fn(() => mPool), types: { setTypeParser: jest.fn() } };
});

jest.mock('bcryptjs', () => ({
  compare: jest.fn((password) => {
    // Only return true for correct password
    if (password === 'correctpass') return Promise.resolve(true);
    return Promise.resolve(false);
  }),
  hash: jest.fn(() => Promise.resolve('$2a$10$hashedpassword'))
}));

const mockSend = jest.fn(() => Promise.resolve({ id: 'test-email-id' }));
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: { send: mockSend } }))
}));

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

describe('Auth endpoints', () => {
  let server, port;
  beforeAll(() => new Promise((resolve) => { server = app.listen(0, () => { port = server.address().port; resolve(); }); }));
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('POST /api/users/register creates a user', async () => {
    const payload = { member_number: 'M-200', first_name: 'New', last_name: 'User', email: 'new@example.com', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', 'new@example.com');
    expect(res.body).toHaveProperty('token', 'signed-token');
  });

  test('POST /api/users/register fails with duplicate email', async () => {
    const payload = { member_number: 'M-300', first_name: 'Duplicate', last_name: 'Email', email: 'exists@example.com', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('message', 'Email already registered');
  });

  test('POST /api/users/register fails when missing email', async () => {
    const payload = { member_number: 'M-301', first_name: 'No', last_name: 'Email', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Missing required fields');
  });

  test('POST /api/users/register fails when missing password', async () => {
    const payload = { member_number: 'M-302', first_name: 'No', last_name: 'Pass', email: 'nopass@example.com' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Missing required fields');
  });

  test('POST /api/users/register fails when missing first_name', async () => {
    const payload = { member_number: 'M-303', last_name: 'Missing', email: 'nofirst@example.com', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Missing required fields');
  });

  test('POST /api/users/register fails when missing last_name', async () => {
    const payload = { member_number: 'M-304', first_name: 'Test', email: 'nolast@example.com', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Missing required fields');
  });

  test('POST /api/users/register creates member role by default', async () => {
    const payload = { member_number: 'M-305', first_name: 'Default', last_name: 'Role', email: 'defaultrole@example.com', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/users/register accepts custom role', async () => {
    const payload = { member_number: 'M-306', first_name: 'Custom', last_name: 'Role', email: 'customrole@example.com', password: 'pass', role: 'operator' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/users/register includes phone if provided', async () => {
    const payload = { member_number: 'M-307', first_name: 'With', last_name: 'Phone', email: 'withphone@example.com', password: 'pass', phone: '555-1234' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/users/login succeeds with valid credentials', async () => {
    const payload = { email: 'valid@example.com', password: 'correctpass' };
    const res = await httpRequest(port, '/api/users/login', 'POST', payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('email', 'valid@example.com');
  });

  test('POST /api/users/login fails with invalid email', async () => {
    const payload = { email: 'noone@example.com', password: 'anypass' };
    const res = await httpRequest(port, '/api/users/login', 'POST', payload);
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  test('POST /api/users/login fails with wrong password', async () => {
    const payload = { email: 'valid@example.com', password: 'wrongpass' };
    const res = await httpRequest(port, '/api/users/login', 'POST', payload);
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  test('POST /api/users/register sends a welcome email', async () => {
    mockSend.mockClear();
    const payload = { member_number: 'M-308', first_name: 'Email', last_name: 'Test', email: 'emailtest@example.com', password: 'pass' };
    const res = await httpRequest(port, '/api/users/register', 'POST', payload);
    expect(res.statusCode).toBe(201);
    // Allow the fire-and-forget email to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockSend).toHaveBeenCalledTimes(1);
    const mailOptions = mockSend.mock.calls[0][0];
    expect(mailOptions.to).toBe('emailtest@example.com');
    expect(mailOptions.subject).toMatch(/welcome/i);
    expect(mailOptions.html).toMatch(/reset-password/i);
  });

  test('GET /api/users/profile returns user profile when authenticated', async () => {
    const res = await httpRequest(port, '/api/users/profile', 'GET', null, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('member_number', 'M-1');
    expect(res.body).toHaveProperty('first_name', 'Auth');
    expect(res.body).toHaveProperty('email', 'auth@example.com');
  });

  test('GET /api/users/profile includes role in response', async () => {
    const res = await httpRequest(port, '/api/users/profile', 'GET', null, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('role');
  });

  test('GET /api/users/profile includes is_active status', async () => {
    const res = await httpRequest(port, '/api/users/profile', 'GET', null, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('is_active');
  });

  test('GET /api/users/profile fails without authentication', async () => {
    const res = await httpRequest(port, '/api/users/profile', 'GET');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  test('PUT /api/users/profile updates user profile', async () => {
    const payload = {
      first_name: 'Updated',
      last_name: 'Name',
      email: 'newemail@example.com',
      phone: '555-9999'
    };
    const res = await httpRequest(port, '/api/users/profile', 'PUT', payload, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Profile updated successfully');
    expect(res.body).toHaveProperty('user');
  });

  test('PUT /api/users/profile fails without authentication', async () => {
    const payload = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com'
    };
    const res = await httpRequest(port, '/api/users/profile', 'PUT', payload);
    expect(res.statusCode).toBe(401);
  });

  test('PUT /api/users/profile fails with missing required fields', async () => {
    const payload = {
      first_name: 'Test',
      email: 'test@example.com'
    };
    const res = await httpRequest(port, '/api/users/profile', 'PUT', payload, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Missing required fields');
  });

  test('PUT /api/users/profile fails when email is already taken', async () => {
    const payload = {
      first_name: 'Test',
      last_name: 'User',
      email: 'taken@example.com'
    };
    const res = await httpRequest(port, '/api/users/profile', 'PUT', payload, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('message', 'Email is already in use');
  });

  test('PUT /api/users/profile allows password change with correct current password', async () => {
    const payload = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      current_password: 'correctpass',
      new_password: 'newpass'
    };
    const res = await httpRequest(port, '/api/users/profile', 'PUT', payload, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Profile updated successfully');
  });

  test('PUT /api/users/profile requires current password when changing password', async () => {
    const payload = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      new_password: 'newpass'
    };
    const res = await httpRequest(port, '/api/users/profile', 'PUT', payload, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Current password is required to change password');
  });

  test('PUT /api/users/profile rejects wrong current password', async () => {
    const payload = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      current_password: 'wrongpass',
      new_password: 'newpass'
    };
    const res = await httpRequest(port, '/api/users/profile', 'PUT', payload, { Authorization: 'Bearer valid-token' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Current password is incorrect');
  });

  test('POST /api/users/reset-password resets password with valid token', async () => {
    const payload = {
      token: 'valid-reset-token',
      password: 'newpassword123'
    };
    const res = await httpRequest(port, '/api/users/reset-password', 'POST', payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Password reset successfully');
  });

  test('POST /api/users/reset-password fails without token', async () => {
    const payload = {
      password: 'newpassword123'
    };
    const res = await httpRequest(port, '/api/users/reset-password', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Token and password are required');
  });

  test('POST /api/users/reset-password fails without password', async () => {
    const payload = {
      token: 'valid-reset-token'
    };
    const res = await httpRequest(port, '/api/users/reset-password', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Token and password are required');
  });

  test('POST /api/users/reset-password fails with expired token', async () => {
    const payload = {
      token: 'expired-token',
      password: 'newpassword123'
    };
    const res = await httpRequest(port, '/api/users/reset-password', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Reset token has expired. Please request a new one.');
  });

  test('POST /api/users/reset-password fails with invalid purpose token', async () => {
    const payload = {
      token: 'invalid-purpose-token',
      password: 'newpassword123'
    };
    const res = await httpRequest(port, '/api/users/reset-password', 'POST', payload);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid reset token');
  });
});
