# PeoplePulse Presentation Player & Simulator — Technical Architecture Specification

**Project**: PeoplePulse — Standalone Interactive HTML5 Presentation Player & Live UI Simulator  
**Working Directory**: `d:/project/PeoplePulse/demo_video_player/`  
**Target Duration**: 300 Seconds (5:00 Minutes) Across Official 6-Stage Lifecycle  
**Integrity Mode**: Standalone / Zero External Cloud Runtime Dependencies  
**Author**: Player Architecture Explorer  
**Date**: 2026-09-11  

---

## 1. Executive Architectural Blueprint

### 1.1 Mission & Context
The PeoplePulse Interactive Presentation Player and Simulator is engineered to deliver a seamless, high-impact 5-minute (300-second) pitch and live demonstration for the **Tech Zephyr 4.0 Agentic AI Hackathon** (IIT Bhubaneswar). It strictly adheres to the official 6-stage evaluation rubric:
$$\text{Goal} \longrightarrow \text{Decision} \longrightarrow \text{Action} \longrightarrow \text{Evaluation} \longrightarrow \text{Adaptation} \longrightarrow \text{Outcome}$$

Rather than relying on a static video file (e.g. MP4/WebM) which is non-interactive, pixel-compressed, and unresponsive to judge curiosity, this architecture implements a **100% client-side, interactive DOM-based simulator powered by a high-precision timeline engine and continuous studio-quality voiceover narration**.

### 1.2 Core Architectural Principles
1. **Zero External Runtime Dependencies**: The entire player, audio assets, subtitles, and interactive simulator must run locally via direct `file:///` protocol opening or a lightweight static file server (`python -m http.server` or `npx serve`).
2. **Rock-Solid Clock Synchronization**: The presentation timeline must remain drift-free over all 300 seconds, maintaining millisecond alignment across audio narration, real-time karaoke captions, and animated DOM scenes.
3. **Interactive Live-Pause Mode**: Judges or viewers can pause the automated playback at any moment to explore the live UI—clicking agent tabs, expanding raw JSON schemas, inspecting the Postgres audit trail—and resume smoothly without breaking presentation continuity.
4. **Authentic System Fidelity**: The simulator recreates the exact styling, color palette, typography (Inter & JetBrains Mono), badges, and event cards defined in PeoplePulse's production codebase (`AgenticCopilot.jsx`, `tools.js`, `agentEngine.js`).
5. **Headless Self-Verification**: Includes an automated verification harness (`verify_player.mjs`) leveraging Node 24 native WebSockets and Microsoft Edge DevTools Protocol (CDP) to validate timeline continuity, audio readiness, and zero console errors without installing third-party test frameworks.

---

## 2. Directory Structure & Component Topology

The standalone application will reside in `d:/project/PeoplePulse/demo_video_player/` with clean modular separation:

```
d:/project/PeoplePulse/demo_video_player/
├── index.html                     # Unified single-page presentation player & simulator
├── css/
│   ├── base.css                   # Global reset, typography, layout grid, dark/light themes
│   ├── simulator.css              # Mockups: Dashboard, PulseAgent Drawer, ODAEA Event Cards
│   └── player_controls.css       # Scrubber timeline, stage breadcrumbs, audio controls, subtitles
├── js/
│   ├── timelineEngine.js          # Authoritative clock, state machine, seek/speed management
│   ├── audioManager.js            # Audio narration playback, Web Audio chimes, gain/mute
│   ├── subtitleRenderer.js        # Millisecond karaoke captions & transcript overlay
│   ├── sceneSimulator.js          # Synchronized DOM scene state machine for 6 stages
│   ├── interactiveController.js   # Live-pause sandbox mode, tab clicks, JSON inspectors
│   ├── presentationData.js        # Complete pitch script, timestamps, event payloads, inline cues
│   └── app.js                     # Main entry wiring modules and event buses together
├── assets/
│   ├── audio/
│   │   ├── narration_full.mp3     # Studio-grade neural voiceover (edge-tts ChristopherNeural)
│   │   └── narration_sapi.wav     # Offline Windows SAPI fallback audio
│   └── subtitles/
│       ├── subtitles.json         # Timestamped sentence & word boundary metadata
│       └── subtitles.vtt          # Standard WebVTT track file
├── scripts/
│   ├── generate_audio_edgetts.py  # Automation: generates MP3 narration + word-level subtitle JSON
│   ├── generate_audio_sapi.ps1    # Automation: generates offline SAPI WAV fallback audio
│   └── verify_player.mjs          # Headless verification script via Edge CDP (0 dependencies)
└── README.md                      # Comprehensive user & judge documentation
```

---

## 3. Timeline Engine Architecture

### 3.1 Dual-Mode Authoritative Clock Design
Timing drift in web applications typically arises from `setInterval`/`setTimeout` inaccuracies caused by browser tab throttling, frame drops, or audio decoder variance. To achieve a rock-solid, drift-free 300-second timeline, we employ a **Dual-Mode Master Clock with Continuous Soft Drift Compensation**.

```
                           ┌───────────────────────────┐
                           │      Authoritative        │
                           │       Master Clock        │
                           └─────────────┬─────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [Mode A: Audio Master]                          [Mode B: Synthetic Clock]
   `audio.currentTime` is master                  `performance.now()` accumulator
(Active during standard voiced run)           (Active during silent / fallback mode)
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │  requestAnimationFrame()  │
                           │   Tick Loop (~60 FPS)     │
                           └─────────────┬─────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
       [Scene Simulator]       [Subtitle Renderer]       [Timeline UI Scrubber]
     Renders active stage,     Illuminates active        Updates progress bar,
     cards, and drawer state   karaoke word/cue          time tags, and markers
```

#### Drift Compensation Algorithm
On every animation frame (`requestAnimationFrame`), the timeline compares visual presentation time ($T_{\text{vis}}$) with audio master time ($T_{\text{audio}}$):
$$\Delta_{\text{drift}} = T_{\text{audio}} - T_{\text{vis}}$$
- **Micro-Drift ($|\Delta_{\text{drift}}| \le 0.05\text{s}$)**: No action; visually imperceptible.
- **Moderate Drift ($0.05\text{s} < |\Delta_{\text{drift}}| \le 0.3\text{s}$)**: Soft correction. The visual timeline is smoothly nudged toward $T_{\text{audio}}$ via exponential smoothing ($T_{\text{vis}} \leftarrow T_{\text{vis}} + 0.1 \times \Delta_{\text{drift}}$).
- **Major Desynchronization ($|\Delta_{\text{drift}}| > 0.3\text{s}$)**: If a frame stall occurs, the engine performs an instant hard-sync ($T_{\text{vis}} = T_{\text{audio}}$). This avoids cumulative drift while avoiding audio stutter.

### 3.2 Timeline State Machine
The engine implements seven discrete states:
1. `UNINITIALIZED`: Assets loading, UI in initial standby.
2. `READY`: Audio decoded, presentation data parsed, ready for judge start.
3. `PLAYING`: Normal forward playback, time advancing at `playbackRate`.
4. `PAUSED_USER`: Playback paused by user click or spacebar; interactive sandbox active.
5. `PAUSED_AUTO_STAGE`: Optional presentation mode: automatically pauses at stage transitions for presenter commentary.
6. `SEEKING`: User dragging scrubber slider; audio temporarily muted to prevent scrub buffer distortion.
7. `COMPLETED`: Timeline reaches 300.0s; displays final grand finale scorecard and restart button.

### 3.3 Stage Progression & Exact Timestamps
The timeline is divided into 6 distinct stages strictly corresponding to `pitch_script_5min.html`:

| Stage | Name | Time Range | Duration | Color Theme | Screen Cue & Primary Action |
|---|---|---|---|---|---|
| **Stage 1** | Goal Context | `0:00 – 0:45` (0s - 45s) | 45s | Indigo / Blue (`#4E6ABF`) | PeoplePulse Admin Dashboard, real-time KPIs, 84.2% participation, burnout crisis context. |
| **Stage 2** | Decision Framework | `0:45 – 1:30` (45s - 90s) | 45s | Purple (`#7e22ce`) | PulseAgent drawer slides open; highlights 6-stage lifecycle breadcrumb & Gemini 2.0 Flash function calling. |
| **Stage 3** | Action Execution | `1:30 – 2:10` (90s - 130s) | 40s | Emerald / Slate (`#15803d`) | Quick Preset clicked; agent executes `get_organization_metrics` with server-injected `organization_id`. |
| **Stage 4** | Dynamic Evaluation | `2:10 – 2:40` (130s - 160s) | 30s | Amber (`#b45309`) | Observation returns Support team drop (42%); agent evaluates data and calculates targeted survey intervention. |
| **Stage 5** | Adaptation (Differentiator) | `2:40 – 3:45` (160s - 225s) | 65s | Orange (`#ea580c`) | Primary webhook fails with **HTTP 503**; agent intercepts error, adapts strategy, and reroutes to internal backup queue. |
| **Stage 6** | Outcome & Wrap-up | `3:45 – 5:00` (225s - 300s) | 75s | Teal / Emerald (`#059669`) | Part A (225-265s): Outcome synthesis & Audit Trail tab.<br>Part B (265-300s): Terminal test suite (23 passing tests), $n \ge 3$ privacy, closing. |

**Total Duration**: Exactly 300.000 Seconds (5:00.00).

### 3.4 Speed Multipliers & Scrubbing
- **Speed Multipliers**: Supports `1.0x` (standard pace, ~136 wpm), `1.25x` (brisk demo), and `1.5x` (fast evaluation).
  - Configures `audio.playbackRate = speed` and sets `audio.preservesPitch = true` so the voiceover retains natural vocal frequency without the "chipmunk" artifact.
  - In synthetic clock mode, timer delta increments are multiplied by the active speed coefficient.
- **Scrubber Bar**:
  - Interactive custom track with 6 color-coded stage segments.
  - Hovering over the scrubber displays an instantaneous **Time & Stage Tooltip** showing the exact target timestamp, stage name, and preview description.
  - Clicking or dragging updates the timeline instantaneously, re-rendering the exact visual scene at that timestamp.
- **Stage Navigation Jump Markers**:
  - Direct jump buttons located both on the top breadcrumb bar and beneath the scrubber track.
  - Clicking any stage badge (`Goal`, `Decision`, `Action`, `Evaluation`, `Adaptation`, `Outcome`) executes a seek to that stage's exact start boundary with zero desynchronization.

### 3.5 Keyboard Shortcuts & Accessibility
- **Spacebar**: Toggle Play / Pause
- **Arrow Left / Right**: Seek backward / forward 5 seconds
- **Shift + Arrow Left / Right**: Seek backward / forward 15 seconds
- **Number Keys 1 – 6**: Instant jump to Stages 1 through 6
- **M**: Toggle Mute / Unmute
- **C**: Toggle Subtitles / Closed Captions
- **S**: Cycle Speed Multiplier (1.0x $\rightarrow$ 1.25x $\rightarrow$ 1.5x $\rightarrow$ 1.0x)
- **R**: Restart from 0:00

---

## 4. Voiceover & Audio Narration Architecture

### 4.1 Multi-Tier Synthesis Strategy
To guarantee 100% reliable narration across any presentation environment without requiring cloud access during the demo, the player employs a 3-tier audio architecture:

```
                                  [Audio Initialization]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [Tier 1: Pre-rendered]                      [File Missing / Error]
          `assets/audio/narration_full.mp3`                        │
        (High-Fidelity Neural Voiceover)                           ▼
                       │                                 [Tier 2: Offline SAPI]
                       │                              `assets/audio/narration_sapi.wav`
                       │                            (Generated via Windows PowerShell)
                       │                                           │
                       ├───────────────────────────────────────────┤
                       │                                           │
                       ▼                                           ▼
              [Audio Decoded OK]                         [Browser File Error]
                       │                                           │
                       │                                           ▼
                       │                                [Tier 3: In-Browser TTS]
                       │                               `window.speechSynthesis`
                       │                               (Real-time speech synth)
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                                     [Web Audio Graph]
                                   GainNode (Volume/Mute)
                                  AudioContext Destination
```

#### Tier 1: Pre-rendered Studio-Grade Neural Voiceover (Primary)
- **Tooling**: Microsoft Neural Speech Engine via `edge-tts` (Python package verified and installed in project workspace).
- **Voice Model**: `en-US-ChristopherNeural` (pitch: `+0Hz`, rate: `-4%` to achieve authoritative, broadcast-quality clarity at exactly 136 words per minute).
- **Format**: High-bitrate MP3 (`narration_full.mp3`, ~192 kbps, stereo, 44.1 kHz).
- **Duration**: Pre-calculated at 286.9s spoken audio + 13.1s distributed transition pauses = exactly 300.0s master audio track.

#### Tier 2: Offline Windows SAPI Synthesizer (Zero-Network Fallback)
- **Tooling**: PowerShell script utilizing native Windows .NET assembly `System.Speech.Synthesis.SpeechSynthesizer`.
- **Voice**: `Microsoft David Desktop` or `Microsoft Zira Desktop`.
- **Output**: Uncompressed WAV (`narration_sapi.wav`).
- **Advantage**: Can be generated entirely offline on any Windows machine with zero python packages or internet access.

#### Tier 3: Browser Client-Side SpeechSynthesis Fallback
- If local file security policies block audio element fetching, the player detects audio load failure within 1.5 seconds and falls back to `window.speechSynthesis.speak()`, cueing speech utterances directly synchronized to stage triggers.

### 4.2 Web Audio Procedural Sound Effects
In addition to spoken voiceover, the player incorporates lightweight procedural audio synthesis via the Web Audio API for interactive realism:
- **`playAlertChime()` (HTTP 503 Interception)**: A sharp dual-frequency warning tone (440 Hz $\rightarrow$ 311 Hz sawtooth wave with quick exponential decay) triggered at `t = 175s` when the external webhook fails.
- **`playSuccessChime()` (Stage 6 Outcome Complete)**: A harmonic major triad chord (C5 [523.25 Hz], E5 [659.25 Hz], G5 [783.99 Hz] sine wave) triggered when autonomous resolution concludes.
- **`playClickChime()`**: Subtle tactile click (800 Hz, 12ms duration) on tab switches and pause toggles.

### 4.3 Browser Autoplay Policy Compliance
Modern web browsers (Chrome, Edge, Firefox, Safari) enforce strict autoplay policies that reject unmuted media playback without prior user interaction.
- **Hero Presentation Overlay**: On initial page load, the player renders a sophisticated presentation splash hero:
  - Header: *PeoplePulse — Autonomous Enterprise HR Intelligence*
  - Badge: *Tech Zephyr 4.0 Hackathon Submission • IIT Bhubaneswar*
  - Rubric Notice: *Official 6-Stage Lifecycle Demonstration (Goal $\rightarrow$ Outcome)*
  - Call to Action: Large, pulsing **"▶ Start 5-Minute Pitch & Demo"** button.
- Clicking the button fulfills the browser's user-gesture requirement, initializes `AudioContext.resume()`, starts the audio playback, and smoothly fades the overlay into the active presentation.

---

## 5. Real-Time Subtitles & Caption Engine

### 5.1 Subtitle Data Specification
To deliver real-time karaoke captioning where words light up as they are spoken, we define a dual-layer JSON cue dataset (`subtitles.json` and mirrored inline in `presentationData.js`):

```json
{
  "version": "1.0",
  "totalDuration": 300.0,
  "cues": [
    {
      "id": "cue-01",
      "stageId": 1,
      "stageName": "Goal Context",
      "stageClass": "s-goal",
      "start": 0.1,
      "end": 7.6,
      "text": "Respected judges, 76% of employees experience burnout before leadership even realizes there is a problem.",
      "tokens": [
        { "text": "Respected", "start": 0.10, "end": 0.65 },
        { "text": "judges,", "start": 0.65, "end": 1.15 },
        { "text": "76%", "start": 1.20, "end": 1.75, "highlight": true },
        { "text": "of", "start": 1.75, "end": 1.95 },
        { "text": "employees", "start": 1.95, "end": 2.55 },
        { "text": "experience", "start": 2.55, "end": 3.15 },
        { "text": "burnout", "start": 3.15, "end": 3.85, "highlight": true },
        { "text": "before", "start": 3.90, "end": 4.30 },
        { "text": "leadership", "start": 4.30, "end": 5.00 },
        { "text": "even", "start": 5.00, "end": 5.35 },
        { "text": "realizes", "start": 5.35, "end": 5.95 },
        { "text": "there", "start": 5.95, "end": 6.15 },
        { "text": "is", "start": 6.15, "end": 6.35 },
        { "text": "a", "start": 6.35, "end": 6.50 },
        { "text": "problem.", "start": 6.50, "end": 7.60 }
      ]
    }
  ]
}
```

### 5.2 Real-Time Karaoke Rendering
- **Binary Search Cue Lookup**: On each animation frame, the active cue is identified in $O(\log N)$ time.
- **Dynamic Token Styling**: Inside the active cue container:
  - Tokens with `token.end < currentTime`: Rendered in muted silver (`#94a3b8`) indicating spoken text.
  - Tokens with `token.start <= currentTime && currentTime <= token.end`: Decorated with the `.karaoke-active` CSS class, displaying an illuminated cyan glow (`#38bdf8`) with slight font scale (`scale(1.05)`).
  - Tokens with `token.start > currentTime`: Rendered in crisp, high-contrast white (`#f8fafc`).
  - Key technical terms (e.g. `76%`, `ReAct`, `Gemini 2.0 Flash`, `HTTP 503`, `n ≥ 3`) feature an amber accent badge.

### 5.3 Overlay UI & Accessibility
- **Floating Glassmorphic Container**: Positioned at bottom-center of viewport, directly above timeline controls (`z-index: 40`, `bottom: 90px`).
- **High-Contrast Contrast Guarantee**: Dark translucent background (`rgba(15, 23, 42, 0.88)` with `backdrop-filter: blur(12px)` and subtle white border `rgba(255, 255, 255, 0.12)`). Meets WCAG AAA contrast ratio standards (> 7:1) against both light and dark backgrounds.
- **Stage Tag Indicator**: Displays the active stage badge (e.g. `[Stage 1: Goal Context]`, `[Stage 5: Adaptation]`) directly to the left of the caption text.
- **Interactive Transcript Modal**: Judges can click the "Transcript" icon to open a scrollable drawer with the full 680-word script. Clicking any paragraph immediately jumps the player to that line's timestamp.

---

## 6. Dynamic Scene Visuals & Live UI Simulator Architecture

### 6.1 Why Native DOM Simulation Over Static Video
A pre-rendered video cannot be paused to inspect database query schemas or switch tabs. This architecture renders an **authentic, live DOM simulation** of PeoplePulse matching the exact React components in `src/components/AgenticCopilot.jsx` and `src/components/PeoplePulseHomepage.jsx`.

### 6.2 Synchronized Scene States
The simulator executes deterministic scene state transitions tied to the 300-second timeline:

```
[0:00 - 0:45] ──► Scene 1: PeoplePulse Admin Dashboard (KPIs, Burnout Alert)
                         │
[0:45 - 1:30] ──► Scene 2: PulseAgent Drawer Opens (Breadcrumbs, ReAct Framing)
                         │
[1:30 - 2:40] ──► Scene 3: Live ODAEA Stream (Goal ➔ Decision ➔ Action ➔ Observation ➔ Evaluation)
                         │
[2:40 - 3:45] ──► Scene 4: Core Differentiator — Failure Interception & Adaptation (HTTP 503)
                         │
[3:45 - 4:25] ──► Scene 5: Stage 6 Outcome Synthesis, HITL Approval & Live Audit Trail
                         │
[4:25 - 5:00] ──► Scene 6: Rigor Wrap-up (23 Passing Tests, n ≥ 3 Privacy, Finale)
```

#### Detailed Scene Breakdown:

#### Scene 1: PeoplePulse Admin Dashboard (`0:00 – 0:45`)
- **Visuals**: Full enterprise dashboard with brand header, organization indicator (`Acme Corp • Enterprise Tier`), and user profile (`Alex Morgan • HR Director`).
- **Key Metric Cards**:
  - Daily Participation: `84.2%` with positive trend `+4.3% this week`.
  - Overall Sentiment / Engagement: `68 / 100` (Amber status).
  - Burnout Risk Alert: `High Risk (Customer Support 42%)` highlighted in warning red/amber badge.
  - Active Pulses: `Cycle #14 (60-sec micro-pulse active)`.
- **Dynamic Elements**: Pulsing live survey counter, interactive team comparison sparklines.
- **Trigger**: Animated cursor moves to bottom right and clicks the floating `PulseAgent Copilot` button at `t = 44s`.

#### Scene 2: PulseAgent Drawer Opens (`0:45 – 1:30`)
- **Visuals**: Copilot drawer smoothly slides in from right (`transform: translateX(0)`).
- **Header**: `PulseAgent`, `ReAct AI Agent` pill, and pulsing green `Gemini 2.0 Flash Live` indicator.
- **Top Breadcrumb Bar**: Shows all 6 rubric stages:
  $$\text{Goal} \longrightarrow \text{Decision} \longrightarrow \text{Action} \longrightarrow \text{Evaluation} \longrightarrow \text{Adaptation} \longrightarrow \text{Outcome}$$
- **Narrative Focus**: Highlights that PulseAgent is an autonomous agent with schema-validated Postgres tools, not a static chatbot.
- **Trigger**: At `t = 88s`, simulated cursor clicks the quick goal preset: *"Demonstrate Full Agentic Workflow: Goal → Decision → Action → Evaluation → Adaptation → Outcome"*.

#### Scene 3: Live ODAEA Event Stream (`1:30 – 2:40`)
Event cards animate into the drawer trace sequentially, matching spoken cues:
1. **Stage 1: Goal Card (`t = 95s`)**: Blue card (`bg-blue-50 border-blue-200`). Objective: *"Diagnose company-wide friction and deploy organizational interventions"*.
2. **Stage 2: Decision Card (`t = 105s`)**: Purple card (`bg-purple-50 border-purple-200`). Agent autonomously selects `get_organization_metrics` tool.
3. **Stage 3: Action Card (`t = 118s`)**: White card with slate border. Executes live Supabase RPC. Expandable parameter payload proves `organization_id` was server-injected from session (LLM cannot fabricate tenant IDs).
4. **Observation Card (`t = 135s`)**: Emerald card (`bg-emerald-50 border-emerald-200`). Data returns: Overall engagement 68%, but Customer Support drops severely to 42% due to shift overload.
5. **Stage 4: Evaluation Card (`t = 150s`)**: Amber card (`bg-amber-50 border-amber-200`). Agent parses numbers, calculates mathematical severity, and determines Customer Support requires targeted pulse questions and manager action brief.

#### Scene 4: The Core Differentiator — Failure Interception & Adaptation (`2:40 – 3:45`)
The centerpiece of the Tech Zephyr 4.0 evaluation rubric:
1. **Tool Invocation (`t = 165s`)**: Agent attempts to trigger external escalation webhook alert via `simulate_and_handle_failure`.
2. **Orange Failure & Adaptation Card (`t = 175s`)**:
   - Card glows with radiant amber/orange border (`border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 shadow-md shadow-orange-500/20`).
   - Header: `🛡️ Stage 5: Adaptation (Failure Interception & Self-Correction)` with prominent `Self-Corrected` badge.
   - Intercepted Error: `HTTP 503 Service Unavailable from external webhook endpoint (httpstat.us/503)`.
   - Audio: Procedural warning alert chime triggers.
   - Strategy: Agent catches network exception, evaluates failure context, flags `adaptation_required: true`, and triggers strategy adaptation.
3. **Fallback Action Card (`t = 205s`)**: Executes `send_emergency_notification` routing the alert to the internal Supabase emergency dispatch queue.
4. **Resilience Badge**: Displays `Zero Message Loss • 100% Self-Healing Autonomy`.

#### Scene 5: Outcome & Governance (`3:45 – 4:25`)
1. **Stage 6: Outcome Card (`t = 228s`)**:
   - Polished emerald card (`border-2 border-emerald-500 bg-white shadow-md`).
   - Summary statistics grid: Check-ins analyzed: 142; Interventions deployed: 2; High-stress teams: Support resolved.
   - Key discoveries bulleted with emerald checkmarks.
2. **Human-in-the-Loop Modal (`t = 245s`)**: Demonstrates interactive confirmation required before high-risk organizational broadcasts.
3. **Audit Trail View (`t = 255s`)**: Drawer switches to "Audit Trail" tab. Shows live `agent_activity_logs` table with sanitized parameters, SHA-256 integrity hash, and credential masking.

#### Scene 6: Production Rigor Wrap-up (`4:25 – 5:00`)
1. **Terminal Test Runner Visual (`t = 268s`)**: Embedded terminal mockup executing `npm run test`, displaying `23 passing unit tests in 511ms` (covering tool registry, policy engine, Gemini failover, and differential privacy).
2. **Privacy Architecture Card (`t = 280s`)**: Visual diagram of $n \ge 3$ differential privacy threshold enforced directly in PostgreSQL RPC (`get_org_team_comparison`), mathematically suppressing low-count teams to `null`.
3. **Grand Finale Banner (`t = 295s`)**: Closing slide thanking respected judges, displaying GitHub repository link, Tech Zephyr 4.0 submission badge, and inviting Q&A.

---

## 7. Interactive Live-Pause Mode & UI Decoupling Architecture

### 7.1 State Separation Architecture
To allow judges to click, expand, and inspect without corrupting the automated presentation, the player strictly separates **Playback State** from **Interactive Sandbox State**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Timeline Engine State                    │
│  - currentTime: 175.4s                                      │
│  - activeStage: "Stage 5: Adaptation"                       │
│  - isPlaying: false (PAUSED)                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
               [User Triggers Pause: Space / Click]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Interactive Sandbox State                  │
│  - activeDrawerTab: "activity" (Judge clicked Audit tab)    │
│  - expandedPayloads: Set(["tool-call-3", "failure-503"])    │
│  - inspectedTool: "simulate_and_handle_failure"             │
│  - isUserInteracting: true                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                [User Hits Play: Space / Resume]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Smooth Resynchronization Handler               │
│  1. Toast Notice: "Resuming automated presentation..."      │
│  2. Reset activeDrawerTab to match current timeline cue     │
│  3. Re-anchor scroll position to current execution step     │
│  4. Resume AudioContext & Timeline Clock                    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Interactive Sandbox Capabilities During Pause
When paused:
1. **Tab Switching**: Judges can toggle freely between `ReAct Copilot`, `Audit Trail`, and `Tools Registry`.
2. **Payload Inspection**: Clicking `▸ View technical schema & payload` reveals complete JSON tool definitions and responses.
3. **Human-in-the-Loop Exploration**: Judges can click `Approve Action` or `Deny Action` on the confirmation card to see how the agent responds.
4. **Dashboard Hover**: KPI metric cards show breakdown tooltips (e.g. participation trends by office location).
5. **Timeline Scrubber**: Dragging the scrubber instantly updates both the visual state and the audio seek point.

---

## 8. Local Execution & Packaging Strategy

### 8.1 Zero-Server Static Execution (`file:///` Protocol)
In competition environments, judges may open `index.html` directly from a USB drive or file explorer.
- **Challenge**: Standard `fetch('subtitles.json')` requests fail on `file:///` in Google Chrome and Microsoft Edge due to local CORS restrictions.
- **Architectural Solution**:
  - In addition to standard JSON and WebVTT asset files, `presentationData.js` embeds the complete presentation dataset as a global JavaScript object:
    `window.PEOPLEPULSE_PRESENTATION_DATA = { cues: [...], stages: [...], scenes: [...] };`
  - When the player initializes, it checks if `window.location.protocol === 'file:'`. If true, it immediately consumes the embedded dataset without triggering a network request.
  - The `<audio>` element loads local `assets/audio/narration_full.mp3` directly via standard relative `src` path, which is fully supported under `file:///`.

### 8.2 Lightweight Local Dev Server Options
For web server execution, three simple one-line commands are supported:
- **Python**: `python -m http.server 8080 --directory demo_video_player`
- **Node**: `npx serve demo_video_player`
- **Vite Integration**: The player can also be accessed via Vite's public static asset serving.

---

## 9. Automated Verification Harness (`verify_player.mjs`)

### 9.1 Headless Edge CDP Verification (Zero Dependencies)
Building upon the pattern in `pp_cdp_test.mjs`, the player includes an automated test runner (`demo_video_player/scripts/verify_player.mjs`). It uses Node 24 native WebSocket to control headless Microsoft Edge directly:

```
[verify_player.mjs]
       │
       ▼  (Spawns headless Edge on port 9224)
`msedge.exe --headless --remote-debugging-port=9224`
       │
       ▼  (Native Node WebSocket Connection)
`ws://localhost:9224/devtools/page/...`
       │
       ├─► 1. Load Verification: Asserts HTTP 200 / DOM readyState === "complete"
       ├─► 2. Console Purity: Listens to Runtime.consoleAPICalled & Runtime.exceptionThrown (0 errors)
       ├─► 3. Audio Asset Integrity: Asserts audio.duration >= 290s and audio.readyState >= 2
       ├─► 4. Timeline Continuity: Advances player, asserts currentTime increments monotonically
       ├─► 5. Stage Navigation: Seeks to 45s, 90s, 160s, 225s, 265s; verifies stage marker updates
       ├─► 6. Live-Pause Sandbox: Pauses at 175s, clicks tabs, expands details, resumes cleanly
       └─► 7. Subtitle Alignment: Verifies active caption matches pitch script at each checkpoint
```

### 9.2 Execution Command
```powershell
node demo_video_player/scripts/verify_player.mjs
```
The test suite executes and prints clear green pass/fail indicators, exiting with code `0` on 100% compliance.

---

## 10. Summary & Recommended Implementation Roadmap

| Component | Target File | Core Technical Decisions |
|---|---|---|
| **Presentation Entry Point** | `demo_video_player/index.html` | Semantic HTML5, accessible viewport, embedded font fallbacks, responsive 16:9 container. |
| **Styling & Theme** | `demo_video_player/css/*.css` | Tailored CSS matching PeoplePulse theme, glassmorphic floating captions, pulse animations. |
| **Timeline Engine** | `demo_video_player/js/timelineEngine.js` | Authoritative audio-master clock with micro-drift smoothing, 6-stage lifecycle boundaries. |
| **Audio Manager** | `demo_video_player/js/audioManager.js` | Audio element controller with Web Audio chimes (alert 503 ping, success triad), volume gain node. |
| **Subtitle Renderer** | `demo_video_player/js/subtitleRenderer.js` | Binary-search cue indexer, active karaoke token illumination, high-contrast overlay, transcript drawer. |
| **Scene Simulator** | `demo_video_player/js/sceneSimulator.js` | High-fidelity DOM simulation of Dashboard, Drawer, ODAEA stream, orange failure callout, and audit trail. |
| **Interactive Sandbox** | `demo_video_player/js/interactiveController.js` | Live-pause state decoupling, user event handlers, seamless resume resynchronization. |
| **Presentation Dataset** | `demo_video_player/js/presentationData.js` | Full 680-word script, millisecond cue bounds, stage definitions, mock Supabase database responses. |
| **Audio Assets** | `demo_video_player/assets/audio/` | Studio-grade `narration_full.mp3` generated via `edge-tts`, plus offline SAPI WAV fallback. |
| **Subtitle Assets** | `demo_video_player/assets/subtitles/` | `subtitles.json` and `subtitles.vtt` generated with millisecond sentence & token timestamps. |
| **Verification Suite** | `demo_video_player/scripts/verify_player.mjs` | Automated Edge CDP test runner validating timeline, audio, subtitles, pause, and console purity. |

This technical architecture guarantees that PeoplePulse presents a rock-solid, visually stunning, fully interactive presentation that directly proves every single requirement of the Tech Zephyr 4.0 Hackathon evaluation rubric.
