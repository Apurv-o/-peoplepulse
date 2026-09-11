# E2E Test Infra: PeoplePulse Presentation Player & Simulator

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests interact with the player via DOM queries, event triggers, and state queries exactly as an end user or judge would.
- **Progressive Testability**: Verification mechanisms do not depend on internal features more complex than what is being tested.
- **Methodology**: Systematic 4-tier approach based on Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Real-World Workload Testing.

## Feature Inventory (24 Features)
| # | Feature | Requirement | Tier 1 | Tier 2 | Tier 3 |
|---|---------|-------------|:------:|:------:|:------:|
| 1 | F01: 300s Timeline Engine | R1 | 5 | 5 | ✓ |
| 2 | F02: Transport Controls (Play/Pause/Seek) | R1 | 5 | 5 | ✓ |
| 3 | F03: Speed Multiplier (1x/1.25x/1.5x) | R1 | 5 | 5 | ✓ |
| 4 | F04: Stage Jump Markers | R1 | 5 | 5 | ✓ |
| 5 | F05: Auto-Advance & Stage Highlighting | R1 | 5 | 5 | ✓ |
| 6 | F06: Continuous Voiceover Narration | R2 | 5 | 5 | ✓ |
| 7 | F07: Audio Controls (Mute/Volume/Rate) | R2 | 5 | 5 | ✓ |
| 8 | F08: High-Contrast Live Subtitles | R2 | 5 | 5 | ✓ |
| 9 | F09: Word/Phrase Synchronization | R2 | 5 | 5 | ✓ |
| 10 | F10: Dual-Mode Clock Fallback | R2 | 5 | 5 | ✓ |
| 11 | F11: Admin Dashboard Mockup | R3 | 5 | 5 | ✓ |
| 12 | F12: Sliding PulseAgent Drawer | R3 | 5 | 5 | ✓ |
| 13 | F13: Streaming ODAEA Event Cards | R3 | 5 | 5 | ✓ |
| 14 | F14: Orange HTTP 503 Interception | R3 | 5 | 5 | ✓ |
| 15 | F15: Emergency Queue Reroute Card | R3 | 5 | 5 | ✓ |
| 16 | F16: Q&A and Rubric Visual Views | R3 | 5 | 5 | ✓ |
| 17 | F17: Interactive Live-Pause Sandbox | R4 | 5 | 5 | ✓ |
| 18 | F18: JSON Payload Inspector | R4 | 5 | 5 | ✓ |
| 19 | F19: PulseAgent Drawer Tabs | R4 | 5 | 5 | ✓ |
| 20 | F20: Postgres Audit Trail Inspection | R4 | 5 | 5 | ✓ |
| 21 | F21: Seamless Playback Resumption | R4 | 5 | 5 | ✓ |
| 22 | F22: Standalone Local Bundle | Delivery | 5 | 5 | ✓ |
| 23 | F23: Narration Audio Generator Scripts | Delivery | 5 | 5 | ✓ |
| 24 | F24: Headless Verification Harness | AC | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Node.js test runner in `demo_video_player/scripts/run_tests.mjs` and headless browser verifier in `demo_video_player/scripts/verify_player.mjs`.
- **Pass/Fail Semantics**: Exit code `0` on all tests passing; nonzero on any assertion failure. Emits standard TAP / JSON reporting with detailed error diagnostics.
- **Headless Environment**: Automated execution using Node 24 native WebSocket client connecting to Edge/Chromium DevTools Protocol (CDP) headless browser, or lightweight JSDOM/Node harness for unit/integration suites.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full 5-Minute Uninterrupted Playback Run | F01, F05, F06, F08, F11, F12, F13, F14, F15 | High |
| 2 | Judge Scrubbing & Stage Jump Exploration | F01, F02, F04, F05, F06, F08, F13 | High |
| 3 | Live-Pause at HTTP 503 Failure & JSON Inspection | F02, F14, F15, F17, F18, F19, F21 | High |
| 4 | Rapid Speed Toggling (1x -> 1.5x -> 1.25x -> 1x) with Audio | F03, F06, F07, F09, F10 | Medium |
| 5 | Audit Trail & HITL Modal Interaction During Pause | F17, F19, F20, F21 | Medium |
| 6 | Subtitle Highlighting & Speech-Text Synchronization Check | F06, F08, F09, F10 | Medium |
| 7 | Offline / Silent Fallback Clock Mode Verification | F01, F02, F05, F08, F10 | Medium |
| 8 | Drawer Tab Switching and Payload Collapsing in Pause | F17, F18, F19, F21 | Medium |
| 9 | Mute / Unmute and Volume Scrubber Operations Across Stages | F06, F07, F08 | Low |
| 10 | Direct `file:///` and Local Web Server Execution | F22, F24 | Medium |
| 11 | Stage Boundary Transition Consistency & Breadcrumb Sync | F01, F04, F05, F12 | Medium |
| 12 | End-of-Timeline Replay and State Reset Verification | F01, F02, F05, F11, F12, F13 | Medium |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: 120 test cases (5 per feature across 24 features)
- **Tier 2 (Boundary & Corner Cases)**: 120 test cases (5 boundary tests per feature across 24 features)
- **Tier 3 (Cross-Feature Combinations)**: 24 pairwise test cases
- **Tier 4 (Real-World Application Scenarios)**: 12 end-to-end integration scenarios
- **Total Minimum Target**: 276 test cases
