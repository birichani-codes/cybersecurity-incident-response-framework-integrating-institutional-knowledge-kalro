# Defensive Routine Manager — Documentation & Implementation Guide

## Overview

The **Defensive Routine Manager** is a core module of the Cybersecurity Incident Response Framework (IK-IR) that captures, validates, and operationalizes organizational defensive strategies. It bridges **Game Theory decision support**, **NIST Cybersecurity Framework alignment**, and **Post-Incident Review (PIR) conversion** into reusable, versioned routines.

---

## Purpose

To store, version, and deploy **Validated Strategies** that:
- Map directly to the **Game Theory Payoff Matrix** (payoff ratings based on success rates and business impact)
- Align with **NIST CSF functions** (Identify, Protect, Detect, Respond, Recover)
- Link **Institutional Enablers** (policies, tools, training) required for execution
- Capture **Socio-Technical considerations** (technical vs. social vs. hybrid approaches)
- Enable seamless **PIR-to-Routine conversion** so organizational learning is preserved

---

## Core Features

### 1. Routine Signature
Each routine is linked to specific incident types:
- **Primary Incident Types** – e.g., "SQL Injection," "Unauthorized Access," "Data Exfiltration"
- **Tags** – descriptive keywords for search and matching
- **Routine Signature** – formal identifier (e.g., "unauthorized_access_containment_v2")

### 2. Payoff Rating (Game Theory)
Each routine is assigned a quantitative **Success Probability** and **Implementation Cost**:

| Metric | Calculation | Range |
|--------|-------------|-------|
| **Success Rate** | Exponential smoothing of outcomes | 0.0 – 1.0 |
| **Payoff Weight** | Strategic importance × mitigation potential | 0.0 – 1.0 |
| **Payoff Rating** | (success_rate × 0.7) + (payoff_weight × 0.3) | 0.0 – 1.0 |

- **High Payoff Rating** (0.8+): Routine is proven effective and high-impact → Recommend first
- **Medium Payoff Rating** (0.5–0.8): Routine is moderate; consider for trade-offs
- **Low Payoff Rating** (<0.5): Routine needs improvement or is situational

### 3. Socio-Technical Mapping
Each routine defines which **Institutional Enablers** must be active:

| Enabler Type | Examples |
|---|---|
| **Technical** | Firewall rules, EDR agents, SIEM tuning, automation scripts |
| **Social** | Security awareness training, incident response drills, escalation policies |
| **Policy** | Incident classification, authorization boundaries, vendor contracts |

#### Socio-Technical Focus
- **Technical Focus** → Automated containment, scripts, tool configuration
- **Social Focus** → Training, communication, team coordination
- **Hybrid** → Requires both institutional infrastructure AND human response

---

## Implementation Examples

### Example 1: Rapid Containment Alpha
**Purpose:** Stop data exfiltration immediately

| Attribute | Value |
|-----------|-------|
| **Routine Name** | Rapid Containment Alpha |
| **Primary Goal** | Stop Data Exfiltration |
| **Game Theory Payoff** | Minimizes Loss: Stops attacker gain immediately but has high "Business Downtime" cost |
| **Payoff Weight** | 0.75 (high priority, acceptable business impact) |
| **NIST Function** | Respond (RS) |
| **Socio-Technical Focus** | Technical |
| **Institutional Enablers** | Automated VLAN isolation, Network segmentation policies, EDR agent on compromised host |
| **Associated Scripts** | isolate_vlan.sh, quarantine_endpoint.ps1 |
| **Applicable Incident Types** | data_exfiltration, unauthorized_access |
| **Success Rate** | 0.92 (tested 12 times, 11 successful) |
| **Estimated Time** | 5–15 minutes |

**Routine Content:**
```
1. Identify compromised asset and connected network
2. Execute VLAN isolation script on network switch
3. Notify user and block outbound network access
4. Initiate EDR containment on endpoint
5. Preserve logs for forensics
6. Escalate to security team for investigation
```

---

### Example 2: Strategic Deception
**Purpose:** Profile attacker intent and tactics

| Attribute | Value |
|-----------|-------|
| **Routine Name** | Strategic Deception |
| **Primary Goal** | Attacker Profiling |
| **Game Theory Payoff** | Maximizes Knowledge: Low cost, but higher risk; uses honeyfiles to study the attacker |
| **Payoff Weight** | 0.55 (moderate priority, high learning value) |
| **NIST Function** | Detect (DE) |
| **Socio-Technical Focus** | Social |
| **Institutional Enablers** | Honeypot infrastructure, Policy clearance for monitoring, SIEM alert tuning |
| **Associated Scripts** | deploy_honeypot.sh, monitor_deception.py |
| **Applicable Incident Types** | reconnaissance, credential_theft, insider_threat |
| **Success Rate** | 0.68 (tested 7 times, learned from 6) |
| **Estimated Time** | 30–60 minutes |

**Routine Content:**
```
1. Assess threat level and organizational risk tolerance
2. Coordinate with legal/compliance for monitoring authorization
3. Deploy honeypot/deception infrastructure
4. Monitor attacker interaction with honeyfiles
5. Record tactics, techniques, and objectives (TTO)
6. Document findings for threat intelligence
7. Clean up honeypots and restore normal operations
```

---

### Example 3: Human-Centric Reset
**Purpose:** Remediate social engineering and human error

| Attribute | Value |
|-----------|-------|
| **Routine Name** | Human-Centric Reset |
| **Primary Goal** | Remediation of Social Engineering |
| **Game Theory Payoff** | Increases Resilience: Long-term payoff by reducing future human error |
| **Payoff Weight** | 0.82 (high priority for organizational resilience) |
| **NIST Function** | Identify (ID) / Protect (PR) |
| **Socio-Technical Focus** | Hybrid |
| **Institutional Enablers** | Training & Awareness modules, HR coordination, Threat intelligence, Insider threat program |
| **Associated Scripts** | reset_user_environment.sh, distribute_training.py |
| **Applicable Incident Types** | phishing, social_engineering, credential_compromise, insider_threat |
| **Success Rate** | 0.85 (tested 20 times, prevents 17 recurrences) |
| **Estimated Time** | 1–2 days |

**Routine Content:**
```
1. Identify affected user(s) and reset credentials immediately
2. Audit mailbox forwarding rules and 2FA settings
3. Enroll user in phishing awareness training
4. Schedule 1-on-1 security coaching
5. Monitor user behavior for 30 days
6. Document incident pattern for insider threat assessment
7. Update organizational security baseline if pattern repeats
```

---

## Data Model

### DefensiveRoutine Structure (Knowledge Entry)

```json
{
  "id": "k8f7a9b2",
  "title": "Rapid Containment Alpha",
  "content": "...",
  "tags": ["data_exfiltration", "containment", "network"],
  "incident_id": "inc0012f3",
  "knowledge_type": "defensive-routine",
  "contributor_id": "u5d2f8a1",
  "confidence_score": 0.92,
  "version": 2,
  "status": "active",
  "use_count": 12,
  "last_used_at": "2026-04-28T14:32:00Z",
  "defensive_routine": {
    "enabled": true,
    "category": "playbook",
    "primary_goal": "Stop Data Exfiltration",
    "payoff_weight": 0.75,
    "payoff_rating": 0.84,
    "nist_function": "RS",
    "associated_scripts": ["isolate_vlan.sh", "quarantine_endpoint.ps1"],
    "institutional_enablers": ["Automated VLAN isolation", "Network segmentation policies"],
    "socio_technical_focus": "technical",
    "success_rate": 0.92,
    "times_applied": 12,
    "applicable_incident_types": ["data_exfiltration", "unauthorized_access"],
    "applicable_severities": ["critical", "high"],
    "estimated_time_to_resolve": "15m",
    "routine_signature": ["data_exfiltration", "containment"]
  }
}
```

---

## Technical Roadmap

### Module 4: Defensive Routine Manager

#### Backend (`server/routes/knowledge.js` + `server/logic/defensive-routines.js`)

**Implemented:**
- ✅ Link knowledge entry to routine (`POST /knowledge/:id/link-routine`)
- ✅ Suggest routines for incident (`GET /incidents/:id/defensive-routines`)
- ✅ Record routine application (`POST /incidents/:id/apply-routine/:knowledgeId`)
- ✅ Get routine metrics (`GET /knowledge/defensive-routines/metrics`)
- ✅ Analyze routine coverage (`GET /knowledge/defensive-routines/coverage`)

**New:**
- ✅ **Convert PIR to Routine** (`POST /knowledge/from-pir/:pirId`)
  - Endpoint: Transforms completed PIR into permanent defensive routine
  - Input: PIR ID + routine metadata (payoff weight, NIST function, enablers)
  - Output: New knowledge entry marked as defensive routine
  - Effect: Links incident lessons to strategic decision support

#### Frontend (`client/src/pages/DefensiveRoutines.jsx`)

**Existing UI:**
- 📚 **All Routines** – Browse library with success rates and metadata
- ⭐ **Best Performing** – Top 5 highest-rated routines
- 🎯 **Coverage** – NIST function breakdown and incident type coverage gaps

**New UI:**
- ✅ **Routine Editor** (admin only)
  - Select a completed PIR
  - Populate routine metadata (goal, payoff weight, NIST function, enablers)
  - Write routine content / procedures
  - Convert to organizational knowledge
  - Show NIST function coverage and gap analysis

#### Dashboard Integration (`client/src/pages/Dashboard.jsx`)

- ✅ Display **Recommended Countermeasure** widget (from Game Theory + routines)
- ✅ Show **Attacker Prediction** (next likely move based on incident type)
- ✅ Link to **Routine Recommendations** for key incident

---

## Analyst Workflow: Using Defensive Routines

### Step 1: Incident Detection
**Analyst opens an incident detail page.**

The system automatically displays:
- ✅ Suggested defensive routines (top 5, ranked by match score)
- ✅ Each routine shows: success rate, times applied, confidence, payoff rating
- ✅ Option to expand and view routine content

### Step 2: Routine Selection
**Analyst selects a routine to apply.**

- Reads the procedure steps
- Reviews institutional enablers required (firewall policies, scripts, etc.)
- Confirms prerequisites are met

### Step 3: Routine Execution
**Analyst executes the routine.**

- Follows the documented steps
- Uses associated scripts if available
- Coordinates with relevant teams (network, applications, training)

### Step 4: Outcome Recording
**After execution, analyst records success or failure.**

System updates:
- ✅ Success rate (exponential smoothing)
- ✅ Payoff rating (recalculated)
- ✅ Confidence score (incremented)
- ✅ Use count (incremented)

### Step 5: Review & Payoff Adjustment
**After the incident is closed, the Super Admin reviews the applied defensive routine and rates its effectiveness.**

This step is essential to keep the KBV living and adaptive:
- The routine receives a review rating after the PDF report / PIR is complete.
- The system updates the routine's success probability and payoff rating.
- Poor ratings push the routine toward lower future selection probability.
- Positive ratings reinforce the routine as a trusted institutional response.

This creates a continuous learning feedback loop.

---

## Admin Workflow: Converting PIR to Routine

### Step 1: Access Routine Editor
**Admin navigates to: Dashboard → Defensive Routines → Routine Editor**

### Step 2: Select Completed PIR
**Admin chooses a high-value PIR** (one that prevented recurrence, or solved a critical incident)

Example:
- "Phishing campaign with credential compromise" → prevented future social engineering

### Step 3: Define Routine Metadata
Admin fills in:
- **Title** – Descriptive routine name
- **Primary Goal** – What does this routine achieve?
- **Payoff Weight** – How important is this routine? (0.0–1.0)
- **NIST Function** – Which CSF function does it support?
- **Institutional Enablers** – What policies/tools/training is required?
- **Associated Scripts** – Automation commands (optional)
- **Socio-Technical Focus** – Technical, Social, or Hybrid?

### Step 4: Write Routine Content
Admin documents:
- Step-by-step procedures
- Decision points ("If X, do Y")
- Escalation triggers
- Communication templates

### Step 5: Submit & Versioning
- Click "Convert PIR to Routine"
- System creates new knowledge entry (defensive_routine marked as true)
- PIR marked as "converted" (read-only)
- Routine available for analysts to apply to future incidents

---

## Metrics & Reporting

### Routine Effectiveness Metrics

**Dashboard shows:**
- Total routines in library
- Average success rate
- Average payoff weight
- Average payoff rating
- Count by effectiveness tier:
  - Highly effective (≥0.85)
  - Moderately effective (0.6–0.85)
  - Needs improvement (<0.6)

### NIST Function Coverage

**Coverage analysis shows:**
- How many routines support each NIST function?
  - Identify (ID)
  - Protect (PR)
  - Detect (DE)
  - Respond (RS)
  - Recover (RC)
- Gaps in routine library (incident types without routines)

### Most Applied & Highest Success

**Rankings display:**
- Most applied routines (tested many times → proven value)
- Highest success rates (best performers)
- Newest routines (recently converted from PIRs)

---

## Learning Metrics & Institutional Feedback

### Strategic Institutional Metrics
The system now tracks resilience metrics that are visible to both Viewer and Admin roles:
- **Knowledge Utilization Rate (KUR)** — percentage of incidents resolved using institutional memory instead of ad-hoc guessing.
- **Mean Time to Wisdom (MTTW)** — average time from a tacit lesson learned or PIR to an explicit defensive routine published in the firm-wide library.
- **Socio-Technical Balance Score** — heatmap-style score that shows whether the current risk profile is skewed toward human/social error or technical/system weakness.

These metrics support the KALRO dashboard and help leadership monitor whether the organization is improving as a learning system.

### Cross-Site Knowledge Synchronization
When deployed across departments or locations, the framework supports a **Shared Knowledge Pulse**:
- A major incident handled with a validated defensive routine generates a knowledge alert.
- Other sites receive the alert so analysts can prepare for similar attacks.
- This prevents repeated mistakes across the organization.

A pulse alert includes:
- incident type and severity
- routine identifier and title
- source site and target site scope
- summary of what worked and what to watch for

---

## Integration with Game Theory

### Payoff Matrix Integration

When an analyst opens an incident, the system:

1. **Calculates payoff matrix** (using Game Theory engine):
   - Isolation strategy: high risk reduction, high cost
   - Monitoring strategy: low cost, high knowledge gain
   - Hybrid strategy: balanced approach

2. **Recommends countermeasure** (Nash Equilibrium):
   - "Isolate" | "Monitor" | "Hybrid"
   - Confidence score (0.0–1.0)

3. **Links to defensive routines**:
   - "Rapid Containment Alpha" supports "Isolate" decision
   - "Strategic Deception" supports "Monitor" decision
   - "Human-Centric Reset" supports organizational resilience

### Payoff Rating Calculation

Each routine's **payoff rating** incorporates:
- Game Theory success probability (70% weight)
- Strategic importance (payoff weight) (30% weight)

```
payoff_rating = (success_rate × 0.7) + (payoff_weight × 0.3)
```

---

## Integration with NIST CSF

### Routine Mapping to NIST Functions

Each routine is mapped to one primary NIST function:

| Function | Routines | Example |
|----------|----------|---------|
| **ID** (Identify) | Asset discovery, classification | "Inventory Control Routine" |
| **PR** (Protect) | Access control, encryption, training | "Credential Reset Routine" |
| **DE** (Detect) | Monitoring, detection tuning | "Anomaly Detection Tuning" |
| **RS** (Respond) | Incident response, containment | "Rapid Containment Alpha" |
| **RC** (Recover) | Restoration, post-incident | "System Restoration Protocol" |

### CSF Maturity Progression

As routines are created and applied:
- **Tier 1** (Ad-hoc): Few documented routines, reliant on individual expertise
- **Tier 2** (Repeatable): Routines exist for major incident types
- **Tier 3** (Defined): Routines cover all NIST functions with documented procedures
- **Tier 4** (Managed): Routines are continuously measured, optimized, and updated
- **Tier 5** (Optimized): Routine library is AI-assisted, predictive, and fully automated

---

## API Reference

### Link Knowledge to Routine

**Endpoint:** `POST /knowledge/:id/link-routine`

**Request:**
```json
{
  "enabled": true,
  "category": "playbook",
  "primary_goal": "Stop Data Exfiltration",
  "payoff_weight": 0.75,
  "nist_function": "RS",
  "associated_scripts": ["isolate_vlan.sh"],
  "institutional_enablers": ["VLAN isolation", "EDR"],
  "socio_technical_focus": "technical",
  "success_rate": 0.9,
  "times_applied": 10,
  "applicable_incident_types": ["data_exfiltration", "unauthorized_access"],
  "prerequisites": ["Network access", "EDR agent"],
  "routine_signature": ["data_exfiltration"]
}
```

**Response:** Updated knowledge entry with defensive_routine metadata

---

### Convert PIR to Routine

**Endpoint:** `POST /knowledge/from-pir/:pirId`

**Request:**
```json
{
  "title": "Phishing Response Routine",
  "content": "...",
  "category": "response-checklist",
  "primary_goal": "Mitigate phishing compromise",
  "payoff_weight": 0.8,
  "nist_function": "PR",
  "associated_scripts": [],
  "institutional_enablers": ["Email gateway", "User training"],
  "socio_technical_focus": "hybrid",
  "applicable_incident_types": ["phishing"],
  "routine_signature": ["phishing"]
}
```

**Response:** New knowledge entry (defensive routine)

**Effect:** PIR marked as "converted"; routine available for all analysts

---

### Get Routine Metrics

**Endpoint:** `GET /knowledge/defensive-routines/metrics`

**Response:**
```json
{
  "total_routines": 8,
  "highly_effective": 5,
  "moderately_effective": 2,
  "needs_improvement": 1,
  "avg_success_rate": 0.82,
  "avg_payoff_weight": 0.67,
  "avg_payoff_rating": 0.76,
  "most_applied": [...],
  "highest_success": [...]
}
```

---

### Analyze Coverage

**Endpoint:** `GET /knowledge/defensive-routines/coverage`

**Response:**
```json
{
  "total_routines": 8,
  "incident_types_covered": 6,
  "nist_function_counts": {
    "ID": 1,
    "PR": 3,
    "DE": 2,
    "RS": 2,
    "RC": 1
  },
  "coverage_by_type": {...},
  "gaps": [...]
}
```

---

## Best Practices

### For Analysts

1. **Always check routine recommendations** when opening an incident
2. **Record outcome** after applying a routine (success/failure)
3. **Annotate routine failures** if you discover gaps or issues
4. **Suggest improvements** to admins if a routine could be better

### For Admins

1. **Convert high-value PIRs to routines** every quarter
2. **Review routine effectiveness** monthly; retire underperforming ones
3. **Update routine content** as tools/policies change
4. **Maintain NIST coverage** across all 5 functions
5. **Gather team feedback** on routine usability

### For Leadership

1. **Track routine adoption rate** (% of incidents using a routine)
2. **Monitor organizational resilience score** (aggregate routine effectiveness)
3. **Invest in institutional enablers** (policies, training, tools)
4. **Use routine library maturity** as a CSF assessment metric
5. **Link routine improvements** to incident response KPIs (MTTR, SLA compliance)

---

## Future Enhancements

- **AI-Assisted Routine Generation**: Auto-suggest routines from PIR text
- **Predictive Routine Selection**: ML model predicts best routine for incident type
- **Automated Routine Execution**: Orchestrate scripts and tooling directly
- **Routine Conflict Detection**: Warn if two routines are incompatible
- **Routine Dependency Graph**: Visualize institutional enabler dependencies
- **Continuous Improvement Loop**: Feedback metrics → routine updates → analyst notification

---

## Final Documentation Summary Table

| Pillar | Strategic Goal | New Web Feature |
|---|---|---|
| **KBV** | Build Institutional Memory | Routine Manager, PDF Archive, Continuous Learning Review, Knowledge Pulse |
| **STS** | Balance Human & Tech | Role-Based Notifications, Socio-Technical Balance Score, Gap Analysis |
| **Game Theory** | Predictive Defense | Nash Equilibrium Advisor, Dynamic Payoffs, Review-Based Payoff Updates |
| **NIST CSF** | Standardized Workflow | Categorized IR Phases, Routine Coverage, Institutional Routine Mapping |

---

## Conclusion

The Defensive Routine Manager transforms organizational learning into actionable, measurable, and continuously improving strategic guidance. By linking **Game Theory payoffs**, **NIST CSF alignment**, and **socio-technical enablers**, the system ensures that every incident response becomes a building block for organizational resilience.
