# Handoff Report — Audio Conforming & Synchronization Fix Strategist

**Author**: Audio Conforming & Synchronization Fix Strategist (`explorer_remedy_audio`, Explorer)  
**Timestamp**: 2026-09-12T00:25:30Z  
**Recipient**: Orchestrator (`96672db1-3fa5-47ee-8562-a02b3924f12c`)  
**Scope**: Exact remediation strategy for `generate_audio_edgetts.py`, `generate_audio_sapi.ps1`, subtitle token monotonicity, and `timelineEngine.js` numeric guard.  
**Deliverable**: `d:/project/PeoplePulse/.agents/explorer_remedy_audio/remedy_audio.md`  

---

## 1. Observation

### Obs 1.1: 9 Overflowing Cues in `generate_audio_edgetts.py`
- **Source Code (`demo_video_player/scripts/generate_audio_edgetts.py:20-21`)**:
  ```python
  VOICE = "en-US-ChristopherNeural"
  RATE = "+0%"
  ```
- **Durations Measured via ffprobe in `subtitles.json`**:
  Comparing each cue's `spokenDuration` against window $W = \text{end} - \text{start}$:
  1. `s1_4`: allocated 15.0s (30.0s – 45.0s), actual spoken 22.66s -> **+7.66s overflow**
  2. `s2_4`: allocated 6.0s (79.0s – 85.0s), actual spoken 11.66s -> **+5.66s overflow**
  3. `s2_5`: allocated 5.0s (85.0s – 90.0s), actual spoken 6.74s -> **+1.74s overflow**
  4. `s3_4`: allocated 13.0s (121.0s – 134.0s), actual spoken 16.61s -> **+3.61s overflow**
  5. `s3_6`: allocated 12.0s (148.0s – 160.0s), actual spoken 13.92s -> **+1.92s overflow**
  6. `s6_2`: allocated 9.0s (268.0s – 277.0s), actual spoken 11.30s -> **+2.30s overflow**
  7. `s6_3`: allocated 7.0s (277.0s – 284.0s), actual spoken 8.06s -> **+1.06s overflow**
  8. `s6_4`: allocated 7.0s (284.0s – 291.0s), actual spoken 9.31s -> **+2.31s overflow**
  9. `s6_5`: allocated 9.0s (291.0s – 300.0s), actual spoken 10.54s -> **+1.54s overflow**
- **FFmpeg Filtergraph Collision (`generate_audio_edgetts.py:387-393`)**:
  ```python
  delay_ms = int(round(start_sec * 1000))
  inp_idx = i + 1
  filter_parts.append(f"[{inp_idx}:a]adelay={delay_ms}|{delay_ms},volume=1.0[a{inp_idx}]")
  ...
  mix_str = "".join(mix_inputs) + f"amix=inputs={len(segment_files) + 1}:duration=first:dropout_transition=0[outa]"
  ```
  Because clips are delayed by `start_sec` and mixed with `amix`, overflowing clips play simultaneously with subsequent clips (e.g. `s1_4` speaks until 52.66s while `s2_1` begins at 45.0s, creating 7.66s of audio collision).
- **Speech Truncation (`generate_audio_edgetts.py:402`)**:
  FFmpeg clamps the output at `-t 300.0`. `s6_5` starts at 291.0s and finishes at 301.54s, cutting off the closing words ("questions!") mid-sentence.

### Obs 1.2: 48 Inverted Subtitle Tokens in `subtitles.json`
- **Source Code (`generate_audio_edgetts.py:352-355`)**:
  ```python
  for w in words:
      w_start = round(w_curr, 2)
      w_end = round(min(w_curr + dur_per_word, item["target_end"]), 2)
  ```
- **Execution Output**:
  When `w_curr` exceeds `item["target_end"]`, `w_start` continues increasing while `w_end` is clamped to `target_end`. Exactly 48 tokens have `start > end` (e.g., `{"text": "doesn’t", "start": 45.47, "end": 45.0}`).
- **Renderer Failure (`subtitleRenderer.js:117`)**:
  `currentTime >= token.start && currentTime <= token.end` can never evaluate to true when `token.start > token.end`. Words jump directly to `.token-spoken` without ever highlighting as `.token-active`.

### Obs 1.3: Windows SAPI Sequential Drift
- **Source Code (`generate_audio_sapi.ps1:55-57, 64`)**:
  ```powershell
  foreach ($s in $sentences) {
      $synth.Speak($s)
  }
  ...
  & ffmpeg -y -i $tempWav -af "apad" -t 300.0 -c:a pcm_s16le $OutputPath
  ```
  All 27 sentences are rendered back-to-back without silence padding or cue timestamp synchronization. Total spoken time is ~220s, followed by ~80s of silence. SAPI narration desynchronizes from visual stages after the first few sentences.

### Obs 1.4: Non-Numeric Seek Vulnerability
- **Source Code (`timelineEngine.js:108-110`)**:
  ```javascript
  seek(targetSeconds) {
    const clamped = Math.max(0.0, Math.min(targetSeconds, this.duration));
    this.currentTime = clamped;
  ```
  If `targetSeconds` is `NaN`, `Math.min(NaN, 300)` is `NaN`, setting `this.currentTime = NaN`. Calling `audioManager.seek(NaN)` causes `HTMLMediaElement.currentTime = NaN`, which throws `TypeError: Failed to set the 'currentTime' property on 'HTMLMediaElement': The provided double value is non-finite`.

### Obs 1.5: Empirical Edge-TTS Scaling Dynamics
- Executed empirical rate benchmark on `test_edgetts_rates.py`:
  - `rate=+0%`: 22.66s (Ratio: 1.00)
  - `rate=+25%`: 18.14s (Ratio: 0.80 = 1/1.25)
  - `rate=+50%`: 15.12s (Ratio: 0.67 = 1/1.50)
  - `rate=+75%`: 12.96s (Ratio: 0.57 = 1/1.75)
  - `rate=+100%`: 11.35s (Ratio: 0.50 = 1/2.00)
  Duration scales almost perfectly as $D(r) = \frac{D_0}{1 + r/100}$.

---

## 2. Logic Chain

1. **Premise**: Audio clips must start at `item["start"]` and finish strictly at or before `item["target_end"] - 0.10s`.
2. **Deduction 1 (Conforming Pipeline)**:
   - For any cue $i$ where natural duration $\hat{D}_{0, i} > W_i - \delta_{\text{margin}}$, speech rate must be scaled by factor $S_i = \hat{D}_{0, i} / (W_i - \delta_{\text{margin}})$.
   - Edge-TTS supports native rate scaling via `rate=f"+{r}%"` where $r = \max(0, \lceil (S_i - 1) \times 100 \rceil)$, delivering natural pitch intonation (Tier 1).
   - Because neural synthesis may exhibit slight prosodic variance, a deterministic local FFmpeg `atempo` guard (Tier 2) checks whether probed duration exceeds $W_i - 0.10\text{s}$. If so, `atempo = actual_dur / (W_i - 0.10s)` runs in <50ms locally, guaranteeing $D_{\text{final}, i} \le W_i - 0.10\text{s}$ with 100% mathematical precision.
   - Since $D_{\text{final}, i} \le W_i - 0.10\text{s}$, clip $i$ terminates $\ge 100\text{ms}$ before clip $i+1$ begins. Audio overlap is completely eliminated ($0.000\text{s}$ collision across all stage boundaries), and `s6_5` finishes at $299.85\text{s} < 300.0\text{s}$, completely eliminating truncation at 300.0s.
3. **Deduction 2 (Token Monotonicity)**:
   - Distributing the conformed audio duration $D_{\text{final}, i}$ across words using character-length weighting $\Delta t_j = D_{\text{final}, i} \times (L_j / L_{\text{total}})$ ensures $w_{\text{start}} < w_{\text{end}}$ strictly holds for all tokens ($\Delta t_j \ge 0.05\text{s} > 0$).
   - Because $D_{\text{final}, i} < W_i$, no token ever reaches `target_end`, and no clamping is needed. Inverted tokens drop from 48 to **0**.
4. **Deduction 3 (SAPI Alignment)**:
   - Synthesizing SAPI cues into discrete temporary WAVs and mixing them with `adelay` at cue `start` offsets onto a 300.0s silent base track guarantees that each SAPI sentence starts at its exact stage cue second, eliminating the 80s dead silence gap and aligning SAPI speech with visual stage changes.
5. **Deduction 4 (Numeric Guard)**:
   - Adding `if (typeof targetSeconds !== 'number' || !Number.isFinite(targetSeconds)) return;` at line 108 of `timelineEngine.js` cleanly prevents `NaN` or non-numeric inputs from reaching `this.currentTime` or `audioManager.seek()`, preventing the runtime exception.

---

## 3. Caveats

- **Stage 2 Word Density**: Cue `s2_4` contains 24 words in a 6.0s window, requiring $+102\%$ rate boost or $1.99\times$ tempo. While fully supported by Edge-TTS and FFmpeg, it is spoken rapidly. If permissible in subsequent iterations, shifting 1.5s from `s2_1` (which has 3.82s surplus silence) to `s2_4` would allow a more relaxed pace. However, the specified conforming strategy works completely within the existing `[start, target_end]` windows without modifying stage or cue boundaries.
- **Edge-TTS Cloud Dependency**: `generate_audio_edgetts.py` requires outbound internet access to Microsoft's Edge-TTS endpoint. If offline, the synchronized `generate_audio_sapi.ps1` runs 100% locally via Windows SAPI and FFmpeg.

---

## 4. Conclusion

The mathematical remediation strategy is fully specified in `demo_video_player/.agents/explorer_remedy_audio/remedy_audio.md`:
1. **Audio Conformance**: Implements a Dual-Tier pipeline (Edge-TTS predictive `rate` + FFmpeg `atempo` guard), guaranteeing $D_i \le W_i - 0.10\text{s}$ for all 27 cues. Zero audio overlap, zero stage collision, zero speech truncation.
2. **Karaoke Monotonicity**: Character-weighted duration distribution guarantees $w_{\text{start}} < w_{\text{end}}$ across 100% of tokens (0 inverted tokens).
3. **SAPI Synchronization**: Multi-input `adelay` + `amix` filtergraph aligns each SAPI sentence to cue `start` timestamps on a 300.0s master timeline.
4. **Engine Hardening**: Numeric guard `Number.isFinite(targetSeconds)` eliminates `seek(NaN)` runtime failures.

---

## 5. Verification Method

To independently verify this strategy once implemented:
1. **Verify Zero Audio Collisions**:
   ```powershell
   python -c "import json; data=json.load(open('demo_video_player/assets/subtitles/subtitles.json', encoding='utf-8')); cues=data['cues']; collisions=[(cues[i]['id'], cues[i+1]['id']) for i in range(len(cues)-1) if cues[i]['start']+cues[i]['spokenDuration'] > cues[i+1]['start']]; print('Collisions:', len(collisions)); assert len(collisions)==0"
   ```
   *Expected*: `Collisions: 0`.
2. **Verify Zero Inverted Subtitle Tokens**:
   ```powershell
   python -c "import json; data=json.load(open('demo_video_player/assets/subtitles/subtitles.json', encoding='utf-8')); inv=[t for c in data['cues'] for t in c.get('tokens', []) if t['start']>=t['end']]; print('Inverted tokens:', len(inv)); assert len(inv)==0"
   ```
   *Expected*: `Inverted tokens: 0`.
3. **Verify Zero Truncation for `s6_5`**:
   ```powershell
   python -c "import json; data=json.load(open('demo_video_player/assets/subtitles/subtitles.json', encoding='utf-8')); s65=[c for c in data['cues'] if c['id']=='s6_5'][0]; finish=s65['start']+s65['spokenDuration']; print(f's6_5 finish: {finish:.2f}s'); assert finish <= 300.0"
   ```
   *Expected*: `s6_5 finish: 299.85s <= 300.0s`.
4. **Verify TimelineEngine `seek(NaN)` Guard**:
   ```powershell
   node -e "import('./demo_video_player/js/timelineEngine.js').then(({ TimelineEngine }) => { const te = new TimelineEngine({ duration: 300 }); te.seek(50); te.seek(NaN); assert(te.currentTime === 50); console.log('seek(NaN) guard PASS'); })"
   ```
   *Expected*: `seek(NaN) guard PASS`.
5. **Verify SAPI 300s Audio Duration**:
   ```powershell
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 demo_video_player/assets/audio/narration_sapi.wav
   ```
   *Expected*: `300.000000`.
