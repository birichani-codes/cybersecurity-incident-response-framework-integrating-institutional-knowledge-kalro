# Server Configuration Update Instructions

## Step 1: Update `server/index.js` to include log collection routes

Find this section in your `server/index.js` (around line 40-50):

```javascript
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
```

**Add this line after the other routes:**

```javascript
app.use('/api/log-collection', require('./routes/log-collection'));
```

---

## Step 2: Set up Automatic SIEM Processing

Find the end of your `server/index.js` file (before the listen call), and add:

```javascript
// ========================================
// 5. AUTOMATED SIEM PROCESSING
// ========================================
// Process SIEM queue every 5 minutes
setInterval(async () => {
  try {
    const siemEngine = require('./services/siemEngine');
    const alertEnrichment = require('./services/alertEnrichment');
    
    // Step 1: Analyze logs with SIEM
    const siemResults = siemEngine.processSiemQueue();
    
    if (siemResults.status === 'success') {
      console.log(`[SIEM] Processed ${siemResults.processed} logs, generated ${siemResults.alerts_generated} alerts`);
    }
    
    // Step 2: Enrich alerts and create incidents
    const enrichResults = alertEnrichment.processPendingAlerts();
    
    if (enrichResults.incidents_created > 0) {
      console.log(`[Enrichment] Created ${enrichResults.incidents_created} incidents from ${enrichResults.total_alerts} alerts`);
    }
    
  } catch (error) {
    console.error('[SIEM Processing] Error:', error);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

console.log('[SIEM] Automated processing started (every 5 minutes)');
```

---

## Step 3: Create Asset Database (Optional)

Create `server/data/assets.json` with your known network assets:

```json
[
  {
    "ip": "10.0.0.1",
    "hostname": "domain-controller.kalro.local",
    "type": "directory_service",
    "criticality": "critical",
    "owner": "IT Infrastructure"
  },
  {
    "ip": "10.0.0.2",
    "hostname": "fileserver.kalro.local",
    "type": "file_server",
    "criticality": "critical",
    "owner": "IT Infrastructure"
  },
  {
    "ip": "10.0.0.100",
    "hostname": "sql-primary.kalro.local",
    "type": "database",
    "criticality": "critical",
    "owner": "Database Team"
  },
  {
    "ip": "192.168.1.1",
    "hostname": "firewall.kalro.local",
    "type": "security",
    "criticality": "critical",
    "owner": "Security Team"
  }
]
```

---

## Step 4: Update Raw Logs Storage

Create `server/data/raw_logs.json` (initialized empty):

```json
[]
```

Create `server/data/siem_alerts.json` (initialized empty):

```json
[]
```

---

## Step 5: Configure API Key Management (Optional)

Update the API key validation in `server/routes/log-collection.js`:

```javascript
function validateApiKey(apiKey) {
  // In production, load from environment or secure storage
  const validKeys = process.env.LOG_COLLECTION_KEYS?.split(',') || [
    'demo-api-key-001',
    'firewall-01-key',
    'ids-primary-key'
  ];
  
  return validKeys.includes(apiKey);
}
```

Set environment variables:

```bash
export LOG_COLLECTION_KEYS="firewall-key-abc123,ids-key-def456,endpoint-key-ghi789"
```

---

## Step 6: Enable RBAC for Log Collection (Optional)

Update middleware checks in `server/routes/log-collection.js`:

```javascript
/**
 * Protect sensitive endpoints with authentication
 */
router.get('/stats', authenticate, (req, res) => {
  // Only authenticated users can see stats
  // ...
});

router.post('/process', authenticate, requireMinRole('analyst'), (req, res) => {
  // Only analysts and above can trigger processing
  // ...
});
```

---

## Step 7: Test the Configuration

### Test 1: Verify endpoints are available

```bash
# Check server is running
curl -i http://localhost:10000/api/log-collection/status
```

Expected output: HTTP 401 (needs authentication) or HTTP 200

### Test 2: Submit test log

```bash
curl -X POST http://localhost:10000/api/log-collection/test \
  -H "Content-Type: application/json" \
  -d '{"source": "test", "message": "Configuration test"}'
```

Expected output:
```json
{
  "success": true,
  "message": "Test log ingested successfully",
  "log_id": "log-...",
  "test_connection": "OK"
}
```

### Test 3: Check ingestion statistics

```bash
curl -X GET http://localhost:10000/api/log-collection/stats \
  -H "Authorization: Bearer $YOUR_JWT_TOKEN"
```

Expected output:
```json
{
  "ingestion": {
    "total_logs": 1,
    "processed_logs": 0,
    "unprocessed_logs": 1,
    ...
  },
  "alerts": {...},
  "timestamp": "2026-05-10T..."
}
```

---

## Step 8: Verify Automatic Processing

Check server logs for SIEM processing messages:

```bash
# In your running server terminal, you should see:
# [SIEM] Automated processing started (every 5 minutes)
# [SIEM] Processed X logs, generated Y alerts
# [Enrichment] Created Z incidents from A alerts
```

---

## Troubleshooting

### Error: Cannot find module './services/logIngestion'

**Solution:** Ensure all service files are created in `server/services/` directory:
- `logIngestion.js` ✓
- `siemEngine.js` ✓
- `alertEnrichment.js` ✓

### Error: 404 on /api/log-collection endpoints

**Solution:** Ensure the route is added to server/index.js:
```javascript
app.use('/api/log-collection', require('./routes/log-collection'));
```

### Logs ingested but not creating incidents

**Solution:** Verify the SIEM processing interval is running:
```bash
# Force manual processing
curl -X POST http://localhost:10000/api/log-collection/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### High memory usage

**Solution:** Clear old logs periodically:
```javascript
// Add to your processing interval
const logIngestion = require('./services/logIngestion');
logIngestion.clearOldLogs(30); // Keep only 30 days
```

---

## Deployment Checklist

- [ ] Log collection routes added to server/index.js
- [ ] Automatic SIEM processing interval configured
- [ ] All service files created in server/services/
- [ ] Data files initialized (raw_logs.json, siem_alerts.json)
- [ ] API keys configured for security
- [ ] RBAC middleware applied to sensitive endpoints
- [ ] Test log ingestion verified
- [ ] Dashboard ready to display incidents
- [ ] Log sources configured (firewall, IDS, endpoints)
- [ ] Monitoring setup to check pipeline health

---

## Performance Recommendations

### For Development/Testing
- Log ingestion: Immediate processing
- Processing interval: 1 minute (faster feedback)
- Log retention: 7 days

### For Production
- Log ingestion: Async processing with batching
- Processing interval: 5 minutes (balanced performance)
- Log retention: 30 days (compliance)
- Scale: Consider Redis cache + worker processes for 10k+/min

---

## Next: Dashboard Integration

After server is configured, update the dashboard to show:
1. Real-time incident feed from SIEM
2. Suggested actions for each incident
3. Alert timeline/correlation
4. SLA status indicators

See `client/src/pages/Dashboard.jsx` updates section.
