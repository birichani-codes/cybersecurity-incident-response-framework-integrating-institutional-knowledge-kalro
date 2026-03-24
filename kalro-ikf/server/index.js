require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const knowledgeRoutes = require('./routes/knowledge');
const searchRoutes = require('./routes/search');
const reportsRoutes = require('./routes/reports');
const { router: auditRoutes } = require('./routes/audit');

const app = express();

// ✅ IMPORTANT: Render provides PORT automatically
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);

// Health check (good for Render monitoring)
app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
  })
);

// Error handler (keep it LAST)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ IMPORTANT: Render needs 0.0.0.0 binding (safe fix)
app.listen(PORT, '0.0.0.0', () =>
  console.log(`KALRO IKF API running on port ${PORT}`)
);