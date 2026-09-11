# PeoplePulse — 5-Minute Pitch Script & Live Demo Specification
**Event:** Tech Zephyr 4.0 | IIT Bhubaneswar — Agentic AI Hackathon  
**Authoritative Source:** `d:/project/PeoplePulse/docs/pitch_script_5min.html`  
**Secondary Sources:** `docs/generate_pdf.py`, `src/components/AgenticCopilot.jsx`, `src/lib/agent/tools.js`, `src/lib/agent/agentEngine.js`  
**Target Runtime:** Exactly 300 seconds (5:00 minutes, 0s – 300s)  
**Speaking Pace:** ~135 words per minute (~680 total spoken words)  
**Document Status:** Complete Mining Specification for Interactive Presentation Player  

---

## 1. Executive Overview & Architecture Alignment

The 5-minute presentation script specifies an end-to-end presentation and live demonstration of **PeoplePulse**, an autonomous enterprise HR intelligence platform engineered for the Tech Zephyr 4.0 Agentic AI Hackathon.

The presentation strictly adheres to the official 6-stage hackathon evaluation rubric:
$$\text{Goal} \longrightarrow \text{Decision} \longrightarrow \text{Action} \longrightarrow \text{Evaluation} \longrightarrow \text{Adaptation} \longrightarrow \text{Outcome}$$

### Core Architecture Pillars Highlighted in Pitch:
1. **Real ReAct Autonomy:** Multi-step Reason + Act loop powered by Google Gemini 2.0 Flash Function Calling and Supabase PostgreSQL with zero canned single-turn text short-circuits.
2. **Self-Healing Adaptation:** Real environmental resilience harness; intercepts an HTTP 503 service timeout when attempting external webhook delivery and autonomously reroutes escalation to an internal emergency dispatch queue with zero message loss.
3. **Enterprise Security & Privacy Invariants:**
   - **Differential Privacy ($n \ge 3$):** Strict database-level suppression where groups with $< 3$ responses return `null` aggregations, preventing deanonymization.
   - **Multi-Tenant Row Level Security (RLS):** Context stripping of LLM tenant arguments and server-injected `organization_id`.
   - **Governance & Audit Trail:** Human-in-the-Loop confirmation modal for sensitive/destructive actions and automated regex credential masking in `agent_activity_logs`.
4. **Production Rigor:** 23 passing unit tests executing in 511ms, dual-key auto-failover, and an offline deterministic local fallback planner guaranteeing zero live-demo downtime.

---

## 2. The 6 Official Hackathon Stages & Exact Timestamps

### 2.1 Macro Timeline Blocks (Authoritative HTML Blocks)

| Block # | Time Range (MM:SS) | Seconds Range | Duration | Hackathon Stage | Phase Title | Primary Focus |
|---|---|---|---|---|---|---|
| **Block 1** | `0:00 – 0:45` | `0s – 45s` | 45s | **Stage 1: Goal Context** | Minute 1: The Problem & The Autonomous Shift | Employee burnout (76%), survey fatigue, time lag vs. 60s daily micro-pulses |
| **Block 2** | `0:45 – 1:30` | `45s – 90s` | 45s | **Stage 2: Decision Framework** | Minute 2: Why Agentic AI? (Not a Chatbot) | Agent vs. chatbot, ReAct loop, Gemini 2.0 Flash, 6-stage breadcrumb, RBAC |
| **Block 3** | `1:30 – 2:40` | `90s – 160s` | 70s | **Stage 3: Action & Stage 4: Evaluation** | Minute 3: Live ODAEA Demo — Dynamic Observation & Evaluation | Live preset run, DB query, server-injected tenant ID, 68% org / 42% Support burnout diagnosis |
| **Block 4** | `2:40 – 3:45` | `160s – 225s` | 65s | **Stage 5: Adaptation** | Minute 4: The Core Differentiator — Failure Interception & Adaptation | External webhook HTTP 503 timeout caught, orange card trigger, emergency queue reroute |
| **Block 5** | `3:45 – 4:25` | `225s – 265s` | 40s | **Stage 6: Outcome** | Minute 5 (Part A): Outcome & Human-in-the-Loop Governance | Interventions scheduled, Human-in-the-Loop confirmation modal, credential-redacted audit trail |
| **Block 6** | `4:25 – 5:00` | `265s – 300s` | 35s | **Production Wrap-up** (Outcome Synthesis) | Minute 5 (Part B): Privacy Core, Security & Strong Closing | $n \ge 3$ differential privacy, RLS security, 23 passing tests (511ms), strong finish |

### 2.2 Rubric Stage-by-Stage Strict Mapping (For Player Jump Markers & Breadcrumbs)

For precise UI stage breadcrumb highlighting and seek jump buttons across 0s – 300s:

| Rubric Stage | Start Time | End Time | Total Duration | Visual Cue & UI State | Trigger Event / Milestone |
|---|---|---|---|---|---|
| **1. Goal** | `0:00` (0s) | `0:45` (45s) | 45s | PeoplePulse Landing Page → Admin Dashboard KPI overview | Problem statement and autonomous goal formulation |
| **2. Decision** | `0:45` (45s) | `1:30` (90s) | 45s | Copilot drawer slides open; cursor points to 6-stage breadcrumb bar | Decision reasoning framework (Gemini 2.0 Flash ReAct loop) |
| **3. Action** | `1:30` (90s) | `2:14` (134s) | 44s | Click preset; Blue Goal card + Purple Decision card + White Action card stream | Tool execution: `get_organization_metrics` with server tenant ID |
| **4. Evaluation** | `2:14` (134s) | `2:40` (160s) | 26s | Green Observation card (68% org / 42% Support) + Amber Evaluation card | Data-driven mathematical evaluation and burnout isolation |
| **5. Adaptation** | `2:40` (160s) | `3:45` (225s) | 65s | Network failure simulation + Orange Adaptation card + Emergency fallback card | HTTP 503 interception & autonomous reroute to emergency dispatch queue |
| **6. Outcome** | `3:45` (225s) | `5:00` (300s) | 75s | Green Outcome card → Audit Trail tab table → Terminal running tests (511ms) | Synthesis, Human-in-the-Loop governance, $n \ge 3$ privacy, test verification |

---

## 3. Word-for-Word Spoken Pitch Script Breakdown

### Block 1: Minute 1 — The Problem & The Autonomous Shift (`0:00 – 0:45`, 0s – 45s)
*Stage 1: Goal Context | ~105 words | ~140 wpm*

| Timestamp Range | Sentence # | Spoken Narration Script (Verbatim) | Word Count |
|---|---|---|---|
| `0:00 – 0:08` (8s) | S1.1 | "Respected judges, **76% of employees experience burnout** before leadership even realizes there is a problem." | 14 words |
| `0:08 – 0:22` (14s) | S1.2 | "Traditional enterprise survey tools—like annual 50-question reviews—fail because of **survey fatigue** and **devastating time lag**." | 16 words |
| `0:22 – 0:30` (8s) | S1.3 | "By the time HR compiles quarterly reports, top talent has already resigned." | 12 words |
| `0:30 – 0:45` (15s) | S1.4 | "Enter **PeoplePulse**—the autonomous enterprise HR intelligence platform engineered for Tech Zephyr 4.0. We replace static surveys with **60-second daily micro-pulses**, backed by **PulseAgent**: an autonomous AI agent that doesn’t just graph sentiment, but continuously reasons, diagnoses bottlenecks, and executes organizational interventions." | 45 words |

---

### Block 2: Minute 2 — Why Agentic AI? (Not a Chatbot) (`0:45 – 1:30`, 45s – 90s)
*Stage 2: Decision Framework | ~104 words | ~138 wpm*

| Timestamp Range | Sentence # | Spoken Narration Script (Verbatim) | Word Count |
|---|---|---|---|
| `0:45 – 0:54` (9s) | S2.1 | "Now, why is this an **Agentic AI** problem rather than a simple chatbot?" | 12 words |
| `0:54 – 1:07` (13s) | S2.2 | "A chatbot merely summarizes text. It has no organizational memory, no schema-validated tools, and cannot take closed-loop actions." | 18 words |
| `1:07 – 1:19` (12s) | S2.3 | "**PulseAgent** operates on a genuine **ReAct (Reason + Act)** loop powered by Google Gemini 2.0 Flash Function Calling, backed by our Supabase PostgreSQL architecture." | 25 words |
| `1:19 – 1:25` (6s) | S2.4 | "As you can see on the top breadcrumb bar, our agent enforces the strict 6-stage rubric lifecycle: **Goal, Decision, Action, Evaluation, Adaptation, and Outcome**." | 24 words |
| `1:25 – 1:30` (5s) | S2.5 | "Every tool call is governed through an active RBAC policy engine with strict multi-tenant isolation." | 15 words |

---

### Block 3: Minute 3 — Live ODAEA Demo: Dynamic Observation & Evaluation (`1:30 – 2:40`, 90s – 160s)
*Stage 3: Action & Stage 4: Evaluation | ~164 words | ~140 wpm*

| Timestamp Range | Segment / Step | Spoken Narration Script (Verbatim) | Word Count |
|---|---|---|---|
| `1:30 – 1:35` (5s) | S3.1 (Intro) | "Let’s watch PulseAgent execute live." | 5 words |
| `1:35 – 1:47` (12s) | S3.2 (Stage 1) | "**Stage 1: Goal Established.** The objective is formulated: diagnose company-wide friction and deploy interventions." | 14 words |
| `1:47 – 2:01` (14s) | S3.3 (Stage 2) | "**Stage 2: Decision.** Rather than guessing, the agent reasons over its tool registry and autonomously selects `get_organization_metrics`." | 18 words |
| `2:01 – 2:18` (17s) | S3.4 (Stage 3) | "**Stage 3: Action.** It queries our live Supabase database. Notice in the parameter payload that `organization_id` was automatically injected from the authenticated session—the LLM is never allowed to fabricate tenant boundaries." | 33 words |
| `2:18 – 2:30` (12s) | S3.5 (Observation) | "**Observation:** Live data returns: overall company engagement sits at 68%, but Customer Support shows a severe drop to 42% due to shift overload." | 23 words |
| `2:30 – 2:40` (10s) | S3.6 (Stage 4) | "**Stage 4: Evaluation.** The agent parses the numerical observation. It calculates that Customer Support requires an immediate targeted pulse survey and a manager 1:1 action brief." | 26 words |

---

### Block 4: Minute 4 — The Core Differentiator: Failure Interception & Adaptation (`2:40 – 3:45`, 160s – 225s)
*Stage 5: Adaptation (Hackathon Core Differentiator) | ~117 words | ~108 wpm (deliberate emphasis)*

| Timestamp Range | Sentence # | Spoken Narration Script (Verbatim) | Word Count |
|---|---|---|---|
| `2:40 – 2:50` (10s) | S4.1 | "Now, pay close attention to **Stage 5: Adaptation**—our primary hackathon differentiator." | 12 words |
| `2:50 – 3:08` (18s) | S4.2 | "In real-world enterprise environments, external services fail. When PulseAgent attempts to broadcast an escalation alert to an external team webhook, it intercepts a real **HTTP 503 service timeout**." | 29 words |
| `3:08 – 3:32` (24s) | S4.3 | "A standard script would crash or silently drop the notification. **PulseAgent catches the network exception, evaluates the failure context, triggers a strategy adaptation event, and autonomously reroutes the escalation** to our internal Supabase emergency dispatch queue." | 37 words |
| `3:32 – 3:45` (13s) | S4.4 | "Zero message loss, zero human intervention, **100% self-healing resilience**." | 9 words |

---

### Block 5: Minute 5 (Part A) — Outcome & Human-in-the-Loop Governance (`3:45 – 4:25`, 225s – 265s)
*Stage 6: Outcome | ~88 words | ~132 wpm*

| Timestamp Range | Sentence # | Spoken Narration Script (Verbatim) | Word Count |
|---|---|---|---|
| `3:45 – 3:58` (13s) | S5.1 | "This brings us to **Stage 6: Outcome**. The agent synthesizes its discoveries, schedules the targeted questions into upcoming check-ins, and confirms execution." | 22 words |
| `3:58 – 4:11` (13s) | S5.2 | "For high-risk actions—like department-wide broadcast alerts—our **Human-in-the-Loop engine** presents an interactive confirmation modal before execution." | 18 words |
| `4:11 – 4:25` (14s) | S5.3 | "Furthermore, every decision, tool invocation, and adaptation is sanitized by our credential redactor and permanently written to the immutable `agent_activity_logs` audit table for enterprise compliance." | 25 words |

---

### Block 6: Minute 5 (Part B) — Privacy Core, Security & Strong Closing (`4:25 – 5:00`, 265s – 300s)
*Production Wrap-up / Outcome Synthesis | ~102 words | ~175 wpm (rapid punchy closing)*

| Timestamp Range | Sub-Segment | Spoken Narration Script (Verbatim) | Word Count |
|---|---|---|---|
| `4:25 – 4:28` (3s) | Lead-in | "Under the hood:" | 3 words |
| `4:28 – 4:37` (9s) | Pillar 1 | "1. **Zero Data Leaks:** We enforce **n ≥ 3 differential privacy** directly in PostgreSQL, mathematically preventing individual de-anonymization." | 18 words |
| `4:37 – 4:44` (7s) | Pillar 2 | "2. **Bulletproof Security:** Row Level Security isolates every tenant, and DB triggers lock down billing columns." | 15 words |
| `4:44 – 4:51` (7s) | Pillar 3 | "3. **Production Rigor:** 23 passing unit tests and an offline fallback planner guarantee zero downtime during presentations." | 17 words |
| `4:51 – 5:00` (9s) | Grand Closing | "PeoplePulse doesn’t just watch company burnout happen—it empowers autonomous intelligence to fix it in real-time. Thank you, and we look forward to your questions!" | 23 words |

---

## 4. Visual Scene Cues, On-Screen Actions, Telemetry & Callouts

### Scene 1: Minute 1 (`0:00 – 0:45`) — The Problem & The Autonomous Shift
- **On-Screen Visual:**
  - Starts on **PeoplePulse Landing Page** (`/` or Hero), showcasing brand title, mission banner, and "Sign In / View Demo" CTA.
  - Smoothly transitions into **Admin Dashboard** (`/admin` or `#admin`).
  - Renders top KPI Summary Cards:
    - **Total Employees:** `248`
    - **Company Wellbeing / Avg Engagement:** `68%`
    - **Active Teams:** `5` (Engineering, Product, Customer Support, Sales, Marketing)
    - **Weekly Participation Rate:** `84%`
  - Active team health breakdown cards with status chips (`Healthy`, `Moderate`, `At Risk`).
  - Floating in the bottom-right corner: Glowing PulseAgent Copilot button with pulsating icon and animated emerald ping badge.
- **Judge Key Takeaway Callout:**
  - *"Establish immediate contrast: static 50-question annual surveys lag by 6 months; PeoplePulse closes the loop autonomously every day."*
- **On-Screen Telemetry Stats:**
  - Burnout rate: `76%`
  - Survey cycle time: `60 seconds` daily micro-pulse vs. `6-month` lag
  - Org active count: `248 employees`, `5 teams`

---

### Scene 2: Minute 2 (`0:45 – 1:30`) — Why Agentic AI? (Not a Chatbot)
- **On-Screen Visual & UI Actions:**
  - Cursor tracks to bottom-right and clicks floating **PulseAgent Copilot** button.
  - Slide-out drawer animates open from right edge (`w-[520px]`).
  - Header displays:
    - Zap icon in gradient box
    - Title: **PulseAgent**
    - Badges: `ReAct AI Agent` (blue pill), `Gemini Live` (emerald pulsating pill)
    - Subtitle: *"Autonomous reasoning loop (Observe → Decide → Act → Evaluate → Adapt)"*
  - **Top Breadcrumb Bar Highlight:**
    - Visual pointer / spotlight focuses on the 6-stage rubric breadcrumb bar:
      `Goal (Blue) → Decision (Purple) → Action (Slate) → Evaluation (Amber) → Adaptation (Orange) → Outcome (Emerald)`
  - Three navigation tabs visible:
    - `[Terminal icon] ReAct Copilot` (Active)
    - `[Activity icon] Audit Trail (30)`
    - `[Wrench icon] Tools (7)`
- **Judge Key Takeaway Callout:**
  - *"Prove technical compliance with Rulebook §4: Multi-step ReAct loop with schema-validated Postgres tools, not single-turn text."*
- **Technical Callouts:**
  - Reasoning Engine: Google Gemini 2.0 Flash Function Calling
  - Backend: Supabase PostgreSQL with active Row Level Security (RLS)
  - Security Layer: `agentPolicy.js` RBAC engine with multi-tenant boundary isolation

---

### Scene 3: Minute 3 (`1:30 – 2:40`) — Live ODAEA Demo (Action & Evaluation)
- **On-Screen Visual & UI Actions:**
  - Cursor clicks Quick Preset button:
    `"Demonstrate Full Agentic Workflow: Goal → Decision → Action → Evaluation → Adaptation → Outcome"`
  - Event stream begins rendering live ODAEA cards sequentially:
    1. **Stage 1: Goal Card (Blue background, border-blue-200):**
       - Icon: `🎯 Stage 1: Goal`
       - Content: *"Diagnose company-wide friction and deploy interventions."*
    2. **Stage 2: Decision Card (Purple background, border-purple-200):**
       - Icon: `💡 Stage 2: Decision (Step 1)`
       - Tool Badge: `Checking Company Numbers` (`get_organization_metrics`)
       - Decision Reasoning: *"Query baseline organization health metrics to identify departments experiencing anomalous friction or workload spikes."*
    3. **Stage 3: Action Card (White background, shadow-2xs):**
       - Icon: `⚙️ Stage 3: Action Executed: Checking Company Numbers`
       - Status: `✓ Done`
       - Friendly summary: *"Checked 124 survey responses across 5 teams."*
       - Collapsible schema drawer expanded:
         ```json
         {
           "organization_id": "org_acme_corp_01",
           "time_window_days": 30
         }
         ```
       - Visual Callout Banner: *"`organization_id` server-injected from session token — LLM cannot fabricate tenant boundary."*
    4. **Observation Card (Emerald background, border-emerald-200):**
       - Icon: `🔍 Observation (Environment Feedback)`
       - Summary: *"Company average engagement: 68/100. Customer Support team shows critical drop to 42/100 (stress level 4.6/5, workload unsustainable due to shift overload)."*
       - Signals:
         - `• Organization Average Engagement: 68/100`
         - `• Customer Support Engagement: 42/100 (Critical)`
         - `• Stress Index: 4.6 / 5.0 (Shift Overload Detected)`
    5. **Stage 4: Evaluation Card (Amber background, border-amber-200):**
       - Icon: `📋 Stage 4: Evaluation (Step 1)`
       - Evaluation Reasoning: *"Data indicates localized acute burnout in Customer Support. Formulating targeted adaptive pulse question for upcoming check-ins and generating 1:1 manager coaching talking points."*
- **Judge Key Takeaway Callout:**
  - *"Show live DB query, server-injected tenant ID (no hallucination), and context-aware mathematical evaluation."*
- **On-Screen Telemetry Stats:**
  - Org engagement: `68%`
  - Customer Support engagement: `42%`
  - Support stress index: `4.6 / 5.0`
  - Responses analyzed: `124 check-ins`

---

### Scene 4: Minute 4 (`2:40 – 3:45`) — The Core Differentiator: Failure Interception & Adaptation
- **On-Screen Visual & UI Actions:**
  - Agent attempts to broadcast escalation alert to external team webhook (`simulate_and_handle_failure`).
  - Action card displays:
    - Attempting webhook delivery: `POST https://httpstat.us/503?sleep=1000` (`slack_webhook_v2`)
    - Latency timer counts: `0ms → 1218ms`
    - Status: `FAILED (HTTP 503 Service Unavailable)`
  - **Prominent Orange Adaptation Card Appears (Border-2 border-orange-400, gradient-to-r from-orange-50 to-amber-50):**
    - Header: `🛡️ Stage 5: Adaptation (Failure Interception & Self-Correction)`
    - Badge: `Self-Corrected` (orange pill)
    - Strategy Text: *"Primary webhook connection timed out with HTTP 503. Autonomous failover triggered: switching alert delivery to Supabase internal emergency escalation queue."*
    - Trigger Monospace Text: `Trigger: HTTP 503 Service Unavailable from primary webhook endpoint (slack_webhook_v2, duration: 1218ms)`
  - **Subsequent Action Card (Fallback Execution):**
    - Tool: `send_emergency_notification` (Routing Alert via Fallback Queue)
    - Status: `✓ DELIVERED`
    - Result: *"Emergency notice safely logged and delivered to admin console via backup queue (channel: emergency_in_app_queue, priority: high)."*
- **Judge Key Takeaway Callout:**
  - *"Rulebook §7 & §9: Demonstrates genuine environmental resilience. HTTP 503 error is intercepted and rerouted with zero message loss."*
- **Resilience Telemetry Stats:**
  - Primary attempt target: `slack_webhook_v2`
  - Error code: `HTTP 503 Service Unavailable`
  - Timeout duration: `1218 ms`
  - Adaptation required flag: `true`
  - Message loss: `0% (Zero loss)`
  - Human intervention required: `0 (Zero)`
  - Self-healing resilience: `100%`

---

### Scene 5: Minute 5 (Part A) (`3:45 – 4:25`) — Outcome & Human-in-the-Loop Governance
- **On-Screen Visual & UI Actions:**
  - Event stream concludes with large **Green Stage 6: Outcome Card** (Border-2 border-emerald-500, shadow-md):
    - Icon: `CheckCircle2` (emerald circle)
    - Title: **Stage 6: Outcome & Final Resolution**
    - Model Badge: `Gemini 2.0 Flash`
    - Subtitle: *"Resolution complete • Interventions deployed"*
    - Summary Box: *"Autonomous multi-step investigation completed for goal: 'Diagnose company-wide friction and deploy interventions'."*
    - Summary Stats Grid (2x2):
      - Engagement: `68/100`
      - Active Employees: `248`
      - Active Teams: `5`
      - Interventions: `2 Deployed`
    - Key Discoveries List:
      - `• Customer Support engagement dropped to 42/100 due to shift scheduling fatigue`
      - `• Primary notification channel failed (HTTP 503) — autonomously recovered via internal queue`
      - `• Interventions scheduled without exposing anonymous individual responses`
    - Actions Taken:
      - `• Scheduled adaptive survey question: 'How manageable has your shift scheduling been this week?'`
      - `• Generated 3 manager coaching talking points for Customer Support lead`
      - `• Emergency alert delivered to admin escalation queue`
  - **Human-in-the-Loop Modal Demonstration:**
    - Brief mockup overlay showing Amber Confirmation dialog: *"Administrator confirmation required to broadcast department-wide shift alert [Approve Action] [Deny Action]"*.
  - **Audit Trail Tab Navigation:**
    - User clicks `Audit Trail` tab in drawer header.
    - Displays live `agent_activity_logs` table:
      - Columns: `Timestamp`, `Goal`, `Tool Invoked`, `Status`, `Sanitized Input`, `Outcome`.
      - Parameters show active credential masking: `api_key: [REDACTED]`, `tenant_token: [MASKED]`.
- **Judge Key Takeaway Callout:**
  - *"Enterprise governance: Human-in-the-Loop confirmation for destructive actions; immutable audit log with automated credential masking."*

---

### Scene 6: Minute 5 (Part B) (`4:25 – 5:00`) — Privacy Core, Security & Strong Closing
- **On-Screen Visual & UI Actions:**
  - Quick split screen / overlay of **Developer Terminal** running unit test suite:
    ```bash
    npm run test
    ```
    - Terminal Output:
      ```
      PASS  src/lib/agent/__tests__/toolRegistry.test.js
      PASS  src/lib/agent/__tests__/agentPolicy.test.js
      PASS  src/lib/agent/__tests__/privacyThreshold.test.js
      PASS  src/lib/agent/__tests__/reactLoop.test.js

      Test Files  4 passed (4)
      Tests       23 passed (23)
      Time:       511 ms
      ```
  - Terminal closes, transitions back to full-screen **PeoplePulse Command Center Dashboard**.
  - Vibrant closing banner / slide:
    - **PeoplePulse — Autonomous Enterprise HR Intelligence**
    - Subtitle: *Tech Zephyr 4.0 | Agentic AI Hackathon | IIT Bhubaneswar*
    - Badges: `n ≥ 3 Differential Privacy` • `PostgreSQL RLS` • `Zero Message Loss Failover` • `23/23 Passing Tests`
    - Text: *"Thank You — Open for Q&A"*
- **Judge Key Takeaway Callout:**
  - *"Under-the-hood enterprise rigor: n ≥ 3 differential privacy, DB RLS, passing test suite, and offline guarantee."*
- **Enterprise Telemetry Stats:**
  - Unit tests: `23 passed in 511ms`
  - Privacy guarantee: $n \ge 3$ database suppression threshold
  - Tenant security: 100% RLS coverage across all tables
  - Availability: Dual-key auto-failover + local deterministic state machine

---

## 5. Technical Q&A Defense Sheet (Judges' Toughest Questions)

Authoritative answers from Section 2 of the pitch script:

| # | Judge's Tough Question | Winning Technical Defense Answer | Key Code Artifact / Proof |
|---|---|---|---|
| **1** | *"How do you prove this is an Agent, not just a scripted if-else flow?"* | "PulseAgent runs a true **ReAct loop** in `agentEngine.js` via Gemini 2.0 Flash Function Calling. The model inspects tool signatures, decides execution steps dynamically based on memory history, and dynamically forms parameters. We removed all hardcoded completion short-circuits—the model independently evaluates observations until its goal is satisfied." | `src/lib/agent/agentEngine.js`<br/>`src/lib/agent/toolRegistry.js` |
| **2** | *"How do you prevent cross-tenant data leaks between companies?"* | "Three-layer enforcement:<br/>1) **Policy Layer** (`agentPolicy.js` validates active session org against target org);<br/>2) **Context Stripping** (client strips `organization_id` from LLM parameters and server-injects it); and<br/>3) **PostgreSQL Row Level Security** (Migration 039 queries tenant membership for all reads/writes)." | `src/lib/agent/agentPolicy.js`<br/>`supabase/migrations/039_security_hardening_v2.sql` |
| **3** | *"What stops a manager from identifying who submitted negative ratings?"* | "We enforce an **n ≥ 3 differential privacy threshold** in our PostgreSQL RPC (`get_org_team_comparison`). If a team has fewer than 3 responses in a cycle, sentiment and score aggregations are suppressed to `null` at the database engine level, making individual deanonymization mathematically impossible." | `supabase/migrations/039_security_hardening_v2.sql`<br/>`src/lib/agent/__tests__/privacyThreshold.test.js` |
| **4** | *"What happens if external APIs throttle you or internet drops during live judging?"* | "We engineered a **dual-key failover system** and a **deterministic local fallback planner** (`geminiClient.js`). If API keys fail or network disconnects, the engine seamlessly switches to the local state-machine planner with zero crashes and identical ODAEA event streaming." | `src/lib/agent/geminiClient.js:runDynamicLocalPlanner`<br/>`src/components/AgenticCopilot.jsx:340` |
| **5** | *"How does failure adaptation actually work under the hood?"* | "In `tools.js`, `simulate_and_handle_failure` triggers a real HTTP request to a failing endpoint (503 status). The exception is caught, returning `adaptation_required: true`. The engine flags an **ADAPTATION** event, pushes failure telemetry into prompt context, and the planner autonomously selects the in-app emergency dispatch tool." | `src/lib/agent/tools.js:569`<br/>`src/lib/agent/agentEngine.js:298` |

---

## 6. Grand Finale Scoring Maximizers (Securing 10/10)

From Section 3 of the pitch documentation:

| Rubric Requirement | Key Action During Presentation / Simulator | Proof Location in Codebase |
|---|---|---|
| **1. Visible 6-Stage Loop** | Point physically to the breadcrumb bar at the top of the copilot drawer when each stage fires. Ensure active stage glows prominently. | `AgenticCopilot.jsx:274-286` |
| **2. Failure & Self-Healing** | Let the orange Adaptation card stay on screen for at least 5 seconds. Explicitly say: *"Notice how it caught the 503 error and rerouted."* | `tools.js:simulate_and_handle_failure`<br/>`AgenticCopilot.jsx:549-563` |
| **3. Enterprise Security** | Mention the $n \ge 3$ differential privacy rule. Academic judges at IIT Bhubaneswar value mathematical guarantees. | `supabase/migrations/039_security_hardening_v2.sql` |
| **4. Zero Downtime Demo** | If Gemini API key hits any quota or latency, the system seamlessly transitions to the local fallback planner without throwing an alert. | `geminiClient.js:runDynamicLocalPlanner` |

---

## 7. Features Discovered Table

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| **1** | Timeline Engine | 300-Second Synchronized Timeline | Master playback clock covering exactly 0 to 300 seconds across 6 stages | Play/pause/seek events, playback rate | Current time (seconds), active stage index | Clamps seek to `[0, 300]` | `pitch_script_5min.html:298` |
| **2** | Timeline Engine | 6 Official Rubric Stage Markers | Goal (0-45s), Decision (45-90s), Action (90-134s), Evaluation (134-160s), Adaptation (160-225s), Outcome (225-300s) | Stage click, timeline seek | Active breadcrumb state, stage title, stage badge styling | Falls back to closest stage | `pitch_script_5min.html:310-478` |
| **3** | Audio Narration | Verbatim Spoken Pitch Narration | Continuous spoken voiceover track matching pitch script word-for-word (~135 wpm) | Audio file / Web Audio / TTS synthesizer | Audio output stream, synced current timestamp | Audio load failure falls back to visual subtitle mode | `pitch_script_5min.html:331-475` |
| **4** | Subtitles & Captions | Real-Time Synchronized Captions | High-contrast subtitle overlay synchronized sentence-by-sentence with exact target timestamps | Master timeline time | Active sentence text, highlighted keywords | Empty string if outside timestamp range | `pitch_script_5min.html:331-475` |
| **5** | UI Simulation | Admin Dashboard Mockup | Interactive overview with KPI cards (248 employees, 68% engagement, 5 teams, 84% participation) | Navigation state, mock tenant data | Rendered KPI tiles, team health cards | Gracefully renders zero/null stats | `pitch_script_5min.html:324` |
| **6** | UI Simulation | Slide-Out Copilot Drawer | Animated slide-out drawer (`w-[520px]`) containing breadcrumbs, settings, and ODAEA event trace | Toggle button click, auto-slide trigger | Drawer open/closed animation, backdrop overlay | Re-centers if viewport width < 520px | `AgenticCopilot.jsx:224-271` |
| **7** | Agent Execution | 6-Stage Rubric Breadcrumbs | Visual top bar tracking `Goal → Decision → Action → Evaluation → Adaptation → Outcome` | Active event type or timeline stage | Colored active pill with pulsing indicator | Resets to Stage 1 on restart | `AgenticCopilot.jsx:274-286` |
| **8** | Agent Execution | Quick Preset Runner | One-click demo button: *"Demonstrate Full Agentic Workflow"* | Click event | Sequential ODAEA event card dispatch into trace | Ignores clicks if already running | `AgenticCopilot.jsx:52, 440` |
| **9** | Agent Execution | Stage 1 Goal Card | Blue card displaying goal statement | Goal text string | Rendered `🎯 Stage 1: Goal` card | Shows default fallback goal | `AgenticCopilot.jsx:458-466` |
| **10** | Agent Execution | Stage 2 Decision Card | Purple card showing autonomous tool selection and step reasoning | Tool name, decision reasoning | Rendered `💡 Stage 2: Decision` card with friendly tool name | Shows raw tool name if unmapped | `AgenticCopilot.jsx:468-482` |
| **11** | Agent Execution | Stage 3 Action Card | Slate/white card showing executed tool, friendly result summary, and expandable JSON schema | Tool name, execution result payload | Rendered `⚙️ Stage 3: Action Executed` card with collapsible JSON | Renders error summary if execution failed | `AgenticCopilot.jsx:484-512` |
| **12** | Agent Execution | Observation Feedback Card | Emerald card displaying environment feedback, org metrics, and localized friction signals | Signals array, summary text | Rendered `🔍 Observation` card with signal bullets | Renders generic feedback if signals empty | `AgenticCopilot.jsx:514-533` |
| **13** | Agent Execution | Stage 4 Evaluation Card | Amber card showing numerical data evaluation and burnout calculation | Evaluation reasoning string | Rendered `📋 Stage 4: Evaluation` card | Evaluates need for baseline pulse | `AgenticCopilot.jsx:535-546` |
| **14** | Agent Execution | Stage 5 Adaptation Card | Prominent orange/amber card indicating failure interception and autonomous strategy shift | Error trigger, adaptive strategy text | Rendered `🛡️ Stage 5: Adaptation` card with `Self-Corrected` badge | Flags adaptation required; alerts admin | `AgenticCopilot.jsx:548-563` |
| **15** | Resilience Harness | HTTP 503 Webhook Interception | Initiates external webhook post to `httpstat.us/503`, catches timeout within 1200ms | Channel name, organization ID | Result object with `adaptation_required: true` and failure duration | Caught exception handled without crashing loop | `tools.js:569-613` |
| **16** | Resilience Harness | Emergency Queue Autonomous Reroute | Fallback tool dispatching urgent alert to internal Supabase emergency queue | Organization ID, alert title, message, priority | Delivered alert record, zero message loss | LocalStorage cache fallback if DB unavailable | `tools.js:511-559` |
| **17** | Agent Execution | Stage 6 Outcome Card | Emerald card showing final resolution, discovery list, summary stats grid, and actions taken | Outcome payload object | Rendered `Stage 6: Outcome & Final Resolution` card | Displays default completion message | `AgenticCopilot.jsx:604-650` |
| **18** | Governance | Human-in-the-Loop Confirmation | Interactive approval modal for high-risk tools (`broadcast_alert`) | Tool name, proposed arguments | Approve/Deny action buttons, pause state | If denied, emits error event and stops safely | `AgenticCopilot.jsx:566-601` |
| **19** | Governance | Credential-Redacted Audit Trail | Tab in drawer showing table of logged actions with automated regex credential masking | Org ID, log records | Rendered audit table with redacted tokens | Masks patterns like `Bearer *`, `AIzaSy*` | `AgenticCopilot.jsx:406` |
| **20** | Privacy Security | $n \ge 3$ Differential Privacy | Suppression of aggregate metrics for teams with $< 3$ responses | Team survey response count | Nullified sentiment/engagement scores | Suppresses score rather than throwing error | `039_security_hardening_v2.sql` |
| **21** | Privacy Security | Server Tenant Injection | Stripping client-provided `organization_id` and injecting authenticated session ID | Raw LLM arguments, auth session | Sanitized arguments with enforced tenant ID | Rejects request if session org missing | `pitch_script_5min.html:499` |
| **22** | Production Rigor | Offline Deterministic Planner | Local state machine that executes complete ODAEA loop without internet or API key | Prompt goal, tool registry | Deterministic sequence of events matching live Gemini | Activates automatically on API failure | `geminiClient.js:runDynamicLocalPlanner` |
| **23** | Interactive Player | Judge Live-Pause & Exploration | Allows judge to pause presentation at any time to inspect JSON schemas, click tabs, scroll trace | Pause button click, timeline click | Suspends clock/audio; enables UI clicks | Resuming continues from exact paused timestamp | `ORIGINAL_REQUEST.md:R4` |
| **24** | Interactive Player | Playback Rate Controls | 1x, 1.25x, 1.5x speed toggle buttons | Rate select click (1.0, 1.25, 1.5) | Adjusted audio rate, scaled timer tick | Preserves audio pitch via `preservesPitch` | `ORIGINAL_REQUEST.md:R1` |

---

## 8. Edge Cases & Observed System Behaviors

| # | Feature | Input / Condition | Observed / Documented Behavior |
|---|---|---|---|
| **E1** | Timeline Scrubbing | Viewer seeks from 0:10 (Stage 1) to 3:00 (Stage 5) | Timeline instantly updates: active stage switches to Adaptation, drawer opens, orange failure card displays, audio seeks to 180s, captions show Sentence S4.3. |
| **E2** | Live-Pause Exploration | Viewer pauses at 2:45 during Adaptation explanation | Narration audio pauses immediately; UI unlocks; viewer can expand JSON payload (`simulate_and_handle_failure`), click "Audit Trail" tab, or inspect breadcrumb bar. Resuming from 2:45 resumes audio and timeline seamlessly. |
| **E3** | Playback Speed Scaling | User switches speed to 1.5x during playback | Audio playback rate adjusts to 1.5x with pitch preservation (`preservesPitch = true`); subtitle timings scale inversely ($t / 1.5$); visual card reveal triggers remain perfectly synchronized. |
| **E4** | Webhook 503 Timeout | Primary webhook endpoint returns HTTP 503 or hangs $> 1200\text{ms}$ | Controller aborts request at 1200ms; exception is caught by try-catch; returns `adaptation_required: true`; agent engine emits `ADAPTATION` event; engine autonomously calls `send_emergency_notification`. No crash. |
| **E5** | Differential Privacy ($n < 3$) | Manager queries team comparison where Customer Support has 2 responses | PostgreSQL RPC suppresses engagement score and sentiment to `null`. Agent receives nullified metrics and reports "insufficient responses to protect anonymity ($n \ge 3$ threshold)". |
| **E6** | Tenant Boundary Tampering | LLM or malicious user passes `organization_id: "org_competitor_99"` | Parameter is stripped by client validation layer; authenticated session `activeOrganization.id` is server-injected; PostgreSQL RLS policy filters rows strictly by session JWT. |
| **E7** | API Quota Exceeded / Offline | Gemini API returns 429 Quota Exceeded or device offline during demo | Copilot catches network failure, switches to previous working API key; if that fails, immediately falls back to `runDynamicLocalPlanner` in `geminiClient.js`, rendering identical ODAEA event cards with zero delay. |
| **E8** | Human-in-the-Loop Rejection | Administrator clicks "Deny Action" on high-risk confirmation modal | Agent aborts sensitive tool execution, emits `AGENT_EVENT_TYPES.ERROR` with message "Action rejected by administrator", logs rejection to audit table, and halts execution gracefully. |
| **E9** | Timeline Boundary Overflow | Presentation reaches $t = 300\text{s}$ (5:00) | Clock stops; player enters finished state; displays final summary slide with replay button and Technical Defense cheat sheet access. Seeking backwards allows instant replay. |
| **E10** | Audio Mute / Unmute Toggle | Viewer toggles mute button while narration is playing | Audio volume sets to 0 (muted) without stopping timeline playback clock or desynchronizing live caption stream. Unmuting restores previous volume level. |

---

## 9. Player Simulator Implementation Requirements (For Downstream Agents)

Downstream agents building the interactive HTML5 presentation player in `d:/project/PeoplePulse/demo_video_player` should implement:

1. **Timeline State Machine:**
   - Single source of truth clock: `currentTime` ($0.00\text{s} \le t \le 300.00\text{s}$).
   - Derives `currentStageIndex` ($0 \dots 5$) and `currentBlockIndex` ($0 \dots 5$).
   - Synchronizes Audio element, Subtitle overlay, and Visual scene mockup.
2. **Audio & Subtitle Track:**
   - Web Audio or HTML5 `<audio>` track delivering the complete spoken script.
   - Synchronized VTT/JSON subtitle cues matching the sentence tables in Section 3.
   - High-contrast floating caption overlay with word/phrase highlight.
3. **Dynamic Visual Stage Simulator:**
   - Stage 1 ($0\text{s} - 45\text{s}$): Landing page → Admin dashboard mockup with live KPI numbers.
   - Stage 2 ($45\text{s} - 90\text{s}$): Slide-out PulseAgent drawer with 6-stage breadcrumbs highlighted.
   - Stage 3 ($90\text{s} - 134\text{s}$): Event card streaming (Goal, Decision, Action with expandable JSON).
   - Stage 4 ($134\text{s} - 160\text{s}$): Observation feedback (68% org, 42% Support) + Evaluation card.
   - Stage 5 ($160\text{s} - 225\text{s}$): Orange failure interception card (HTTP 503) + emergency queue reroute.
   - Stage 6 ($225\text{s} - 300\text{s}$): Green outcome card, Audit Trail tab, terminal test output (23 tests in 511ms), and final closing slide.
4. **Interactive Pause Mode:**
   - Whenever paused, the viewer can freely click tabs, toggle details/JSON payloads, inspect the audit trail, and verify schema parameters.
   - Resuming automatically restores active presentation state.
5. **Standalone Verification:**
   - Lightweight standalone HTML/JS bundle runnable with `npx serve` or vite dev server.
   - Automated verification script checking timeline continuity and audio/caption sync.
