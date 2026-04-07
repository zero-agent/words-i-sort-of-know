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

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  return { init, play, melody, playNote, playMelody, startWaves, stopWaves, resume, freq, DEG };
})();
