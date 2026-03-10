const pool = require('../config/database');

const getFlightLogs = async (req, res) => {
  const { member_id, aircraft_id, start_date, end_date } = req.query;

  let query = `
    SELECT fl.*,
           m.first_name || ' ' || m.last_name as member_name,
           a.tail_number, a.make, a.model
    FROM flight_logs fl
    JOIN members m ON fl.member_id = m.id
    JOIN aircraft a ON fl.aircraft_id = a.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (member_id) {
    query += ` AND fl.member_id = $${paramCount}`;
    params.push(member_id);
    paramCount++;
  }

  if (aircraft_id) {
    query += ` AND fl.aircraft_id = $${paramCount}`;
    params.push(aircraft_id);
    paramCount++;
  }

  if (start_date) {
    query += ` AND fl.flight_date >= $${paramCount}`;
    params.push(start_date);
    paramCount++;
  }

  if (end_date) {
    query += ` AND fl.flight_date <= $${paramCount}`;
    params.push(end_date);
    paramCount++;
  }

  query += ' ORDER BY fl.flight_date DESC, fl.departure_time DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
};

const getFlightLogById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT fl.*,
            m.first_name || ' ' || m.last_name as member_name,
            a.tail_number, a.make, a.model
     FROM flight_logs fl
     JOIN members m ON fl.member_id = m.id
     JOIN aircraft a ON fl.aircraft_id = a.id
     WHERE fl.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Flight log not found' });
  }
  res.json(result.rows[0]);
};

const createFlightLog = async (req, res) => {
  const {
    reservation_id, member_id, aircraft_id, tach_start, tach_end,
    flight_date, departure_time, arrival_time
  } = req.body;

  const result = await pool.query(
    `INSERT INTO flight_logs
     (reservation_id, member_id, aircraft_id, tach_start, tach_end,
      flight_date, departure_time, arrival_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [reservation_id, member_id, aircraft_id, tach_start, tach_end,
     flight_date, departure_time, arrival_time]
  );

  if (tach_end) {
    await pool.query(
      'UPDATE aircraft SET current_tach_hours = $1 WHERE id = $2',
      [tach_end, aircraft_id]
    );
  }

  res.status(201).json(result.rows[0]);
};

const updateFlightLog = async (req, res) => {
  const { id } = req.params;
  const { tach_start, tach_end, flight_date, departure_time, arrival_time } = req.body;

  const result = await pool.query(
    `UPDATE flight_logs
     SET tach_start = $1, tach_end = $2, flight_date = $3,
         departure_time = $4, arrival_time = $5
     WHERE id = $6
     RETURNING *`,
    [tach_start, tach_end, flight_date, departure_time, arrival_time, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Flight log not found' });
  }

  if (tach_end) {
    await pool.query(
      'UPDATE aircraft SET current_tach_hours = $1 WHERE id = $2',
      [tach_end, result.rows[0].aircraft_id]
    );
  }

  res.json(result.rows[0]);
};

const deleteFlightLog = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'DELETE FROM flight_logs WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Flight log not found' });
  }
  res.json({ message: 'Flight log deleted successfully', flight_log: result.rows[0] });
};

module.exports = {
  getFlightLogs,
  getFlightLogById,
  createFlightLog,
  updateFlightLog,
  deleteFlightLog,
};
