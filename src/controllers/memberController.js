const pool = require('../config/database');

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
    const { member_number, first_name, last_name, email, phone } = req.body;

    const result = await pool.query(
        `INSERT INTO members (member_number, first_name, last_name, email, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [member_number, first_name, last_name, email, phone]
    );

    res.status(201).json(result.rows[0]);
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
