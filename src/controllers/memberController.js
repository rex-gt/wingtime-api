const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../services/emailService');

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

        console.log('Attempting to send welcome email to:', newMember.email);
        sendWelcomeEmail(newMember)
            .then(() => console.log('Welcome email sent successfully to:', newMember.email))
            .catch((err) => console.error('Failed to send welcome email:', err.message));

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

    // Build dynamic UPDATE query based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Define which fields each role can update
    const allowedAdminFields = ['first_name', 'last_name', 'email', 'phone', 'is_active', 'role'];
    const allowedMemberFields = ['first_name', 'last_name', 'email', 'phone'];
    const allowedFields = req.user.role === 'admin' ? allowedAdminFields : allowedMemberFields;

    // Build the update query dynamically
    for (const field of allowedFields) {
        if (field in req.body && req.body[field] !== undefined) {
            updates.push(`${field} = $${paramCount}`);
            values.push(req.body[field]);
            paramCount++;
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(targetId);
    const query = `UPDATE members SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        return res.json(result.rows[0]);
    } catch (err) {
        console.error('Update member error:', err);
        res.status(500).json({ error: 'Failed to update member' });
    }
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
