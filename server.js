require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

//ended up needing to this... still don't know why (at least not completely)
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

const PUBLIC_DIR = path.join(__dirname, '..', 'Public');
app.use(express.static(PUBLIC_DIR));

//stay healthy kids
app.get('/api/health', (_req, res) => res.json({ ok: true }));

//those api routes...
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));

//had to start serving the .html files just directly (without wildcard) because ngrok kept breaking
app.get(/.*\.html$/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, req.path));
});

//a reminder cause this happend for EVERY api
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  next();
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
