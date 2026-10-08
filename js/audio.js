/**
 * audio.js
 * - 배경음악: assets/sounds/bgm.mp3 파일이 있으면 그 파일을 재생하고,
 *   없으면 Web Audio API 로 직접 연주하는 오리지널 '아늑한 섬' 테마를 재생합니다.
 *   (저작권 있는 게임 음악은 포함하지 않습니다. 사용 권한이 있는 음원을 bgm.mp3 로 넣으면 교체됩니다.)
 * - 효과음: 대화 '재잘거림' 소리, 버튼 팝, 정답/오답, 코인
 */

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.started = false;
    this.fileBgm = null;
    this.useFile = false;
    this.nextTime = 0;
    this.step = 0;
    this.timer = null;
    try {
      this.muted = localStorage.getItem('tradeIsland.muted') === '1';
    } catch (_) { /* 무시 */ }
  }

  /** 사용자 입력(클릭/키) 이후에 호출해야 브라우저가 소리를 허용합니다. */
  start() {
    if (this.started) return;
    this.started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    const warm = this.ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 3800;
    this.musicGain.connect(warm).connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.35;
    this.sfxGain.connect(this.master);

    this.noise = this.makeNoise();
    this.startWaves();

    // 사용자 음원 우선 시도
    const audio = new Audio('assets/sounds/bgm.mp3');
    audio.loop = true;
    audio.volume = 0.45;
    audio.addEventListener('canplaythrough', () => {
      if (this.useFile) return;
      this.useFile = true;
      this.stopSynth();
      this.fileBgm = audio;
      if (!this.muted) audio.play().catch(() => {});
    }, { once: true });
    audio.addEventListener('error', () => {}, { once: true });
    audio.load();
    this.startSynth();
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('tradeIsland.muted', m ? '1' : '0'); } catch (_) { /* 무시 */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    if (this.fileBgm) {
      if (m) this.fileBgm.pause();
      else this.fileBgm.play().catch(() => {});
    }
  }

  toggle() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /* ---------------- 오리지널 BGM (F장조, 스윙 리듬) ---------------- */
  startSynth() {
    if (!this.ctx) return;
    this.bpm = 92;
    this.nextTime = this.ctx.currentTime + 0.15;
    this.step = 0;
    // 8마디 코드 진행: Fmaj7 Dm7 Gm7 C7 | Fmaj7 Am7 Bbmaj7 C7
    this.chords = [
      [53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 58],
      [53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [48, 52, 55, 58],
    ];
    // 16분음표 단위 멜로디 (0 = 쉼표) — 마디당 16칸
    this.melody = [
      72, 0, 0, 69, 0, 0, 72, 0, 74, 0, 72, 0, 69, 0, 0, 0,
      69, 0, 0, 65, 0, 0, 69, 0, 72, 0, 0, 0, 0, 0, 0, 0,
      70, 0, 0, 74, 0, 0, 77, 0, 74, 0, 70, 0, 67, 0, 0, 0,
      67, 0, 70, 0, 72, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0,
      77, 0, 0, 76, 0, 0, 72, 0, 69, 0, 72, 0, 74, 0, 0, 0,
      76, 0, 0, 72, 0, 0, 69, 0, 72, 0, 0, 0, 0, 0, 0, 0,
      74, 0, 0, 72, 0, 0, 70, 0, 69, 0, 70, 0, 74, 0, 0, 0,
      72, 0, 70, 0, 67, 0, 64, 0, 65, 0, 0, 0, 0, 0, 0, 0,
    ];
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopSynth() {
    clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const ctx = this.ctx;
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const s = this.step % 128;
      const bar = Math.floor(s / 16);
      const pos = s % 16;
      // 스윙: 짝수 8분음표 뒤 칸을 살짝 늦춤
      const swing = pos % 4 === 2 ? sixteenth * 0.18 : 0;
      const t = this.nextTime + swing;
      const chord = this.chords[bar];

      const note = this.melody[s];
      if (note) this.marimba(note, t, 0.5);
      if (pos === 0 || pos === 8) this.bass(chord[0] - 12 + (pos === 8 ? 7 : 0), t);
      if (pos === 4 || pos === 12) chord.forEach((n, i) => this.pluck(n, t + i * 0.012, 0.12));
      if (pos === 0) this.pad(chord, t, sixteenth * 16);
      if (pos % 2 === 0) this.shaker(t, pos % 4 === 0 ? 0.05 : 0.03);
      if (pos === 0 || pos === 10) this.kick(t);

      this.nextTime += sixteenth;
      this.step += 1;
    }
  }

  freq(m) {
    return 440 * 2 ** ((m - 69) / 12);
  }

  marimba(m, t, vol) {
    const ctx = this.ctx;
    const f = this.freq(m);
    [[1, vol], [4, vol * 0.18], [10, vol * 0.05]].forEach(([mul, v]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (mul === 1 ? 0.7 : 0.15));
      o.connect(g).connect(this.musicGain);
      o.start(t);
      o.stop(t + 0.8);
    });
  }

  pluck(m, t, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.value = this.freq(m);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(f).connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.4);
  }

  bass(m, t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = this.freq(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.6);
  }

  pad(chord, t, dur) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.musicGain);
    chord.forEach((n) => [-6, 6].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = this.freq(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }));
  }

  makeNoise() {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  shaker(t, vol) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(t, Math.random());
    src.stop(t + 0.08);
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.22);
  }

  /** 잔잔한 파도 소리 */
  startWaves() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    lfo.start();
  }

  /* ---------------- 효과음 ---------------- */
  tone(freq, dur, type = 'sine', vol = 0.3, slide = 1, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** 캐릭터 대사 재잘거림 (voice: 음높이 배율) */
  babble(voice = 1) {
    const base = 300 * voice;
    this.tone(base * (0.85 + Math.random() * 0.5), 0.06, 'triangle', 0.13, 1.15);
  }

  pop() { this.tone(660, 0.08, 'sine', 0.22, 1.6); }
  open() { this.tone(520, 0.1, 'sine', 0.2, 1.5); this.tone(780, 0.12, 'sine', 0.18, 1.3, 0.07); }
  correct() { [660, 830, 990].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.22, 1, i * 0.08)); }
  wrong() { this.tone(260, 0.25, 'square', 0.08, 0.7); }
  coin() { this.tone(988, 0.08, 'square', 0.1); this.tone(1318, 0.25, 'square', 0.1, 1, 0.08); }
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.22, 1, i * 0.12)); }
  jump() { this.tone(380, 0.14, 'sine', 0.15, 1.8); }
}

const gameAudio = new GameAudio();
