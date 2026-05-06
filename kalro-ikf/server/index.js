require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// 1. DYNAMIC PORT & HOST FOR DEPLOYMENT
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// 2. CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://cybersecurity-incident-response-fra.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.options('*', cors());

app.use(express.json());

// 3. CORE FRAMEWORK ROUTES
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/incidents',     require('./routes/incidents'));
app.use('/api/knowledge',     require('./routes/knowledge'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/pir',           require('./routes/pir'));
app.use('/api/game-theory',   require('./routes/game-theory'));
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/sync',          require('./routes/sync'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/sde',           require('./routes/sde'));

// 4. AUDIT & GOVERNANCE
const { router: auditRouter } = require('./routes/audit');
app.use('/api/audit', auditRouter);

// 5. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'KALRO IKF Strategic Engine',
    decentralized: true,
    time: new Date().toISOString()
  });
});

// 6. GLOBAL ERROR HANDLING
app.use((err, req, res, next) => {
  console.error('System Error:', err.stack);
  res.status(500).json({
    error: 'Internal Strategic Engine Error',
    message: err.message
  });
});

// 7. START SERVER
app.listen(PORT, HOST, () => {
  console.log(`
  ================================================
  KALRO IKF STRATEGIC ENGINE LOADED
  Status: Running on http://${HOST}:${PORT}
  Allowed Origins: ${allowedOrigins.join(', ')}
  Mode:   Decentralized Architecture
  ================================================
  `);
});