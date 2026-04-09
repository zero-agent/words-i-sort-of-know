// Violin using the stock pm.violin_ui_MIDI with improved body EQ
// The stock model exposes all params properly via its own UI hierarchy.
// We post-process with a gentler body resonance to reduce honkiness.
import("stdfaust.lib");

brightness = hslider("h:body/brightness", 0.5, 0, 1, 0.01);

// The stock violin model with full MIDI-style controls
rawViolin = pm.violin_ui_MIDI;

// Tame the 500Hz honk from the stock body, add warmth
bodyEQ(x) = x : fi.peak_eq(-8, 500, 200)     // cut the honky 500Hz resonance
              : fi.peak_eq(3, 280, 150)        // boost air resonance warmth
              : fi.peak_eq(2, 1200, 300)       // gentle bridge hill presence
              : fi.peak_eq(brightness * 4, 2800, 400) // brightness control
              : fi.lowpass(2, 4000 + brightness * 4000); // overall top-end control

process = rawViolin : bodyEQ;
