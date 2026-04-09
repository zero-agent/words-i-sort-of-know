// Score config: Inference.1
// Dreamy → awake transition at ~75s. G#-minor / C#-minor tonality.
// JSON: inference-1_2026-04-09T0009.json

const ScoreInference1 = {
  url: 'inference-1_2026-04-09T0009.json',

  volume: 0.10,
  lpfQ: 0.7,

  // Instruments — each note spawns one of each
  instruments: [
    { type: 'triangle', gain: 1.0 },                              // main — warm body
    { type: 'triangle', gain: 0.4, detuneCents: 5.2 },            // detuned — chorus width
    { type: 'sine',     gain: 0.3, freqMultiplier: 0.5, attackMultiplier: 1.2 },  // sub — bass weight
    { type: 'sawtooth', gain: 0.15 },                              // saw — harmonic edge
  ],

  // Attack envelope (seconds) — per-note swell time
  // Phases: dreamy = slow swell, awake = punchy
  attack: [
    { until: 65,  value: 2.0 },                    // dreamy: long swell
    { until: 80,  value: 0.25, rampFrom: 65 },     // transition
    { until: 999, value: 0.25 },                    // awake: snappy
  ],

  // Dry gain (direct passthrough)
  dry: [
    { until: 65,  value: 0.15 },                   // dreamy: mostly reverb
    { until: 80,  value: 0.55, rampFrom: 65 },     // ramp up presence
    { until: 999, value: 0.55 },                    // awake: clear
  ],

  // Wet gain (reverb send)
  wet: [
    { until: 65,  value: 0.50 },                   // dreamy: heavy reverb
    { until: 80,  value: 0.20, rampFrom: 65 },     // pull back reverb
    { until: 999, value: 0.20 },                    // awake: subtle space
  ],

  // Lowpass filter cutoff (Hz)
  lpf: [
    { until: 65,  value: 500 },                    // dreamy: dark
    { until: 80,  value: 2400, rampFrom: 65 },     // open up
    { until: 999, value: 2400 },                    // awake: bright
  ],
};
