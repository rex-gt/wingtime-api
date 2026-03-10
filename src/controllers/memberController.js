const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const getMembers = async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM members ORDER BY last_name, first_name'
    );
    res.json(result.rows);
};

const getMemberById = async (req, res) => {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    if (req.user.role === 'member' && req.user.id !== targetId) {
        return res.status(403).json({ error: 'Forbidden: you can only view your own profile' });
    }

    const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
};

const createMember = async (req, res) => {
    const { member_number, first_name, last_name, email, phone, password, role } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields: first_name, last_name, email, password' });
    }

    try {
        // Check if email already exists
        const existingEmail = await pool.query('SELECT id FROM members WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const mNumber = member_number || `M-${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO members (member_number, first_name, last_name, email, phone, password, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, member_number, first_name, last_name, email, phone, password, role, is_active, created_at`,
            [mNumber, first_name, last_name, email, phone || null, hashedPassword, role || 'member']
        );

        const newMember = result.rows[0];
        res.status(201).json({
            id: newMember.id,
            member_number: newMember.member_number,
            first_name: newMember.first_name,
            last_name: newMember.last_name,
            email: newMember.email,
            phone: newMember.phone,
            role: newMember.role,
            is_active: newMember.is_active,
            created_at: newMember.created_at
        });
    } catch (err) {
        console.error('Member creation error:', err);
        res.status(500).json({ error: 'Server error creating member' });
    }
};

const updateMember = async (req, res) => {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    if (req.user.role !== 'admin' && req.user.id !== targetId) {
        return res.status(403).json({ error: 'Forbidden: you can only update your own profile' });
    }

    if (req.user.role === 'admin') {
        const { first_name, last_name, email, phone, is_active, role } = req.body;
        const result = await pool.query(
            `UPDATE members
             SET first_name = $1, last_name = $2, email = $3, phone = $4, is_active = $5, role = $6
             WHERE id = $7
             RETURNING *`,
            [first_name, last_name, email, phone, is_active, role, targetId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        return res.json(result.rows[0]);
    }

    const { first_name, last_name, email, phone } = req.body;
    const result = await pool.query(
        `UPDATE members
         SET first_name = $1, last_name = $2, email = $3, phone = $4
         WHERE id = $5
         RETURNING *`,
        [first_name, last_name, email, phone, targetId]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
    }
    return res.json(result.rows[0]);
};

const deleteMember = async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member deleted successfully', member: result.rows[0] });
};

module.exports = {
    getMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember,
};
