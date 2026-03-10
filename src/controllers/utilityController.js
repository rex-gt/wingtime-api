const pool = require('../config/database');

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
  getAircraftAvailability,
};
