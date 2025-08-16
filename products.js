const express = require('express');
const { query, one } = require('../db');

const router = express.Router();

//gotta get those items from the database
router.get('/', async (_req, res) => {
  try {
    const [rows] = await query(
      `SELECT product_id, category_id, name, slug, description, price_cents, is_active, stock, created_at
       FROM products
       ORDER BY created_at DESC`
    );

    //make the fields sensible
    const products = rows.map(p => ({
      product_id: p.product_id,
      name: p.name,
      description: p.description,
      price_cents: p.price_cents ?? 0,
      price: (p.price_cents ?? 0) / 100,
      stock: p.stock ?? 0,
      is_active: p.is_active ?? 1,
      //incase the images give up...
      image: `${p.slug || 'placeholder'}.png`,
      slug: p.slug
    }));

    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

/* *insert back in the day joke here* 
GET /api/products/:id
Fetch single product
*/
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = await one(
      `SELECT product_id, category_id, name, slug, description, price_cents, is_active, stock, created_at
       FROM products WHERE product_id = :id`,
      { id }
    );
    if (!p) return res.status(404).json({ error: 'Not found' });

    res.json({
      product_id: p.product_id,
      name: p.name,
      description: p.description,
      price_cents: p.price_cents ?? 0,
      price: (p.price_cents ?? 0) / 100,
      stock: p.stock ?? 0,
      is_active: p.is_active ?? 1,
      image: `${p.slug || 'placeholder'}.png`,
      slug: p.slug
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

module.exports = router;
