/**
 * PeoplePulse Subtitle & Caption Renderer
 * High-contrast WCAG AAA karaoke subtitle overlay with token-level highlighting
 * and interactive full-script transcript drawer.
 *
 * Supports zero-cloud offline execution via file:/// with bundled cues.
 */

(function(root) {
  'use strict';

  class SubtitleRenderer {
    constructor(options = {}) {
      // Support both new SubtitleRenderer({ containerEl: el, ... })
      // and new SubtitleRenderer(containerElement)
      const isElement = (options && (options.nodeType === 1 || options.tagName));
      const opts = isElement ? { containerEl: options, textEl: options } : (options || {});

      this.containerEl = opts.containerEl || (typeof document !== 'undefined' ? document.getElementById('subtitle-overlay') : null);
      this.textEl = opts.textEl || (this.containerEl && this.containerEl.querySelector ? this.containerEl.querySelector('#subtitle-text') : null) || (typeof document !== 'undefined' ? document.getElementById('subtitle-text') : null) || this.containerEl;
      this.stageTagEl = opts.stageTagEl || (this.containerEl && this.containerEl.querySelector ? this.containerEl.querySelector('#subtitle-stage-tag') : null) || (typeof document !== 'undefined' ? document.getElementById('subtitle-stage-tag') : null);
      this.transcriptDrawerEl = opts.transcriptDrawerEl || (typeof document !== 'undefined' ? document.getElementById('transcript-drawer') : null);
      this.transcriptListEl = opts.transcriptListEl || (typeof document !== 'undefined' ? document.getElementById('transcript-list') : null);
      this.timelineEngine = opts.timelineEngine || null;

      this.cues = [];
      this.currentCueIndex = -1;
      this.isVisible = true;

      // Check bundled cues in options or global presentation data for standalone file:/// mode
      const bundledCues = (opts.cues && Array.isArray(opts.cues) && opts.cues.length > 0)
        ? opts.cues
        : (root.PEOPLEPULSE_PRESENTATION_DATA && Array.isArray(root.PEOPLEPULSE_PRESENTATION_DATA.cues))
          ? root.PEOPLEPULSE_PRESENTATION_DATA.cues
          : (typeof window !== 'undefined' && window.PEOPLEPULSE_PRESENTATION_DATA && Array.isArray(window.PEOPLEPULSE_PRESENTATION_DATA.cues))
            ? window.PEOPLEPULSE_PRESENTATION_DATA.cues
            : (typeof globalThis !== 'undefined' && globalThis.PEOPLEPULSE_PRESENTATION_DATA && Array.isArray(globalThis.PEOPLEPULSE_PRESENTATION_DATA.cues))
              ? globalThis.PEOPLEPULSE_PRESENTATION_DATA.cues
              : null;

      if (bundledCues) {
        this.loadCues(bundledCues);
      } else {
        // Fallback fetch if running on http server
        this._tryLoadSubtitlesJson();
      }
    }

    setTimelineEngine(engine) {
      this.timelineEngine = engine;
    }

    _tryLoadSubtitlesJson() {
      if (typeof fetch === 'function' && root.location && root.location.protocol !== 'file:') {
        fetch('assets/subtitles/subtitles.json')
          .then(res => res.json())
          .then(data => {
            if (data && data.cues) {
              this.loadCues(data.cues);
            }
          })
          .catch(() => {
            // Ignore fetch error in file:/// mode
          });
      }
    }

    loadCues(cues) {
      this.cues = cues || [];
      this._renderTranscriptDrawer();
    }

    getActiveCue(time) {
      const idx = this.findCueIndex(time);
      return idx !== -1 ? this.cues[idx] : null;
    }

    findCueIndex(time) {
      if (!this.cues || this.cues.length === 0) return -1;

      // Binary search for efficiency
      let low = 0;
      let high = this.cues.length - 1;

      while (low <= high) {
        const mid = (low + high) >> 1;
        const c = this.cues[mid];
        if (time >= c.start && time <= c.end) {
          return mid;
        } else if (time < c.start) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }

      // Edge case: if in between or slightly before/after, find nearest valid cue
      for (let i = 0; i < this.cues.length; i++) {
        if (time >= this.cues[i].start && time <= this.cues[i].end) return i;
      }
      return -1;
    }

    update(currentTime) {
      if (!this.isVisible) return;

      const cueIdx = this.findCueIndex(currentTime);
      if (cueIdx === -1) {
        if (this.currentCueIndex !== -1) {
          this.currentCueIndex = -1;
          if (this.textEl) this.textEl.innerHTML = '<span class="caption-idle">...</span>';
          if (this.stageTagEl) this.stageTagEl.textContent = "";
        }
        return;
      }

      const cue = this.cues[cueIdx];
      const cueChanged = (cueIdx !== this.currentCueIndex);
      this.currentCueIndex = cueIdx;

      // Update stage badge tag
      if (this.stageTagEl) {
        this.stageTagEl.textContent = cue.stageName ? `[${cue.stageName}]` : `[Stage ${cue.stageId}]`;
        this.stageTagEl.className = `subtitle-stage-badge ${cue.stageClass || ''}`;
      }

      // Render tokens with real-time karaoke illumination
      if (this.textEl) {
        if (cue.tokens && cue.tokens.length > 0) {
          let html = "";
          for (let i = 0; i < cue.tokens.length; i++) {
            const token = cue.tokens[i];
            let cls = "caption-token";
            if (token.highlight) cls += " caption-highlight-term";

            if (currentTime < token.start) {
              cls += " token-upcoming karaoke-upcoming";
            } else if (currentTime >= token.start && currentTime <= token.end) {
              cls += " token-active karaoke-active";
            } else {
              cls += " token-spoken karaoke-spoken";
            }

            html += `<span class="${cls}">${this._escapeHtml(token.text)}</span> `;
          }
          this.textEl.innerHTML = html;
        } else {
          // Plain text fallback
          this.textEl.textContent = cue.text;
        }
      }

      // Highlight active paragraph in transcript drawer if open
      if (cueChanged && this.transcriptListEl) {
        const items = this.transcriptListEl.querySelectorAll('.transcript-item');
        items.forEach((it, idx) => {
          if (idx === cueIdx) {
            it.classList.add('active-transcript-item');
            it.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            it.classList.remove('active-transcript-item');
          }
        });
      }
    }

    _renderTranscriptDrawer() {
      if (!this.transcriptListEl || !this.cues.length) return;

      this.transcriptListEl.innerHTML = "";
      this.cues.forEach((cue, idx) => {
        const item = document.createElement('div');
        item.className = 'transcript-item';
        item.dataset.index = idx;
        item.dataset.start = cue.start;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'transcript-time';
        timeSpan.textContent = this._formatTime(cue.start);

        const stageSpan = document.createElement('span');
        stageSpan.className = `transcript-stage-badge ${cue.stageClass || ''}`;
        stageSpan.textContent = cue.stageName || `Stage ${cue.stageId}`;

        const textSpan = document.createElement('span');
        textSpan.className = 'transcript-text';
        textSpan.textContent = cue.text;

        item.appendChild(timeSpan);
        item.appendChild(stageSpan);
        item.appendChild(textSpan);

        item.addEventListener('click', () => {
          if (this.timelineEngine) {
            this.timelineEngine.seek(cue.start);
          }
        });

        this.transcriptListEl.appendChild(item);
      });
    }

    toggleTranscript() {
      if (!this.transcriptDrawerEl) return;
      const isOpen = this.transcriptDrawerEl.classList.contains('drawer-open');
      if (isOpen) {
        this.transcriptDrawerEl.classList.remove('drawer-open');
      } else {
        this.transcriptDrawerEl.classList.add('drawer-open');
      }
    }

    closeTranscript() {
      if (this.transcriptDrawerEl) {
        this.transcriptDrawerEl.classList.remove('drawer-open');
      }
    }

    setVisibility(visible) {
      this.isVisible = !!visible;
      if (this.containerEl) {
        this.containerEl.style.display = this.isVisible ? "flex" : "none";
      }
    }

    toggleVisibility(force) {
      const next = (typeof force === 'boolean') ? force : !this.isVisible;
      this.setVisibility(next);
      return this.isVisible;
    }

    _formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    _escapeHtml(text) {
      return (text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
  }

  root.SubtitleRenderer = SubtitleRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
