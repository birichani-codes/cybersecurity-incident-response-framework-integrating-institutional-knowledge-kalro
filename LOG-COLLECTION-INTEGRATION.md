# KALRO Centralized Logging Integration Checklist

## Server Configuration

### 1. Update `server/index.js` to include log collection routes

Add this line after the existing routes (around line 44):

```javascript
app.use('/api/log-collection', require('./routes/log-collection'));
```

---

## API Usage Examples

### 1. Submit Single Log via API

```bash
curl -X POST http://localhost:10000/api/log-collection/api \
  -H "Content-Type: application/json" \
  -d '{
    "source": "firewall-core-01",
    "event_type": "brute_force_attempt",
    "timestamp": "2026-05-10T10:30:45Z",
    "source_ip": "192.168.1.100",
    "target_ip": "10.0.0.1",
    "message": "15 failed login attempts detected in 5 minutes",
    "severity": "high",
    "station_id": "Site A"
  }'
```

### 2. Submit Batch of Logs

```bash
curl -X POST http://localhost:10000/api/log-collection/api \
  -H "Content-Type: application/json" \
  -d '{
    "source": "ids-suricata",
    "station_id": "Site B",
    "events": [
      {
        "event_type": "alert",
        "timestamp": "2026-05-10T10:30:00Z",
        "source_ip": "203.0.113.50",
        "target_ip": "10.0.0.50",
        "message": "ET MALWARE SuspiciousDomain Visit"
      },
      {
        "event_type": "alert",
        "timestamp": "2026-05-10T10:30:15Z",
        "source_ip": "203.0.113.50",
        "target_ip": "10.0.0.50",
        "message": "ET POLICY Suspicious User-Agent"
      }
    ]
  }'
```

### 3. Generic Webhook (e.g., from Splunk)

```bash
curl -X POST http://localhost:10000/api/log-collection/webhook \
  -H "Content-Type: application/json" \
  -H "X-Source-Type: splunk" \
  -H "X-Station-ID: Site A" \
  -H "X-API-Key: demo-api-key-001" \
  -d '{
    "result": {
      "src_ip": "192.168.1.50",
      "dst_ip": "10.0.0.1",
      "signature": "Multiple Failed Login Attempts",
      "severity": "high",
      "_time": "2026-05-10T10:30:00Z",
      "event_count": 25
    }
  }'
```

### 4. Test Connection

```bash
curl -X POST http://localhost:10000/api/log-collection/test \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test-client",
    "message": "Testing KALRO log collection"
  }'
```

### 5. Get Collection Statistics

```bash
curl -X GET http://localhost:10000/api/log-collection/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Trigger Processing

```bash
curl -X POST http://localhost:10000/api/log-collection/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Integration with Network Devices

### Firewall (Palo Alto, Fortinet, Cisco)

**Configure syslog forwarding to KALRO:**

```
Destination: 192.168.100.50:514  (your KALRO server)
Protocol: UDP
Format: CEF or Syslog
Facility: Local6
```

### IDS/IPS (Suricata, Zeek)

**Send JSON alerts to webhook:**

```yaml
# suricata.yaml
outputs:
  - eve-log:
      enabled: yes
      filename: eve.json
      types:
        - alert
        - http
  - http-log:
      enabled: yes
      uri: http://192.168.100.50:10000/api/log-collection/webhook?source=suricata
      headers:
        X-Source-Type: suricata
        X-API-Key: demo-api-key-001
```

### EDR/Endpoint (CrowdStrike, Carbon Black)

**Create integration via API:**

```python
import requests

def send_endpoint_alert(alert_data):
    response = requests.post(
        'http://192.168.100.50:10000/api/log-collection/api',
        json={
            'source': 'crowdstrike-falcon',
            'station_id': 'Site A',
            'events': [
                {
                    'event_type': alert_data['event_type'],
                    'source_ip': alert_data['device_ip'],
                    'target_ip': alert_data.get('remote_ip'),
                    'message': alert_data['message'],
                    'severity': alert_data['severity'],
                    'timestamp': alert_data['timestamp']
                }
            ]
        }
    )
    return response.json()
```

### SIEM (Splunk, ELK, ArcSight)

**Configure alert webhook in your SIEM:**

- Alert Action: Webhook
- URL: `http://192.168.100.50:10000/api/log-collection/webhook`
- Headers: `X-API-Key: demo-api-key-001`
- Format: JSON

---

## Processing Pipeline

The system runs automatically, but you can also trigger manually:

### Automatic Processing (Every 5 minutes)

```javascript
// Add to server/index.js after routes definition
setInterval(async () => {
  try {
    console.log('[KALRO] Running automated SIEM processing...');
    
    const siemEngine = require('./services/siemEngine');
    const alertEnrichment = require('./services/alertEnrichment');
    
    // Process SIEM queue
    const siemResults = siemEngine.processSiemQueue();
    console.log(`[KALRO] SIEM: ${siemResults.alerts_generated} alerts generated`);
    
    // Create incidents from alerts
    const enrichResults = alertEnrichment.processPendingAlerts();
    console.log(`[KALRO] Enrichment: ${enrichResults.incidents_created} incidents created`);
    
  } catch (error) {
    console.error('[KALRO] Processing error:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## Data Files Reference

The system stores data in JSON files in `server/data/`:

| File | Purpose |
|------|---------|
| `raw_logs.json` | All ingested raw logs |
| `siem_alerts.json` | Processed SIEM alerts |
| `incidents.json` | Created incidents (enhanced with SIEM data) |
| `notifications.json` | System notifications |
| `knowledge.json` | Defensive routines & procedures |
| `siem_queue.json` | Logs pending SIEM processing |
| `assets.json` | Network asset database (optional) |

---

## Dashboard Integration

### Real-time Incident Feed Component

Update `client/src/pages/Dashboard.jsx` to show SIEM-generated incidents:

```jsx
// Add to Dashboard component
useEffect(() => {
  // Fetch recent SIEM incidents
  api.get('/incidents?status=open&sort=created_at&limit=10')
    .then(r => {
      const siemIncidents = r.data.filter(inc => inc.created_by === 'SIEM');
      setSiemFeed(siemIncidents);
    });
  
  // Poll for new alerts every 10 seconds
  const interval = setInterval(() => {
    api.get('/incidents?status=open&limit=5')
      .then(r => setSiemFeed(r.data.filter(inc => inc.created_by === 'SIEM')));
  }, 10000);
  
  return () => clearInterval(interval);
}, []);
```

### Display Suggested Actions

```jsx
{incident.suggested_routines && incident.suggested_routines.length > 0 && (
  <div className="suggested-actions">
    <h4>Suggested Response Actions</h4>
    {incident.suggested_routines.map(routine => (
      <div key={routine.routine_id} className="routine-card">
        <div>{routine.title}</div>
        <div>Success Rate: {(routine.success_rate * 100).toFixed(0)}%</div>
        <button onClick={() => executeRoutine(routine.routine_id)}>
          Execute Routine
        </button>
      </div>
    ))}
  </div>
)}
```

---

## Monitoring & Maintenance

### Check System Health

```bash
curl -s http://localhost:10000/api/log-collection/status \
  -H "Authorization: Bearer $JWT_TOKEN" | jq
```

### Expected Response

```json
{
  "system_status": "operational",
  "pipeline_health": {
    "raw_logs": {
      "total": 45230,
      "unprocessed": 128
    },
    "siem_alerts": {
      "total": 1240,
      "pending": 15
    },
    "incidents": {
      "total": 128,
      "open": 12
    }
  },
  "timestamp": "2026-05-10T14:30:00Z"
}
```

### Cleanup Old Logs

```javascript
const logIngestion = require('./services/logIngestion');
logIngestion.clearOldLogs(30); // Clear logs older than 30 days
```

---

## Performance Tuning

### For High Event Volume (10k+ events/minute)

1. **Increase batch size**: Modify `siemEngine.processSiemQueue()` to process in larger batches
2. **Add Redis caching**: Cache threat intel lookups
3. **Implement log rotation**: Archive old logs to external storage
4. **Scale horizontally**: Run multiple SIEM analysis workers

### Typical Processing Times

- Log ingestion: ~1ms per log
- SIEM analysis: ~5ms per correlated event
- Enrichment: ~20ms per alert
- Incident creation: ~10ms per incident

**End-to-end**: Raw event → Incident in ~50-100ms

---

## Troubleshooting

### Problem: Logs not being processed

**Solution:**
```bash
# Check if logs are in queue
node -e "const {read}=require('./server/store'); console.log(JSON.stringify(read('raw_logs').slice(0,3), null, 2))"

# Manually trigger processing
curl -X POST http://localhost:10000/api/log-collection/process \
  -H "Authorization: Bearer $TOKEN"
```

### Problem: Too many false positives

**Solution:** Adjust SIEM rules in `siemEngine.js`:
```javascript
// Lower the correlation threshold
minOccurrences: 5  // Changed from 10

// Add whitelist entries
WHITELIST.ips.push('192.168.100.50/32'); // Trusted system
```

### Problem: High memory usage

**Solution:**
```javascript
// Clear old logs regularly
setInterval(() => {
  logIngestion.clearOldLogs(7); // Keep 7 days instead of 30
}, 24 * 60 * 60 * 1000);
```

---

## Security Best Practices

1. **API Key Management**
   - Store API keys in environment variables, not code
   - Rotate keys regularly
   - Use different keys for different sources

2. **Network Security**
   - Require TLS/HTTPS in production
   - Restrict log ingestion IP addresses
   - Use firewall rules to limit who can submit logs

3. **Access Control**
   - Only SOC leads can manually trigger processing
   - Analysts can view incidents but not modify SIEM rules
   - Admins manage log sources and API keys

4. **Data Retention**
   - Delete raw logs after 30 days
   - Archive incidents after 90 days
   - Keep audit logs for 1+ years

---

## Next Steps

1. **Week 1**: Deploy log ingestion + test with 1-2 log sources
2. **Week 2**: Tune SIEM rules based on your environment
3. **Week 3**: Add more log sources (firewall, IDS, endpoints)
4. **Week 4**: Deploy dashboard enhancements
5. **Week 5+**: Optimize and scale based on event volume
