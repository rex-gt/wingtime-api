const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const dns = require('dns');
const { promisify } = require('util');

const resolve4 = promisify(dns.resolve4);

const createTransporter = async () => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;

    // Resolve IPv4 address for the SMTP host
    let host = smtpHost;
    try {
        const addresses = await resolve4(smtpHost);
        if (addresses && addresses.length > 0) {
            host = addresses[0];
            console.log(`Resolved ${smtpHost} to IPv4: ${host}`);
        }
    } catch (err) {
        console.error(`Failed to resolve IPv4 for ${smtpHost}:`, err.message);
        // Fall back to hostname
    }

    return nodemailer.createTransport({
        host: host,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            // Use original hostname for certificate verification
            servername: smtpHost,
        },
    });
};

const sendWelcomeEmail = async (user) => {
    const appUrl = process.env.APP_URL || 'https://localhost:5173';
    const resetSecret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET;
    const resetToken = jwt.sign(
        { id: user.id, purpose: 'password-reset' },
        resetSecret,
        { expiresIn: '24h' }
    );
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    const transporter = await createTransporter();

    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@wingtime.app',
        to: user.email,
        subject: 'Welcome to WingTime!',
        html: `
            <h1>Welcome to WingTime, ${user.first_name}!</h1>
            <p>Your account has been successfully created. You can now access the WingTime flight scheduling app.</p>
            <p>To set up your WingTime password, please click the link below:</p>
            <p><a href="${resetLink}">Set up your WingTime password</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create this account, please ignore this email.</p>
        `,
    });
};

module.exports = { sendWelcomeEmail };
