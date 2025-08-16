const express = require('express');
const pool = require('../db');
const auth = require('./auth');
const router = express.Router();

async function ensurePendingOrder(customerId) {
  const [rows] = await pool.query('SELECT order_id FROM orders WHERE customer_id=? AND status="pending"', [customerId]);
  if (rows.length) return rows[0].order_id;
  const [r] = await pool.query('INSERT INTO orders (customer_id, status, total_cents) VALUES (?,?,0)', [customerId, 'pending']);
  return r.insertId;
}

router.get('/', auth, async (req, res) => {
  const orderId = await ensurePendingOrder(req.user.id);
  const [items] = await pool.query(
    `SELECT oi.order_item_id AS id, oi.product_id, p.name, p.price_cents, p.stock, oi.quantity AS qty
     FROM order_items oi
     JOIN products p ON p.product_id=oi.product_id
     WHERE oi.order_id=?`,
    [orderId]
  );
  res.json({ ok: true, userId: req.user.id, items: [] });
});

router.post('/items', auth, async (req, res) => {
  const { product_id, qty } = req.body || {};
  if (!product_id || !qty || qty < 1) return res.status(400).json({ error: 'product_id and qty>0' });
  const orderId = await ensurePendingOrder(req.user.id);

  //QUERY my beloved
  await pool.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price_cents)
     SELECT ?, p.product_id, ?, p.price_cents FROM products p WHERE p.product_id=? AND p.is_active=1
     ON DUPLICATE KEY UPDATE quantity = LEAST(order_items.quantity + VALUES(quantity), 999)`,
    [orderId, qty, product_id]
  );

  const [items] = await pool.query(`SELECT order_item_id AS id, product_id, quantity AS qty FROM order_items WHERE order_id=?`, [orderId]);
  res.status(201).json({ order_id: orderId, items });
});

router.patch('/items/:id', auth, async (req, res) => {
  const { qty } = req.body || {};
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'qty must be >=1' });

  //QQQQUUUUEEEEERRRRYYYYYYY
  const [own] = await pool.query(
    `SELECT oi.order_item_id FROM order_items oi
     JOIN orders o ON o.order_id=oi.order_id
     WHERE oi.order_item_id=? AND o.customer_id=? AND o.status='pending'`,
    [req.params.id, req.user.id]
  );
  if (!own.length) return res.status(404).json({ error: 'item not found' });

  await pool.query('UPDATE order_items SET quantity=? WHERE order_item_id=?', [qty, req.params.id]);
  res.json({ ok: true });
});

router.delete('/items/:id', auth, async (req, res) => {
  await pool.query(
    `DELETE oi FROM order_items oi
     JOIN orders o ON o.order_id=oi.order_id
     WHERE oi.order_item_id=? AND o.customer_id=? AND o.status='pending'`,
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

module.exports = router;
