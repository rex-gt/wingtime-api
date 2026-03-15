const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendWelcomeEmail = async (user) => {
    const appUrl = process.env.APP_URL || 'https://localhost:5173';
    const resetSecret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET;
    const resetToken = jwt.sign(
        { id: user.id, purpose: 'password-reset' },
        resetSecret,
        { expiresIn: '24h' }
    );
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    const msg = {
        to: user.email,
        from: process.env.SENDGRID_FROM || 'noreply@wingtime.app',
        subject: 'Welcome to WingTime!',
        html: `
            <h1>Welcome to WingTime, ${user.first_name}!</h1>
            <p>Your account has been successfully created. You can now access the WingTime flight scheduling app.</p>
            <p>To set up your WingTime password, please click the link below:</p>
            <p><a href="${resetLink}">Set up your WingTime password</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create this account, please ignore this email.</p>
        `,
    };

    await sgMail.send(msg);
};

module.exports = { sendWelcomeEmail };
