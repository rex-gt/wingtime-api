const pool = require('../config/database');

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    return next(); // Continue to JWT auth if no API key is provided
  }

  try {
    const result = await pool.query(
      'SELECT ak.*, m.role FROM api_keys ak JOIN members m ON ak.created_by = m.id WHERE ak.key_value = $1 AND ak.is_active = true',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Set a mock user object for the request based on the API key creator
    const keyData = result.rows[0];
    req.user = {
      id: keyData.created_by,
      role: keyData.role,
      isApiKey: true,
      keyName: keyData.name
    };
    
    next();
  } catch (err) {
    console.error('API Key Auth Error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = apiKeyAuth;
