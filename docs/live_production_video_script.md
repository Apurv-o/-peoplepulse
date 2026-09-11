# PeoplePulse — Official Live Production Video & Demo Script
**Deployed Production App:** [https://peoplepulse-app.vercel.app/](https://peoplepulse-app.vercel.app/)  
**Login Credentials:** `admin@company.com` / `Password123!`  
**Target Video Duration:** 2:45 – 3:00 Minutes (~165–180 Seconds)  
**Style Reference:** Modeled after [NetCraft AI - Kiro Hackathon Submission](https://www.youtube.com/watch?v=Yf8ev7WYqUE)  
**Track:** Agentic AI Hackathon | Tech Zephyr 4.0, IIT Bhubaneswar  

---

## 🎬 Video Recording Guide & Screen Setup
* **Browser:** Google Chrome or Microsoft Edge in full-screen (1080p / 1920x1080).
* **Zoom Level:** 100% (or 110% for crisp readability on YouTube).
* **Audio:** Clear headset or USB microphone, steady speaking pace (~130 words/minute).
* **Initial State:** Start on the Login page at `https://peoplepulse-app.vercel.app/`.

---

## ⏱️ Minute-by-Minute Live Recording Script

### **[0:00 – 0:28] Act 1: The Hook & Introduction (Login Page → Overview)**
* **Visual Action on Screen:**
  1. Start on the clean PeoplePulse Login card (`#login`).
  2. Cursor moves to Email input: types `admin@company.com`.
  3. Cursor moves to Password: types `••••••••••••`.
  4. Click the blue button: **"Sign in to PeoplePulse"**.
  5. The screen transitions into the **Organization Overview** dashboard.
* **Spoken Narration (Word-for-Word):**
  > *"Greetings, dear judges. Let me introduce **PeoplePulse**, an autonomous enterprise HR intelligence platform built for Tech Zephyr 4.0 at IIT Bhubaneswar.*  
  > 
  > *In modern engineering and enterprise teams, **76% of employees experience burnout** before leadership realizes there’s a problem. Traditional annual surveys fail because of survey fatigue and 6-month time lags.*  
  > 
  > *PeoplePulse transforms passive employee engagement into **60-second confidential daily micro-pulses**, backed by **PulseAgent**: an autonomous ReAct AI agent that continuously diagnoses team friction, isolates burnout bottlenecks, and executes organizational interventions directly in your browser."*

---

### **[0:28 – 0:58] Act 2: Architecture & Why Agentic AI (Overview Dashboard)**
* **Visual Action on Screen:**
  1. Hover cursor gently across the top metric cards:
     * **Organization Members** (`12 / 100` seats)
     * **Active Teams** (`4 / 10` departments)
     * **Daily Participation** (`83%` with green `● Realtime` pulsing pill)
     * **Org. Engagement** (`74 / 100` score with *"Resets every Saturday"*)
  2. Scroll down smoothly to show the **Engagement Trend** line chart and the **Sentiment Distribution** donut chart.
* **Spoken Narration (Word-for-Word):**
  > *"Before showing you the live workflow, let me explain how our agentic architecture works.*  
  > 
  > *Unlike simple chatbots that merely output text, PulseAgent implements an authentic 6-stage lifecycle: **Goal, Decision, Action, Evaluation, Adaptation, and Outcome**.*  
  > 
  > *It is powered by Google Gemini 2.0 Flash Function Calling, running against our multi-tenant Supabase PostgreSQL backend with strict Row Level Security. We enforce differential privacy where $n \ge 3$ at the database engine level, mathematically preventing individual de-anonymization, while every decision is recorded to an immutable audit trail."*

---

### **[0:58 – 1:35] Act 3: Live Workflow & ReAct Copilot (Opening PulseAgent)**
* **Visual Action on Screen:**
  1. Scroll up to the **PulseAgent HR Copilot** banner widget (sparkles icon with green `Active` pill).
  2. Click the blue CTA button: **"Open PulseAgent"** (or the floating button on the bottom right).
  3. The **PulseAgent slide-out drawer** opens from the right side of the screen.
  4. Point cursor to the top breadcrumb bar tracking all 6 stages.
  5. Click the Quick Prompt chip:  
     👉 *"Investigate Customer Success team burnout, deploy adaptive question, and brief manager"*  
     *(or "Run comprehensive organization wellbeing audit & recommend actions")*.
  6. The live ReAct execution stream begins populating with friendly tool names.
* **Spoken Narration (Word-for-Word):**
  > *"Now, let’s move to our live workflow demo. On the Organization Overview dashboard, we click **Open PulseAgent** to open our copilot drawer.*  
  > 
  > *Notice the top breadcrumb bar tracking all 6 stages. We trigger an organizational investigation with one click.*  
  > 
  > * **Stage 1: Goal Established.** PulseAgent sets the enterprise objective.*  
  > * **Stage 2: Decision.** The model inspects its tool registry and autonomously selects `get_organization_metrics`—labeled here as **Checking Company Numbers**.*  
  > * **Stage 3: Action.** It executes the tool against our live Supabase database. Notice that the organization ID is automatically injected from the session claims—the LLM is never allowed to fabricate tenant boundaries."*

---

### **[1:35 – 2:02] Act 4: Dynamic Evaluation & Bottleneck Discovery (Copilot Trace)**
* **Visual Action on Screen:**
  1. Point cursor to the incoming **Observation** in the Copilot stream.
  2. The agent displays: Company engagement is 74%, but **Customer Support** has dropped to an urgent **42% burnout score**.
  3. The card updates to **Stage 4: Evaluation**.
  4. Agent calls `dispatch_adaptive_survey` (*"Adding Follow-Up Question"*) and `trigger_manager_action_brief` (*"Preparing Manager Talking Points"*).
* **Spoken Narration (Word-for-Word):**
  > *"In **Stage 4: Evaluation**, the agent parses the live telemetry.*  
  > 
  > *It calculates mathematical averages across teams and isolates Customer Support as an urgent bottleneck, suffering from severe burnout at 42% due to shift overload.*  
  > 
  > *Rather than waiting for human HR intervention, PulseAgent autonomously decides on two corrective actions: injecting an adaptive follow-up question into tomorrow's check-in battery, and synthesizing a personalized 1:1 action brief for the Customer Support manager."*

---

### **[2:02 – 2:32] Act 5: Failure Interception & Self-Healing Adaptation (The Killer Differentiator)**
* **Visual Action on Screen:**
  1. The agent attempts to broadcast an emergency notice to an external team webhook.
  2. Highlight the prominent **orange event card**:  
     `Stage 5: Adaptation (Failure Interception & Self-Correction)`.
  3. The card displays: `Trigger: HTTP 503 Service Unavailable from external webhook`.
  4. The next card executes `send_emergency_notification` (*"Rerouting to Internal Emergency Queue"*).
* **Spoken Narration (Word-for-Word):**
  > *"Now, pay close attention to **Stage 5: Adaptation**—our primary hackathon differentiator.*  
  > 
  > *In real-world enterprise environments, external webhooks and third-party APIs fail. When PulseAgent attempts to broadcast an escalation alert, it intercepts a real **HTTP 503 service timeout**.*  
  > 
  > *A standard script would crash or silently drop the alert. **PulseAgent catches the network exception, evaluates the failure context, triggers a strategy adaptation event, and autonomously reroutes the escalation** to our internal Supabase emergency dispatch queue.*  
  > 
  > *Zero message loss, zero human intervention, 100% self-healing resilience."*

---

### **[2:32 – 2:58] Act 6: Outcome, Governance & Closing (Activity Tab → Conclusion)**
* **Visual Action on Screen:**
  1. The green card appears: **Stage 6: Outcome & Final Summary**.
  2. Click the **Activity** tab in the Copilot drawer header: show the chronological audit log of actions taken.
  3. Click the **Tools** tab: briefly show the allowlisted tool schemas.
  4. Close the drawer, return to the clean Dashboard, and hover over the **Questions** tab in the sidebar.
* **Spoken Narration (Word-for-Word):**
  > *"This brings us to **Stage 6: Outcome**.*  
  > 
  > *The adaptive questions are live, the manager brief is delivered, and in the **Activity tab**, judges can inspect the permanent, sanitized audit log recorded in `agent_activity_logs`.*  
  > 
  > *Under the hood, PeoplePulse is production-hardened: 23 unit tests passing in 500 milliseconds, strict PostgreSQL Row Level Security, and an offline fallback planner guaranteeing continuous uptime.*  
  > 
  > *I believe PeoplePulse demonstrates the true potential of autonomous Agentic AI in the enterprise. I sincerely hope it earns your positive review. Thank you for your attention!"*

---

## 📋 Quick Cheat Sheet: Click & Navigation Sequence

```text
1. [0:00]  Login Page (admin@company.com / Password123!) → Click "Sign in"
2. [0:20]  Dashboard: Highlight KPI Cards (12/100 members, 4/10 teams, 83% participation, 74 engagement)
3. [0:40]  Scroll: Show Trend Chart & Sentiment Donut
4. [1:00]  Click "Open PulseAgent" button → Slide-out drawer opens
5. [1:15]  Click Quick Prompt: "Investigate Customer Success team burnout..."
6. [1:30]  Event Stream: Stage 1 (Goal) → Stage 2 (Decision) → Stage 3 (Action)
7. [1:45]  Observation: Highlight Customer Support 42% burnout drop
8. [2:05]  Stage 5 (Orange Card): Highlight HTTP 503 Failure & Autonomous Reroute
9. [2:35]  Click "Activity" tab: Show Audit Logs → Click "Tools" tab: Show Schemas
10. [2:50] Close drawer → Final view of Dashboard → Conclude video
```
