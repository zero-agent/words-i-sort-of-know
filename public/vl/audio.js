// Audio engine for "words i sort of know"
// Drone motif + wave generator, triggered by scene events

const vlAudio = (() => {
  let ctx, sourceNode, sfxNode, dryNode, masterGain, convolver, lpf;
  let initialized = false;
  let stopWavesFn = null;
  let droneVol = 0.3;  // default drone volume
  let muted = false;   // mute all SFX during skips

  const ROOT = 130.81; // C3
  const DEG = { 1: 0, 2: 1, 3: 3, 4: 5, 5: 7, 6: 8, 7: 10, 8: 12 };

  function freq(semitones, octave) {
    return ROOT * Math.pow(2, (semitones + octave * 12) / 12);
  }

  async function createReverb(audioCtx, duration = 7, decay = 2.0) {
    const rate = audioCtx.sampleRate;
    const length = rate * duration;
    const impulse = audioCtx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    const conv = audioCtx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  async function init() {
    if (initialized) return;
    try {
    // Create context synchronously in the user gesture — do NOT await anything first
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Some browsers need resume called synchronously in the gesture too
    ctx.resume();

    masterGain = ctx.createGain();
    masterGain.gain.value = 1.4;  // boosted for mobile

    lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 400;
    lpf.Q.value = 0.5;

    convolver = await createReverb(ctx, 7, 2.0);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.85;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.2;

    const mixNode = ctx.createGain();
    mixNode.gain.value = 1;

    dryGain.connect(mixNode);
    convolver.connect(reverbGain);
    reverbGain.connect(mixNode);
    mixNode.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Drone bus — heavy LPF (400Hz) for the deep warm drones
    sourceNode = ctx.createGain();
    sourceNode.gain.value = 1;
    sourceNode.connect(lpf);
    lpf.connect(dryGain);
    lpf.connect(convolver);

    // SFX/pulse bus — light LPF (3kHz), own short reverb
    const sfxLpf = ctx.createBiquadFilter();
    sfxLpf.type = 'lowpass';
    sfxLpf.frequency.value = 3000;
    sfxLpf.Q.value = 0.5;

    const sfxReverb = await createReverb(ctx, 3.5, 2.5);  // moderate tail, smooth decay
    const sfxReverbGain = ctx.createGain();
    sfxReverbGain.gain.value = 0.15;

    const sfxDry = ctx.createGain();
    sfxDry.gain.value = 0.65;

    sfxNode = ctx.createGain();
    sfxNode.gain.value = 1;
    sfxNode.connect(sfxLpf);
    sfxLpf.connect(sfxDry);
    sfxLpf.connect(sfxReverb);
    sfxReverb.connect(sfxReverbGain);
    sfxReverbGain.connect(mixNode);

    sfxDry.connect(mixNode);

    // Dry bus — NO reverb, NO filter (typing, shimmer)
    dryNode = ctx.createGain();
    dryNode.gain.value = 1;
    dryNode.connect(masterGain);

    initialized = true;
    } catch(e) { console.error('Audio init failed:', e); }
  }

  function playNote(noteFreq, slideToFreq, harmonicOverride, iteration) {
    if (!initialized) return;
    const dur = 3.5;
    const rampUp = 2.2;
    const droneLevel = droneVol;  // set via setDroneVol()
    const vol = (noteFreq > 200 ? 0.5 : 1.6) * droneLevel;
    const startTime = ctx.currentTime + 0.05;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(noteFreq, startTime);
    if (slideToFreq) osc.frequency.exponentialRampToValueAtTime(slideToFreq, startTime + dur * 0.7);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(noteFreq * 1.002, startTime);
    if (slideToFreq) osc2.frequency.exponentialRampToValueAtTime(slideToFreq * 1.002, startTime + dur * 0.7);

    const sub = ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(noteFreq * 0.5, startTime);
    if (slideToFreq) sub.frequency.exponentialRampToValueAtTime(slideToFreq * 0.5, startTime + dur * 0.7);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.18 * vol, startTime + rampUp);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + dur + 1.5);

    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0, startTime);
    env2.gain.linearRampToValueAtTime(0.08 * vol, startTime + rampUp);
    env2.gain.exponentialRampToValueAtTime(0.001, startTime + dur + 1.5);

    const subEnv = ctx.createGain();
    subEnv.gain.setValueAtTime(0, startTime);
    subEnv.gain.linearRampToValueAtTime(0.06 * vol, startTime + rampUp);
    subEnv.gain.exponentialRampToValueAtTime(0.001, startTime + dur + 1.5);

    osc.connect(env); osc2.connect(env2); sub.connect(subEnv);
    env.connect(sourceNode); env2.connect(sourceNode); subEnv.connect(sourceNode);
    osc.start(startTime); osc2.start(startTime); sub.start(startTime);
    osc.stop(startTime + dur + 2); osc2.stop(startTime + dur + 2); sub.stop(startTime + dur + 2);

    // Iteration 2+: tenth layer or custom harmonic
    if (iteration >= 2) {
      let hFreq, hSlide;
      if (harmonicOverride) {
        hFreq = freq(harmonicOverride.semitones, harmonicOverride.octave);
        hSlide = harmonicOverride.slideTo != null ? freq(harmonicOverride.slideTo, harmonicOverride.octave) : null;
      } else {
        const tenthRatio = Math.pow(2, 16 / 12);
        hFreq = noteFreq * tenthRatio;
        hSlide = slideToFreq ? slideToFreq * tenthRatio : null;
      }

      const tenth = ctx.createOscillator();
      tenth.type = 'triangle';
      tenth.frequency.setValueAtTime(hFreq, startTime);
      if (hSlide) tenth.frequency.exponentialRampToValueAtTime(hSlide, startTime + dur * 0.7);

      const tenth2 = ctx.createOscillator();
      tenth2.type = 'triangle';
      tenth2.frequency.setValueAtTime(hFreq * 0.998, startTime);
      if (hSlide) tenth2.frequency.exponentialRampToValueAtTime(hSlide * 0.998, startTime + dur * 0.7);

      const tEnv = ctx.createGain();
      tEnv.gain.setValueAtTime(0, startTime);
      tEnv.gain.linearRampToValueAtTime(0.06 * vol, startTime + rampUp + 0.4);
      tEnv.gain.exponentialRampToValueAtTime(0.001, startTime + dur + 1.5);

      const tEnv2 = ctx.createGain();
      tEnv2.gain.setValueAtTime(0, startTime);
      tEnv2.gain.linearRampToValueAtTime(0.035 * vol, startTime + rampUp + 0.6);
      tEnv2.gain.exponentialRampToValueAtTime(0.001, startTime + dur + 1.5);

      tenth.connect(tEnv); tenth2.connect(tEnv2);
      tEnv.connect(sourceNode); tEnv2.connect(sourceNode);
      tenth.start(startTime + 0.2); tenth2.start(startTime + 0.2);
      tenth.stop(startTime + dur + 2); tenth2.stop(startTime + dur + 2);
    }
  }

  function playMelody(noteFreq, iteration) {
    if (!initialized) return;
    const f = noteFreq * 2; // octave up
    const attack = 0.02;
    const decay = 0.15;
    const release = 2.5;
    const startTime = ctx.currentTime + 0.05;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = f * 1.003;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.096, startTime + attack);
    env.gain.exponentialRampToValueAtTime(0.024, startTime + attack + decay);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay + release);

    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0, startTime);
    env2.gain.linearRampToValueAtTime(0.042, startTime + attack);
    env2.gain.exponentialRampToValueAtTime(0.012, startTime + attack + decay);
    env2.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay + release);

    osc.connect(env); env.connect(sourceNode);
    osc2.connect(env2); env2.connect(sourceNode);
    osc.start(startTime); osc2.start(startTime);
    osc.stop(startTime + attack + decay + release + 0.5);
    osc2.stop(startTime + attack + decay + release + 0.5);
  }

  function startWaves(durationSecs) {
    if (!initialized) return;
    if (stopWavesFn) { stopWavesFn(); stopWavesFn = null; }

    const bufferSize = ctx.sampleRate * (durationSecs + 4);
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const tideFilter = ctx.createBiquadFilter();
    tideFilter.type = 'lowpass';
    tideFilter.Q.value = 1.0;

    const tideGain = ctx.createGain();
    const now = ctx.currentTime;
    const wavePeriod = 4.0;
    const numCycles = Math.ceil(durationSecs / wavePeriod) + 2;

    for (let c = 0; c < numCycles; c++) {
      const cycleStart = now + c * wavePeriod;
      const crest = cycleStart + wavePeriod * 0.55;
      const trough = cycleStart + wavePeriod;
      tideFilter.frequency.setValueAtTime(80, cycleStart);
      tideFilter.frequency.exponentialRampToValueAtTime(1400, crest);
      tideFilter.frequency.exponentialRampToValueAtTime(80, trough);
      tideGain.gain.setValueAtTime(0.01, cycleStart);
      tideGain.gain.linearRampToValueAtTime(0.22, crest);
      tideGain.gain.exponentialRampToValueAtTime(0.01, trough);
    }

    const masterFade = ctx.createGain();
    masterFade.gain.setValueAtTime(0, now);
    masterFade.gain.linearRampToValueAtTime(1.0, now + wavePeriod);

    noise.connect(tideFilter);
    tideFilter.connect(tideGain);
    tideGain.connect(masterFade);
    masterFade.connect(sourceNode);
    noise.start(now);

    stopWavesFn = () => {
      masterFade.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
      setTimeout(() => { try { noise.stop(); } catch(e) {} }, 3000);
    };
  }

  function stopWaves() {
    if (stopWavesFn) { stopWavesFn(); stopWavesFn = null; }
  }

  // Convenience: play a note from semitone/octave notation
  function play(semitones, octave, slideTo, iteration, harmonic) {
    const f = freq(semitones, octave);
    const sf = slideTo != null ? freq(slideTo, octave) : null;
    playNote(f, sf, harmonic || null, iteration || 1);
  }

  function melody(degree, octave, iteration) {
    const f = freq(DEG[degree], octave);
    playMelody(f, iteration || 1);
  }

  // ═══════════════════════════════════════
  // Sound effects — all in key (C minor)
  // ═══════════════════════════════════════

  function sfxReady() {
    if (!initialized || muted) return false;
    if (ctx.state === 'suspended') ctx.resume();
    if (ctx.state === 'closed') return false;
    return true;
  }

  function mute() { muted = true; }
  function unmute() { muted = false; }

  // Birthday fanfare — da dada daaaah! Eb4 Eb4 Eb4 Ab4
  function sfxBirthday() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const notes = [
      { f: freq(3, 1), start: 0,    dur: 0.15 },  // Eb4 (da)
      { f: freq(3, 1), start: 0.18, dur: 0.15 },  // Eb4 (da)
      { f: freq(3, 1), start: 0.36, dur: 0.12 },  // Eb4 (da)
      { f: freq(8, 1), start: 0.50, dur: 0.8 },   // Ab4 (daaaah!)
    ];
    notes.forEach(n => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = n.f;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, t + n.start);
      e.gain.linearRampToValueAtTime(0.14, t + n.start + 0.01);
      e.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur + 0.3);
      o.connect(e); e.connect(sfxNode);
      o.start(t + n.start); o.stop(t + n.start + n.dur + 0.5);
    });
  }

  // Error tool call — low Gb2 with dampened plucky character
  function sfxError() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq(6, -1); // Gb2
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = freq(6, -1) * 1.01; // harsh detune
    // LPF that closes quickly — plucky dampening
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(1200, t);
    flt.frequency.exponentialRampToValueAtTime(200, t + 0.15); // closes fast
    flt.Q.value = 2;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.1, t + 0.008);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.3); // faster decay
    o.connect(flt); o2.connect(flt); flt.connect(e); e.connect(sfxNode);
    o.start(t); o2.start(t);
    o.stop(t + 0.5); o2.stop(t + 0.5);
  }

  // Liam text ding — low Eb3
  function sfxText() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(3, 0); // Eb3
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.2, t + 0.01);  // another 30% louder
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o.connect(e); e.connect(sfxNode);
    o.start(t); o.stop(t + 0.9);
  }

  // Soft ding for tool calls — triangle ping on the 5th (G4)
  function sfxTool() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(7, 1); // G4
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.12, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(e); e.connect(sfxNode);
    o.start(t); o.stop(t + 0.8);
  }

  // Log line blip — Eb5, louder with a bright triangle layer
  function sfxLog() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(3, 2); // Eb5
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq(3, 2) * 2; // Eb6 — bright overtone
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.14, t + 0.005);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const e2 = ctx.createGain();
    e2.gain.setValueAtTime(0, t);
    e2.gain.linearRampToValueAtTime(0.05, t + 0.005);
    e2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(e); e.connect(sfxNode);
    o2.connect(e2); e2.connect(sfxNode);
    o.start(t); o.stop(t + 0.5);
    o2.start(t); o2.stop(t + 0.4);
  }

  // Alert/pager ping — two-tone on the 6th (Ab4) then 7th (Bb4), sharper
  function sfxAlert() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq(8, 1); // Ab4
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq(10, 1); // Bb4
    const e1 = ctx.createGain();
    e1.gain.setValueAtTime(0, t);
    e1.gain.linearRampToValueAtTime(0.15, t + 0.008);
    e1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    const e2 = ctx.createGain();
    e2.gain.setValueAtTime(0, t + 0.12);
    e2.gain.linearRampToValueAtTime(0.12, t + 0.13);
    e2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o1.connect(e1); e1.connect(sfxNode);
    o2.connect(e2); e2.connect(sfxNode);
    o1.start(t); o1.stop(t + 0.4);
    o2.start(t + 0.12); o2.stop(t + 0.6);
  }

  // Banner/system event — quick Ab5 then Bb5 (high, bright)
  function sfxBanner() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = freq(8, 2); // Ab5
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq(10, 2); // Bb5
    const e1 = ctx.createGain();
    e1.gain.setValueAtTime(0, t);
    e1.gain.linearRampToValueAtTime(0.1, t + 0.008);
    e1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    const e2 = ctx.createGain();
    e2.gain.setValueAtTime(0, t + 0.08);
    e2.gain.linearRampToValueAtTime(0.08, t + 0.09);
    e2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o1.connect(e1); e1.connect(sfxNode);
    o2.connect(e2); e2.connect(sfxNode);
    o1.start(t); o1.stop(t + 0.3);
    o2.start(t + 0.08); o2.stop(t + 0.5);
  }

  // Search blip — descending two-note on 5th→3rd (G4→Eb4)
  function sfxSearch() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq(7, 1), t); // G4
    o.frequency.exponentialRampToValueAtTime(freq(3, 1), t + 0.15); // → Eb4
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.1, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(e); e.connect(sfxNode);
    o.start(t); o.stop(t + 0.7);
  }

  // Confirm ding — bright, on the root (C5)
  function sfxConfirm() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(0, 2); // C5
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.14, t + 0.008);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    o.connect(e); e.connect(sfxNode);
    o.start(t); o.stop(t + 1.0);
  }

  // Typing click — very short noise burst
  function sfxKeyclick() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.015, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // Bandpass to give it a woody click character
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + Math.random() * 1000;
    bp.Q.value = 2;
    const e = ctx.createGain();
    e.gain.value = 0.12 * (0.5 + Math.random() * 0.5); // ~50% of original, random 50-100%
    src.connect(bp); bp.connect(e); e.connect(dryNode);  // dry — no reverb
    src.start(t);
  }

  // Soft keyclick — for caleb narration typing (40% quieter)
  function sfxKeyclickSoft() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.015, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + Math.random() * 1000;
    bp.Q.value = 2;
    const e = ctx.createGain();
    e.gain.value = 0.072 * (0.5 + Math.random() * 0.5); // 60% of normal keyclick
    src.connect(bp); bp.connect(e); e.connect(dryNode);
    src.start(t);
  }

  // Loud keyclick — enter key, paste action
  function sfxKeyclickLoud() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 600;
    bp.Q.value = 1.5;
    const e = ctx.createGain();
    e.gain.value = 0.18;  // top of the normal range
    src.connect(bp); bp.connect(e); e.connect(dryNode);
    src.start(t);
  }

  // Shimmer/buzz — starts quiet, builds aggressively (dry bus, no reverb)
  let shimmerStop = null;
  function sfxShimmerStart() {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    // Buzzing static — detuned saws + noise
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = freq(0, 0); // C3
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = freq(0, 0) * 1.015; // wider detune = more buzz
    const o3 = ctx.createOscillator();
    o3.type = 'sawtooth';
    o3.frequency.value = freq(3, 0); // Eb3 — adds dissonance
    // Filter opens over time
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(120, t);
    flt.frequency.linearRampToValueAtTime(900, t + 12);  // slower ramp — 12s
    flt.Q.value = 3;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0005, t);
    e.gain.linearRampToValueAtTime(0.05, t + 12);  // half of previous
    o1.connect(flt); o2.connect(flt); o3.connect(flt);
    flt.connect(e); e.connect(dryNode);  // dry — no reverb, cuts off clean
    o1.start(t); o2.start(t); o3.start(t);
    shimmerStop = () => {
      e.gain.cancelScheduledValues(ctx.currentTime);
      e.gain.setValueAtTime(e.gain.value, ctx.currentTime);
      e.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08); // very sudden cutoff
      setTimeout(() => { try { o1.stop(); o2.stop(); o3.stop(); } catch(e) {} }, 200);
      shimmerStop = null;
    };
  }

  function sfxShimmerStop() {
    if (shimmerStop) shimmerStop();
  }

  // ═══════════════════════════════════════
  // Pulse engine — rhythmic score for Regression sections
  // 110 BPM staccato strings with configurable chord voicings
  // ═══════════════════════════════════════

  let pulseInterval = null;
  let pulsebeat = 0;
  let pulseChords = null;   // array of { high: [freq, freq], bass: freq, every: N }
  let pulseChordIdx = 0;
  let pulseMasterGain = null;

  // Violin-ish staccato: triangle + slight saw, fast attack, moderate decay
  function playPulseNote(noteFreq, loud) {
    if (!sfxReady()) return;
    const t = ctx.currentTime;
    const vol = loud ? 1.0 : 0.55;

    // Main voice — triangle (warm string-like)
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = noteFreq;

    // Slight saw layer for rosin/bite
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = noteFreq * 1.001;

    // Fast attack, moderate decay — staccato bow stroke
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.045 * vol, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.008 * vol, t + 0.18);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0, t);
    env2.gain.linearRampToValueAtTime(0.012 * vol, t + 0.015);
    env2.gain.exponentialRampToValueAtTime(0.002 * vol, t + 0.15);
    env2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    o1.connect(env); o2.connect(env2);
    env.connect(pulseMasterGain); env2.connect(pulseMasterGain);
    o1.start(t); o2.start(t);
    o1.stop(t + 0.6); o2.stop(t + 0.6);
  }

  function playPulseBass(noteFreq) {
    if (!sfxReady()) return;
    const t = ctx.currentTime;

    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = noteFreq;

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = noteFreq * 0.5;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.07, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.015, t + 0.4);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    const subEnv = ctx.createGain();
    subEnv.gain.setValueAtTime(0, t);
    subEnv.gain.linearRampToValueAtTime(0.05, t + 0.03);
    subEnv.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    subEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    o.connect(env); sub.connect(subEnv);
    env.connect(pulseMasterGain); subEnv.connect(pulseMasterGain);
    o.start(t); sub.start(t);
    o.stop(t + 1.6); sub.stop(t + 1.6);
  }

  // Start the pulse with a chord progression
  // chords: array of { high: [semitones, semitones], highOctave, bass: semitones, bassOctave }
  // Each chord plays for 12 beats then advances
  function pulseStart(chords) {
    if (pulseInterval) pulseClear();
    if (!sfxReady()) return;

    pulseChords = chords;
    pulseChordIdx = 0;
    pulsebeat = 0;

    // Dedicated gain for the pulse so we can fade it
    pulseMasterGain = ctx.createGain();
    pulseMasterGain.gain.setValueAtTime(0, ctx.currentTime);
    pulseMasterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 2.0); // fade in
    pulseMasterGain.connect(sfxNode);

    const bpm = 110;
    const interval = 60000 / bpm; // ms per beat

    function tick() {
      const chord = pulseChords[pulseChordIdx];
      if (!chord) return;

      const loud = (pulsebeat % 3) === 0; // 1 loud, 2 soft pattern in 3s

      // Play high notes (harmony)
      const hOct = chord.highOctave != null ? chord.highOctave : 0;
      for (const semi of chord.high) {
        playPulseNote(freq(semi, hOct), loud);
      }

      // Bass every 12 beats
      if (pulsebeat % 12 === 0 && chord.bass != null) {
        const bOct = chord.bassOctave != null ? chord.bassOctave : -1;
        playPulseBass(freq(chord.bass, bOct));
      }

      pulsebeat++;
      // Advance chord every 12 beats
      if (pulsebeat % 12 === 0 && pulseChordIdx < pulseChords.length - 1) {
        pulseChordIdx++;
      }
    }

    tick(); // first beat immediately
    pulseInterval = setInterval(tick, interval);
  }

  // Change the chord progression mid-pulse
  function pulseSetChords(chords) {
    pulseChords = chords;
    pulseChordIdx = 0;
    pulsebeat = 0;
  }

  function pulseClear() {
    if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null; }
    if (pulseMasterGain) {
      pulseMasterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        try { pulseMasterGain.disconnect(); } catch(e) {}
        pulseMasterGain = null;
      }, 2000);
    }
    pulseChords = null;
    pulsebeat = 0;
    pulseChordIdx = 0;
  }

  function setDroneVol(v) { droneVol = v; }

  async function resume() {
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state === 'closed') {
      initialized = false;
      await init();
    }
  }

  // Force resume — close old context and re-init fresh (for repeated tab returns)
  async function forceResume() {
    if (ctx) {
      try {
        if (ctx.state !== 'closed') await ctx.close();
      } catch(e) {}
    }
    initialized = false;
    await init();
  }

  return {
    init, play, melody, playNote, playMelody, startWaves, stopWaves, setDroneVol, mute, unmute, resume, forceResume, freq, DEG,
    sfxText, sfxTool, sfxError, sfxLog, sfxAlert, sfxBanner, sfxSearch, sfxConfirm, sfxBirthday,
    sfxKeyclick, sfxKeyclickSoft, sfxKeyclickLoud, sfxShimmerStart, sfxShimmerStop,
    pulseStart, pulseSetChords, pulseClear
  };
})();
