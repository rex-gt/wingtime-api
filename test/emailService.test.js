jest.mock('nodemailer');
jest.mock('jsonwebtoken');

const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../src/services/emailService');

describe('Email Service', () => {
  let mockSendMail;
  let mockCreateTransport;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock sendMail
    mockSendMail = jest.fn();
    mockSendMail.mockResolvedValue({ messageId: '<test@example.com>' });

    // Mock createTransport
    mockCreateTransport = jest.fn(() => ({
      sendMail: mockSendMail
    }));

    nodemailer.createTransport = mockCreateTransport;

    // Mock jwt.sign
    jwt.sign = jest.fn(() => 'mock-reset-token-12345');

    // Mock environment variables
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@gmail.com';
    process.env.SMTP_PASS = 'password123';
    process.env.SMTP_FROM = 'noreply@wingtime.app';
    process.env.SMTP_SECURE = 'false';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.JWT_SECRET = 'test-secret';
  });

  test('sendWelcomeEmail should send email with correct structure', async () => {
    const user = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com'
    };

    await sendWelcomeEmail(user);

    expect(mockCreateTransport).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const emailCall = mockSendMail.mock.calls[0][0];
    expect(emailCall.to).toBe('john@example.com');
    expect(emailCall.from).toBe('noreply@wingtime.app');
    expect(emailCall.subject).toBe('Welcome to WingTime!');
  });

  test('sendWelcomeEmail should include personalized greeting', async () => {
    const user = {
      id: 42,
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@example.com'
    };

    await sendWelcomeEmail(user);

    const emailCall = mockSendMail.mock.calls[0][0];
    expect(emailCall.html).toContain('Welcome to WingTime, Alice!');
  });

  test('sendWelcomeEmail should include password reset link', async () => {
    const user = {
      id: 5,
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob@example.com'
    };

    await sendWelcomeEmail(user);

    const emailCall = mockSendMail.mock.calls[0][0];
    expect(emailCall.html).toContain('Set up your WingTime password');
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
    process.env.RESET_TOKEN_SECRET = 'reset-secret-key';

    const user = {
      id: 10,
      first_name: 'David',
      last_name: 'Brown',
      email: 'david@example.com'
    };

    await sendWelcomeEmail(user);

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      'reset-secret-key',
      { expiresIn: '24h' }
    );

    delete process.env.RESET_TOKEN_SECRET;
  });

  test('sendWelcomeEmail should configure transporter with correct SMTP settings', async () => {
    const user = {
      id: 15,
      first_name: 'Eve',
      last_name: 'Davis',
      email: 'eve@example.com'
    };

    await sendWelcomeEmail(user);

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@gmail.com',
        pass: 'password123'
      }
    });
  });

  test('sendWelcomeEmail should handle secure SMTP on port 465', async () => {
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'true';

    const user = {
      id: 20,
      first_name: 'Frank',
      last_name: 'Miller',
      email: 'frank@example.com'
    };

    // Recreate the module to pick up env changes
    jest.resetModules();
    jest.mock('nodemailer');
    jest.mock('jsonwebtoken');

    const nodemailer2 = require('nodemailer');
    const jwt2 = require('jsonwebtoken');
    const mockSendMail2 = jest.fn().mockResolvedValue({ messageId: '<test@example.com>' });
    nodemailer2.createTransport = jest.fn(() => ({ sendMail: mockSendMail2 }));
    jwt2.sign = jest.fn(() => 'mock-token');

    const { sendWelcomeEmail: sendWelcomeEmail2 } = require('../src/services/emailService');
    await sendWelcomeEmail2(user);

    expect(nodemailer2.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: true
      })
    );

    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
  });

  test('sendWelcomeEmail should use default APP_URL when not configured', async () => {
    delete process.env.APP_URL;

    jest.resetModules();
    jest.mock('nodemailer');
    jest.mock('jsonwebtoken');

    const nodemailer3 = require('nodemailer');
    const jwt3 = require('jsonwebtoken');
    const mockSendMail3 = jest.fn().mockResolvedValue({ messageId: '<test@example.com>' });
    nodemailer3.createTransport = jest.fn(() => ({ sendMail: mockSendMail3 }));
    jwt3.sign = jest.fn(() => 'token-abc');

    const { sendWelcomeEmail: sendWelcomeEmail3 } = require('../src/services/emailService');

    const user = {
      id: 25,
      first_name: 'Grace',
      last_name: 'Taylor',
      email: 'grace@example.com'
    };

    await sendWelcomeEmail3(user);

    const emailCall = mockSendMail3.mock.calls[0][0];
    expect(emailCall.html).toContain('http://localhost:3000');

    process.env.APP_URL = 'http://localhost:3000';
  });

  test('sendWelcomeEmail should include 24-hour expiration notice', async () => {
    const user = {
      id: 30,
      first_name: 'Henry',
      last_name: 'Garcia',
      email: 'henry@example.com'
    };

    await sendWelcomeEmail(user);

    const emailCall = mockSendMail.mock.calls[0][0];
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

    const emailCall = mockSendMail.mock.calls[0][0];
    expect(emailCall.html).toContain('If you did not create this account, please ignore this email');
  });

  test('sendWelcomeEmail should use custom SMTP_FROM', async () => {
    process.env.SMTP_FROM = 'hello@mycompany.com';

    jest.resetModules();
    jest.mock('nodemailer');
    jest.mock('jsonwebtoken');

    const nodemailer4 = require('nodemailer');
    const jwt4 = require('jsonwebtoken');
    const mockSendMail4 = jest.fn().mockResolvedValue({ messageId: '<test@example.com>' });
    nodemailer4.createTransport = jest.fn(() => ({ sendMail: mockSendMail4 }));
    jwt4.sign = jest.fn(() => 'token-xyz');

    const { sendWelcomeEmail: sendWelcomeEmail4 } = require('../src/services/emailService');

    const user = {
      id: 40,
      first_name: 'Jack',
      last_name: 'Anderson',
      email: 'jack@example.com'
    };

    await sendWelcomeEmail4(user);

    const emailCall = mockSendMail4.mock.calls[0][0];
    expect(emailCall.from).toBe('hello@mycompany.com');

    process.env.SMTP_FROM = 'noreply@wingtime.app';
  });

  test('sendWelcomeEmail should handle email sending errors gracefully', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

    const user = {
      id: 45,
      first_name: 'Karen',
      last_name: 'White',
      email: 'karen@example.com'
    };

    await expect(sendWelcomeEmail(user)).rejects.toThrow('SMTP connection failed');
  });
});
