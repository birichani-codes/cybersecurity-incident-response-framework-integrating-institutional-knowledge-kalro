require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// 1. DYNAMIC PORT & HOST FOR DEPLOYMENT (Fixes 502 Bad Gateway)
const PORT = process.env.PORT || 10000; 
const HOST = '0.0.0.0'; // Essential for Render/Vercel communication

// 2. STRATEGIC CORS CONFIGURATION
// Add your Vercel URL to this array to secure the Socio-Technical data
const allowedOrigins = [
  'https://vercel.app',
  'http://localhost:5173' // Kept for local development
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy Violation: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Handle OPTIONS pre-flight for Game Theory and Auth routes
app.options('*', cors());

app.use(express.json());

// 3. CORE FRAMEWORK ROUTES
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/incidents',     require('./routes/incidents'));
app.use('/api/knowledge',     require('./routes/knowledge')); // KBV: Institutional Memory
app.use('/api/search',        require('./routes/search'));
app.use('/api/reports',       require('./routes/reports'));   // PDF Report Generation
app.use('/api/pir',           require('./routes/pir'));       // Knowledge Capture Loop
app.use('/api/game-theory',   require('./routes/game-theory')); // Strategic Decision Engine
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/sync',          require('./routes/sync'));      // Decentralized Sync logic
app.use('/api/notifications', require('./routes/notifications')); // Role-based alerts

// 4. AUDIT & GOVERNANCE
const { router: auditRouter } = require('./routes/audit');
app.use('/api/audit', auditRouter);

// 5. HEALTH CHECK (For Render/Vercel monitoring)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    engine: 'KALRO IKF Strategic Engine',
    decentralized: true,
    time: new Date().toISOString() 
  });
});

// 6. GLOBAL ERROR HANDLING (Socio-Technical System Integrity)
app.use((err, req, res, next) => {
  console.error('System Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Strategic Engine Error',
    message: err.message 
  });
});

// 7. START SERVER (Binding to 0.0.0.0 is the key fix)
app.listen(PORT, HOST, () => {
  console.log(`
  ================================================
  KALRO IKF STRATEGIC ENGINE LOADED
  Status: Running on http://${HOST}:${PORT}
  Mode:   Decentralized Architecture
  ================================================
  `);
});
