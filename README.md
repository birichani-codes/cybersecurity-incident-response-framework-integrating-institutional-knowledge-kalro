# Prototype Framework to Improve Cybersecurity Incident Response Using Institutional Knowledge

## A Case Study of Kenya Agricultural and Livestock Research Organization (KALRO)

---

## Description

This project presents a **prototype framework** to enhance cybersecurity incident response by capturing, structuring, and integrating **institutional knowledge** — the accumulated expertise, experience, and undocumented know-how held by individuals within an organization.

Many organizations rely on undocumented expert experience that exists only in the minds of long-serving staff. When those individuals leave or are unavailable, critical response capability is lost. This prototype demonstrates how tacit, individual knowledge can be transformed into **searchable, versioned, reusable intelligence** to support faster and more effective incident response.

The design follows **NIST Cybersecurity Framework principles**, **SECI Knowledge Management**, and **MIST design concepts** to ensure modularity, security, and integration with existing tools.

---

## Objectives

- Explore methods to capture undocumented institutional knowledge
- Prototype integration into cybersecurity workflows
- Demonstrate improvements in response speed and decision-making
- Reduce dependency on individual expertise (proof-of-concept)
- Create a **searchable, versioned repository** for organizational knowledge
- Establish a knowledge lifecycle with decay detection, versioning, and retirement

---

## Key Features

- **Role-based authentication with optional 2FA**
- **Interactive React dashboard for incident monitoring**
- **Institutional knowledge capture and annotation**
- **Confidence scoring on retrieved knowledge entries**
- **Version control and knowledge retirement lifecycle**
- **Full-text search and retrieval of past incidents**
- **Automatic knowledge suggestions when a new incident is logged**
- **Contributor attribution on all knowledge entries**
- **Escalation workflow for unknown or unmatched incidents**
- **Comprehensive audit trail of all system actions**
- **Integration with logs and threat intelligence feeds**

![Key Features](Feature.drawio.png)

---

## Prototype Architecture

- **Presentation Layer** – React SPA (Single Page Application)
- **Application Layer** – Node.js + Express REST API
- **Knowledge Layer** – Tagging, indexing, versioning, and confidence scoring
- **Integration Layer** – Connection with logs, IDS, and external threat feeds
- **Data Layer** – PostgreSQL persistent storage for incidents, knowledge, and audit logs

![Prototype Architecture](prototype.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + React Router + Axios |
| UI Styling | Tailwind CSS |
| State Management | React Context API |
| Backend | Node.js + Express |
| Database | PostgreSQL (with full-text search via tsvector) |
| Authentication | JWT tokens + bcrypt password hashing + optional TOTP 2FA |
| Search | PostgreSQL native full-text search |
| Dev Tooling | Vite (frontend), Nodemon (backend), dotenv |

---

## User Roles

| Role | Permissions |
|---|---|
| **Super Admin** | Full access: manage users, roles, system configuration |
| **Security Analyst** | Log incidents, capture knowledge, annotate, search |
| **Viewer** | Read-only access to dashboard and knowledge base |
| **System** | Automated log and alert ingestion via API key |

---

## Framework Alignment

This prototype aligns with established frameworks and design principles to ensure **security, scalability, and effective knowledge management**.

### NIST Cybersecurity Functions
Provides structured incident management across the full lifecycle.

- **Identify** — Know assets, risks, and existing institutional knowledge
- **Protect** — Secure access through RBAC, encryption, and 2FA
- **Detect** — Monitor logs, alerts, and incoming incident signals
- **Respond** — Execute mitigation strategies informed by institutional knowledge
- **Recover** — Capture lessons learned, update knowledge base, restore operations

### SECI Knowledge Management
Captures and shares institutional knowledge across the organization.

- **Socialization** — Team discussions and collaboration on incidents
- **Externalization** — Annotate and record incident insights into the knowledge base
- **Combination** — Integrate knowledge across incidents and departments
- **Internalization** — Apply lessons learned to future responses

### MIST Design Principles
Ensures modularity, security, and modern system design.

- **Microservices** — Separate components: Auth, Incident, Knowledge, NLP/Tagging
- **Integration** — Connect with external systems (Logs, IDS, Threat Feeds)
- **Security** — Role-based access control, encryption, 2FA, audit logging
- **Technology** — React SPA + REST API + PostgreSQL; supports future NLP automation

### TRIKER Knowledge Lifecycle
Guides the complete institutional knowledge lifecycle.

- **Trigger** — Initiate workflows when incidents occur or actions are performed
- **Record** — Document insights, annotations, and lessons learned
- **Integrate** — Merge new knowledge with the existing repository
- **Knowledge** — Structure information for easy retrieval and analysis
- **Evaluate** — Assess quality, relevance, accuracy, and confidence of captured knowledge
- **Reuse** — Apply past knowledge to improve future incident responses

![Framework Alignment](framework-alignment.drawio.png)

---

## Knowledge Lifecycle Management

A key component of this framework is explicit management of the knowledge entry lifecycle to prevent outdated information from misleading analysts.

### Knowledge Entry States

| State | Meaning |
|---|---|
| **Active** | Current, trusted, and recommended for use |
| **Superseded** | Replaced by a newer version — visible but flagged |
| **Retired** | Archived; no longer applicable or accurate |

### Confidence Scoring

Every knowledge entry carries a **confidence score** (0.0 – 1.0) calculated from:

- Recency of last use
- Number of times successfully applied
- Analyst feedback and ratings
- Time elapsed since creation (decay factor)

Scores decay over time if an entry is not reused, prompting administrators to review and update it.

### Versioning

When an existing entry is updated, the old version is preserved with a `superseded_by` reference. Analysts can always view the full version history of any knowledge entry.

### Contributor Attribution

Every entry records who created it and who last modified it. This supports accountability, trust assessment, and knowledge quality reviews.

---

## Escalation Workflow

When a new incident arrives and **no matching knowledge is found**, the system follows a structured escalation path rather than leaving analysts without guidance:

```
New Incident Logged
       ↓
Auto-search Knowledge Base
       ↓
Match Found? ──YES──→ Display suggestions with confidence scores
       ↓ NO
Escalation Flag Set (status: "escalated")
       ↓
Notify assigned senior analyst / admin
       ↓
Manual investigation and response
       ↓
On resolution → Capture new knowledge entry
       ↓
Knowledge base updated for future incidents
```

Incident statuses: `open → investigating → escalated → resolved → closed`

---

## Audit Trail

Every action in the system is recorded in a tamper-evident audit log including:

- User identity and role
- Action performed (login, view, annotate, create, update, retire, search)
- Target entity (incident ID, knowledge entry ID)
- Timestamp
- IP address and session metadata

Audit logs are read-only and accessible only to Super Admins.

---

## UML Diagrams

### 1. Use Case Diagram
**Purpose:** Show who interacts with the system and what they do.

**Actors:** Cybersecurity Analyst, System Administrator, External Systems (e.g., IDS, Logs)

**Use Cases:**
- Login / Authenticate
- Detect Incident
- View Incident
- Annotate Knowledge
- Search Knowledge Base
- Retrieve Recommendations
- Escalate Incident
- Manage Users
- Generate Reports
- Retire / Version Knowledge Entry

![Use Case Diagram](usecase.drawio.png)

---

### 2. Activity Diagram
**Purpose:** Illustrate step-by-step workflows of the system.

**Example Flow:**
Start → Detect Incident → Retrieve Institutional Knowledge → Decision (Knowledge Found?) → Yes: Analyze with suggestions / No: Escalate → Respond → Capture New Knowledge → Store → End

![Activity Diagram](activity.drawio.png)

---

### 3. Sequence Diagram
**Purpose:** Show interactions over time between system components.

**Key Components:** User (Analyst), React Frontend, Express API, Knowledge Base, Integration Layer

1. User submits login form in React
2. Express API authenticates and returns JWT token
3. React stores token, loads dashboard
4. Incident detected or logged via React form
5. API queries Knowledge Base, returns matches with confidence scores
6. React renders suggestions; user annotates
7. API saves data and writes to audit log

![Sequence Diagram](sequence.drawio.png)

---

### 4. Class Diagram
**Purpose:** Display system structure, entities, and relationships.

**Key Classes:** User, Incident, KnowledgeEntry, Annotation, Entity (IP, File, UserAccount), AuditLog, Report

**Includes:**
- Attributes (id, name, timestamp, confidence_score, version)
- Methods (save(), retrieve(), supersede(), retire(), search())
- Relationships (User → KnowledgeEntry one-to-many, Incident ↔ KnowledgeEntry association)

![Class Diagram](class.drawio.png)

---

### 5. Component Diagram
**Purpose:** Show system architecture and modules.

**Key Components:** React SPA, Express REST API, Authentication Service, Incident Management, Knowledge Management, NLP/Tagging Engine, Search Engine, Audit Logger, Integration Layer, PostgreSQL Database

![Component Diagram](component.drawio.png)

---

## Database Schema

```sql
users
  id, name, email, password_hash, role, totp_secret, created_at

incidents
  id, title, type, severity, status, description,
  entities JSONB, reported_by (FK), assigned_to (FK),
  created_at, updated_at

knowledge
  id, title, content, tags TEXT[], incident_id (FK),
  contributor_id (FK), confidence_score, version,
  superseded_by (FK self-referencing), status,
  search_vector tsvector, last_used_at, use_count, created_at

annotations
  id, knowledge_id (FK), user_id (FK), note, created_at

audit_logs
  id, user_id (FK), action, target_type, target_id,
  metadata JSONB, ip_address, created_at
```

---

## Prototype Workflow (Pseudo-Algorithm)

```text
BEGIN

// MIST: Microservices Initialization
1. Initialize Services:
   - Auth Service
   - Incident Service
   - Knowledge Service
   - Integration Service
   - NLP/Tagging Service

// NIST: IDENTIFY
2. Load System Context:
   - assets, users, existing institutional knowledge

3. Authenticate User (React login form → Express API)
   INPUT: credentials + optional 2FA (TOTP)
   IF valid THEN
       issue JWT, store in React context
       grant role-based (RBAC) access
   ELSE
       deny access, log attempt
   ENDIF

// MIST: Integration
4. Collect Incident Data from logs, IDS, threat feeds

// NIST: DETECT
5. Detect or Log Incident (React form → POST /api/incidents)
   IDENTIFY anomalies, type, severity, affected entities

6. Extract Entities: IP address, user account, file hash

// NIST: RESPOND
7. Auto-Query Institutional Knowledge Base (GET /api/search)
   IF match found THEN
       DISPLAY entries with confidence scores in React UI
   ELSE
       SET status = "escalated"
       NOTIFY senior analyst / admin
   ENDIF

8. Analyst reviews knowledge, adds annotations, executes response

// NIST: RECOVER
9. On incident resolution -> prompt to capture new knowledge
   RECORD observations, lessons learned, effective mitigations

// MIST: Technology
10. Process new knowledge entry (POST /api/knowledge):
    - NLP tagging and categorization
    - Confidence score initialization
    - Version check (supersede existing entry if applicable)
    - Full-text search index update
    - Store in PostgreSQL

// MIST Security + NIST Protect
11. Enforce Security throughout:
    - Encrypt data at rest and in transit (HTTPS)
    - Validate JWT on every API request (Express middleware)
    - Enforce RBAC per route
    - Write all actions to audit log

// Knowledge Lifecycle
12. Scheduled job: decay confidence scores for unused entries
    FLAG entries below threshold for admin review
    RETIRE or UPDATE flagged entries

// Continuous Improvement
13. Feedback loop:
    - Analysts rate knowledge usefulness in React UI
    - Ratings update confidence scores via API
    - Reports surface most/least useful knowledge entries

END
```

---

## Folder Structure

```
kalro-ikf/
├── client/                           <- React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── main.jsx                  <- React entry point
│   │   ├── App.jsx                   <- Router setup
│   │   ├── context/
│   │   │   └── AuthContext.jsx       <- JWT + user state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Incidents.jsx
│   │   │   ├── IncidentDetail.jsx
│   │   │   ├── Knowledge.jsx
│   │   │   ├── KnowledgeDetail.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── IncidentCard.jsx
│   │   │   ├── KnowledgeCard.jsx
│   │   │   ├── ConfidenceBadge.jsx
│   │   │   └── AuditLogTable.jsx
│   │   └── api/
│   │       └── axios.js              <- Axios instance with JWT interceptor
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                           <- Node.js + Express backend
│   ├── index.js                      <- Express entry point
│   ├── db.js                         <- PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js                   <- JWT verification
│   │   └── rbac.js                   <- Role-based access control
│   ├── routes/
│   │   ├── auth.js                   <- Login, register, 2FA
│   │   ├── incidents.js              <- CRUD + status management
│   │   ├── knowledge.js              <- Capture, version, retire
│   │   ├── search.js                 <- Full-text + tag search
│   │   └── reports.js                <- Audit logs, analytics
│   └── models/
│       └── schema.sql                <- All table definitions + indexes
│
├── .env
└── package.json                      <- Root package with dev scripts
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/kalro-ikf.git
cd kalro-ikf

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DB credentials and JWT secret

# Run database schema
psql -U postgres -d kalro_ikf -f server/models/schema.sql

# Start backend (from /server)
npm run dev

# Start frontend (from /client)
npm run dev
```

The React app runs on `http://localhost:5173` and proxies API requests to `http://localhost:3000`.

---

## References

- NIST Cybersecurity Framework (CSF 2.0) — https://www.nist.gov/cyberframework
- Nonaka & Takeuchi, SECI Model of Knowledge Creation (1995)
- MIST Microservices Design Principles
- KALRO ICT Security Policy (internal reference)
