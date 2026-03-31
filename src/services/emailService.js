const { Resend } = require('resend');
const jwt = require('jsonwebtoken');

// Fallback to a dummy key prevents the Resend constructor from throwing during tests
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_testing');

const sendWelcomeEmail = async (user) => {
    const appUrl = process.env.APP_URL || 'https://localhost:5173';
    const resetSecret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET;
    const resetToken = jwt.sign(
        { id: user.id, purpose: 'password-reset' },
        resetSecret,
        { expiresIn: '24h' }
    );
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await resend.emails.send({
        from: process.env.RESEND_FROM || 'AeroBook <noreply@aerobook.app>',
        to: user.email,
        subject: 'Welcome to AeroBook!',
        html: `
            <h1>Welcome to AeroBook, ${user.first_name}!</h1>
            <p>Your account has been successfully created. You can now access the AeroBook flight scheduling app.</p>
            <p>To set up your AeroBook password, please click the link below:</p>
            <p><a href="${resetLink}">Set up your AeroBook password</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create this account, please ignore this email.</p>
        `,
    });
};

const sendPasswordResetEmail = async (user) => {
    const appUrl = process.env.APP_URL || 'https://localhost:5173';
    const resetSecret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET;
    const resetToken = jwt.sign(
        { id: user.id, purpose: 'password-reset' },
        resetSecret,
        { expiresIn: '10m' }
    );
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await resend.emails.send({
        from: process.env.RESEND_FROM || 'AeroBook <noreply@aerobook.app>',
        to: user.email,
        subject: 'Password Reset Request',
        html: `
            <h1>Password Reset Request</h1>
            <p>Hello ${user.first_name},</p>
            <p>You requested a password reset for your AeroBook account.</p>
            <p>Please click the link below to set a new password:</p>
            <p><a href="${resetLink}">Reset your AeroBook password</a></p>
            <p>This link will expire in <strong>10 minutes</strong>.</p>
            <p>If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
        `,
    });
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };
