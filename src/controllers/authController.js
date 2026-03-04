const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

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

module.exports = { loginUser, registerUser, getProfile };
