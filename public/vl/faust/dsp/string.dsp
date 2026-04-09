// Karplus-Strong inspired string model
// Simple but musical — plucked string with controllable decay and brightness
import("stdfaust.lib");

freq = hslider("freq [unit:Hz]", 220, 20, 4000, 0.01);
gain = hslider("gain", 0.5, 0, 1, 0.001);
gate = button("gate");

// Damping controls brightness decay (0 = bright, 1 = muted)
damping = hslider("damping", 0.4, 0, 0.99, 0.001);

// Exciter: short noise burst on gate
exciter = no.noise * en.ar(0.001, 0.01, gate);

// Karplus-Strong: delay line with filtered feedback
delay_samples = ma.SR / freq;
string_loop = + ~ (de.fdelay(4096, delay_samples - 1) : fi.lowpass(1, freq * (4 - 3*damping)));

process = exciter : string_loop * gain;
