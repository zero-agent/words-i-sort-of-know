// Score config: Regression Transition
// Starts at "squiggly numbers keep getting bigger" (~150.5s in scene timeline).
// LPF ramps from nearly closed to moderate — sawtooth sounds great dark,
// harsh when fully open, so we cap it.
// Composed transition (0-21s) → driving G#1 pulse with pitch-bend slides
//   → Inference.1 themes cycling over steady held-root eighth-note pulse
// 138 BPM, 3/4 time, G# minor. Runs ~280s to cover all of Regression.1.
// JSON: regression-transition_2026-04-09T0457.json

const ScoreRegressionTransition = {
  url: 'regression-transition_2026-04-09T0457.json',

  volume: 0.12,
  lpfQ: 1.2,

  // Instruments — sawtooth-forward, capped by LPF to stay warm
  instruments: [
    { type: 'sawtooth', gain: 1.0 },                              // main — raw harmonic drive
    { type: 'sawtooth', gain: 0.35, detuneCents: 7.0 },           // detuned — thick chorus
    { type: 'sine',     gain: 0.4, freqMultiplier: 0.5, attackMultiplier: 1.1 },  // sub — weight
    { type: 'triangle', gain: 0.25 },                              // triangle — rounds the top
  ],

  // Attack — moderate opening, snappy once the pulse kicks in
  attack: [
    { until: 15,  value: 1.0 },                    // composed section: moderate swell
    { until: 22,  value: 0.12, rampFrom: 15 },     // tighten into the pulse
    { until: 999, value: 0.12 },                    // driving: very snappy
  ],

  // Dry gain — builds steadily
  dry: [
    { until: 10,  value: 0.10 },                   // start quiet
    { until: 40,  value: 0.40, rampFrom: 10 },     // build presence
    { until: 80,  value: 0.50, rampFrom: 40 },     // settle
    { until: 999, value: 0.50 },
  ],

  // Wet gain — starts heavy, dries out
  wet: [
    { until: 15,  value: 0.45 },                   // opening: reverby
    { until: 50,  value: 0.18, rampFrom: 15 },     // dry out
    { until: 999, value: 0.15 },                    // tight
  ],

  // Lowpass filter — ramps from muffled to warm, NOT to harsh
  // Sawtooth sounds great under 1800Hz, gets grating above that
  lpf: [
    { until: 0,   value: 150 },                    // starts nearly closed
    { until: 280, value: 1800, rampFrom: 0 },      // opens slowly, stays warm
    { until: 999, value: 1800 },
  ],
};
