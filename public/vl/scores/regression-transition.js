// Score config: Regression Transition 1.1
// Starts at "squiggly numbers keep getting bigger" (~150.5s in scene timeline).
// LPF ramps from nearly closed to warm across the piece.
// 138 BPM, 3/4 time, G# minor.
// JSON: regression-transition_2026-04-09T0457.json

const ScoreRegressionTransition = {
  url: 'regression-transition_2026-04-09T0457.json',

  volume: 0.108,
  lpfQ: 1.2,

  // Per-note instrument mapping (by instrument index from composer)
  // 0 = triangle oscillator layers (default, uses instruments[] below)
  // 1 = violin samples (bass/melody)
  // 2 = strings samples (chords)
  // 3 = piano samples
  noteInstruments: {
    1: { type: 'waf-violin', gain: 0.35 },
    2: { type: 'waf-strings', gain: 0.30 },
    3: { type: 'waf-piano', gain: 0.40 },
  },

  // Default oscillator layers for instrument 0
  instruments: [
    { type: 'sawtooth', gain: 1.0 },
    { type: 'sawtooth', gain: 0.35, detuneCents: 7.0 },
    { type: 'sine',     gain: 0.4, freqMultiplier: 0.5, attackMultiplier: 1.1 },
    { type: 'triangle', gain: 0.25 },
  ],

  // Attack — moderate at start, snappy once the pulse kicks in
  attack: [
    { until: 15,  value: 1.0 },
    { until: 22,  value: 0.12, rampFrom: 15 },
    { until: 999, value: 0.12 },
  ],

  // Dry gain — builds to 90% by the end
  dry: [
    { until: 10,  value: 0.10 },
    { until: 40,  value: 0.40, rampFrom: 10 },
    { until: 80,  value: 0.60, rampFrom: 40 },
    { until: 200, value: 0.90, rampFrom: 80 },
    { until: 999, value: 0.90 },
  ],

  // Wet gain — starts heavy, dries out to nearly nothing
  wet: [
    { until: 8,   value: 0.40 },
    { until: 22,  value: 0.10, rampFrom: 8 },
    { until: 80,  value: 0.05, rampFrom: 22 },
    { until: 200, value: 0.02, rampFrom: 80 },
    { until: 999, value: 0.02 },
  ],

  // Lowpass filter — ramps from muffled to warm
  lpf: [
    { until: 0,   value: 150 },
    { until: 280, value: 1800, rampFrom: 0 },
    { until: 999, value: 1800 },
  ],
};
