const express = require('express');
const pool = require('../db');
const auth = require('./auth');
const router = express.Router();

router.post('/checkout', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    //Lock in the pending order... if the checkout button would work...
    const [[order]] = await conn.query(
      `SELECT order_id FROM orders WHERE customer_id=? AND status='pending' FOR UPDATE`,
      [req.user.id]
    );
    if (!order) { await conn.rollback(); return res.status(400).json({ error: 'no pending cart' }); }

    //can't let someone else scoup it from under you
    const [items] = await conn.query(
      `SELECT oi.order_item_id, oi.product_id, oi.quantity, p.name, p.stock, p.price_cents
       FROM order_items oi
       JOIN products p ON p.product_id=oi.product_id
       WHERE oi.order_id=? FOR UPDATE`,
      [order.order_id]
    );
    if (!items.length) { await conn.rollback(); return res.status(400).json({ error: 'empty cart' }); }

    //checking the item stock to make sure you can actually get you stuff
    for (const it of items) {
      if (it.quantity > it.stock) {
        await conn.rollback();
        return res.status(409).json({ error: `Insufficient stock for ${it.name}`, product_id: it.product_id });
      }
    }

    const total = items.reduce((s, it) => s + it.price_cents * it.quantity, 0);

    //we lose stock
    for (const it of items) {
      await conn.query('UPDATE products SET stock = stock - ? WHERE product_id=?', [it.quantity, it.product_id]);
      //make sure you're giving us the correct monies :)
      await conn.query('UPDATE order_items SET price_cents=? WHERE order_item_id=?', [it.price_cents, it.order_item_id]);
    }

    //and thanks for your order...
    await conn.query('UPDATE orders SET status="paid", total_cents=? WHERE order_id=?', [total, order.order_id]);

    await conn.commit();
    res.json({ order_id: order.order_id, total_cents: total });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    //or not if it failed... which it did... alot...
    res.status(500).json({ error: 'checkout failed' });
  } finally {
    conn.release();
  }
});

//purchase history that just would not display no matter what...
router.get('/my', auth, async (req, res) => {
  const [orders] = await pool.query(
    `SELECT order_id, total_cents, status, created_at
     FROM orders WHERE customer_id=? AND status IN ('paid','shipped','cancelled')
     ORDER BY order_id DESC`,
    [req.user.id]
  );
  if (!orders.length) return res.json([]);

  const ids = orders.map(o => o.order_id);
  const [items] = await pool.query(
    `SELECT order_id, product_id, price_cents, quantity
     FROM order_items
     WHERE order_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );

  const byOrder = {};
  for (const o of orders) byOrder[o.order_id] = { ...o, items: [] };
  for (const it of items) byOrder[it.order_id].items.push(it);

  res.json(Object.values(byOrder));
});

module.exports = router;
