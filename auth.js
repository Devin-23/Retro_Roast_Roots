//"auth" will be the death of me I swear...
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { one, query } = require('../db');

const router = express.Router();

/* Had this here in early times for testing before things became cooked spegettie :(
POST /api/auth/register
body: { email, password, first_name?, last_name? }
*/
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name = null, last_name = null } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const existing = await one('SELECT customer_id FROM customers WHERE email = :email', { email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(String(password), 10);

    const [result] = await query(
      `INSERT INTO customers (email, password_hash, first_name, last_name)
       VALUES (:email, :hash, :first_name, :last_name)`,
      { email, hash, first_name, last_name }
    );

    const customer_id = result.insertId;

    const token = jwt.sign(
      { sub: customer_id, email, name: buildName(first_name, last_name) },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        customer_id,
        email,
        first_name,
        last_name,
        name: buildName(first_name, last_name)
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* bring me back to when it was this simple and we didn't start connecting to the database using jsonwebtoken...
POST /api/auth/login
body: { email, password }
*/
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await one(
      `SELECT customer_id, email, password_hash, first_name, last_name
       FROM customers WHERE email = :email`,
      { email }
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: user.customer_id, email: user.email, name: buildName(user.first_name, user.last_name) },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        customer_id: user.customer_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        name: buildName(user.first_name, user.last_name)
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

function buildName(first, last) {
  const a = (first || '').trim();
  const b = (last || '').trim();
  return (a && b) ? `${a} ${b}` : (a || b || null);
}

module.exports = router;
