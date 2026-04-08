// Pitch Timeline — Compose App (Vanilla JS, Canvas-based piano roll)
'use strict';

// ─── Constants ───────────────────────────────────────────────────────
const PPQ = 480;
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ACCENT_COLOR = '#4fc3f7';
const ACCENT_BRIGHT = '#81d4fa';
const BEND_COLOR = '#ff7043';
const PLAYHEAD_COLOR = '#ffeb3b';
const BG_COLOR = '#1a1a1e';
const GRID_COLOR = '#2a2a2e';
const MEASURE_COLOR = '#3a3a3e';
const KEY_BLACK = '#222';
const KEY_WHITE = '#888';
const RESIZE_HANDLE_W = 8;

// ─── State ───────────────────────────────────────────────────────────
let project = createNewProject();
let selectedNoteId = null;
let selectedBendId = null;
let hZoom = 64;   // px per beat
let vZoom = 18;   // px per semitone row
let scrollX = 0;  // px
let scrollY = 0;  // px
let voiceType = 'triangle';

// Undo
let undoStack = [];
let redoStack = [];

// Transport
let audioCtx = null;
let masterGain = null;
let isPlaying = false;
let playStartAudioTime = 0;
let playStartTick = 0;
let schedulerTimer = null;
let scheduledUpTo = 0;
let activeVoices = [];
let rafId = null;

// Drag state
let dragMode = null; // 'move','resize','bend','pan',null
let dragTarget = null;
let dragStartX = 0, dragStartY = 0;
let dragOrigTick = 0, dragOrigPitch = 0, dragOrigDur = 0;
let dragOrigBendTick = 0, dragOrigBendCents = 0;

// Canvas refs
let gridCanvas, gridCtx, rulerCanvas, rulerCtx, pianoCanvas, pianoCtx, bendCanvas, bendCtx;

// ─── Helpers ─────────────────────────────────────────────────────────
function uuid() { return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pitchName(p) { return NOTE_NAMES[p % 12] + (Math.floor(p / 12) - 1); }
function pitchFreq(p) { return 440 * Math.pow(2, (p - 69) / 12); }
function tickToSec(tick) { return tick * 60 / (project.settings.tempoBpm * PPQ); }
function secToTick(s) { return s * project.settings.tempoBpm * PPQ / 60; }
function barLengthTicks() {
  const ts = project.settings.timeSignature;
  return ts.numerator * (4 / ts.denominator) * PPQ;
}
function snapTicks() { return PPQ * 4 / project.settings.snapDivisor; }
function snapTick(tick) { const s = snapTicks(); return Math.round(tick / s) * s; }
function totalTicks() { return barLengthTicks() * project.settings.totalBars; }

// Pitch range: show MIDI 36 (C2) to 96 (C7) = 60 semitones
const PITCH_MIN = 36, PITCH_MAX = 96, PITCH_RANGE = PITCH_MAX - PITCH_MIN;

function createNewProject(title) {
  return {
    schema: 'pitch-timeline/v1',
    id: uuid(),
    title: title || 'Untitled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      tempoBpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq: 480,
      bendRangeCents: 1200,
      totalBars: 8,
      snapDivisor: 16
    },
    notes: [],
    pitchBend: []
  };
}

// ─── Coordinate transforms ──────────────────────────────────────────
function tickToX(tick) { return (tick / PPQ) * hZoom - scrollX; }
function xToTick(x) { return ((x + scrollX) / hZoom) * PPQ; }
function pitchToY(pitch) { return (PITCH_MAX - pitch) * vZoom - scrollY; }
function yToPitch(y) { return PITCH_MAX - Math.floor((y + scrollY) / vZoom); }

// ─── IndexedDB ───────────────────────────────────────────────────────
let db = null;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pitch-timeline-db', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('projects', { keyPath: 'id' }); };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

let saveTimeout = null;
function autosave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    project.updatedAt = new Date().toISOString();
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').put({ id: project.id, title: project.title, updatedAt: project.updatedAt, project });
    document.getElementById('status-save').textContent = 'saved';
  }, 500);
  document.getElementById('status-save').textContent = 'saving...';
}

async function loadLatest() {
  const tx = db.transaction('projects', 'readonly');
  const store = tx.objectStore('projects');
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result;
      if (all.length > 0) {
        all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        resolve(all[0].project);
      } else resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

// ─── Undo / Redo ─────────────────────────────────────────────────────
function pushUndo() {
  undoStack.push(JSON.stringify({ notes: project.notes, pitchBend: project.pitchBend }));
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify({ notes: project.notes, pitchBend: project.pitchBend }));
  const s = JSON.parse(undoStack.pop());
  project.notes = s.notes; project.pitchBend = s.pitchBend;
  selectedNoteId = null; selectedBendId = null;
  autosave(); renderAll();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify({ notes: project.notes, pitchBend: project.pitchBend }));
  const s = JSON.parse(redoStack.pop());
  project.notes = s.notes; project.pitchBend = s.pitchBend;
  selectedNoteId = null; selectedBendId = null;
  autosave(); renderAll();
}

// ─── Pitch Bend helpers ──────────────────────────────────────────────
function getBendAtTick(tick) {
  const pts = project.pitchBend;
  if (!pts.length) return 0;
  if (tick <= pts[0].tick) return pts[0].tick === 0 ? pts[0].cents : 0;
  if (tick >= pts[pts.length-1].tick) return pts[pts.length-1].cents;
  for (let i = 0; i < pts.length - 1; i++) {
    if (tick >= pts[i].tick && tick <= pts[i+1].tick) {
      const t = (tick - pts[i].tick) / (pts[i+1].tick - pts[i].tick);
      return pts[i].cents + t * (pts[i+1].cents - pts[i].cents);
    }
  }
  return 0;
}

function getBendSegments(startTick, endTick) {
  const segs = [{ tick: startTick, cents: getBendAtTick(startTick) }];
  for (const p of project.pitchBend) {
    if (p.tick > startTick && p.tick < endTick) segs.push({ tick: p.tick, cents: p.cents });
  }
  segs.push({ tick: endTick, cents: getBendAtTick(endTick) });
  return segs;
}

// ─── Auto-extend project ────────────────────────────────────────────
function autoExtend() {
  const bl = barLengthTicks();
  let maxTick = 0;
  for (const n of project.notes) maxTick = Math.max(maxTick, n.startTick + n.durationTicks);
  for (const p of project.pitchBend) maxTick = Math.max(maxTick, p.tick);
  const neededBars = Math.ceil(maxTick / bl) + 1;
  if (neededBars > project.settings.totalBars) {
    project.settings.totalBars = neededBars;
  }
}

// ─── Rendering ───────────────────────────────────────────────────────
function renderAll() {
  renderPianoKeys();
  renderRuler();
  renderGrid();
  renderBend();
  updateStatus();
}

function renderPianoKeys() {
  const c = pianoCanvas, ctx = pianoCtx;
  const w = c.width / devicePixelRatio, h = c.height / devicePixelRatio;
  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.fillStyle = '#1e1e22';
  ctx.fillRect(0, 0, w, h);
  
  for (let p = PITCH_MIN; p <= PITCH_MAX; p++) {
    const y = pitchToY(p);
    const note = p % 12;
    const isBlack = [1,3,6,8,10].includes(note);
    if (y < -vZoom || y > h) continue;
    ctx.fillStyle = isBlack ? '#252528' : '#2e2e32';
    ctx.fillRect(0, y, w, vZoom - 1);
    
    if (note === 0) { // C
      ctx.fillStyle = '#888';
      ctx.font = '10px sans-serif';
      ctx.fillText(pitchName(p), 4, y + vZoom - 3);
    }
  }
  ctx.restore();
}

function renderRuler() {
  const c = rulerCanvas, ctx = rulerCtx;
  const w = c.width / devicePixelRatio, h = c.height / devicePixelRatio;
  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.fillStyle = '#222226';
  ctx.fillRect(0, 0, w, h);
  
  const bl = barLengthTicks();
  const beatTicks = PPQ;
  
  // Draw bar/beat markers
  for (let tick = 0; tick <= totalTicks(); tick += beatTicks) {
    const x = tickToX(tick);
    if (x < -10 || x > w + 10) continue;
    const isBar = tick % bl === 0;
    ctx.strokeStyle = isBar ? '#888' : '#555';
    ctx.lineWidth = isBar ? 1.5 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, isBar ? 0 : h * 0.6); ctx.lineTo(x, h); ctx.stroke();
    
    if (isBar) {
      const barNum = Math.floor(tick / bl) + 1;
      ctx.fillStyle = '#aaa';
      ctx.font = '13px sans-serif';
      ctx.fillText(String(barNum), x + 5, 20);
    }
  }
  
  // Playhead
  if (isPlaying || playheadTick() > 0) {
    const px = tickToX(playheadTick());
    ctx.strokeStyle = PLAYHEAD_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
  }
  ctx.restore();
}

function renderGrid() {
  const c = gridCanvas, ctx = gridCtx;
  const w = c.width / devicePixelRatio, h = c.height / devicePixelRatio;
  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);
  
  // Pitch rows
  for (let p = PITCH_MIN; p <= PITCH_MAX; p++) {
    const y = pitchToY(p);
    if (y < -vZoom || y > h) continue;
    const note = p % 12;
    const isBlack = [1,3,6,8,10].includes(note);
    ctx.fillStyle = isBlack ? '#1c1c20' : '#212125';
    ctx.fillRect(0, y, w, vZoom - 1);
    // C-line
    if (note === 0) {
      ctx.strokeStyle = '#3a3a3e';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, y + vZoom); ctx.lineTo(w, y + vZoom); ctx.stroke();
    }
  }
  
  // Vertical grid lines
  const bl = barLengthTicks();
  const snapT = snapTicks();
  for (let tick = 0; tick <= totalTicks(); tick += snapT) {
    const x = tickToX(tick);
    if (x < -1 || x > w + 1) continue;
    const isBar = tick % bl === 0;
    const isBeat = tick % PPQ === 0;
    ctx.strokeStyle = isBar ? MEASURE_COLOR : (isBeat ? '#2e2e32' : GRID_COLOR);
    ctx.lineWidth = isBar ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  
  // Notes
  for (const note of project.notes) {
    const x = tickToX(note.startTick);
    const y = pitchToY(note.pitch);
    const w2 = (note.durationTicks / PPQ) * hZoom;
    const sel = note.id === selectedNoteId;
    
    ctx.fillStyle = sel ? ACCENT_BRIGHT : ACCENT_COLOR;
    ctx.globalAlpha = note.velocity;
    ctx.fillRect(x, y, w2, vZoom - 1);
    ctx.globalAlpha = 1;
    
    if (sel) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w2, vZoom - 1);
    }
    
    // Resize handle
    ctx.fillStyle = sel ? '#fff' : '#3a8ec2';
    ctx.fillRect(x + w2 - RESIZE_HANDLE_W, y, RESIZE_HANDLE_W, vZoom - 1);
    
    // Label
    if (w2 > 30) {
      ctx.fillStyle = '#000';
      ctx.font = '10px sans-serif';
      ctx.fillText(pitchName(note.pitch), x + 3, y + vZoom - 4);
    }
  }
  
  // Playhead
  const phTick = playheadTick();
  if (isPlaying || phTick > 0) {
    const px = tickToX(phTick);
    ctx.strokeStyle = PLAYHEAD_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
  }
  
  ctx.restore();
}

function renderBend() {
  const c = bendCanvas, ctx = bendCtx;
  const w = c.width / devicePixelRatio, h = c.height / devicePixelRatio;
  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.fillStyle = '#181820';
  ctx.fillRect(0, 0, w, h);
  
  const midY = h / 2;
  const range = project.settings.bendRangeCents;
  
  // Center line
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();
  ctx.setLineDash([]);
  
  // Vertical grid
  const bl = barLengthTicks();
  for (let tick = 0; tick <= totalTicks(); tick += PPQ) {
    const x = tickToX(tick);
    if (x < -1 || x > w + 1) continue;
    const isBar = tick % bl === 0;
    ctx.strokeStyle = isBar ? '#333' : '#242428';
    ctx.lineWidth = isBar ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  
  // Bend line
  const pts = project.pitchBend;
  if (pts.length > 0) {
    ctx.strokeStyle = BEND_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // line from left to first point
    const firstY = midY - (pts[0].cents / range) * midY;
    ctx.moveTo(tickToX(0), pts[0].tick === 0 ? firstY : midY);
    if (pts[0].tick > 0) ctx.lineTo(tickToX(pts[0].tick), firstY);
    
    for (let i = 0; i < pts.length; i++) {
      const px = tickToX(pts[i].tick);
      const py = midY - (pts[i].cents / range) * midY;
      ctx.lineTo(px, py);
    }
    // extend to end
    const lastPt = pts[pts.length - 1];
    ctx.lineTo(tickToX(totalTicks()), midY - (lastPt.cents / range) * midY);
    ctx.stroke();
  }
  
  // Bend points
  for (const pt of pts) {
    const px = tickToX(pt.tick);
    const py = midY - (pt.cents / range) * midY;
    const sel = pt.id === selectedBendId;
    ctx.fillStyle = sel ? '#fff' : BEND_COLOR;
    ctx.beginPath();
    ctx.arc(px, py, sel ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = '#ffab91';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  // Playhead
  const phTick = playheadTick();
  if (isPlaying || phTick > 0) {
    const px = tickToX(phTick);
    ctx.strokeStyle = PLAYHEAD_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
  }
  
  ctx.restore();
}

function updateStatus() {
  const tick = playheadTick();
  const bl = barLengthTicks();
  const bar = Math.floor(tick / bl) + 1;
  const beatInBar = Math.floor((tick % bl) / PPQ) + 1;
  const tickInBeat = Math.floor(tick % PPQ);
  document.getElementById('status-pos').textContent = `${bar}:${beatInBar}:${String(tickInBeat).padStart(3, '0')}`;
  
  let sel = '';
  if (selectedNoteId) {
    const n = project.notes.find(n => n.id === selectedNoteId);
    if (n) sel = `Note: ${pitchName(n.pitch)} t:${n.startTick} d:${n.durationTicks}`;
  } else if (selectedBendId) {
    const b = project.pitchBend.find(b => b.id === selectedBendId);
    if (b) sel = `Bend: ${b.cents}¢ @ t:${b.tick}`;
  }
  document.getElementById('status-sel').textContent = sel;
}

// ─── Canvas sizing ───────────────────────────────────────────────────
function resizeCanvases() {
  const dpr = devicePixelRatio || 1;
  
  [gridCanvas, rulerCanvas, bendCanvas].forEach(c => {
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
  });
  
  const pianoRect = pianoCanvas.getBoundingClientRect();
  pianoCanvas.width = pianoRect.width * dpr;
  pianoCanvas.height = pianoRect.height * dpr;
  
  renderAll();
}

// ─── Playhead ────────────────────────────────────────────────────────
function playheadTick() {
  if (!isPlaying) return playStartTick;
  if (!audioCtx) return playStartTick;
  const elapsed = audioCtx.currentTime - playStartAudioTime;
  return playStartTick + secToTick(elapsed);
}

// ─── Audio Engine ────────────────────────────────────────────────────
async function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
}

function scheduleNote(note, when, dur) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  const vt = voiceType;
  if (vt === 'plucky') {
    osc.type = 'triangle';
  } else {
    osc.type = vt;
  }
  
  osc.frequency.value = pitchFreq(note.pitch);
  osc.connect(gain);
  gain.connect(masterGain);
  
  // Envelope
  gain.gain.setValueAtTime(0, when);
  if (vt === 'plucky') {
    // Fast attack, quick exponential decay
    gain.gain.linearRampToValueAtTime(note.velocity * 0.15, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, when + Math.min(dur, 0.3));
  } else {
    gain.gain.linearRampToValueAtTime(note.velocity * 0.15, when + 0.005);
    // Hold, then release
    const releaseStart = when + dur - 0.04;
    if (releaseStart > when + 0.005) {
      gain.gain.setValueAtTime(note.velocity * 0.15, releaseStart);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  }
  
  // Pitch bend automation
  const startTick = note.startTick;
  const endTick = note.startTick + note.durationTicks;
  const segs = getBendSegments(startTick, endTick);
  for (let i = 0; i < segs.length; i++) {
    const segTime = when + tickToSec(segs[i].tick - startTick);
    if (i === 0) {
      osc.detune.setValueAtTime(segs[i].cents, when);
    } else {
      osc.detune.linearRampToValueAtTime(segs[i].cents, segTime);
    }
  }
  
  osc.start(when);
  osc.stop(when + dur + 0.05);
  
  activeVoices.push({ osc, gain, endTime: when + dur + 0.05 });
}

async function startPlayback() {
  await ensureAudio();
  isPlaying = true;
  playStartAudioTime = audioCtx.currentTime;
  scheduledUpTo = playStartTick;
  
  document.getElementById('btn-play').textContent = '⏹';
  
  schedulerTimer = setInterval(schedulerTick, 25);
  rafLoop();
}

function stopPlayback() {
  isPlaying = false;
  playStartTick = playheadTick();
  if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  
  // Stop all voices
  const now = audioCtx ? audioCtx.currentTime : 0;
  for (const v of activeVoices) {
    try { v.gain.gain.cancelScheduledValues(now); v.gain.gain.setValueAtTime(0, now); v.osc.stop(now + 0.01); } catch(e) {}
  }
  activeVoices = [];
  
  document.getElementById('btn-play').textContent = '▶';
  renderAll();
}

function schedulerTick() {
  if (!isPlaying || !audioCtx) return;
  
  const now = audioCtx.currentTime;
  const lookAheadSec = 0.12;
  const lookAheadEnd = now + lookAheadSec;
  
  // Clean up finished voices
  activeVoices = activeVoices.filter(v => v.endTime > now);
  
  // Find notes to schedule
  const currentTick = playStartTick + secToTick(now - playStartAudioTime);
  const endTick = playStartTick + secToTick(lookAheadEnd - playStartAudioTime);
  
  for (const note of project.notes) {
    if (note.startTick >= scheduledUpTo && note.startTick < endTick) {
      const noteTimeSec = tickToSec(note.startTick - playStartTick);
      const when = playStartAudioTime + noteTimeSec;
      const dur = tickToSec(note.durationTicks);
      if (when >= now - 0.01) {
        scheduleNote(note, Math.max(when, now), dur);
      }
    }
  }
  
  scheduledUpTo = endTick;
  
  // End of project
  if (currentTick >= totalTicks()) {
    stopPlayback();
    playStartTick = 0;
    renderAll();
  }
}

function rafLoop() {
  if (!isPlaying) return;
  renderAll();
  rafId = requestAnimationFrame(rafLoop);
}

// ─── Grid Interaction ────────────────────────────────────────────────
function noteAt(x, y) {
  const tick = xToTick(x);
  const pitch = yToPitch(y);
  for (let i = project.notes.length - 1; i >= 0; i--) {
    const n = project.notes[i];
    if (n.pitch === pitch && tick >= n.startTick && tick <= n.startTick + n.durationTicks) {
      return n;
    }
  }
  return null;
}

function isOnResizeHandle(x, y, note) {
  const nx = tickToX(note.startTick);
  const nw = (note.durationTicks / PPQ) * hZoom;
  const rightEdge = nx + nw;
  return x >= rightEdge - RESIZE_HANDLE_W && x <= rightEdge + 2;
}

function setupGridEvents() {
  const el = gridCanvas;
  
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tick = xToTick(x);
    const pitch = yToPitch(y);
    
    const hit = noteAt(x, y);
    
    if (hit && isOnResizeHandle(x, y, hit)) {
      // Resize
      pushUndo();
      selectedNoteId = hit.id;
      selectedBendId = null;
      dragMode = 'resize';
      dragTarget = hit;
      dragStartX = x;
      dragOrigDur = hit.durationTicks;
      el.setPointerCapture(e.pointerId);
    } else if (hit) {
      // Move
      pushUndo();
      selectedNoteId = hit.id;
      selectedBendId = null;
      dragMode = 'move';
      dragTarget = hit;
      dragStartX = x; dragStartY = y;
      dragOrigTick = hit.startTick;
      dragOrigPitch = hit.pitch;
      el.setPointerCapture(e.pointerId);
    } else if (e.shiftKey || e.button === 1) {
      // Pan
      dragMode = 'pan';
      dragStartX = e.clientX; dragStartY = e.clientY;
      el.setPointerCapture(e.pointerId);
    } else {
      // Insert note
      const snapped = snapTick(tick);
      if (pitch >= PITCH_MIN && pitch <= PITCH_MAX && snapped >= 0) {
        pushUndo();
        const n = {
          id: uuid(),
          pitch: clamp(pitch, PITCH_MIN, PITCH_MAX),
          startTick: Math.max(0, snapped),
          durationTicks: snapTicks(),
          velocity: 0.8
        };
        project.notes.push(n);
        project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
        selectedNoteId = n.id;
        selectedBendId = null;
        autoExtend();
        autosave();
        // Preview
        previewNote(n);
      }
    }
    renderAll();
  });
  
  el.addEventListener('pointermove', (e) => {
    if (!dragMode) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (dragMode === 'move' && dragTarget) {
      const dx = x - dragStartX;
      const dy = y - dragStartY;
      const tickDelta = (dx / hZoom) * PPQ;
      const pitchDelta = -Math.round(dy / vZoom);
      dragTarget.startTick = Math.max(0, snapTick(dragOrigTick + tickDelta));
      dragTarget.pitch = clamp(dragOrigPitch + pitchDelta, PITCH_MIN, PITCH_MAX);
    } else if (dragMode === 'resize' && dragTarget) {
      const dx = x - dragStartX;
      const tickDelta = (dx / hZoom) * PPQ;
      dragTarget.durationTicks = Math.max(snapTicks(), snapTick(dragOrigDur + tickDelta));
    } else if (dragMode === 'pan') {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      scrollX = Math.max(0, scrollX - dx);
      scrollY = Math.max(0, scrollY - dy);
      dragStartX = e.clientX; dragStartY = e.clientY;
    }
    renderAll();
  });
  
  const pointerUp = () => {
    if (dragMode === 'move' || dragMode === 'resize') {
      autoExtend();
      autosave();
    }
    dragMode = null; dragTarget = null;
  };
  el.addEventListener('pointerup', pointerUp);
  el.addEventListener('pointercancel', pointerUp);
  
  // Wheel: scroll + zoom
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom horizontal
      hZoom = clamp(hZoom * (e.deltaY < 0 ? 1.15 : 0.87), 20, 240);
    } else if (e.shiftKey) {
      scrollX = Math.max(0, scrollX + e.deltaY);
    } else {
      scrollY = Math.max(0, scrollY + e.deltaY);
    }
    renderAll();
  }, { passive: false });
}

// ─── Bend Lane Interaction ───────────────────────────────────────────
function bendPointAt(x, y) {
  const c = bendCanvas;
  const h = c.height / devicePixelRatio;
  const midY = h / 2;
  const range = project.settings.bendRangeCents;
  
  for (let i = project.pitchBend.length - 1; i >= 0; i--) {
    const pt = project.pitchBend[i];
    const px = tickToX(pt.tick);
    const py = midY - (pt.cents / range) * midY;
    if (Math.abs(x - px) < 10 && Math.abs(y - py) < 10) return pt;
  }
  return null;
}

function setupBendEvents() {
  const el = bendCanvas;
  
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const h = rect.height;
    const midY = h / 2;
    const range = project.settings.bendRangeCents;
    
    const hit = bendPointAt(x, y);
    
    if (hit) {
      pushUndo();
      selectedBendId = hit.id;
      selectedNoteId = null;
      dragMode = 'bend';
      dragTarget = hit;
      dragStartX = x; dragStartY = y;
      dragOrigBendTick = hit.tick;
      dragOrigBendCents = hit.cents;
      el.setPointerCapture(e.pointerId);
    } else {
      // Insert
      const tick = snapTick(xToTick(x));
      const cents = clamp((midY - y) / midY * range, -range, range);
      pushUndo();
      const pt = { id: uuid(), tick: Math.max(0, tick), cents: Math.round(cents) };
      project.pitchBend.push(pt);
      project.pitchBend.sort((a, b) => a.tick - b.tick);
      selectedBendId = pt.id;
      selectedNoteId = null;
      autoExtend();
      autosave();
    }
    renderAll();
  });
  
  el.addEventListener('pointermove', (e) => {
    if (dragMode !== 'bend' || !dragTarget) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const h = rect.height;
    const midY = h / 2;
    const range = project.settings.bendRangeCents;
    
    const dx = x - dragStartX;
    const tickDelta = (dx / hZoom) * PPQ;
    dragTarget.tick = Math.max(0, snapTick(dragOrigBendTick + tickDelta));
    dragTarget.cents = clamp(Math.round((midY - y) / midY * range), -range, range);
    
    project.pitchBend.sort((a, b) => a.tick - b.tick);
    renderAll();
  });
  
  const pointerUp = () => {
    if (dragMode === 'bend') { autoExtend(); autosave(); }
    dragMode = null; dragTarget = null;
  };
  el.addEventListener('pointerup', pointerUp);
  el.addEventListener('pointercancel', pointerUp);
  
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      hZoom = clamp(hZoom * (e.deltaY < 0 ? 1.15 : 0.87), 20, 240);
    } else {
      scrollX = Math.max(0, scrollX + e.deltaY);
    }
    renderAll();
  }, { passive: false });
}

// ─── Ruler scrubbing ─────────────────────────────────────────────────
function setupRulerInteractions() {
  const el = rulerCanvas;
  let scrubbing = false;

  function scrubToX(e) {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const tick = Math.max(0, xToTick(x));
    // If playing, restart from new position
    if (isPlaying) {
      stopPlayback();
      playStartTick = tick;
      startPlayback();
    } else {
      playStartTick = tick;
    }
    renderAll();
  }

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    scrubbing = true;
    scrubToX(e);
  });

  el.addEventListener('pointermove', (e) => {
    if (!scrubbing) return;
    scrubToX(e);
  });

  el.addEventListener('pointerup', () => { scrubbing = false; });
  el.addEventListener('pointercancel', () => { scrubbing = false; });
}

// ─── Preview ─────────────────────────────────────────────────────────
async function previewNote(note) {
  await ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = voiceType === 'plucky' ? 'triangle' : voiceType;
  osc.frequency.value = pitchFreq(note.pitch);
  osc.connect(gain);
  gain.connect(masterGain);
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.start(now);
  osc.stop(now + 0.25);
}

// ─── Export ──────────────────────────────────────────────────────────
function buildExportData() {
  const s = project.settings;
  const totalT = totalTicks();
  const totalS = tickToSec(totalT);
  
  const notes = project.notes.map(n => ({
    id: n.id,
    pitch: n.pitch,
    pitchName: pitchName(n.pitch),
    frequencyHz: parseFloat(pitchFreq(n.pitch).toFixed(6)),
    startTick: n.startTick,
    durationTicks: n.durationTicks,
    endTick: n.startTick + n.durationTicks,
    startSeconds: parseFloat(tickToSec(n.startTick).toFixed(3)),
    durationSeconds: parseFloat(tickToSec(n.durationTicks).toFixed(3)),
    endSeconds: parseFloat(tickToSec(n.startTick + n.durationTicks).toFixed(3)),
    velocity: n.velocity
  }));
  
  const bends = project.pitchBend.map(b => ({
    id: b.id,
    tick: b.tick,
    seconds: parseFloat(tickToSec(b.tick).toFixed(3)),
    cents: b.cents
  }));
  
  return {
    schema: 'pitch-timeline/v1-export',
    project: {
      id: project.id,
      title: project.title,
      tempoBpm: s.tempoBpm,
      timeSignature: { numerator: s.timeSignature.numerator, denominator: s.timeSignature.denominator },
      ppq: PPQ,
      bendRangeCents: s.bendRangeCents,
      totalBars: s.totalBars,
      durationTicks: totalT,
      durationSeconds: parseFloat(totalS.toFixed(3))
    },
    notes,
    pitchBend: bends
  };
}

function exportJSON() {
  return JSON.stringify(buildExportData(), null, 2);
}

function exportMarkdown() {
  const d = buildExportData();
  const p = d.project;
  let md = `---
schema: pitch-timeline/v1-export
title: ${p.title}
tempoBpm: ${p.tempoBpm}
timeSignature: ${p.timeSignature.numerator}/${p.timeSignature.denominator}
ppq: ${p.ppq}
bendRangeCents: ${p.bendRangeCents}
totalBars: ${p.totalBars}
durationTicks: ${p.durationTicks}
durationSeconds: ${p.durationSeconds}
---

# Notes

| id | pitch | pitchName | frequencyHz | startTick | durationTicks | endTick | startSeconds | durationSeconds | endSeconds | velocity |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
`;
  for (const n of d.notes) {
    md += `| ${n.id} | ${n.pitch} | ${n.pitchName} | ${n.frequencyHz} | ${n.startTick} | ${n.durationTicks} | ${n.endTick} | ${n.startSeconds.toFixed(3)} | ${n.durationSeconds.toFixed(3)} | ${n.endSeconds.toFixed(3)} | ${n.velocity} |\n`;
  }
  
  md += `\n# Pitch Bend\n\n| id | tick | seconds | cents |\n|---|---:|---:|---:|\n`;
  for (const b of d.pitchBend) {
    md += `| ${b.id} | ${b.tick} | ${b.seconds.toFixed(3)} | ${b.cents} |\n`;
  }
  
  return md;
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugTitle() {
  return project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'') || 'composition';
}

function fileTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
}

// ─── Keyboard Shortcuts ──────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Don't capture when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      deleteSelected();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') {
      e.preventDefault();
      redo();
    } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
      e.preventDefault();
      undo();
    } else if (e.code === 'Digit0') {
      hZoom = 64; vZoom = 18; scrollX = 0; scrollY = 0;
      renderAll();
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      hZoom = clamp(hZoom * 1.2, 20, 240);
      renderAll();
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      hZoom = clamp(hZoom * 0.83, 20, 240);
      renderAll();
    }
  });
}

async function togglePlay() {
  if (isPlaying) stopPlayback();
  else await startPlayback();
}

function deleteSelected() {
  if (selectedNoteId) {
    pushUndo();
    project.notes = project.notes.filter(n => n.id !== selectedNoteId);
    selectedNoteId = null;
    autosave(); renderAll();
  } else if (selectedBendId) {
    pushUndo();
    project.pitchBend = project.pitchBend.filter(b => b.id !== selectedBendId);
    selectedBendId = null;
    autosave(); renderAll();
  }
}

// ─── UI Wiring ───────────────────────────────────────────────────────
function setupUI() {
  // Title
  const titleEl = document.getElementById('project-title');
  titleEl.value = project.title;
  titleEl.addEventListener('change', () => {
    project.title = titleEl.value || 'Untitled';
    autosave();
  });
  
  // Tempo
  const tempoEl = document.getElementById('inp-tempo');
  tempoEl.value = project.settings.tempoBpm;
  tempoEl.addEventListener('change', () => {
    pushUndo();
    project.settings.tempoBpm = clamp(parseInt(tempoEl.value) || 120, 20, 300);
    tempoEl.value = project.settings.tempoBpm;
    autosave();
  });
  
  // Time sig
  const tsEl = document.getElementById('sel-timesig');
  tsEl.value = `${project.settings.timeSignature.numerator}/${project.settings.timeSignature.denominator}`;
  tsEl.addEventListener('change', () => {
    pushUndo();
    const [num, den] = tsEl.value.split('/').map(Number);
    project.settings.timeSignature = { numerator: num, denominator: den };
    autosave(); renderAll();
  });
  
  // Snap
  const snapEl = document.getElementById('sel-snap');
  snapEl.value = project.settings.snapDivisor;
  snapEl.addEventListener('change', () => {
    project.settings.snapDivisor = parseInt(snapEl.value);
  });
  
  // Voice
  const voiceEl = document.getElementById('sel-voice');
  voiceEl.addEventListener('change', () => { voiceType = voiceEl.value; });
  
  // Transport
  document.getElementById('btn-play').addEventListener('click', togglePlay);
  document.getElementById('btn-rewind').addEventListener('click', () => {
    if (isPlaying) stopPlayback();
    playStartTick = 0;
    renderAll();
  });
  
  // Zoom
  document.getElementById('btn-zoom-in').addEventListener('click', () => { hZoom = clamp(hZoom * 1.25, 20, 240); renderAll(); });
  document.getElementById('btn-zoom-out').addEventListener('click', () => { hZoom = clamp(hZoom * 0.8, 20, 240); renderAll(); });
  document.getElementById('btn-zoom-reset').addEventListener('click', () => { hZoom = 64; vZoom = 18; scrollX = 0; scrollY = 0; renderAll(); });
  
  // Undo/redo/delete
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-delete').addEventListener('click', deleteSelected);
  
  // Export menu
  const exportMenu = document.getElementById('export-menu');
  document.getElementById('btn-export').addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', () => exportMenu.classList.add('hidden'));
  
  document.getElementById('exp-json-dl').addEventListener('click', () => {
    downloadFile(exportJSON(), `${slugTitle()}_${fileTimestamp()}.json`, 'application/json');
  });
  document.getElementById('exp-md-dl').addEventListener('click', () => {
    downloadFile(exportMarkdown(), `${slugTitle()}_${fileTimestamp()}.md`, 'text/markdown');
  });
  document.getElementById('exp-json-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(exportJSON()).then(() => alert('JSON copied!'));
  });
  document.getElementById('exp-md-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(exportMarkdown()).then(() => alert('Markdown copied!'));
  });
}

function syncUIFromProject() {
  document.getElementById('project-title').value = project.title;
  document.getElementById('inp-tempo').value = project.settings.tempoBpm;
  document.getElementById('sel-timesig').value = `${project.settings.timeSignature.numerator}/${project.settings.timeSignature.denominator}`;
  document.getElementById('sel-snap').value = project.settings.snapDivisor;
}

// ─── Init ────────────────────────────────────────────────────────────
async function init() {
  gridCanvas = document.getElementById('grid-canvas');
  gridCtx = gridCanvas.getContext('2d');
  rulerCanvas = document.getElementById('ruler-canvas');
  rulerCtx = rulerCanvas.getContext('2d');
  pianoCanvas = document.getElementById('piano-keys-canvas');
  pianoCtx = pianoCanvas.getContext('2d');
  bendCanvas = document.getElementById('bend-canvas');
  bendCtx = bendCanvas.getContext('2d');
  
  // Center scroll to show middle octaves
  scrollY = (PITCH_MAX - 72) * vZoom; // Start around C5
  
  await openDB();
  const latest = await loadLatest();
  if (latest) {
    project = latest;
    // Ensure defaults for older saved projects
    if (!project.settings.snapDivisor) project.settings.snapDivisor = 16;
  }
  
  setupUI();
  syncUIFromProject();
  setupGridEvents();
  setupBendEvents();
  setupRulerInteractions();
  setupKeyboard();
  
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
  
  // Initial save for new projects
  autosave();
}

init();
