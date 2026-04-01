const pool = require('../config/database');

const getAircraftList = async (req, res) => {
  const result = await pool.query('SELECT * FROM aircraft ORDER BY tail_number');
  res.json(result.rows);
};

const getAircraftById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM aircraft WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Aircraft not found' });
  }
  res.json(result.rows[0]);
};

const createAircraft = async (req, res) => {
  const { tail_number, make, model, year, hourly_rate, current_tach_hours } = req.body;
  const result = await pool.query(
    `INSERT INTO aircraft (tail_number, make, model, year, hourly_rate, current_tach_hours)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tail_number, make, model, year, hourly_rate, current_tach_hours || 0]
  );
  res.status(201).json(result.rows[0]);
};

const updateAircraft = async (req, res) => {
  const { id } = req.params;
  const { tail_number, make, model, year, hourly_rate, current_tach_hours, is_available } = req.body;
  const result = await pool.query(
    `UPDATE aircraft
     SET tail_number = $1, make = $2, model = $3, year = $4, hourly_rate = $5,
         current_tach_hours = $6, is_available = $7
     WHERE id = $8
     RETURNING *`,
    [tail_number, make, model, year, hourly_rate, current_tach_hours, is_available, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Aircraft not found' });
  }
  res.json(result.rows[0]);
};

const deleteAircraft = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM aircraft WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Aircraft not found' });
  }
  res.json({ message: 'Aircraft deleted successfully', aircraft: result.rows[0] });
};

const getAircraftAvailability = async (req, res) => {
  const { start_time, end_time } = req.query;
  if (!start_time || !end_time) {
    return res.status(400).json({ error: 'start_time and end_time required' });
  }
  const result = await pool.query(
    `SELECT a.*,
       CASE WHEN r.id IS NULL THEN true ELSE false END as is_available_for_timeframe
     FROM aircraft a
     LEFT JOIN reservations r ON a.id = r.aircraft_id
       AND r.status NOT IN ('cancelled', 'completed')
       AND (
         (r.start_time <= $1 AND r.end_time > $1) OR
         (r.start_time < $2 AND r.end_time >= $2) OR
         (r.start_time >= $1 AND r.end_time <= $2)
       )
     WHERE a.is_available = true
     ORDER BY a.tail_number`,
    [start_time, end_time]
  );
  res.json(result.rows);
};

module.exports = {
  getAircraftList,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
  getAircraftAvailability,
};
