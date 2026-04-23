const pool = require('../config/database');
const crypto = require('crypto');

const getApiKeys = async (req, res) => {
  const result = await pool.query(
    'SELECT ak.*, m.first_name || \' \' || m.last_name as creator_name FROM api_keys ak JOIN members m ON ak.created_by = m.id ORDER BY ak.created_at DESC'
  );
  res.json(result.rows);
};

const createApiKey = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'API key name is required' });
  }

  const key_value = crypto.randomBytes(32).toString('hex');
  const created_by = req.user.id;

  const result = await pool.query(
    'INSERT INTO api_keys (key_value, name, created_by) VALUES ($1, $2, $3) RETURNING id, key_value, name, created_by, is_active, created_at',
    [key_value, name, created_by]
  );

  res.status(201).json(result.rows[0]);
};

const deleteApiKey = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM api_keys WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'API key not found' });
  }
  res.json({ message: 'API key deleted successfully' });
};

module.exports = {
  getApiKeys,
  createApiKey,
  deleteApiKey
};
