const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendPasswordResetEmail = async (email, resetUrl) => {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@wingtime.com',
        to: email,
        subject: 'WingTime Password Reset Request',
        html: `
            <p>You requested a password reset for your WingTime account.</p>
            <p>Click the link below to reset your password. This link expires in 10 minutes.</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>If you did not request this, please ignore this email.</p>
        `,
    });
};

module.exports = { sendPasswordResetEmail };
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');

const resend = new Resend(process.env.RESEND_API_KEY);

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

module.exports = { sendWelcomeEmail };
