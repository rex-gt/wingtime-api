jest.mock('resend');
jest.mock('jsonwebtoken');

describe('Email Service', () => {
  let mockSend;
  let sendWelcomeEmail;
  let jwt;

  beforeEach(() => {
    jest.resetModules();

    // Set up environment variables before requiring the module
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM = 'AeroBook <noreply@aerobook.app>';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.RESET_TOKEN_SECRET;

    // Mock Resend
    mockSend = jest.fn().mockResolvedValue({ id: 'test-email-id' });
    const { Resend } = require('resend');
    Resend.mockImplementation(() => ({
      emails: {
        send: mockSend
      }
    }));

    // Mock jwt
    jwt = require('jsonwebtoken');
    jwt.sign = jest.fn(() => 'mock-reset-token-12345');

    // Now require the email service (after mocks are set up)
    const emailService = require('../src/services/emailService');
    sendWelcomeEmail = emailService.sendWelcomeEmail;
  });

  test('sendWelcomeEmail should send email with correct structure', async () => {
    const user = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com'
    };

    await sendWelcomeEmail(user);

    expect(mockSend).toHaveBeenCalledTimes(1);

    const emailCall = mockSend.mock.calls[0][0];
    expect(emailCall.to).toBe('john@example.com');
    expect(emailCall.from).toBe('AeroBook <noreply@aerobook.app>');
    expect(emailCall.subject).toBe('Welcome to AeroBook!');
  });

  test('sendWelcomeEmail should include personalized greeting', async () => {
    const user = {
      id: 42,
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@example.com'
    };

    await sendWelcomeEmail(user);

    const emailCall = mockSend.mock.calls[0][0];
    expect(emailCall.html).toContain('Welcome to AeroBook, Alice!');
  });

  test('sendWelcomeEmail should include password reset link', async () => {
    const user = {
      id: 5,
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob@example.com'
    };

    await sendWelcomeEmail(user);

    const emailCall = mockSend.mock.calls[0][0];
    expect(emailCall.html).toContain('Set up your AeroBook password');
    expect(emailCall.html).toContain('mock-reset-token-12345');
  });

  test('sendWelcomeEmail should generate JWT reset token with correct payload', async () => {
    const user = {
      id: 7,
      first_name: 'Carol',
      last_name: 'Williams',
      email: 'carol@example.com'
    };

    await sendWelcomeEmail(user);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 7, purpose: 'password-reset' },
      'test-secret',
      { expiresIn: '24h' }
    );
  });

  test('sendWelcomeEmail should use RESET_TOKEN_SECRET if provided', async () => {
    // Reset and reconfigure with RESET_TOKEN_SECRET
    jest.resetModules();
    process.env.RESET_TOKEN_SECRET = 'reset-secret-key';

    const mockSend2 = jest.fn().mockResolvedValue({ id: 'test-id' });
    const { Resend } = require('resend');
    Resend.mockImplementation(() => ({
      emails: { send: mockSend2 }
    }));

    const jwt2 = require('jsonwebtoken');
    jwt2.sign = jest.fn(() => 'mock-token');

    const { sendWelcomeEmail: sendWelcomeEmail2 } = require('../src/services/emailService');

    const user = {
      id: 10,
      first_name: 'David',
      last_name: 'Brown',
      email: 'david@example.com'
    };

    await sendWelcomeEmail2(user);

    expect(jwt2.sign).toHaveBeenCalledWith(
      expect.any(Object),
      'reset-secret-key',
      { expiresIn: '24h' }
    );
  });

  test('sendWelcomeEmail should use default RESEND_FROM when not configured', async () => {
    jest.resetModules();
    delete process.env.RESEND_FROM;

    const mockSend2 = jest.fn().mockResolvedValue({ id: 'test-id' });
    const { Resend } = require('resend');
    Resend.mockImplementation(() => ({
      emails: { send: mockSend2 }
    }));

    const jwt2 = require('jsonwebtoken');
    jwt2.sign = jest.fn(() => 'token-abc');

    const { sendWelcomeEmail: sendWelcomeEmail2 } = require('../src/services/emailService');

    const user = {
      id: 15,
      first_name: 'Eve',
      last_name: 'Davis',
      email: 'eve@example.com'
    };

    await sendWelcomeEmail2(user);

    const emailCall = mockSend2.mock.calls[0][0];
    expect(emailCall.from).toBe('AeroBook <noreply@aerobook.app>');
  });

  test('sendWelcomeEmail should use default APP_URL when not configured', async () => {
    jest.resetModules();
    delete process.env.APP_URL;

    const mockSend2 = jest.fn().mockResolvedValue({ id: 'test-id' });
    const { Resend } = require('resend');
    Resend.mockImplementation(() => ({
      emails: { send: mockSend2 }
    }));

    const jwt2 = require('jsonwebtoken');
    jwt2.sign = jest.fn(() => 'token-abc');

    const { sendWelcomeEmail: sendWelcomeEmail2 } = require('../src/services/emailService');

    const user = {
      id: 25,
      first_name: 'Grace',
      last_name: 'Taylor',
      email: 'grace@example.com'
    };

    await sendWelcomeEmail2(user);

    const emailCall = mockSend2.mock.calls[0][0];
    expect(emailCall.html).toContain('https://localhost:5173');
  });

  test('sendWelcomeEmail should include 24-hour expiration notice', async () => {
    const user = {
      id: 30,
      first_name: 'Henry',
      last_name: 'Garcia',
      email: 'henry@example.com'
    };

    await sendWelcomeEmail(user);

    const emailCall = mockSend.mock.calls[0][0];
    expect(emailCall.html).toContain('This link will expire in 24 hours');
  });

  test('sendWelcomeEmail should include security disclaimer', async () => {
    const user = {
      id: 35,
      first_name: 'Iris',
      last_name: 'Martinez',
      email: 'iris@example.com'
    };

    await sendWelcomeEmail(user);

    const emailCall = mockSend.mock.calls[0][0];
    expect(emailCall.html).toContain('If you did not create this account, please ignore this email');
  });

  test('sendWelcomeEmail should use custom RESEND_FROM', async () => {
    jest.resetModules();
    process.env.RESEND_FROM = 'hello@mycompany.com';

    const mockSend2 = jest.fn().mockResolvedValue({ id: 'test-id' });
    const { Resend } = require('resend');
    Resend.mockImplementation(() => ({
      emails: { send: mockSend2 }
    }));

    const jwt2 = require('jsonwebtoken');
    jwt2.sign = jest.fn(() => 'token-xyz');

    const { sendWelcomeEmail: sendWelcomeEmail2 } = require('../src/services/emailService');

    const user = {
      id: 40,
      first_name: 'Jack',
      last_name: 'Anderson',
      email: 'jack@example.com'
    };

    await sendWelcomeEmail2(user);

    const emailCall = mockSend2.mock.calls[0][0];
    expect(emailCall.from).toBe('hello@mycompany.com');
  });

  test('sendWelcomeEmail should handle email sending errors gracefully', async () => {
    mockSend.mockRejectedValueOnce(new Error('Resend API error'));

    const user = {
      id: 45,
      first_name: 'Karen',
      last_name: 'White',
      email: 'karen@example.com'
    };

    await expect(sendWelcomeEmail(user)).rejects.toThrow('Resend API error');
  });
});
