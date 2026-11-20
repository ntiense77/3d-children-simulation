class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    delay = 0,
    endFreq?: number,
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playPickup() {
    this.playTone(340, 0.12, 'triangle', 0.07, 0, 480);
  }

  playStandInGroup(slotNumber: number) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0];
    const base = scale[Math.max(0, Math.min(4, slotNumber))];
    this.playTone(base, 0.22, 'sine', 0.08, 0);
    this.playTone(base * 1.25, 0.18, 'triangle', 0.04, 0.04);
  }

  playGroupComplete() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this.playTone(freq, 0.32, 'triangle', 0.07, idx * 0.07);
    });
  }

  playReturnToChair() {
    this.playTone(420, 0.14, 'sine', 0.05, 0, 280);
  }

  playHandRaise() {
    this.playTone(587.33, 0.14, 'sine', 0.06, 0);
    this.playTone(880, 0.18, 'sine', 0.06, 0.07);
  }

  playTeacherPrompt() {
    this.playTone(440, 0.18, 'triangle', 0.06, 0);
    this.playTone(554.37, 0.22, 'triangle', 0.06, 0.09);
  }

  playTeacherPraise() {
    this.playTone(659.25, 0.16, 'sine', 0.06, 0);
    this.playTone(783.99, 0.16, 'sine', 0.06, 0.08);
    this.playTone(1046.5, 0.26, 'triangle', 0.07, 0.16);
  }

  playChalkWrite() {
    [0, 0.18, 0.36, 0.54].forEach((delay, idx) => {
      this.playTone(900 + idx * 110, 0.07, 'triangle', 0.025, delay, 740);
    });
  }

  playError() {
    this.playTone(210, 0.14, 'triangle', 0.05, 0, 165);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.45, 'triangle', 0.08, idx * 0.08);
    });
  }
}

export const soundEngine = new SoundEngine();
