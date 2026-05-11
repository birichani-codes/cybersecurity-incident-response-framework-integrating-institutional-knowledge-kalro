# KALRO Centralized Logging - Visual Implementation Map

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NETWORK SECURITY EVENTS                          │
│      (Firewalls, IDS/IPS, EDR, Endpoints, Cloud, Applications)    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    [SYSLOG]           [API]              [WEBHOOK]
    Port 514          HTTP POST           HTTP POST
    UDP/TCP        logIngestion.js    logIngestion.js
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │    LOG INGESTION SERVICE            │
        │  📄 logIngestion.js                 │
        │                                     │
        │  ✓ Parse multiple formats           │
        │  ✓ Normalize to standard schema     │
        │  ✓ Deduplicate (5-min window)       │
        │  ✓ Validate & filter                │
        │  ✓ Buffer for performance           │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │    📦 Storage: raw_logs.json        │
        │    📦 Queue: siem_queue.json        │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │     SIEM ANALYSIS ENGINE            │
        │  🔍 siemEngine.js                   │
        │                                     │
        │  ✓ Pattern matching                 │
        │    - 6 threat rules                 │
        │    - Custom rule support            │
        │                                     │
        │  ✓ Event correlation                │
        │    - Time-window based              │
        │    - Multi-source linking           │
        │    - Attack chain detection         │
        │                                     │
        │  ✓ Severity elevation               │
        │    - Context-aware (asset critical) │
        │    - Threat intel score             │
        │    - Historical analysis            │
        │                                     │
        │  ✓ False positive reduction         │
        │    - Whitelisting                   │
        │    - Deduplication                  │
        │    - Confidence scoring             │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │    📦 Storage: siem_alerts.json     │
        │                                     │
        │  Alert {                            │
        │    id, name, severity, confidence,  │
        │    event_count, source_ip, target   │
        │  }                                  │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────────────────────┐
        │      ALERT ENRICHMENT ENGINE                       │
        │  🧠 alertEnrichment.js                             │
        │                                                    │
        │  ┌─ Asset Enrichment ─────────────────────────┐  │
        │  │ • Lookup: IP → hostname, criticality       │  │
        │  │ • Identify target importance               │  │
        │  └────────────────────────────────────────────┘  │
        │                                                    │
        │  ┌─ Threat Intelligence ──────────────────────┐  │
        │  │ • Source IP reputation check               │  │
        │  │ • Historical attack analysis               │  │
        │  │ • Geolocation & ASN lookup                 │  │
        │  └────────────────────────────────────────────┘  │
        │                                                    │
        │  ┌─ Historical Context ───────────────────────┐  │
        │  │ • Find similar incidents (past 90 days)    │  │
        │  │ • Extract resolution patterns              │  │
        │  │ • Calculate success rates                  │  │
        │  └────────────────────────────────────────────┘  │
        │                                                    │
        │  ┌─ Routine Suggestion ───────────────────────┐  │
        │  │ • Query knowledge base                     │  │
        │  │ • Match by incident type & severity        │  │
        │  │ • Rank by success rate                     │  │
        │  │ • Return top 5 suggestions                 │  │
        │  └────────────────────────────────────────────┘  │
        │                                                    │
        │  ┌─ Priority Calculation ─────────────────────┐  │
        │  │ • Severity weight (40%)                    │  │
        │  │ • Confidence weight (30%)                  │  │
        │  │ • Event frequency (20%)                    │  │
        │  │ • Target criticality (10%)                 │  │
        │  └────────────────────────────────────────────┘  │
        └──────────────────┬───────────────────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │    CREATE INCIDENT                  │
        │  📋 alertToIncident()               │
        │                                     │
        │  Incident {                         │
        │    id, title, severity, status,    │
        │    source, target,                 │
        │    suggested_routines,             │
        │    related_knowledge,              │
        │    threat_intel,                   │
        │    historical_context,             │
        │    sla_deadline,                   │
        │    priority_score                  │
        │  }                                  │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │    📦 Storage: incidents.json       │
        │    ✓ Enriched with institutional   │
        │      knowledge & context           │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │   NOTIFICATION ROUTING              │
        │  📬 notifications.js                │
        │                                     │
        │  Routes based on:                   │
        │  • Severity (critical → SOC lead)   │
        │  • User role (analyst vs admin)     │
        │  • Station assignment               │
        │  • Skill match (malware expert?)    │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │    📦 Storage: notifications.json   │
        └──────────────────┬──────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      [DASHBOARD]      [EMAIL]         [WEBHOOKS]
      Real-time      Escalation    3rd-party Tools
      Incident       Alerts        (Slack, etc)
      Feed
```

---

## 📊 Data Transformation Pipeline

### Level 1: Raw Event
```
"May 10 10:30:45 fw01 [DROP] failed_login from 192.168.1.100 to 10.0.0.1"
↓ (Parse & normalize)
```

### Level 2: Normalized Log
```json
{
  "id": "log-1715421045123",
  "timestamp": "2026-05-10T10:30:45Z",
  "source_ip": "192.168.1.100",
  "target_ip": "10.0.0.1",
  "event_type": "brute_force",
  "severity_raw": "high"
}
↓ (Correlate events)
```

### Level 3: SIEM Alert
```json
{
  "id": "alert-1715421065789",
  "alert_name": "Brute Force Attack",
  "event_count": 15,
  "severity": "critical",
  "confidence": 0.94
}
↓ (Enrich with context)
```

### Level 4: Enriched Alert
```json
{
  "...": "...",
  "source_asset": { "criticality": "medium" },
  "target_asset": { "criticality": "critical" },  ← Elevation trigger
  "threat_intel": { "reputation": "internal" },
  "historical_incidents": [ "similar past incident" ],
  "suggested_routines": [ "Network Isolation (92%)" ],
  "priority_score": 92
}
↓ (Create incident)
```

### Level 5: Actionable Incident
```json
{
  "id": "inc-20260510-brute-dc",
  "title": "Brute Force Attack - Domain Controller",
  "severity": "critical",
  "suggested_routines": [
    {
      "title": "Network Isolation Protocol",
      "success_rate": 0.92,
      "steps": ["Isolate IP", "Block traffic", "Investigate"]
    }
  ],
  "sla_deadline": "2026-05-10T12:35:00Z"
}
```

---

## 🔄 Processing Loop

```
┌─────────────────────────────────────────────┐
│  EVERY 5 MINUTES (configurable)             │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │ SIEM Processing     │
        │ processSiemQueue()  │
        │                     │
        │ 1. Read unprocessed │
        │    logs             │
        │ 2. Apply rules      │
        │ 3. Correlate events │
        │ 4. Generate alerts  │
        │ 5. Update queue     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────┐
        │ Enrichment Processing   │
        │ processPendingAlerts()  │
        │                         │
        │ 1. Read new alerts      │
        │ 2. Enrich each alert    │
        │ 3. Create incidents     │
        │ 4. Send notifications   │
        │ 5. Mark as processed    │
        └──────────┬──────────────┘
                   │
        ┌──────────▼──────────┐
        │ Dashboard Update    │
        │ Real-time display   │
        │ (via API polling)   │
        └─────────────────────┘
```

---

## 📚 Key Files Structure

```
kalro-ikf/
├── server/
│   ├── index.js .................... (ADD: route + interval)
│   ├── services/
│   │   ├── logIngestion.js ......... (NEW: log collection)
│   │   ├── siemEngine.js ........... (NEW: analysis)
│   │   └── alertEnrichment.js ...... (NEW: enrichment)
│   ├── routes/
│   │   ├── incidents.js ............ (EXISTING)
│   │   ├── notifications.js ........ (EXISTING)
│   │   ├── log-collection.js ....... (NEW: API endpoints)
│   │   └── ...
│   └── data/
│       ├── incidents.json .......... (enhanced with SIEM data)
│       ├── raw_logs.json ........... (NEW: ingested logs)
│       ├── siem_alerts.json ........ (NEW: processed alerts)
│       ├── siem_queue.json ......... (NEW: processing queue)
│       └── ...
│
├── client/
│   └── src/pages/
│       ├── Dashboard.jsx ........... (ENHANCE: show SIEM incidents)
│       └── ...
│
└── [DOCUMENTATION FILES]
    ├── CENTRALIZED-LOGGING-ARCHITECTURE.md
    ├── IMPLEMENTATION-GUIDE.md
    ├── LOG-COLLECTION-INTEGRATION.md
    ├── SERVER-CONFIGURATION.md
    ├── COMPLETE-IMPLEMENTATION-SUMMARY.md
    ├── QUICK-REFERENCE.md
    └── THIS FILE
```

---

## 🎯 Expected Integration Timeline

```
Week 1: CORE SETUP
│
├─ Day 1-2: Create services
│           (logIngestion, siemEngine, alertEnrichment)
│           EST: 4 hours
│
├─ Day 3: Create API routes & update server
│         EST: 2 hours
│
└─ Day 4-5: Test ingestion & SIEM processing
           EST: 3 hours
           Output: Working log collection + alert generation


Week 2-3: LOG SOURCE INTEGRATION
│
├─ Configure Firewall (Syslog)
│  EST: 4 hours
│
├─ Configure IDS/IPS (Webhook)
│  EST: 4 hours
│
└─ Test end-to-end data flow
   EST: 3 hours
   Output: Incidents automatically created from real events


Week 4: DASHBOARD & PRODUCTION
│
├─ Enhance Dashboard.jsx
│  EST: 3 hours
│
├─ Add real-time updates
│  EST: 2 hours
│
├─ Security hardening
│  EST: 2 hours
│
└─ Team training & go-live
   EST: 2 hours
   Output: Live monitoring, automatic incident creation
```

---

## 🧪 Quick Test Scenarios

### Scenario 1: Single Event
```
1. Send test log via API
2. Verify stored in raw_logs.json
3. Trigger processing
4. Check if alert generated (depends on threshold)
```

### Scenario 2: Correlated Attack
```
1. Send 10+ brute force logs from same IP in 5 minutes
2. SIEM detects correlation
3. Alert generated (confidence: 0.94)
4. Incident created automatically
5. Suggested routine appears
```

### Scenario 3: Critical Asset Attack
```
1. Attack targets domain controller (critical asset)
2. Severity elevated by enrichment
3. Incident marked as "major"
4. Notification sent to SOC lead
5. Suggested routine recommended
```

---

## 📈 Performance Targets

```
Single Event Processing:
  Ingestion .................. 1ms
  Dedup check ................ <1ms
  SIEM rule matching ......... 2ms
  Correlation (if applicable) 5ms
  Enrichment ................. 20ms
  Incident creation .......... 10ms
  Notification ............... 5ms
                          ────────
  TOTAL (e2e) ................ ~50ms

Throughput:
  Development mode ........... 1,000 events/min
  With batching .............. 10,000 events/min
  Enterprise scale ........... 100,000+ events/min

Storage (per day):
  100 events/min × 1,440 min × 2KB ≈ 300 MB/day
  Retention: 30 days ≈ 9 GB
  Retention: 90 days ≈ 27 GB
```

---

## ✅ Success Indicators

✓ **You'll know it's working when:**

1. **Logs are ingested**: Test API returns 202 Accepted
2. **SIEM generates alerts**: Check `siem_alerts.json` has entries
3. **Incidents auto-created**: New incidents appear with `"created_by": "SIEM"`
4. **Enrichment works**: Incidents have `suggested_routines` populated
5. **Notifications sent**: Dashboard shows new alerts
6. **Dashboard updates**: Real-time incident feed shows SIEM events
7. **SLA calculated**: `sla_deadline` set correctly
8. **Priority scored**: `priority_score` between 0-100

---

## 🚀 What's Next After Implementation

### Phase 2: Advanced Features
- Custom SIEM rules for your environment
- Threat intelligence API integrations
- Machine learning for anomaly detection
- Automated response playbooks

### Phase 3: Enterprise Scale
- Redis caching for performance
- Elasticsearch for long-term log storage
- Kubernetes orchestration
- Distributed SIEM processing

### Phase 4: Integration Ecosystem
- SOAR platform integration
- Ticketing system sync (Jira, ServiceNow)
- Slack/Teams notifications
- Compliance reporting (SOC 2, NIST)

---

## 📞 Quick Troubleshooting

| Problem | Check | Fix |
|---------|-------|-----|
| Logs not ingested | API endpoint accessible? | Add route to server/index.js |
| Alerts not generated | SIEM processing running? | Enable interval in server/index.js |
| Incidents not created | Enrichment service loaded? | Check require() paths |
| No suggested routines | Knowledge base populated? | Check defensive_routine objects |
| High false positives | Rules tuned for environment? | Adjust minOccurrences in rules |
| High memory usage | Old logs being archived? | Enable log cleanup |

---

## 🎓 Learning Path

```
1. START HERE: Read QUICK-REFERENCE.md (10 min)
                ↓
2. UNDERSTAND: Read COMPLETE-IMPLEMENTATION-SUMMARY.md (20 min)
                ↓
3. PLAN: Review CENTRALIZED-LOGGING-ARCHITECTURE.md (15 min)
                ↓
4. IMPLEMENT: Follow SERVER-CONFIGURATION.md (2 hours)
                ↓
5. INTEGRATE: Use LOG-COLLECTION-INTEGRATION.md (1-4 hours per source)
                ↓
6. TEST: Verify with IMPLEMENTATION-GUIDE.md (1 hour)
                ↓
7. DEPLOY: Go live and monitor
```

---

Created: May 10, 2026
System: KALRO (Cybersecurity Incident Response Framework)
Status: ✅ Ready for Implementation
