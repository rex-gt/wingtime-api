const pool = require('../config/database');

const getMaintenanceItems = async (req, res) => {
  const { aircraft_id, status } = req.query;
  let query = `
    SELECT m.*, a.tail_number, u.first_name || ' ' || u.last_name as creator_name
    FROM maintenance_items m
    JOIN aircraft a ON m.aircraft_id = a.id
    JOIN members u ON m.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (aircraft_id) {
    query += ` AND m.aircraft_id = $${params.length + 1}`;
    params.push(aircraft_id);
  }
  if (status) {
    query += ` AND m.status = $${params.length + 1}`;
    params.push(status);
  }
  query += ' ORDER BY m.due_date ASC, m.created_at DESC';
  
  const result = await pool.query(query, params);
  res.json(result.rows);
};

const getMaintenanceItemById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT m.*, a.tail_number, u.first_name || ' ' || u.last_name as creator_name
     FROM maintenance_items m
     JOIN aircraft a ON m.aircraft_id = a.id
     JOIN members u ON m.created_by = u.id
     WHERE m.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Maintenance item not found' });
  }
  res.json(result.rows[0]);
};

const createMaintenanceItem = async (req, res) => {
  const { aircraft_id, title, description, due_date, status } = req.body;
  const created_by = req.user.id;
  
  const result = await pool.query(
    `INSERT INTO maintenance_items (aircraft_id, title, description, created_by, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [aircraft_id, title, description, created_by, due_date, status || 'open']
  );
  res.status(201).json(result.rows[0]);
};

const updateMaintenanceItem = async (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, status, aircraft_id } = req.body;
  
  const result = await pool.query(
    `UPDATE maintenance_items
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         due_date = COALESCE($3, due_date),
         status = COALESCE($4, status),
         aircraft_id = COALESCE($5, aircraft_id)
     WHERE id = $6
     RETURNING *`,
    [title, description, due_date, status, aircraft_id, id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Maintenance item not found' });
  }
  res.json(result.rows[0]);
};

const deleteMaintenanceItem = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM maintenance_items WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Maintenance item not found' });
  }
  res.json({ message: 'Maintenance item deleted successfully' });
};

module.exports = {
  getMaintenanceItems,
  getMaintenanceItemById,
  createMaintenanceItem,
  updateMaintenanceItem,
  deleteMaintenanceItem,
};
