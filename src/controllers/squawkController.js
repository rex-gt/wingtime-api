const pool = require('../config/database');

const getSquawks = async (req, res) => {
  const { aircraft_id, status } = req.query;
  let query = `
    SELECT s.*, a.tail_number, u.first_name || ' ' || u.last_name as creator_name
    FROM squawks s
    JOIN aircraft a ON s.aircraft_id = a.id
    JOIN members u ON s.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (aircraft_id) {
    query += ` AND s.aircraft_id = $${params.length + 1}`;
    params.push(aircraft_id);
  }
  if (status) {
    query += ` AND s.status = $${params.length + 1}`;
    params.push(status);
  }
  query += ' ORDER BY s.observed_date DESC, s.created_at DESC';
  
  const result = await pool.query(query, params);
  res.json(result.rows);
};

const getSquawkById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT s.*, a.tail_number, u.first_name || ' ' || u.last_name as creator_name
     FROM squawks s
     JOIN aircraft a ON s.aircraft_id = a.id
     JOIN members u ON s.created_by = u.id
     WHERE s.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Squawk not found' });
  }
  
  // Get comments
  const comments = await pool.query(
    `SELECT c.*, u.first_name || ' ' || u.last_name as user_name
     FROM squawk_comments c
     JOIN members u ON c.user_id = u.id
     WHERE c.squawk_id = $1
     ORDER BY c.created_at ASC`,
    [id]
  );
  
  const squawk = result.rows[0];
  squawk.comments = comments.rows;
  
  res.json(squawk);
};

const createSquawk = async (req, res) => {
  const { aircraft_id, severity, description, observed_date } = req.body;
  const created_by = req.user.id;
  
  const result = await pool.query(
    `INSERT INTO squawks (aircraft_id, severity, description, observed_date, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [aircraft_id, severity, description, observed_date, created_by]
  );
  res.status(201).json(result.rows[0]);
};

const addComment = async (req, res) => {
  const { id: squawk_id } = req.params;
  const { comment } = req.body;
  const user_id = req.user.id;
  
  // Check if squawk exists
  const squawkCheck = await pool.query('SELECT id FROM squawks WHERE id = $1', [squawk_id]);
  if (squawkCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Squawk not found' });
  }
  
  const result = await pool.query(
    `INSERT INTO squawk_comments (squawk_id, user_id, comment)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [squawk_id, user_id, comment]
  );
  res.status(201).json(result.rows[0]);
};

const closeSquawk = async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(
    "UPDATE squawks SET status = 'closed' WHERE id = $1 RETURNING *",
    [id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Squawk not found' });
  }
  res.json(result.rows[0]);
};

module.exports = {
  getSquawks,
  getSquawkById,
  createSquawk,
  addComment,
  closeSquawk,
};
