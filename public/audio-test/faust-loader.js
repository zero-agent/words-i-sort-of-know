// Lightweight Faust WASM loader for pre-compiled instruments
// Loads .wasm + .json, creates an AudioWorkletNode
// No full faustwasm compiler needed — just the runtime wrapper

const FaustLoader = (() => {

  // AudioWorklet processor code — runs in the worklet thread
  const processorCode = `
class FaustProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.dsp = null;
    this.HEAPF32 = null;
    this.outs = null;
    this.params = {};
    this.paramAddresses = {};
    this.running = false;

    const { wasmBytes, json } = options.processorOptions;
    this.init(wasmBytes, json);
  }

  async init(wasmBytes, jsonStr) {
    const json = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    const importObj = {
      env: {
        memory: new WebAssembly.Memory({ initial: Math.ceil(json.size / 65536) + 2 }),
        memoryBase: 0, tableBase: 0,
        _abs: Math.abs, _acos: Math.acos, _asin: Math.asin,
        _atan: Math.atan, _atan2: Math.atan2, _ceil: Math.ceil,
        _cos: Math.cos, _exp: Math.exp, _floor: Math.floor,
        _fmod: (x, y) => x % y, _log: Math.log, _log10: Math.log10,
        _max_: Math.max, _min_: Math.min, _pow: Math.pow,
        _remainder: (x, y) => x - Math.round(x / y) * y,
        _round: Math.round, _sin: Math.sin, _sqrt: Math.sqrt,
        _tan: Math.tan, _acosh: Math.acosh, _asinh: Math.asinh,
        _atanh: Math.atanh, _cosh: Math.cosh, _sinh: Math.sinh,
        _tanh: Math.tanh, _isnan: isNaN, _isinf: (x) => !isFinite(x),
        _copysign: (x, y) => Math.sign(y) * Math.abs(x),
        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
      }
    };

    try {
      const module = await WebAssembly.compile(wasmBytes);
      const instance = await WebAssembly.instantiate(module, importObj);
      const exports = instance.exports;
      this.HEAPF32 = new Float32Array(importObj.env.memory.buffer);

      // Faust WASM API
      const dsp = exports.newClassDsp(0);
      exports.init(dsp, sampleRate);
      this.dsp = dsp;
      this.exports = exports;

      // Get output buffer pointers
      const numOutputs = exports.getNumOutputs(dsp);
      this.outs = [];
      for (let i = 0; i < numOutputs; i++) {
        // Allocate output buffer
        const ptr = exports.malloc ? exports.malloc(128 * 4) : 0;
        this.outs.push(ptr);
      }

      // Parse UI to find parameter addresses
      this.parseUI(json.ui || []);

      this.running = true;
    } catch(e) {
      console.error('FaustProcessor init error:', e);
    }

    this.port.onmessage = (e) => {
      if (e.data.type === 'param') {
        this.setParam(e.data.path, e.data.value);
      }
    };
  }

  parseUI(ui) {
    for (const group of ui) {
      if (group.items) {
        for (const item of group.items) {
          if (item.type === 'hslider' || item.type === 'vslider' || item.type === 'button' || item.type === 'nentry') {
            this.paramAddresses[item.label] = item.address;
            // Set default
            if (item.init !== undefined) {
              this.setParamByIndex(item.index, item.init);
            }
          }
          if (item.items) this.parseUI([item]);
        }
      }
    }
  }

  setParam(path, value) {
    if (!this.exports || !this.dsp) return;
    // Try by address or by label
    const addr = this.paramAddresses[path] || path;
    this.exports.setParamValue(this.dsp, this.getParamIndex(path), value);
  }

  setParamByIndex(index, value) {
    if (!this.HEAPF32) return;
    this.HEAPF32[index >> 2] = value;
  }

  getParamIndex(path) {
    // In Faust WASM, param addresses are memory offsets
    // The JSON ui items have 'index' field
    return 0; // Will be set properly via port messages
  }

  process(inputs, outputs, parameters) {
    if (!this.running || !this.exports || !this.dsp) {
      return true;
    }

    const output = outputs[0];
    const bufferSize = output[0].length;

    try {
      this.exports.compute(this.dsp, bufferSize, 0, 0);

      // Copy from WASM memory to output
      // The output is written directly at the DSP memory location
      const numOutputs = this.exports.getNumOutputs(this.dsp);
      for (let ch = 0; ch < Math.min(numOutputs, output.length); ch++) {
        const outputPtr = this.exports.getOutput(this.dsp, ch);
        const wasmOutput = this.HEAPF32.subarray(outputPtr >> 2, (outputPtr >> 2) + bufferSize);
        output[ch].set(wasmOutput);
      }
    } catch(e) {
      // Silent fail
    }

    return true;
  }
}

registerProcessor('faust-processor', FaustProcessor);
`;

  async function load(audioCtx, wasmUrl, jsonUrl) {
    // Load WASM bytes and JSON metadata
    const [wasmResp, jsonResp] = await Promise.all([
      fetch(wasmUrl), fetch(jsonUrl)
    ]);
    const wasmBytes = await wasmResp.arrayBuffer();
    const json = await jsonResp.json();

    // Register the worklet processor
    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    await audioCtx.audioWorklet.addModule(blobUrl);
    URL.revokeObjectURL(blobUrl);

    // Create the node
    const node = new AudioWorkletNode(audioCtx, 'faust-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: {
        wasmBytes: new Uint8Array(wasmBytes),
        json: JSON.stringify(json)
      }
    });

    // Attach a helper to set parameters
    node.setParam = (name, value) => {
      node.port.postMessage({ type: 'param', path: name, value });
    };

    // Convenience: trigger a note
    node.noteOn = (freq, gain = 0.5, damping = 0.4) => {
      node.setParam('freq', freq);
      node.setParam('gain', gain);
      node.setParam('damping', damping);
      node.setParam('gate', 1);
      // Auto gate-off after a short pulse
      setTimeout(() => node.setParam('gate', 0), 30);
    };

    return { node, json };
  }

  return { load };
})();
