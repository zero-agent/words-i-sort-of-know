// Score Engine — generic player for pitch-timeline JSON compositions
// Takes an AudioContext, output nodes, and a score config object.
// Each score config defines instruments, mix phases, and automation.

const ScoreEngine = (() => {
  let ctx = null;
  let scoreData = null;
  let scoreConfig = null;
  let scoreStartTime = 0;
  let scoreScheduledUpTo = 0;
  let scoreTimer = null;
  let scoreVoices = [];
  let scoreGain = null;
  let scoreDryGain = null;
  let scoreWetGain = null;
  let scoreLpf = null;
  // Stored references for routing
  let _masterGain = null;
  let _convolver = null;

  // ─── Pitch bend ──────────────────────────────────────────────────
  function bendAtSec(sec) {
    if (!scoreData || !scoreData.pitchBend || scoreData.pitchBend.length === 0) return 0;
    const pts = scoreData.pitchBend;
    if (sec <= pts[0].seconds) return pts[0].seconds === 0 ? pts[0].cents : 0;
    if (sec >= pts[pts.length - 1].seconds) return pts[pts.length - 1].cents;
    for (let i = 0; i < pts.length - 1; i++) {
      if (sec >= pts[i].seconds && sec <= pts[i + 1].seconds) {
        const t = (sec - pts[i].seconds) / (pts[i + 1].seconds - pts[i].seconds);
        return pts[i].cents + t * (pts[i + 1].cents - pts[i].cents);
      }
    }
    return 0;
  }

  function bendSegments(startSec, endSec) {
    const segs = [{ sec: startSec, cents: bendAtSec(startSec) }];
    if (scoreData && scoreData.pitchBend) {
      for (const p of scoreData.pitchBend) {
        if (p.seconds > startSec && p.seconds < endSec) {
          segs.push({ sec: p.seconds, cents: p.cents });
        }
      }
    }
    segs.push({ sec: endSec, cents: bendAtSec(endSec) });
    return segs;
  }

  function applyBend(osc, noteStartSec, noteDurSec, when) {
    const segs = bendSegments(noteStartSec, noteStartSec + noteDurSec);
    for (let i = 0; i < segs.length; i++) {
      const t = when + (segs[i].sec - noteStartSec);
      if (i === 0) {
        osc.detune.setValueAtTime(segs[i].cents, when);
      } else {
        osc.detune.linearRampToValueAtTime(segs[i].cents, t);
      }
    }
  }

  // ─── Phase interpolation ─────────────────────────────────────────
  // Interpolates a parameter across phases based on note start time.
  // phases: [{ until: sec, value: X }, ...] — last entry covers the rest.
  function phaseValue(phases, sec) {
    if (!phases || phases.length === 0) return 0;
    // Find which phase we're in or transitioning between
    for (let i = 0; i < phases.length; i++) {
      if (sec < phases[i].until) {
        if (i === 0 || !phases[i].rampFrom) return phases[i].value;
        // Ramp from previous phase
        const prev = phases[i - 1];
        const rampStart = phases[i].rampFrom;
        if (sec <= rampStart) return prev.value;
        const t = (sec - rampStart) / (phases[i].until - rampStart);
        return prev.value + (phases[i].value - prev.value) * Math.min(1, Math.max(0, t));
      }
    }
    return phases[phases.length - 1].value;
  }

  // ─── Note scheduling ─────────────────────────────────────────────
  function scheduleNote(note, when) {
    if (!ctx || !scoreGain || !scoreConfig) return;
    const noteFreq = 440 * Math.pow(2, (note.pitch - 69) / 12);
    const dur = note.durationSeconds;
    const vel = note.velocity || 0.8;
    const sec = note.startSeconds;
    const cfg = scoreConfig;

    const attack = phaseValue(cfg.attack, sec);
    const volume = cfg.volume || 0.10;
    const peak = vel * volume * (noteFreq > 200 ? 0.5 : 1.2);

    const oscs = [];
    const envs = [];

    // Create oscillators from instrument config
    for (const inst of cfg.instruments) {
      const osc = ctx.createOscillator();
      osc.type = inst.type;
      const freqMul = inst.freqMultiplier || 1;
      const detuneCents = inst.detuneCents || 0;
      osc.frequency.setValueAtTime(noteFreq * freqMul, when);
      if (detuneCents) osc.detune.setValueAtTime(detuneCents, when);
      if (note.bendActive !== false) applyBend(osc, sec, dur, when);

      const env = ctx.createGain();
      const instPeak = peak * (inst.gain || 1);
      const instAttack = attack * (inst.attackMultiplier || 1);
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(instPeak, when + Math.min(instAttack, dur * 0.6));
      const decayStart = when + dur * 0.8;
      if (decayStart > when + instAttack) {
        env.gain.setValueAtTime(instPeak, decayStart);
      }
      env.gain.exponentialRampToValueAtTime(0.001, when + dur + instAttack * 0.5);

      osc.connect(env);
      env.connect(scoreGain);
      oscs.push(osc);
      envs.push(env);
    }

    const stopAt = when + dur + attack + 0.5;
    for (const osc of oscs) { osc.start(when); osc.stop(stopAt); }

    scoreVoices.push({ oscs, envs, endTime: stopAt });
  }

  // ─── Scheduler ───────────────────────────────────────────────────
  function tick() {
    if (!scoreData || !ctx) return;
    const now = ctx.currentTime;
    const elapsed = now - scoreStartTime;
    const lookAhead = 0.2;

    scoreVoices = scoreVoices.filter(v => v.endTime > now);

    for (const note of scoreData.notes) {
      const noteSec = note.startSeconds;
      if (noteSec >= scoreScheduledUpTo && noteSec < elapsed + lookAhead) {
        const when = scoreStartTime + noteSec;
        if (when >= now - 0.05) {
          scheduleNote(note, Math.max(when, now));
        }
      }
    }
    scoreScheduledUpTo = elapsed + lookAhead;

    if (elapsed > scoreData.project.durationSeconds + 5) {
      stop();
    }
  }

  // ─── Start / Stop ────────────────────────────────────────────────
  async function start(audioCtx, masterGain, convolver, jsonUrl, config) {
    ctx = audioCtx;
    _masterGain = masterGain;
    _convolver = convolver;
    scoreConfig = config;

    try {
      const resp = await fetch(jsonUrl);
      scoreData = await resp.json();
    } catch (e) {
      console.error('Score load failed:', e);
      return;
    }

    // Build signal chain
    scoreGain = ctx.createGain();
    scoreGain.gain.value = 1;

    scoreLpf = ctx.createBiquadFilter();
    scoreLpf.type = 'lowpass';
    scoreLpf.Q.value = config.lpfQ || 0.7;

    scoreDryGain = ctx.createGain();
    scoreWetGain = ctx.createGain();

    // scoreGain → scoreLpf → dry → masterGain
    //                       → wet → convolver
    scoreGain.connect(scoreLpf);
    scoreLpf.connect(scoreDryGain);
    scoreLpf.connect(scoreWetGain);
    scoreDryGain.connect(_masterGain);
    scoreWetGain.connect(_convolver);

    // Schedule mix automation from config phases
    const t0 = ctx.currentTime;
    scheduleMixAutomation(t0, config);

    // Schedule fadeout if configured
    if (config.fadeOut && scoreData.project.durationSeconds) {
      const fadeStart = t0 + scoreData.project.durationSeconds - config.fadeOut;
      const fadeEnd = t0 + scoreData.project.durationSeconds;
      scoreGain.gain.setValueAtTime(1, fadeStart);
      scoreGain.gain.linearRampToValueAtTime(0, fadeEnd);
    }

    scoreStartTime = t0;
    scoreScheduledUpTo = -1;

    tick();
    scoreTimer = setInterval(tick, 50);
    console.log(`Score started: ${scoreData.notes.length} notes, ${scoreData.project.durationSeconds}s, ${config.instruments.length} instruments`);
  }

  function scheduleMixAutomation(t0, config) {
    // Schedule piecewise-linear automation for dry, wet, and LPF
    // Each phase: { until, value, rampFrom? }
    function scheduleParam(param, phases) {
      if (!phases || phases.length === 0) return;
      param.setValueAtTime(phases[0].value, t0);
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        const tEnd = t0 + p.until;
        if (p.rampFrom != null) {
          // Hold previous value until rampFrom, then ramp
          const prev = i > 0 ? phases[i - 1].value : p.value;
          param.setValueAtTime(prev, t0 + p.rampFrom);
          param.linearRampToValueAtTime(p.value, tEnd);
        } else {
          param.setValueAtTime(p.value, tEnd);
        }
      }
    }

    scheduleParam(scoreDryGain.gain, config.dry);
    scheduleParam(scoreWetGain.gain, config.wet);
    scheduleParam(scoreLpf.frequency, config.lpf);
  }

  function stop() {
    if (scoreTimer) { clearInterval(scoreTimer); scoreTimer = null; }
    const now = ctx ? ctx.currentTime : 0;
    for (const v of scoreVoices) {
      try {
        for (const env of v.envs) {
          env.gain.cancelScheduledValues(now);
          env.gain.setValueAtTime(0, now);
        }
        for (const osc of v.oscs) osc.stop(now + 0.01);
      } catch (e) {}
    }
    scoreVoices = [];
    scoreData = null;
    scoreConfig = null;
  }

  return { start, stop };
})();
