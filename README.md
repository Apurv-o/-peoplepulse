# PeoplePulse — Enterprise Multi-Tenant B2B SaaS

PeoplePulse is a production-grade, multi-tenant employee engagement and sentiment analytics platform built with React (Vite, Tailwind CSS, Lucide, Recharts) and Supabase (PostgreSQL, Row-Level Security, Edge Functions, Gemini AI).

---

## 1. Multi-Tenant Architecture & Data Isolation

### Tenancy Model
- **Organizations (organizations)**: The root tenant model supporting multi-company isolation. Each organization has a name, unique URL slug, creation timestamp, and subscription plan tier (ree | pro | enterprise).
- **Organization Memberships (organization_members)**: Maps users to organizations with explicit roles:
  - owner: Full administrative rights, billing, org settings, team and member management.
  - dmin: Member invitations, team management, org analytics.
  - manager: Scoped to manage specific teams and view aggregated team metrics ( \ge 3$).
  - employee: Submits weekly check-ins (named or strictly anonymous) and views personal wellbeing history.
- **Tenant Scoping Across Tables**:
  - 	eams.organization_id
  - checkins.organization_id
  - sentiment_results.organization_id
  - invitations.organization_id
  - organization_usage.organization_id

### Row-Level Security (RLS)
All tenant tables enforce strict PostgreSQL Row-Level Security:
- Direct cross-tenant access is rejected at the database engine level using uth.uid() in (select user_id from organization_members where organization_id = ...).
- Anonymous check-ins strictly preserve user_id = NULL. Direct SELECT access to anonymous rows is prohibited for employee and manager roles.
- Manager metrics and feedback are computed via security-definer RPC functions (get_team_aggregated_insights) enforcing the  \ge 3$ aggregation threshold.

---

## 2. Privacy & Anonymity Invariants

1. **Database-Level Constraint**:
   `sql
   constraint check_anonymous_user_id check (
     (is_anonymous = true and user_id is null) or
     (is_anonymous = false and user_id is not null)
   )
   `
2. **Atomic Token Consumption**:
   Anonymous check-ins generate a cryptographically random client-side UUID processing_token. Edge Functions invoke consume_anonymous_processing_token to atomically clear the token upon sentiment analysis, ensuring tokens cannot be re-used or linked to identity.
3. **Differential Privacy & Sample Protection ( \ge 3$)**:
   Managers and admins cannot view team engagement averages or anonymous text comments unless at least 3 distinct submissions exist for that weekly cycle.

---

## 3. Plan Limits & AI Quota Enforcement

| Dimension | Free Tier | Pro Tier | Enterprise Tier |
| :--- | :--- | :--- | :--- |
| **Active Seats** | 10 seats | 100 seats | Custom / Unlimited |
| **Teams** | 1 team | Unlimited | Unlimited |
| **Monthly AI Quota** | 10 analyses / month | Unlimited | Unlimited |
| **Privacy Threshold** |  \ge 3$ strictly enforced |  \ge 3$ strictly enforced |  \ge 3$ strictly enforced |

Limits are enforced through database triggers:
- 	rg_enforce_org_seat_limit: Prevents inserting more members into organization_members than permitted by the plan.
- 	rg_enforce_org_team_limit: Enforces max teams per organization.
- consume_org_ai_quota: Atomically decrements and verifies AI sentiment analysis quota before the Edge Function calls Google Gemini.

---

## 4. Invitation Lifecycle & Token Security

- Invitations are generated with cryptographically secure random 32-byte tokens.
- Tokens are stored exclusively as SHA-256 hashes (	oken_hash = digest(token, 'sha256')). Raw tokens are never persisted in the database.
- Joining an organization requires calling ccept_org_invitation(p_token) with a valid authenticated session matching the invited email.

---

## 5. End-to-End Verification

Automated browser CDP testing validates:
- [x] Public Homepage rendering and CTA navigation
- [x] Rejection of invalid credentials with user-friendly error alerts
- [x] Real login for Alex Morgan (lex.morgan@company.com) showing real database check-in score (80), week label (Aug 31), and Acme Corp workspace badge
- [x] Duplicate check-in submission guard (You've already submitted your check-in for this week)
- [x] Session persistence across #app and auto-forwarding from #login
- [x] Sarah Patel Manager dashboard rendering aggregated metrics and  \ge 3$ privacy lock
- [x] System Admin overview rendering organization members, teams list, and live plan limits / AI quota
- [x] Zero leak of service-role keys or GEMINI_API_KEY in production client bundles
