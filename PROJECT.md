# Project: PeoplePulse Standalone Interactive Demo Video Player & Simulator

## Architecture
The PeoplePulse Interactive Presentation Player and Simulator is a 100% client-side, zero-external-cloud-dependency HTML5 application located in `d:/project/PeoplePulse/demo_video_player`. It simulates the live execution of the PeoplePulse enterprise agentic platform across a 300-second timeline divided into the 6 official hackathon stages: Goal, Decision, Action, Evaluation, Adaptation, Outcome.

### Core Architectural Subsystems:
1. **Timeline Engine (`timelineEngine.js`)**: Dual-mode authoritative master clock (Audio-Master via `<audio>.currentTime` with Synthetic Delta-Clock fallback via `performance.now()`) with continuous exponential drift compensation running in a 60fps `requestAnimationFrame` loop.
2. **Audio & Narration Manager (`audioManager.js`)**: Manages continuous studio-grade voiceover playback (Edge-TTS neural MP3 / SAPI WAV fallback / Web Speech synthesis), volume, mute, and speed syncing across 1.0x, 1.25x, and 1.5x.
3. **Karaoke Subtitle Renderer (`subtitleRenderer.js`)**: Renders high-contrast WCAG-compliant live captions with phrase/word-level highlight tracking matching the pitch script word-for-word.
4. **Scene Simulator (`sceneSimulator.js`)**: Renders native DOM UI views mirroring PeoplePulse: Admin Dashboard, sliding PulseAgent drawer, streaming ODAEA cards, and the signature glowing orange HTTP 503 failure interception and emergency queue adaptation card.
5. **Interactive Live-Pause Controller (`interactiveController.js`)**: Decouples playback timeline state from sandbox UI state. Pausing unlocks full DOM interaction (tab switching, JSON tree inspection, audit trail review) without corrupting playback upon resume.
6. **Data Store (`presentationData.js`)**: Complete word-for-word pitch script, timestamps, event card payloads, and stage metadata.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F01: 300s Timeline Engine | 300-second synchronized master timeline across 6 stages (Goal, Decision, Action, Evaluation, Adaptation, Outcome) | M1 | R1 |
| 2 | F02: Transport Controls | Play, pause, seek scrubber, and restart controls | M1 | R1 |
| 3 | F03: Speed Multiplier | 1.0x, 1.25x, 1.5x playback speed toggles with pitch preservation | M1 | R1 |
| 4 | F04: Stage Jump Markers | Stage navigation markers and interactive breadcrumbs on the scrubber bar | M1 | R1 |
| 5 | F05: Auto-Advance & Stage Highlighting | Automatic stage transition, active stage breadcrumb bar, and completion state | M1 | R1 |
| 6 | F06: Continuous Voiceover Narration | Spoken pitch script matching word-for-word 5-minute script (~680 words) | M1 | R2 |
| 7 | F07: Audio Controls | Volume slider, mute toggle, rate sync, and audio state management | M1 | R2 |
| 8 | F08: High-Contrast Live Subtitles | Live subtitle overlay container with high contrast meeting WCAG AAA standards | M1 | R2 |
| 9 | F09: Word/Phrase Synchronization | Phrase- and word-level karaoke illumination synchronized to audio timestamps | M1 | R2 |
| 10 | F10: Dual-Mode Clock Fallback | Audio master clock with synthetic performance.now fallback during silence/fallback | M1 | R2 |
| 11 | F11: Admin Dashboard Mockup | Visual representation of PeoplePulse dashboard with metrics (76% burnout, 68% org, 42% Support) | M2 | R3 |
| 12 | F12: Sliding PulseAgent Drawer | Animated floating copilot drawer with 6-stage lifecycle breadcrumbs and status indicators | M2 | R3 |
| 13 | F13: Streaming ODAEA Event Cards | Animated card stream for Goal, Decision, Action, Observation, Evaluation, Adaptation, Outcome | M2 | R3 |
| 14 | F14: Orange HTTP 503 Interception | Glowing orange failure adaptation card highlighting HTTP 503 service timeout interception | M2 | R3 |
| 15 | F15: Emergency Queue Reroute Card | Visual animation of autonomous failover reroute to emergency dispatch queue with 0 message loss | M2 | R3 |
| 16 | F16: Q&A and Rubric Visual Views | Scene overlays for technical Q&A defense points and rubric scoring maximizers | M2 | R3 |
| 17 | F17: Interactive Live-Pause Sandbox | Pausing playback immediately enables interactive exploration mode in DOM | M3 | R4 |
| 18 | F18: JSON Payload Inspector | Collapsible/expandable JSON tree viewer for tool inputs, parameters, and query returns | M3 | R4 |
| 19 | F19: PulseAgent Drawer Tabs | Interactive switching between Overview, Events/ODAEA, Audit Trail, and Payload tabs | M3 | R4 |
| 20 | F20: Postgres Audit Trail Inspection | Interactive audit log table with credential regex redaction and HITL modal trigger | M3 | R4 |
| 21 | F21: Seamless Playback Resumption | Resuming playback cleanly restores playback synchronization without state breakage | M3 | R4 |
| 22 | F22: Standalone Local Bundle | Zero external server dependencies; runnable via lightweight dev server or direct browser open | M3 | Delivery |
| 23 | F23: Narration Audio Generator Scripts | Python Edge-TTS script and Windows SAPI PowerShell script for generating narration audio | M3 | Delivery |
| 24 | F24: Headless Verification Harness | Node/CDP automated test script verifying timeline continuity, audio assets, and zero errors | M4 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Timeline Engine & Voiceover Subtitles | F01–F10: 300s master clock, transport controls, speed multiplier, stage jump markers, audio narration, subtitles | None | PLANNED |
| M2 | Dynamic Scene Visuals & ODAEA Simulator | F11–F16: Dashboard mockups, PulseAgent drawer, ODAEA card stream, HTTP 503 orange callout, emergency reroute | M1 | PLANNED |
| M3 | Interactive Sandbox, Audio Assets & App Integration | F17–F23: Live-pause interactive mode, JSON inspector, drawer tabs, audit trail, audio generation scripts, app wiring | M1, M2 | PLANNED |
| M4 | E2E Testing Suite & Automated Verification | F24: Comprehensive opaque-box test suite (Tiers 1–4) and automated headless runner | M1, M2, M3 | PLANNED |
| M5 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Phase 1 (100% E2E Pass) + Phase 2 (Adversarial Coverage Hardening via Tier 5) | M4 | PLANNED |

## Interface Contracts
### TimelineEngine ↔ AudioManager
- `TimelineEngine.onTick(callback({ currentTime, duration, stage, isPaused, speed }))`
- `TimelineEngine.seek(targetSeconds)` -> calls `AudioManager.seek(targetSeconds)`
- `TimelineEngine.setSpeed(multiplier)` -> calls `AudioManager.setRate(multiplier)`
- `TimelineEngine.play()` / `pause()` -> calls `AudioManager.play()` / `pause()`
- `AudioManager.getCurrentTime()` -> returns master audio timestamp when available

### TimelineEngine ↔ SceneSimulator
- `SceneSimulator.update(currentTime, stage, activeCues)`: updates DOM nodes, visible cards, drawer state, and breadcrumbs corresponding to `currentTime`.
- `SceneSimulator.reset()`: resets UI to initial state at `t = 0`.

### TimelineEngine ↔ SubtitleRenderer
- `SubtitleRenderer.update(currentTime)`: highlights active cue and current spoken word; auto-scrolls caption container.

### InteractiveController ↔ TimelineEngine & SceneSimulator
- `InteractiveController.onPause()`: enables sandbox click handlers on tabs, cards, JSON nodes.
- `InteractiveController.onResume()`: disables sandbox editing, resynchronizes scene state to `TimelineEngine.currentTime`.

## Code Layout
The project resides in `d:/project/PeoplePulse/demo_video_player`:
```
demo_video_player/
├── index.html                     # Primary HTML5 application entry point
├── css/
│   ├── base.css                   # Global styles, variables, typography, layout
│   ├── simulator.css              # Mockups: Dashboard, Drawer, ODAEA Cards, Failure Banner
│   └── player_controls.css       # Scrubber timeline, audio controls, subtitles, stage breadcrumbs
├── js/
│   ├── presentationData.js        # Pitch script, stage boundaries, ODAEA card payloads
│   ├── timelineEngine.js          # Authoritative clock, state machine, seek/speed
│   ├── audioManager.js            # Narration playback, Web Audio chimes, volume/mute
│   ├── subtitleRenderer.js        # Subtitle overlay and word-level karaoke sync
│   ├── sceneSimulator.js          # Synchronized DOM scene views for 6 stages
│   ├── interactiveController.js   # Live-pause sandbox mode, tab switching, JSON trees
│   └── app.js                     # Main application bootstrap and event bus
├── assets/
│   ├── audio/
│   │   ├── narration_full.mp3     # High-fidelity Edge-TTS voiceover narration
│   │   └── narration_sapi.wav     # Offline Windows SAPI fallback audio
│   └── subtitles/
│       ├── subtitles.json         # Structured sentence & word timing metadata
│       └── subtitles.vtt          # Standard WebVTT subtitles track
├── scripts/
│   ├── generate_audio_edgetts.py  # Script to generate narration_full.mp3 and subtitles.json
│   ├── generate_audio_sapi.ps1    # PowerShell script for offline SAPI WAV generation
│   ├── verify_player.mjs          # Headless verification script (Edge CDP / WebSocket)
│   └── run_tests.mjs              # E2E test runner executing Tiers 1-4 suites
└── README.md                      # Complete usage and verification instructions
```
