// Physically-modeled violin using Faust's physmodels library
// Wraps pm.violinModel with simple controllable parameters
import("stdfaust.lib");

freq = hslider("freq [unit:Hz]", 440, 50, 2000, 0.01);
gain = hslider("gain", 0.5, 0, 1, 0.001);
gate = button("gate");

// Bow controls
bowPressure = hslider("bowPressure", 0.5, 0, 1, 0.001);
bowPosition = hslider("bowPosition", 0.7, 0, 1, 0.001);

// Vibrato
vibratoFreq = hslider("vibratoFreq", 5, 0, 10, 0.01);
vibratoGain = hslider("vibratoGain", 0.3, 0, 1, 0.01) * 0.01;

// Convert freq to string length for the physical model
stringLength = freq : pm.f2l;

// Envelope: smooth gate for natural attack/release
envelope = gate * gain : si.smooth(ba.tau2pole(0.002));

// Vibrato modulation
vibrato = 1 + os.osc(vibratoFreq) * vibratoGain * envelope;
effFreq = freq * vibrato;
effStringLength = effFreq : pm.f2l;

// Bow velocity follows the envelope
bowVel = envelope;

// The physical model
process = pm.violinModel(effStringLength, bowPressure, bowVel, bowPosition) * gain;
