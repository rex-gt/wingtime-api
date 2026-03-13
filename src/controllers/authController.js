const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { sendWelcomeEmail } = require('../services/emailService');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM members WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

            res.json({
                id: user.id,
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                email: user.email,
                token: token
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const registerUser = async (req, res) => {
    const { member_number, first_name, last_name, email, phone, password, role } = req.body;

    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const existing = await pool.query('SELECT id FROM members WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const mNumber = member_number || `M-${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO members (member_number, first_name, last_name, email, phone, password, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [mNumber, first_name, last_name, email, phone || null, hashed, role || 'member']
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

        sendWelcomeEmail(user).catch((err) => console.error('Failed to send welcome email:', err));

        res.status(201).json({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const result = await pool.query('SELECT id, member_number, first_name, last_name, email, phone, role, is_active, created_at FROM members WHERE id = $1', [userId]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const { first_name, last_name, email, phone, current_password, new_password } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if email is already taken by another user
        if (email) {
            const emailCheck = await pool.query('SELECT id FROM members WHERE email = $1 AND id != $2', [email, userId]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ message: 'Email is already in use' });
            }
        }

        // If updating password, verify current password
        let hashedPassword = null;
        if (new_password) {
            if (!current_password) {
                return res.status(400).json({ message: 'Current password is required to change password' });
            }

            const userResult = await pool.query('SELECT password FROM members WHERE id = $1', [userId]);
            const user = userResult.rows[0];

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(current_password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            hashedPassword = await bcrypt.hash(new_password, 10);
        }

        // Build update query dynamically
        let updateFields = ['first_name = $1', 'last_name = $2', 'email = $3', 'phone = $4'];
        let params = [first_name, last_name, email, phone || null];

        if (hashedPassword) {
            updateFields.push(`password = $${params.length + 1}`);
            params.push(hashedPassword);
        }

        params.push(userId);
        const userIndex = params.length;

        const query = `
            UPDATE members
            SET ${updateFields.join(', ')}
            WHERE id = $${userIndex}
            RETURNING id, member_number, first_name, last_name, email, phone, role, is_active, created_at
        `;

        const result = await pool.query(query, params);

        if (!result.rows[0]) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updatedUser = result.rows[0];

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (err) {
        console.error('Profile update error:', err.message);
        console.error('Error details:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
    }

    try {
        // Verify the reset token
        const resetSecret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET;
        const decoded = jwt.verify(token, resetSecret);

        // Check if the token has the correct purpose
        if (decoded.purpose !== 'password-reset') {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        const userId = decoded.id;

        // Check if user exists
        const userResult = await pool.query('SELECT id FROM members WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the password
        await pool.query('UPDATE members SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(400).json({ message: 'Invalid reset token' });
        }
        console.error('Password reset error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { loginUser, registerUser, getProfile, updateProfile, resetPassword };
