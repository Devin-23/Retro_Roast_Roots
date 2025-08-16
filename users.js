const express = require('express');
const { one } = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

/* was really close to just leaving it like this...
GET /api/users/me
header: Authorization: Bearer <token>
*/
router.get('/me', requireAuth, async (req, res) => {
  const id = req.user.id;

  const u = await one(
    `SELECT customer_id, email, first_name, last_name, created_at
     FROM customers WHERE customer_id = :id`,
    { id }
  );
  if (!u) return res.status(404).json({ error: 'User not found' });

  res.json({
    customer_id: u.customer_id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    name: buildName(u.first_name, u.last_name),
    created_at: u.created_at
  });
});

function buildName(first, last) {
  const a = (first || '').trim();
  const b = (last || '').trim();
  return (a && b) ? `${a} ${b}` : (a || b || null);
}

module.exports = router;
