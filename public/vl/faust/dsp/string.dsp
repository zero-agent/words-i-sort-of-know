// String instrument model — pluck + bowed sustain
// Gate=1 continuously feeds energy into the string (bowed mode)
// Short gate pulse = pluck (noise burst exciter)
import("stdfaust.lib");

freq = hslider("freq [unit:Hz]", 220, 20, 4000, 0.01);
gain = hslider("gain", 0.5, 0, 1, 0.001);
gate = button("gate");

// Damping controls brightness decay (0 = bright, 1 = muted)
damping = hslider("damping", 0.4, 0, 0.99, 0.001);

// Bow pressure: how much continuous energy feeds in while gate is held
bowPressure = hslider("bowPressure", 0.3, 0, 1, 0.001);

// Exciter: noise burst on gate onset + continuous bow friction while held
pluckBurst = no.noise * en.ar(0.001, 0.012, gate);
bowFriction = no.noise * gate * bowPressure * 0.15;
exciter = pluckBurst + bowFriction;

// Karplus-Strong: delay line with filtered feedback
delay_samples = ma.SR / freq;
string_loop = + ~ (de.fdelay(4096, delay_samples - 1) : fi.lowpass(1, freq * (4 - 3*damping)));

process = exciter : string_loop * gain;
