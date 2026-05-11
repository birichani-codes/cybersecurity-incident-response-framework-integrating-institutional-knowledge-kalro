# Centralized Logging & Alerting Architecture for KALRO

## Executive Overview

This document outlines how to implement a **Network-Wide Centralized Logging System** that:
1. **Collects** raw logs from network devices, endpoints, and applications
2. **Analyzes** them via SIEM logic to detect security events
3. **Transforms** alerts into actionable incidents with institutional knowledge context
4. **Routes** notifications in real-time to appropriate responders
5. **Enriches** incidents with defensive routines and historical patterns

---

## Current KALRO System Architecture

### Existing Components ✓
- **Incident Management**: Incidents tracked with severity, SLA, status
- **Knowledge Base**: Defensive routines, playbooks, procedures linked to incidents
- **Alerts System**: Knowledge pulse alerts with source/target stations
- **Notifications**: User/station-based notification routing
- **Audit Trail**: Full action logging for governance
- **Game Theory Logic**: Strategic decision recommendations
- **Sync System**: Multi-station coordination

### Gap Analysis - What's Missing
- **Raw Log Ingestion**: No mechanism to receive logs from devices
- **SIEM Analysis**: No event correlation/enrichment engine
- **Alert Deduplication**: No dedup logic for repeated events
- **Real-time Webhooks**: No outbound notification system
- **Syslog Support**: No Syslog protocol listener
- **API Feed Parser**: No log parsing from external APIs
- **Alert Severity Mapping**: No automatic severity assignment
- **Institutional Knowledge Linking**: No automatic routine suggestion

---

## Implementation Architecture

### Layer 1: Log Collection & Ingestion

```
┌─────────────────────────────────────────────────────────┐
│              LOG SOURCES                                │
├─────────────────────────────────────────────────────────┤
│ • Firewalls          • Endpoints (EDR)                  │
│ • IDS/IPS Systems    • Web Servers                      │
│ • DNS Servers        • Email Gateways                   │
│ • Active Directory   • Database Audit Logs              │
│ • Cloud Services     • Custom Applications              │
└─────────────────────┬───────────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
   [Syslog]        [API]          [Webhook]
   Port 514         Pull            Push
      │               │               │
      └───────────────┼───────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│      LOG INGESTION SERVICE (Node.js)                    │
├─────────────────────────────────────────────────────────┤
│ • Parse multiple formats (CEF, Syslog, JSON)           │
│ • Normalize to standard schema                         │
│ • Validate required fields                             │
│ • Enrich with source device metadata                   │
│ • Buffer & batch for performance                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  NORMALIZED LOG STORE  │
         │  (JSON per log)        │
         └────────────────────────┘
```

### Layer 2: SIEM Analysis & Correlation

```
┌─────────────────────────────────────────────────────────┐
│        SIEM ANALYSIS ENGINE                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. PATTERN MATCHING                                   │
│     ✓ Regex rules against log fields                  │
│     ✓ Threat intelligence lookups (IPs, domains)      │
│     ✓ Behavioral anomalies (velocity, volume)         │
│                                                         │
│  2. EVENT CORRELATION                                 │
│     ✓ Multi-source events (failed login + file delete) │
│     ✓ Time window clustering (5-min breach attempts)   │
│     ✓ Attack chain detection                          │
│                                                         │
│  3. SEVERITY MAPPING                                  │
│     ✓ Rule-based scoring                              │
│     ✓ Context from institutional knowledge            │
│     ✓ Asset criticality weighting                     │
│                                                         │
│  4. FALSE POSITIVE REDUCTION                          │
│     ✓ Deduplication (same event < 5 min)              │
│     ✓ Whitelisting (known safe operations)            │
│     ✓ Noise filters (heartbeat events)                │
│                                                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   GENERATED ALERTS     │
         │  (High-confidence)     │
         └────────────────────────┘
```

### Layer 3: Alert Enrichment & Transformation

```
┌─────────────────────────────────────────────────────────┐
│    ALERT ENRICHMENT ENGINE                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  INPUT: Raw Alert {                                    │
│    "event_type": "brute_force_attempt",                │
│    "source_ip": "192.168.1.100",                       │
│    "target": "fileserver.kalro.local",                 │
│    "count": 15,                                        │
│    "severity": "high"                                  │
│  }                                                     │
│                                                         │
│  ✓ ASSET LOOKUP: Identify target device               │
│  ✓ VULNERABILITY CHECK: Any known CVE?                │
│  ✓ THREAT INTEL: Check source IP reputation           │
│  ✓ HISTORICAL ANALYSIS: Similar past incidents?       │
│  ✓ KNOWLEDGE BASE LINKING:                            │
│     - Find defensive routines matching incident        │
│     - Suggest playbooks from institutional knowledge   │
│     - Calculate success rates based on history         │
│  ✓ STATION CONTEXT: Which site? Who responds?         │
│  ✓ SLA ASSIGNMENT: Based on severity & type           │
│                                                         │
│  OUTPUT: Enriched Incident {                           │
│    "id": "inc-xyz",                                    │
│    "title": "Brute Force Attack - File Server",        │
│    "severity": "critical",  (elevated from context)    │
│    "type": "unauthorized_access_attempt",              │
│    "status": "open",                                   │
│    "sla_deadline": "2h",                               │
│    "station_id": "Site A",                             │
│    "suggested_routines": [...],                        │
│    "threat_intel": {...},                              │
│    "related_knowledge": [...],                         │
│    "source": {                                         │
│      "ip": "192.168.1.100",                            │
│      "reputation": "malicious",                        │
│      "geolocation": "Unknown"                          │
│    },                                                  │
│    "target": {...},                                    │
│    "created_at": "2026-05-10T10:30:00Z"               │
│  }                                                     │
│                                                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│   INCIDENT CREATION & PERSISTENCE                      │
│   (Stored in incidents.json)                           │
└─────────────────────┬───────────────────────────────────┘
                      │
```

### Layer 4: Real-time Notification & Routing

```
┌─────────────────────────────────────────────────────────┐
│    NOTIFICATION ENGINE                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • Route based on:                                     │
│    - User role (analyst, admin, responder)             │
│    - Station assignment                                │
│    - Skill match with incident type                    │
│    - Availability status                               │
│                                                         │
│  • Delivery channels:                                  │
│    - In-app notifications (existing)                   │
│    - Email escalation                                  │
│    - Webhooks to 3rd-party tools                       │
│    - SMS for critical incidents                        │
│                                                         │
│  • Severity-based routing:                             │
│    - Critical → Immediate to SOC lead + team           │
│    - High → Team lead + assigned analyst               │
│    - Medium → Assigned analyst                         │
│    - Low → Dashboard queue                             │
│                                                         │
└─────────────────────┬───────────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
  [Notifications]  [Webhooks]    [Email/SMS]
     Store          Outbound        System
```

### Layer 5: Dashboard & Real-time Updates

```
┌─────────────────────────────────────────────────────────┐
│    REAL-TIME DASHBOARD (React Frontend)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Real-time Incident Feed ─────────────────────────┐ │
│  │ • New incidents appear instantly                  │ │
│  │ • Live severity/status updates                    │ │
│  │ • Recommended actions from knowledge base         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Alert Timeline ──────────────────────────────────┐ │
│  │ • Related events that triggered incident          │ │
│  │ • Attack chain visualization                      │ │
│  │ • Source/target relationships                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Suggested Actions ───────────────────────────────┐ │
│  │ • Defensive routine recommendations              │ │
│  │ • Similar past incidents & resolutions            │ │
│  │ • Quick-action buttons (isolate, block, etc)      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ SLA Status ──────────────────────────────────────┐ │
│  │ • Time remaining / breached alerts                │ │
│  │ • Escalation triggers                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. Raw Log (ingestion.json)
```json
{
  "id": "log-2026-05-10-001",
  "timestamp": "2026-05-10T10:30:45.123Z",
  "source_ip": "192.168.1.5",
  "source_hostname": "workstation-5.kalro.local",
  "source_type": "firewall",
  "raw_message": "DROP [SYN FLOOD] src=192.168.1.5 dst=10.0.0.1",
  "event_type": "network_anomaly",
  "fields": {
    "action": "DROP",
    "protocol": "TCP",
    "src_port": "12345",
    "dst_port": "443"
  },
  "severity_raw": "medium",
  "ingested_at": "2026-05-10T10:30:46Z",
  "station_id": "Site A",
  "processed": false
}
```

### 2. SIEM Alert (alerts.json)
```json
{
  "id": "alert-2026-05-10-001",
  "alert_name": "Potential SYN Flood Attack",
  "alert_rule": "rule-syn-flood-001",
  "severity": "high",
  "confidence": 0.85,
  "event_count": 145,
  "time_window": "5m",
  "source_ip": "192.168.1.5",
  "target_ip": "10.0.0.1",
  "related_logs": ["log-2026-05-10-001", "log-2026-05-10-002"],
  "correlation_type": "volumetric_anomaly",
  "created_at": "2026-05-10T10:35:00Z",
  "deduplicated": false,
  "whitelist_status": "not_whitelisted"
}
```

### 3. Enriched Incident (incidents.json - enhanced)
```json
{
  "id": "inc-20260510-syn-flood",
  "title": "Potential SYN Flood Attack - File Server",
  "type": "network_attack",
  "severity": "critical",
  "status": "open",
  "station_id": "Site A",
  "description": "Detected SYN flood pattern from workstation-5 targeting file server",
  "created_at": "2026-05-10T10:35:00Z",
  "created_by": "SIEM",
  "source": {
    "ip": "192.168.1.5",
    "hostname": "workstation-5.kalro.local",
    "type": "endpoint",
    "reputation": "internal_but_compromised",
    "geolocation": "Site A",
    "asset_criticality": "medium"
  },
  "target": {
    "ip": "10.0.0.1",
    "hostname": "fileserver.kalro.local",
    "type": "file_server",
    "asset_criticality": "critical"
  },
  "siem_context": {
    "alert_id": "alert-2026-05-10-001",
    "rule_name": "Potential SYN Flood Attack",
    "event_count": 145,
    "time_window": "5 minutes",
    "related_events": 8
  },
  "threat_intel": {
    "source_reputation": "unknown_but_internal",
    "known_cves": [],
    "similar_attacks_past_30days": 2,
    "last_similar_incident": {
      "id": "inc-20260501-syn-v2",
      "resolution_time": "45 minutes",
      "routine_used": "routine-network-isolation"
    }
  },
  "suggested_routines": [
    {
      "routine_id": "routine-network-isolation",
      "name": "Network Isolation Protocol",
      "success_rate": 0.92,
      "avg_resolution_time": "30 minutes",
      "applicable_severities": ["critical", "high"],
      "steps": ["Isolate source IP", "Block malicious traffic", "Investigate endpoint"]
    },
    {
      "routine_id": "routine-ddos-response",
      "name": "DDoS Response Procedure",
      "success_rate": 0.88,
      "avg_resolution_time": "45 minutes"
    }
  ],
  "related_knowledge": [
    {
      "id": "know-syn-flood-detection",
      "title": "SYN Flood Detection Patterns",
      "status": "active",
      "confidence_score": 0.95
    }
  ],
  "is_major": false,
  "assigned_to": null,
  "reported_by": "SIEM",
  "sla_deadline": "2026-05-10T12:35:00Z",
  "sla_breached": false,
  "entities": {
    "ips": ["192.168.1.5", "10.0.0.1"],
    "hostnames": ["workstation-5.kalro.local", "fileserver.kalro.local"]
  }
}
```

---

## Implementation Roadmap

### Phase 1: Log Ingestion (Week 1-2)
✓ Create log collection endpoints (Syslog, API, Webhook)
✓ Implement log normalization pipeline
✓ Build log storage and indexing
✓ Add basic validation and filtering

### Phase 2: SIEM Analysis (Week 3-4)
✓ Implement pattern matching rules
✓ Add event correlation logic
✓ Build alert deduplication
✓ Create threat intelligence enrichment

### Phase 3: Incident Enrichment (Week 5-6)
✓ Link SIEM alerts to incidents
✓ Implement knowledge base matching
✓ Auto-suggest defensive routines
✓ Calculate severity based on context

### Phase 4: Real-time Notifications (Week 7)
✓ Implement notification routing
✓ Add webhook delivery system
✓ Build dashboard real-time updates
✓ Add email/SMS escalation

### Phase 5: Dashboard & Monitoring (Week 8)
✓ Real-time incident feed
✓ Alert timeline visualization
✓ Suggested actions UI
✓ SIEM performance metrics

---

## Key Architectural Principles

1. **Separation of Concerns**: Log ingestion → SIEM → Enrichment → Notification
2. **Real-time Priority**: Critical alerts must reach analysts < 30 seconds
3. **Institutional Knowledge Integration**: Every incident linked to relevant procedures
4. **Auditability**: Every alert, decision, and action logged
5. **Scalability**: Support 10,000+ events/minute with batching
6. **Resilience**: Failed processing doesn't block log ingestion

---

## Success Metrics

- Mean time to detect (MTTD): < 2 minutes
- Mean time to respond (MTTR): Reduced by 40%
- False positive rate: < 10%
- Alert relevance: 85%+ of alerts actionable
- SLA compliance: > 95% incidents resolved in SLA
