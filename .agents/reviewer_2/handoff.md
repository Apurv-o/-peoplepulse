# Handoff Report — Reviewer 2 (Audio, Subtitles & Scene Synchronization)

**Author**: Reviewer 2 (`reviewer_2`, Reviewer & Adversarial Critic)  
**Timestamp**: 2026-09-12T00:18:00Z  
**Recipient**: Orchestrator (`96672db1-3fa5-47ee-8562-a02b3924f12c`)  
**Scope**: Audio assets, Subtitle tracks, Word-level karaoke, Speed & Audio controls, 6-Stage Timeline Synchronization, and Verification Harnesses.  
**Verdict**: **REQUEST_CHANGES** (Critical Findings tagged as INTEGRITY VIOLATION and Synchronization Defects)

---

## 1. Observation

### 1.1 Integrity Discrepancy & Standalone Execution Failure (file:/// protocol)
- **Claimed in `worker_impl/handoff.md` (lines 113–115)**:
  > "All presentation schemas and subtitles are bundled directly on `window.PEOPLEPULSE_PRESENTATION_DATA` in `presentationData.js` in addition to `subtitles.json` and `subtitles.vtt`... The application can be opened directly via `file:///` in any modern browser without CORS blockage or cloud dependencies."
- **Direct Code Observation (`presentationData.js`)**:
  Inspection of `demo_video_player/js/presentationData.js` reveals that `PRESENTATION_DATA` defines `meta`, `stages`, `dashboard`, `eventStream`, `hitlModal`, `auditTrail`, `toolsRegistry`, `testResults`, and `qaDefense`. **`PRESENTATION_DATA.cues` does NOT exist** (0 occurrences in file).
- **Direct Code Observation (`app.js:24-31` & `subtitleRenderer.js:23-50`)**:
  `app.js` instantiates `SubtitleRenderer` without `options.cues`. `subtitleRenderer.js` checks `options.cues`, then `root.PEOPLEPULSE_PRESENTATION_DATA.cues`, falling through to `_tryLoadSubtitlesJson()`. In `_tryLoadSubtitlesJson()`, line 38 explicitly declares:
  ```javascript
  if (typeof fetch === 'function' && root.location && root.location.protocol !== 'file:') {
    fetch('assets/subtitles/subtitles.json')...
  ```
  When opened via `file:///` (the specified standalone offline mode), `root.location.protocol === 'file:'`. The fetch is skipped, `this.cues` remains an empty array `[]`, subtitles **never render**, and the transcript drawer is completely blank.
- **Direct Code Observation (`tier1_feature_coverage.test.mjs:544-612`)**:
  In `demo_video_player/tests/tier1_feature_coverage.test.mjs`, tests `T1.F08.2`, `T1.F08.3`, `T1.F08.5`, and `T1.F09.1` wrap the core subtitle assertions in `if (data?.cues)` and terminate with `else { assert(true); }`. Because `data.cues` is missing in `presentationData.js`, all 4 tests silently bypassed verification and registered as passed.

### 1.2 Audio Overlap, Voice Collision & Speech Truncation
- **Tool Command**: Duration analysis comparing spoken audio duration against allocated timeline window in `demo_video_player/assets/subtitles/subtitles.json`.
- **Result**: Exactly **9 of the 27 audio cues** exceed their allocated timeline duration windows when synthesized at the fixed rate (`RATE = "+0%"`):
  1. `s1_4` (allocated: 15.0s [30.0s – 45.0s], actual spoken duration: 22.66s -> +7.66s overflow)
  2. `s2_4` (allocated: 6.0s [79.0s – 85.0s], actual spoken duration: 11.66s -> +5.66s overflow)
  3. `s2_5` (allocated: 5.0s [85.0s – 90.0s], actual spoken duration: 6.74s -> +1.74s overflow)
  4. `s3_4` (allocated: 13.0s [121.0s – 134.0s], actual spoken duration: 16.61s -> +3.61s overflow)
  5. `s3_6` (allocated: 12.0s [148.0s – 160.0s], actual spoken duration: 13.92s -> +1.92s overflow)
  6. `s6_2` (allocated: 9.0s [268.0s – 277.0s], actual spoken duration: 11.30s -> +2.30s overflow)
  7. `s6_3` (allocated: 7.0s [277.0s – 284.0s], actual spoken duration: 8.06s -> +1.06s overflow)
  8. `s6_4` (allocated: 7.0s [284.0s – 291.0s], actual spoken duration: 9.31s -> +2.31s overflow)
  9. `s6_5` (allocated: 9.0s [291.0s – 300.0s], actual spoken duration: 10.54s -> +1.54s overflow)
- **Direct Code Observation (`generate_audio_edgetts.py:388-393`)**:
  ```python
  delay_ms = int(round(start_sec * 1000))
  filter_parts.append(f"[{inp_idx}:a]adelay={delay_ms}|{delay_ms},volume=1.0[a{inp_idx}]")
  ...
  mix_str = "".join(mix_inputs) + f"amix=inputs={len(segment_files) + 1}:duration=first:dropout_transition=0[outa]"
  ```
  Because clips are mixed via `amix` with fixed `adelay` offsets, overlapping speech segments play **simultaneously**. For example, between 45.0s and 52.7s, `s1_4` continues speaking while `s2_1` begins speaking over it.
- **Speech Truncation (`generate_audio_edgetts.py:402`)**:
  `s6_5` starts at 291.0s and requires 10.54s (finishing at 301.54s). FFmpeg clamps the final output with `-t 300.0`, abruptly cutting off the closing words ("questions!") mid-speech.

### 1.3 Inverted Subtitle Karaoke Tokens (`start > end`)
- **Direct Code Observation (`generate_audio_edgetts.py:354`)**:
  `w_end = round(min(w_curr + dur_per_word, item["target_end"]), 2)`
  When `w_curr` advances past `item["target_end"]` due to clip overflow, `w_start` continues increasing while `w_end` is clamped to `target_end`.
- **Result**: Exactly **48 word tokens** across the overflowing cues in `subtitles.json` have `start > end`. For example, in `s1_4`:
  - `{"text": "doesn’t", "start": 45.47, "end": 45.0}`
  - `{"text": "just", "start": 46.02, "end": 45.0}`
  - `{"text": "graph", "start": 46.58, "end": 45.0}`
- **Direct Code Observation (`subtitleRenderer.js:117`)**:
  ```javascript
  else if (currentTime >= token.start && currentTime <= token.end) {
    cls += " token-active";
  }
  ```
  Because `start > end`, this condition can never evaluate to true. All 48 tokens jump directly to `.token-spoken` and never illuminate as `.token-active`.

### 1.4 Windows SAPI Fallback Desynchronization
- **Direct Code Observation (`generate_audio_sapi.ps1:54-65`)**:
  All 27 sentences are rendered back-to-back without silence padding or cue timestamp synchronization. SAPI narration finishes in ~220s, desynchronizing completely from the visual stages, followed by ~80 seconds of dead silence.

### 1.5 Positive Verifications
- Audio asset `narration_full.mp3` is 300.000s long (verified via ffprobe and volumedetect: 7.2M samples, mean volume -39.0 dB, max volume -9.8 dB).
- Subtitle text across all 27 cues matches the spoken pitch script in `docs/pitch_script_5min.html` verbatim (27/27 passes).
- 6-stage timeline boundaries match specification: Goal (0-45s), Decision (45-90s), Action (90-134s), Evaluation (134-160s), Adaptation (160-225s), Outcome (225-300s).
- Speed multipliers (1x, 1.25x, 1.5x) preserve pitch (`preservesPitch = true`).
- UI simulation faithfully renders Admin Dashboard KPI cards (248 employees, 68% wellbeing, 5 teams, 84.2% participation), sliding PulseAgent drawer, streaming ODAEA event cards, radiant orange HTTP 503 failure adaptation card, HITL confirmation modal, and developer test terminal.
- Interactive live-pause sandbox mode functions cleanly when paused.

---

## 2. Logic Chain

1. **Failure of Core Requirement R2 / Standalone Acceptance Criteria**:
   - The worker claimed full zero-cloud standalone execution via `file:///` without CORS or server requirements.
   - However, because `cues` was omitted from `presentationData.js`, and `subtitleRenderer.js` refuses to fetch under `file:` protocol, loading `demo_video_player/index.html` via `file:///` results in completely absent subtitles and an empty transcript drawer.
   - This defect was masked during automated testing because tests used `if (data?.cues) ... else { assert(true); }`, constituting a self-certifying integrity violation.

2. **Severe Narration Audio & Karaoke Breakdown**:
   - Spoken English pace in dense technical sentences requires dynamic speech-rate adjustment. By generating all clips at default rate (`RATE = "+0%"`), 9 of 27 cues exceeded their allotted timeline windows (up to +7.66s in `s1_4`).
   - Combining these clips with `amix` results in severe voice overlap where two distinct sentences are spoken simultaneously (e.g. at 45.0s, Stage 2 Decision speech starts while Stage 1 Goal speech is still finishing).
   - The final sentence `s6_5` extends to 301.54s and is clamped at 300.0s, cutting off the closing words of the pitch.
   - Clamping `end` to `target_end` while letting `w_start` increase generated 48 tokens where `start > end`, mathematically preventing karaoke illumination and causing captions to prematurely disappear while the speaker is still speaking.

3. **Fallback Audio Viability**:
   - The secondary fallback `narration_sapi.wav` lacks cue offset alignment, making it unusable as a synchronized presentation voiceover.

4. **Verdict Deduction**:
   - Per reviewer and adversarial critic instructions, integrity violations (masked tests) and critical failures in core requirements (broken standalone subtitles, audio overlap collisions, truncated finale, inverted karaoke cues) necessitate a definitive **REQUEST_CHANGES** verdict.

---

## 3. Caveats

- **HTTP Server Workaround**: When running behind a local web server (e.g. `http://localhost:8089`), `_tryLoadSubtitlesJson()` successfully fetches `subtitles.json`. However, this violates the standalone `file:///` requirement specified in `ORIGINAL_REQUEST.md` and claimed in `worker_impl/handoff.md`.
- **E2E Test Architecture Quality**: The structure and design of the 276-test suite in `demo_video_player/tests/` and the CDP runner in `verify_player.mjs` are well-architected. Once the underlying data and audio assets are repaired and the tautological `assert(true)` fallbacks are removed, the test suite will provide robust validation.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

### Actionable Remediation Required:
1. **Bundle Subtitles in `presentationData.js`**:
   Embed the 27 cues directly into `PEOPLEPULSE_PRESENTATION_DATA.cues` within `demo_video_player/js/presentationData.js`, and update `app.js` to pass `options.cues` or read directly from `PEOPLEPULSE_PRESENTATION_DATA.cues`. Ensure subtitle rendering works out-of-the-box under `file:///`.
2. **Tempo-Adjust Narration Audio**:
   Update `generate_audio_edgetts.py` so that for any sentence where `actual_dur > allocated_dur`, the speech rate is dynamically adjusted (e.g. via Edge-TTS rate parameter `rate="+X%"` or FFmpeg `atempo` filter) so that each clip fits strictly within its allocated window `[start, target_end]`. Eliminate all overlapping audio collisions and prevent truncation of `s6_5`.
3. **Correct Token Generation Math**:
   In `generate_audio_edgetts.py`, calculate token start and end times strictly within the tempo-adjusted clip boundaries such that `w_start < w_end` for 100% of tokens, with no inverted timestamps.
4. **Synchronize SAPI Audio**:
   Update `generate_audio_sapi.ps1` to delay each sentence to its corresponding cue `start` timestamp, matching the 300s master timeline.
5. **Remove Tautological Test Assertions**:
   In `demo_video_player/tests/tier1_feature_coverage.test.mjs`, remove `else { assert(true); }` fallbacks and assert that `data.cues` is populated, tokens have `end > start`, and `.token-active` is styled properly.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Missing Cues in `presentationData.js`**:
   ```powershell
   node -e "import('./demo_video_player/js/presentationData.js').then(() => console.log('cues present:', !!(globalThis.PEOPLEPULSE_PRESENTATION_DATA?.cues)));"
   ```
   *Expected Result*: `cues present: false` (Invalidates claim in worker handoff).

2. **Verify Inverted Tokens (`start > end`) in `subtitles.json`**:
   ```powershell
   python -c "import json; sub=json.load(open('demo_video_player/assets/subtitles/subtitles.json', encoding='utf-8')); inv=[(c['id'], t) for c in sub['cues'] for t in c.get('tokens', []) if t['start'] > t['end']]; print('Inverted tokens:', len(inv));"
   ```
   *Expected Result*: `Inverted tokens: 48` (Invalidates word-level karaoke synchronization).

3. **Verify Audio Spillovers and Collisions**:
   ```powershell
   python -c "import json; sub=json.load(open('demo_video_player/assets/subtitles/subtitles.json', encoding='utf-8')); overflows=[c for c in sub['cues'] if c['spokenDuration'] > (c['end'] - c['start'])]; print('Overflowing cues:', len(overflows));"
   ```
   *Expected Result*: `Overflowing cues: 9` (Proves voice collisions and speech truncation at 300s).

4. **Verify SAPI Timing Drift**:
   Inspect `demo_video_player/scripts/generate_audio_sapi.ps1` lines 54-58 to verify absence of cue start delay alignment.

