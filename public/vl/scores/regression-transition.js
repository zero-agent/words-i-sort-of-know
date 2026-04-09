// Score config: Regression Transition
// Starts at "squiggly numbers keep getting bigger" (~150.5s in scene timeline).
// LPF ramps from nearly closed to full bore over the entire piece.
// Composed transition → generated driving riff with Inference.1 themes.
// 138 BPM, 3/4 time, G# minor.
// JSON: regression-transition_2026-04-09T0457.json

const ScoreRegressionTransition = {
  url: 'regression-transition_2026-04-09T0457.json',

  volume: 0.12,
  lpfQ: 1.0,

  // Instruments — same palette as Inference.1 but slightly more aggressive
  instruments: [
    { type: 'triangle', gain: 1.0 },                              // main — warm body
    { type: 'triangle', gain: 0.45, detuneCents: 6.0 },           // detuned — wider chorus
    { type: 'sine',     gain: 0.35, freqMultiplier: 0.5, attackMultiplier: 1.1 },  // sub — heavier bass
    { type: 'sawtooth', gain: 0.20 },                              // saw — more edge for the drive
  ],

  // Attack — starts moderate, gets snappy as the riff kicks in
  attack: [
    { until: 10,  value: 1.2 },                    // opening: still somewhat dreamy
    { until: 22,  value: 0.3, rampFrom: 10 },      // transition into riff
    { until: 999, value: 0.15 },                    // riff: very snappy, driving
  ],

  // Dry gain — starts low, ramps to full presence
  dry: [
    { until: 5,   value: 0.10 },                   // start quiet
    { until: 22,  value: 0.45, rampFrom: 5 },      // build through transition
    { until: 999, value: 0.60 },                    // riff: loud and present
  ],

  // Wet gain — heavy reverb that gradually pulls back
  wet: [
    { until: 10,  value: 0.50 },                   // opening: reverby
    { until: 30,  value: 0.20, rampFrom: 10 },     // gradually dry out
    { until: 999, value: 0.15 },                    // riff: tight, minimal verb
  ],

  // Lowpass filter — THE key automation: ramps from nothing to full bore
  lpf: [
    { until: 0,   value: 200 },                    // starts nearly closed
    { until: 48,  value: 4000, rampFrom: 0 },      // opens across the entire piece
    { until: 999, value: 4000 },                    // full bore
  ],
};
