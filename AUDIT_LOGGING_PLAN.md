# Audit Logging Enhancement Plan

The next iteration of BrainSAIT IOD will persist verification preflight and launch events so compliance teams can reconstruct every identity decision. This document outlines the technical plan that will be executed after the live deployment stabilizes.

## Objectives

- Capture a durable trail of **preflight readiness**, **context enrichment**, and **launch submission** actions initiated from the enterprise verification stepper.
- Preserve events in both a **fast lookup cache** and **immutable storage** so that dashboards as well as auditors have the data they need.
- Emit notification hooks for neural or security systems when high-risk launches are recorded.

## Event Capture

| Event | Description | Required Fields |
| --- | --- | --- |
| `preflight_completed` | Operator passes Stripe, neural, and regional readiness checks. | `session_oid`, `operator_id`, `readiness_snapshot`, `timestamp` |
| `context_enriched` | Regional and neural context payload is finalized prior to launch. | `session_oid`, `country_code`, `context_hash`, `timestamp` |
| `launch_submitted` | Verification is launched toward Stripe Identity. | `session_oid`, `stripe_session_id`, `operator_id`, `device_fingerprint`, `timestamp` |

Events will be published from `IdentityVerification.tsx` via a dedicated `auditLogger` helper that batches and retries if the browser is offline.

## Worker API Design

- **Endpoint:** `POST /api/audit-events`
- **Validation:**
  - Verify `session_oid` follows the BrainSAIT root OID (`1.3.6.1.4.1.61026`).
  - Ensure events arrive in chronological order (`timestamp` monotonic per session).
  - Enforce per-operator rate limiting to block spurious traffic.
- **Persistence Flow:**
  1. Generate an audit OID (`1.3.6.1.4.1.61026.4.2.{epoch}`) and attach to the event.
  2. Write the event to Cloudflare D1 table `audit_events` with indexes on `session_oid` and `created_at`.
  3. Cache the most recent 500 events per `session_oid` in KV (`AUDIT_TRAIL`) for fast dashboard queries.
  4. Optionally emit a durable queue message when `risk_score >= 80` to trigger downstream alerts.

## Storage Schema

```sql
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  session_oid TEXT NOT NULL,
  stripe_session_id TEXT,
  operator_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSON,
  device_fingerprint TEXT,
  readiness_snapshot JSON,
  risk_signal INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_events_session ON audit_events(session_oid, created_at DESC);
```

KV namespace (`AUDIT_TRAIL`) keeps a rolling JSON array for each `session_oid`, trimming after the 500th entry to stay within quota.

## Surfacing & Tooling

1. Extend `/api/analytics/dashboard` to join recent `audit_events` and expose counts per operator, region, and risk tier.
2. Show the last 3 audit events on the verification result page alongside the polling status for quick operator feedback.
3. Provide an **Audit Trail** tab in the enterprise UI that paginates data from D1 via cursor-based queries.

## Implementation Phases

1. **Scaffolding** – Create Worker endpoint, D1 migration, KV namespace, and client-side helper (target: 1 sprint).
2. **UI Integration** – Instrument stepper phases and verification result page with live audit insights (target: 1 sprint).
3. **Alerting & Analytics** – Wire webhook notifications and dashboards once baseline volume is validated (target: 0.5 sprint).

## Open Questions

- Should we redact certain sensitive fields before persisting to KV to comply with regional privacy mandates?
- Do we require operator SSO integration before enabling write access to the audit endpoint?
- Will downstream compliance systems require near-real-time replication to external data warehouses?

Document owner: **BrainSAIT Identity Engineering** – Updated March 2025.
