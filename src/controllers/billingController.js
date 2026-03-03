const pool = require('../config/database');

const getBillingRecords = async (req, res) => {
  const { member_id, is_paid, start_date, end_date } = req.query;

  let query = `
    SELECT br.*,
           m.first_name || ' ' || m.last_name as member_name,
           m.email as member_email,
           a.tail_number
    FROM billing_records br
    JOIN members m ON br.member_id = m.id
    JOIN aircraft a ON br.aircraft_id = a.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (member_id) {
    query += ` AND br.member_id = $${paramCount}`;
    params.push(member_id);
    paramCount++;
  }

  if (is_paid !== undefined) {
    query += ` AND br.is_paid = $${paramCount}`;
    params.push(is_paid === 'true');
    paramCount++;
  }

  if (start_date) {
    query += ` AND br.billing_date >= $${paramCount}`;
    params.push(start_date);
    paramCount++;
  }

  if (end_date) {
    query += ` AND br.billing_date <= $${paramCount}`;
    params.push(end_date);
    paramCount++;
  }

  query += ' ORDER BY br.billing_date DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
};

const generateBilling = async (req, res) => {
  const { flight_log_id } = req.body;

  const flightLog = await pool.query(
    `SELECT fl.*, a.hourly_rate
     FROM flight_logs fl
     JOIN aircraft a ON fl.aircraft_id = a.id
     WHERE fl.id = $1`,
    [flight_log_id]
  );

  if (flightLog.rows.length === 0) {
    return res.status(404).json({ error: 'Flight log not found' });
  }

  const log = flightLog.rows[0];

  if (!log.tach_end) {
    return res.status(400).json({ error: 'Flight log must be completed (tach_end required)' });
  }

  const tachHours = parseFloat(log.tach_end) - parseFloat(log.tach_start);
  const amount = tachHours * parseFloat(log.hourly_rate);

  const existingBilling = await pool.query(
    'SELECT id FROM billing_records WHERE flight_log_id = $1',
    [flight_log_id]
  );

  if (existingBilling.rows.length > 0) {
    return res.status(409).json({
      error: 'Billing record already exists for this flight log',
      billing_id: existingBilling.rows[0].id
    });
  }

  const result = await pool.query(
    `INSERT INTO billing_records
     (member_id, flight_log_id, aircraft_id, tach_hours, hourly_rate, amount)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [log.member_id, flight_log_id, log.aircraft_id, tachHours, log.hourly_rate, amount]
  );

  res.status(201).json(result.rows[0]);
};

const payBillingRecord = async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE billing_records
     SET is_paid = true, payment_date = CURRENT_DATE
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Billing record not found' });
  }
  res.json(result.rows[0]);
};

const getBillingSummary = async (req, res) => {
  const { member_id } = req.params;

  const result = await pool.query(
    `SELECT
       COUNT(*) as total_flights,
       SUM(tach_hours) as total_hours,
       SUM(amount) as total_amount,
       SUM(CASE WHEN is_paid THEN amount ELSE 0 END) as paid_amount,
       SUM(CASE WHEN NOT is_paid THEN amount ELSE 0 END) as unpaid_amount
     FROM billing_records
     WHERE member_id = $1`,
    [member_id]
  );

  res.json(result.rows[0]);
};

const deleteBillingRecord = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'DELETE FROM billing_records WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Billing record not found' });
  }
  res.json({ message: 'Billing record deleted successfully', billing: result.rows[0] });
};

module.exports = {
  getBillingRecords,
  generateBilling,
  payBillingRecord,
  getBillingSummary,
  deleteBillingRecord,
};
