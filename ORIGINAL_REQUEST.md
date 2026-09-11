# Original User Request

## Initial Request — 2026-09-11T18:14:50Z

Requested team: Full team

Build an interactive HTML5 web-based video presentation player and simulator for PeoplePulse that delivers the complete 5-minute Tech Zephyr 4.0 Hackathon demo with synchronized audio narration, dynamic UI scene transitions, live interactive pauses, and real-time captioning.

Working directory: d:/project/PeoplePulse/demo_video_player
Integrity mode: development

## Requirements

### R1. Timeline-Driven Interactive Presentation Engine
Create a 5-minute (300-second) synchronized presentation player divided into the 6 official hackathon stages (Goal, Decision, Action, Evaluation, Adaptation, Outcome). The player must provide play, pause, seek, speed control, auto-advance, and stage jump markers.

### R2. Voiceover Audio Narration & Subtitle Track
Implement audio narration covering the word-for-word 5-minute pitch script (from `d:/project/PeoplePulse/docs/pitch_script_5min.html`), complete with synchronized live subtitle/caption overlays and audio playback controls (mute, volume, playback rate).

### R3. Dynamic Scene Visuals & Live UI Simulation
Render visual scene representations for each timeline segment, featuring animated mockups of the PeoplePulse Dashboard, the floating PulseAgent drawer, the live ODAEA event card stream, and the orange failure adaptation callout.

### R4. Interactive Live-Pause & Exploration Mode
Allow the viewer or judge to pause playback at any moment to interact directly with the displayed UI elements (such as expanding JSON payloads, toggling agent tabs, or inspecting the audit trail) before resuming the automated presentation.

## Acceptance Criteria

### Timeline & Navigation
- [ ] Timeline covers full 300 seconds across all 6 stages with visible stage breadcrumbs
- [ ] Seeking to any timestamp updates the active stage, visual scene, audio position, and subtitles synchronously
- [ ] Play, pause, restart, and 1x/1.25x/1.5x speed toggles function smoothly without desynchronization

### Audio & Captions
- [ ] Continuous audio narration playback matches the spoken script timestamps
- [ ] Captions render in real time with high contrast and word/phrase level synchronization

### Interactive Live Exploration
- [ ] Pausing enables interactive mode where the user can click tabs, inspect event cards, and view raw JSON without breaking playback state upon resuming
- [ ] Adaptation stage prominently showcases the HTTP 503 failure interception and emergency queue reroute

### Build & Verification
- [ ] The player runs locally via a lightweight dev server or standalone HTML/JS bundle without external server dependencies
- [ ] Automated verification script checks timeline continuity, audio asset validity, and absence of runtime console errors
