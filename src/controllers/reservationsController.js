const pool = require('../config/database');
const emailService = require('../services/emailService');

const getReservations = async (req, res) => {
  const { member_id, aircraft_id, status, start_date, end_date } = req.query;
  let query = `
    SELECT r.*,
           m.first_name || ' ' || m.last_name as member_name,
           a.tail_number, a.make, a.model
    FROM reservations r
    JOIN members m ON r.member_id = m.id
    JOIN aircraft a ON r.aircraft_id = a.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;
  if (member_id) {
    query += ` AND r.member_id = $${paramCount}`;
    params.push(member_id);
    paramCount++;
  }
  if (aircraft_id) {
    query += ` AND r.aircraft_id = $${paramCount}`;
    params.push(aircraft_id);
    paramCount++;
  }
  if (status) {
    query += ` AND r.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }
  if (start_date) {
    query += ` AND r.start_time >= $${paramCount}`;
    params.push(start_date);
    paramCount++;
  }
  if (end_date) {
    query += ` AND r.end_time <= $${paramCount}`;
    params.push(end_date);
    paramCount++;
  }
  query += ' ORDER BY r.start_time DESC';
  const result = await pool.query(query, params);
  res.json(result.rows);
};

const getReservationById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT r.*,
            m.first_name || ' ' || m.last_name as member_name,
            a.tail_number, a.make, a.model
     FROM reservations r
     JOIN members m ON r.member_id = m.id
     JOIN aircraft a ON r.aircraft_id = a.id
     WHERE r.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  res.json(result.rows[0]);
};

const createReservation = async (req, res) => {
  let { member_id, aircraft_id, start_time, end_time, notes } = req.body;

  if (req.user && req.user.role === 'member') {
    if (member_id !== undefined && member_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: members can only create reservations for themselves' });
    }
    member_id = req.user.id;
  }

  // Ensure start_time is not in the past
  if (new Date(start_time) < new Date()) {
    return res.status(400).json({ error: 'Reservations cannot be made in the past' });
  }

  // Check if aircraft is available
  const aircraftCheck = await pool.query('SELECT is_available FROM aircraft WHERE id = $1', [aircraft_id]);
  if (aircraftCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Aircraft not found' });
  }
  if (!aircraftCheck.rows[0].is_available) {
    return res.status(409).json({ error: 'Aircraft is not available for reservations' });
  }

  const conflictCheck = await pool.query(
    `SELECT id FROM reservations
     WHERE aircraft_id = $1
     AND status NOT IN ('cancelled', 'completed')
     AND start_time < $3
     AND end_time > $2`,
    [aircraft_id, start_time, end_time]
  );
  if (conflictCheck.rows.length > 0) {
    return res.status(409).json({
      error: 'Time conflict with existing reservation',
      conflicting_reservation_id: conflictCheck.rows[0].id
    });
  }
  const result = await pool.query(
    `INSERT INTO reservations (member_id, aircraft_id, start_time, end_time, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [member_id, aircraft_id, start_time, end_time, notes]
  );

  // Send confirmation email (non-blocking)
  const reservation = result.rows[0];
  const aircraftData = await pool.query('SELECT tail_number, make, model FROM aircraft WHERE id = $1', [aircraft_id]);
  const userData = await pool.query('SELECT first_name, email FROM members WHERE id = $1', [member_id]);
  
  if (userData.rows.length > 0 && aircraftData.rows.length > 0) {
    emailService.sendReservationConfirmationEmail(
      userData.rows[0],
      { ...reservation, ...aircraftData.rows[0] },
      'created'
    ).catch(err => console.error('Error sending reservation email:', err));
  }

  res.status(201).json(reservation);
};

const updateReservation = async (req, res) => {
  const { id } = req.params;
  const { start_time, end_time, status, notes, aircraft_id, member_id } = req.body;

  if (req.user && req.user.role === 'member') {
    const check = await pool.query('SELECT member_id FROM reservations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    if (check.rows[0].member_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you can only update your own reservations' });
    }
    if (member_id !== undefined && member_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: members cannot change the person on a reservation' });
    }
  }

  // If aircraft_id or time is being changed, check for conflicts
  if (aircraft_id || start_time || end_time) {
    const currentRes = await pool.query('SELECT aircraft_id, start_time, end_time FROM reservations WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    const current = currentRes.rows[0];
    const newAircraftId = aircraft_id || current.aircraft_id;
    const newStartTime = start_time || current.start_time;
    const newEndTime = end_time || current.end_time;

    // Ensure new start_time is not in the past
    if (new Date(newStartTime) < new Date()) {
      return res.status(400).json({ error: 'Reservations cannot be moved to the past' });
    }

    // Check if new aircraft is available
    if (aircraft_id) {
      const aircraftCheck = await pool.query('SELECT is_available FROM aircraft WHERE id = $1', [aircraft_id]);
      if (aircraftCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Aircraft not found' });
      }
      if (!aircraftCheck.rows[0].is_available) {
        return res.status(409).json({ error: 'Aircraft is not available for reservations' });
      }
    }

    const conflictCheck = await pool.query(
      `SELECT id FROM reservations
       WHERE aircraft_id = $1
       AND status NOT IN ('cancelled', 'completed')
       AND id != $2
       AND start_time < $4
       AND end_time > $3`,
      [newAircraftId, id, newStartTime, newEndTime]
    );
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Time conflict with existing reservation',
        conflicting_reservation_id: conflictCheck.rows[0].id
      });
    }
  }

  const result = await pool.query(
    `UPDATE reservations
     SET start_time = COALESCE($1, start_time), 
         end_time = COALESCE($2, end_time), 
         status = COALESCE($3, status), 
         notes = COALESCE($4, notes), 
         aircraft_id = COALESCE($5, aircraft_id),
         member_id = COALESCE($6, member_id)
     WHERE id = $7
     RETURNING *`,
    [start_time, end_time, status, notes, aircraft_id, member_id, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  // Send update email (non-blocking)
  const reservation = result.rows[0];
  const aircraftData = await pool.query('SELECT tail_number, make, model FROM aircraft WHERE id = $1', [reservation.aircraft_id]);
  const userData = await pool.query('SELECT first_name, email FROM members WHERE id = $1', [reservation.member_id]);
  
  if (userData.rows.length > 0 && aircraftData.rows.length > 0) {
    emailService.sendReservationConfirmationEmail(
      userData.rows[0],
      { ...reservation, ...aircraftData.rows[0] },
      reservation.status === 'cancelled' ? 'cancelled' : 'updated'
    ).catch(err => console.error('Error sending reservation update email:', err));
  }

  res.status(200).json(result.rows[0]);
};

const deleteReservation = async (req, res) => {
  const { id } = req.params;

  if (req.user && req.user.role === 'member') {
    const check = await pool.query('SELECT member_id FROM reservations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    if (check.rows[0].member_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you can only delete your own reservations' });
    }
  }

  const result = await pool.query(
    'DELETE FROM reservations WHERE id = $1 RETURNING *',
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  // Send cancellation email (non-blocking)
  const reservation = result.rows[0];
  const aircraftData = await pool.query('SELECT tail_number, make, model FROM aircraft WHERE id = $1', [reservation.aircraft_id]);
  const userData = await pool.query('SELECT first_name, email FROM members WHERE id = $1', [reservation.member_id]);
  
  if (userData.rows.length > 0 && aircraftData.rows.length > 0) {
    emailService.sendReservationConfirmationEmail(
      userData.rows[0],
      { ...reservation, ...aircraftData.rows[0] },
      'cancelled'
    ).catch(err => console.error('Error sending reservation cancellation email:', err));
  }

  res.json({ message: 'Reservation deleted successfully', reservation: result.rows[0] });
};

module.exports = {
  getReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
};
