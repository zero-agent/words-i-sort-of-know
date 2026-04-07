// Audio engine for "words i sort of know"
// Drone motif + wave generator, triggered by scene events

const vlAudio = (() => {
  let ctx, sourceNode, masterGain, convolver, lpf;
  let initialized = false;
  let stopWavesFn = null;

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
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;

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

    sourceNode = ctx.createGain();
    sourceNode.gain.value = 1;
    sourceNode.connect(lpf);
    lpf.connect(dryGain);
    lpf.connect(convolver);

    initialized = true;
  }

  function playNote(noteFreq, slideToFreq, harmonicOverride, iteration) {
    if (!initialized) return;
    const dur = 3.5;
    const rampUp = 2.2;
    const vol = noteFreq > 200 ? 0.5 : 1.6;
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

  // Soft ding for tool calls — triangle ping on the 5th (G4)
  function sfxTool() {
    if (!initialized) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(7, 1); // G4
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.04, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(e); e.connect(sourceNode);
    o.start(t); o.stop(t + 0.8);
  }

  // Soft blip for log lines — higher, shorter, on the 3rd (Eb5)
  function sfxLog() {
    if (!initialized) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(3, 2); // Eb5
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.025, t + 0.005);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(e); e.connect(sourceNode);
    o.start(t); o.stop(t + 0.5);
  }

  // Alert/pager ping — two-tone on the 6th (Ab4) then 7th (Bb4), sharper
  function sfxAlert() {
    if (!initialized) return;
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq(8, 1); // Ab4
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq(10, 1); // Bb4
    const e1 = ctx.createGain();
    e1.gain.setValueAtTime(0, t);
    e1.gain.linearRampToValueAtTime(0.05, t + 0.008);
    e1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    const e2 = ctx.createGain();
    e2.gain.setValueAtTime(0, t + 0.12);
    e2.gain.linearRampToValueAtTime(0.04, t + 0.13);
    e2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o1.connect(e1); e1.connect(sourceNode);
    o2.connect(e2); e2.connect(sourceNode);
    o1.start(t); o1.stop(t + 0.4);
    o2.start(t + 0.12); o2.stop(t + 0.6);
  }

  // Banner/system event — low warm tone on root (C3)
  function sfxBanner() {
    if (!initialized) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq(0, 0); // C3
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.05, t + 0.02);
    e.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    o.connect(e); e.connect(sourceNode);
    o.start(t); o.stop(t + 1.2);
  }

  // Search blip — descending two-note on 5th→3rd (G4→Eb4)
  function sfxSearch() {
    if (!initialized) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq(7, 1), t); // G4
    o.frequency.exponentialRampToValueAtTime(freq(3, 1), t + 0.15); // → Eb4
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.035, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(e); e.connect(sourceNode);
    o.start(t); o.stop(t + 0.7);
  }

  // Confirm ding — bright, on the root (C5)
  function sfxConfirm() {
    if (!initialized) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq(0, 2); // C5
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.045, t + 0.008);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    o.connect(e); e.connect(sourceNode);
    o.start(t); o.stop(t + 1.0);
  }

  // Typing click — very short noise burst
  function sfxKeyclick() {
    if (!initialized) return;
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
    bp.frequency.value = 2000 + Math.random() * 1000; // slight variation
    bp.Q.value = 2;
    const e = ctx.createGain();
    e.gain.value = 0.08;
    src.connect(bp); bp.connect(e); e.connect(sourceNode);
    src.start(t);
  }

  // Shimmer/buzz for confirm wait — starts quiet, builds
  let shimmerStop = null;
  function sfxShimmerStart() {
    if (!initialized) return;
    const t = ctx.currentTime;
    // Low buzz using detuned oscillators
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = freq(0, 0); // C3
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = freq(0, 0) * 1.008; // slight detune = buzz
    // Filter to keep it dark
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(200, t);
    flt.frequency.linearRampToValueAtTime(800, t + 8); // opens over 8s
    flt.Q.value = 2;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.005, t);
    e.gain.linearRampToValueAtTime(0.12, t + 8); // builds over 8s
    o1.connect(flt); o2.connect(flt);
    flt.connect(e); e.connect(sourceNode);
    o1.start(t); o2.start(t);
    shimmerStop = () => {
      e.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => { try { o1.stop(); o2.stop(); } catch(e) {} }, 500);
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
    if (!initialized) return;
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
    if (!initialized) return;
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
    if (!initialized) return;

    pulseChords = chords;
    pulseChordIdx = 0;
    pulsebeat = 0;

    // Dedicated gain for the pulse so we can fade it
    pulseMasterGain = ctx.createGain();
    pulseMasterGain.gain.setValueAtTime(0, ctx.currentTime);
    pulseMasterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 2.0); // fade in
    pulseMasterGain.connect(sourceNode);

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

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  return {
    init, play, melody, playNote, playMelody, startWaves, stopWaves, resume, freq, DEG,
    sfxTool, sfxLog, sfxAlert, sfxBanner, sfxSearch, sfxConfirm,
    sfxKeyclick, sfxShimmerStart, sfxShimmerStop,
    pulseStart, pulseSetChords, pulseClear
  };
})();
