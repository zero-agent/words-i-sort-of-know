// Score config: Inference.1
// Gradual dreamy → awake transition starting at "bad dreams" (~32s),
// completing around the awake mode reset (~80s).
// G#-minor / C#-minor tonality.
// JSON: inference-1_2026-04-09T0009.json

const ScoreInference1 = {
  url: 'inference-1_2026-04-09T0009.json',

  volume: 0.10,
  lpfQ: 0.7,
  fadeOut: 2,       // fade to silence over last 2 seconds

  // Per-note instrument mapping (by instrument index from composer)
  // Notes with instrument:0 use the default oscillator layers below
  // Notes with instrument:1 use WAF cello samples
  noteInstruments: {
    1: { type: 'waf-cello', gain: 0.24 }   // atmospheric, sit well behind the oscillators
  },

  // Default oscillator layers for instrument 0 — each note spawns one of each
  instruments: [
    { type: 'triangle', gain: 1.0 },                              // main — warm body
    { type: 'triangle', gain: 0.4, detuneCents: 5.2 },            // detuned — chorus width
    { type: 'sine',     gain: 0.3, freqMultiplier: 0.5, attackMultiplier: 1.2 },  // sub — bass weight
    { type: 'sawtooth', gain: 0.15 },                              // saw — harmonic edge
  ],

  // Attack envelope (seconds) — per-note swell time
  // Starts transitioning at "bad dreams" (32s), fully awake by 80s
  attack: [
    { until: 32,  value: 2.0 },                    // dreamy: long swell
    { until: 80,  value: 0.25, rampFrom: 32 },     // long gradual transition
    { until: 999, value: 0.25 },                    // awake: snappy
  ],

  // Dry gain (direct passthrough)
  dry: [
    { until: 32,  value: 0.15 },                   // dreamy: mostly reverb
    { until: 80,  value: 0.55, rampFrom: 32 },     // gradually more presence
    { until: 999, value: 0.55 },                    // awake: clear
  ],

  // Wet gain (reverb send)
  wet: [
    { until: 32,  value: 0.50 },                   // dreamy: heavy reverb
    { until: 80,  value: 0.20, rampFrom: 32 },     // slowly pull back reverb
    { until: 999, value: 0.20 },                    // awake: subtle space
  ],

  // Lowpass filter cutoff (Hz)
  lpf: [
    { until: 32,  value: 500 },                    // dreamy: dark
    { until: 80,  value: 2400, rampFrom: 32 },     // gradually open up
    { until: 999, value: 2400 },                    // awake: bright
  ],
};
