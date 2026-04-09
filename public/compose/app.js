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
const BEND_MAX_SEMITONES = 24;
const BEND_MAX_CENTS = BEND_MAX_SEMITONES * 100; // 2400
const INSTRUMENT_COLORS = [
  '#4fc3f7', '#f06292', '#aed581', '#ffb74d', '#ba68c8',
  '#4dd0e1', '#e57373', '#81c784', '#ffd54f', '#9575cd',
];

// ─── State ───────────────────────────────────────────────────────────
let project = createNewProject();
let selectedNoteId = null;
let selectedBendId = null;
let hZoom = 64;   // px per beat
let vZoom = 18;   // px per semitone row
let scrollX = 0;  // px
let scrollY = 0;  // px
let voiceType = 'triangle';
let activeInstrument = 0; // index into project.instruments[]

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
let dragMode = null; // 'move','resize','resize-left','bend','pan','pending','region-create','region-move','bend-pending','bend-region-create',null
let dragTarget = null;
let dragStartX = 0, dragStartY = 0;
let dragOrigTick = 0, dragOrigPitch = 0, dragOrigDur = 0;
let dragOrigBendTick = 0, dragOrigBendCents = 0;
let dragPreviewPitch = -1; // track pitch during move for audio feedback
let pendingClickTick = 0, pendingClickPitch = 0; // for deferred insert

// Region selection
let region = null;  // { startTick, endTick, lowPitch, highPitch } or null
let clipboard = null; // { notes: [...], bends: [...], offsetTick } or null

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
function snapTicks() { return project.settings.snapDivisor > 0 ? PPQ * 4 / project.settings.snapDivisor : 1; }
function snapTick(tick) { if (project.settings.snapDivisor === 0) return Math.round(tick); const s = snapTicks(); return Math.round(tick / s) * s; }
function minDuration() { return Math.max(snapTicks(), PPQ / 4); } // At least a 16th note
function totalTicks() { return barLengthTicks() * project.settings.totalBars; }

// Pitch range: show MIDI 36 (C2) to 96 (C7) = 60 semitones
const PITCH_MIN = 24, PITCH_MAX = 96, PITCH_RANGE = PITCH_MAX - PITCH_MIN;

// ─── Logarithmic bend mapping ────────────────────────────────────
// Maps semitones ↔ normalised Y (0..1, where 0=centre, 1=max).
// Uses log scaling so the first few semitones get the most space.
// f(semitones) = log(1 + semitones) / log(1 + maxSemitones)

function semitonesToNorm(st) {
  // st in [0, BEND_MAX_SEMITONES] → [0, 1], logarithmic
  return Math.log(1 + Math.abs(st)) / Math.log(1 + BEND_MAX_SEMITONES);
}
function normToSemitones(n) {
  // n in [0, 1] → [0, BEND_MAX_SEMITONES], inverse log
  return Math.pow(1 + BEND_MAX_SEMITONES, Math.abs(n)) - 1;
}
// cents ↔ pixel-Y within the bend lane (h = lane height)
function centsToY(cents, h) {
  const midY = h / 2;
  const st = cents / 100;
  const norm = semitonesToNorm(Math.abs(st));
  return midY - Math.sign(st) * norm * midY;
}
function yToCents(y, h) {
  const midY = h / 2;
  const norm = Math.abs(midY - y) / midY;        // 0..1
  const st = normToSemitones(norm);               // 0..24
  const sign = y < midY ? 1 : -1;
  return sign * st * 100;
}
// Snap cents to nearest semitone boundary (100-cent increments)
function snapCents(cents) {
  return Math.round(cents / 100) * 100;
}

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
      bendRangeCents: BEND_MAX_CENTS,
      totalBars: 8,
      snapDivisor: 16
    },
    instruments: [
      { name: 'Instrument 1', color: INSTRUMENT_COLORS[0], voice: 'triangle' }
    ],
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

// ─── Remote sync ─────────────────────────────────────────────────────
// Syncs project to the composer API server if available.
// The server URL is detected from ?api= query param or defaults to local.
const SYNC_URL = (() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('api') || 'https://0agents-macbook-pro.tail7457fd.ts.net';
})();
let syncTimeout = null;

function remoteSync() {
  if (!SYNC_URL) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    const exportData = buildExportData();
    fetch(`${SYNC_URL}/sync/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportData)
    }).catch(() => {});
  }, 800);
}

// Poll server for API-initiated changes only (via _apiVersion counter).
// UI pushes don't bump _apiVersion. Only authenticated API calls do.
let knownApiVersion = 0;
let pollTimer = null;

function startPolling() {
  if (!SYNC_URL) return;
  // Push current state on first connect
  remoteSync();
  pollTimer = setInterval(async () => {
    try {
      const resp = await fetch(`${SYNC_URL}/sync/${project.id}`);
      if (!resp.ok) return;
      const data = await resp.json();
      const serverVersion = data._apiVersion || 0;
      if (serverVersion <= knownApiVersion) return;
      // API made a change — import it
      knownApiVersion = serverVersion;
      console.log(`Remote sync: importing API changes (v${serverVersion})`);
      importJSON(data, 'remote-sync');
    } catch(e) {}
  }, 2000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

let saveTimeout = null;
function autosave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    project.updatedAt = new Date().toISOString();
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').put({ id: project.id, title: project.title, updatedAt: project.updatedAt, project });
    document.getElementById('status-save').textContent = 'saved';
    remoteSync();
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

// ─── Modal system ────────────────────────────────────────────────────
function showModal(title, bodyHTML, actions) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  const actionsEl = document.getElementById('modal-actions');
  actionsEl.innerHTML = '';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.textContent = a.label;
    if (a.cls) btn.className = a.cls;
    btn.addEventListener('click', () => { closeModal(); if (a.fn) a.fn(); });
    actionsEl.appendChild(btn);
  }
  overlay.classList.remove('hidden');
  // Focus first input if present
  const inp = document.querySelector('#modal-body input');
  if (inp) { inp.focus(); inp.select(); }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Close modal on overlay click (but not modal body click)
document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !document.getElementById('modal-overlay').classList.contains('hidden')) {
    closeModal();
  }
});

// ─── Project management (Save / Load / New / Delete) ────────────────
function getAllProjects() {
  return new Promise((resolve) => {
    const tx = db.transaction('projects', 'readonly');
    const req = tx.objectStore('projects').getAll();
    req.onsuccess = () => {
      const all = req.result;
      all.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      resolve(all);
    };
    req.onerror = () => resolve([]);
  });
}

function deleteProject(id) {
  return new Promise((resolve) => {
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').delete(id);
    tx.oncomplete = () => resolve();
  });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function showSaveModal() {
  showModal('Save Project',
    `<input type="text" id="modal-save-name" value="${project.title.replace(/"/g, '&quot;')}">`,
    [
      { label: 'Cancel' },
      { label: 'Save', cls: 'modal-btn-primary', fn: () => {
        const name = document.getElementById('modal-save-name').value.trim() || 'Untitled';
        project.title = name;
        document.getElementById('project-title').value = name;
        autosave();
      }}
    ]
  );
  // Allow Enter to confirm
  document.getElementById('modal-save-name').addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      e.preventDefault();
      const name = e.target.value.trim() || 'Untitled';
      project.title = name;
      document.getElementById('project-title').value = name;
      autosave();
      closeModal();
    }
  });
}

async function showLoadModal() {
  const projects = await getAllProjects();
  let body;
  if (projects.length === 0) {
    body = '<div class="project-list-empty">No saved projects</div>';
  } else {
    body = '<ul class="project-list">' + projects.map(p =>
      `<li class="project-item${p.id === project.id ? ' active' : ''}" data-id="${p.id}">` +
        `<span class="project-item-name">${(p.title || p.project?.title || 'Untitled').replace(/</g, '&lt;')}</span>` +
        `<span class="project-item-date">${formatDate(p.updatedAt)}</span>` +
        `<button class="project-item-del" data-del-id="${p.id}" title="Delete">✕</button>` +
      `</li>`
    ).join('') + '</ul>';
  }
  showModal('Load Project', body, [{ label: 'Cancel' }]);

  // Click to load
  document.querySelectorAll('.project-item').forEach(el => {
    el.addEventListener('click', async (e) => {
      if (e.target.classList.contains('project-item-del')) return;
      const id = el.dataset.id;
      const tx = db.transaction('projects', 'readonly');
      const req = tx.objectStore('projects').get(id);
      req.onsuccess = () => {
        if (req.result && req.result.project) {
          project = req.result.project;
          if (!project.settings.snapDivisor) project.settings.snapDivisor = 16;
          if (project.settings.bendRangeCents < BEND_MAX_CENTS) project.settings.bendRangeCents = BEND_MAX_CENTS;
          selectedNoteId = null; selectedBendId = null;
          playStartTick = 0;
          undoStack = []; redoStack = [];
          syncUIFromProject();
          renderAll();
          closeModal();
        }
      };
    });
  });

  // Delete buttons inside list
  document.querySelectorAll('.project-item-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.delId;
      const name = btn.closest('.project-item').querySelector('.project-item-name').textContent;
      showDeleteModal(id, name, true);
    });
  });
}

function showDeleteModal(id, name, reopenLoad) {
  const targetId = id || project.id;
  const targetName = name || project.title;
  showModal('Delete Project',
    `<p style="color:#ccc;font-size:13px;">Delete <strong style="color:#f88;">${targetName.replace(/</g, '&lt;')}</strong>? This cannot be undone.</p>`,
    [
      { label: 'Cancel', fn: reopenLoad ? showLoadModal : null },
      { label: 'Delete', cls: 'modal-btn-danger', fn: async () => {
        await deleteProject(targetId);
        // If we deleted the current project, start fresh
        if (targetId === project.id) {
          project = createNewProject();
          selectedNoteId = null; selectedBendId = null;
          playStartTick = 0;
          undoStack = []; redoStack = [];
          syncUIFromProject();
          autosave();
          renderAll();
        }
        if (reopenLoad) showLoadModal();
      }}
    ]
  );
}

function showNewModal() {
  showModal('New Project',
    `<p style="color:#ccc;font-size:13px;margin-bottom:8px;">Create a new blank project? Unsaved changes to <strong>${project.title.replace(/</g, '&lt;')}</strong> will be kept in storage.</p>` +
    `<input type="text" id="modal-new-name" value="Untitled" placeholder="Project name">`,
    [
      { label: 'Cancel' },
      { label: 'Create', cls: 'modal-btn-primary', fn: () => {
        const name = document.getElementById('modal-new-name').value.trim() || 'Untitled';
        project = createNewProject(name);
        selectedNoteId = null; selectedBendId = null;
        playStartTick = 0;
        undoStack = []; redoStack = [];
        syncUIFromProject();
        autosave();
        renderAll();
      }}
    ]
  );
  document.getElementById('modal-new-name').addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      e.preventDefault();
      const name = e.target.value.trim() || 'Untitled';
      project = createNewProject(name);
      selectedNoteId = null; selectedBendId = null;
      playStartTick = 0;
      undoStack = []; redoStack = [];
      syncUIFromProject();
      autosave();
      renderAll();
      closeModal();
    }
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
  // Also extend past the visible viewport and playhead
  if (gridCanvas) {
    const visW = gridCanvas.width / (devicePixelRatio || 1);
    const visibleEndTick = xToTick(visW);
    maxTick = Math.max(maxTick, visibleEndTick);
  }
  maxTick = Math.max(maxTick, playheadTick());
  const neededBars = Math.ceil(maxTick / bl) + 4;
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
  {
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
    
    const bendOff = note.bendActive === false;
    const instIdx = note.instrument || 0;
    const inst = project.instruments[instIdx];
    const instColor = inst ? inst.color : ACCENT_COLOR;
    const isActiveInst = instIdx === activeInstrument;
    const noteColor = sel ? '#fff' : (bendOff ? '#8e8e8e' : instColor);
    ctx.fillStyle = noteColor;
    ctx.globalAlpha = note.velocity * (isActiveInst || sel ? 1 : 0.3);
    ctx.fillRect(x, y, w2, vZoom - 1);
    ctx.globalAlpha = 1;
    
    if (sel) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w2, vZoom - 1);
    }
    
    // Resize handles (left + right edges)
    ctx.fillStyle = sel ? '#fff' : '#3a8ec2';
    ctx.fillRect(x, y, RESIZE_HANDLE_W, vZoom - 1);
    ctx.fillRect(x + w2 - RESIZE_HANDLE_W, y, RESIZE_HANDLE_W, vZoom - 1);
    
    // Label
    if (w2 > 30) {
      ctx.fillStyle = '#000';
      ctx.font = '10px sans-serif';
      ctx.fillText(pitchName(note.pitch), x + 3, y + vZoom - 4);
    }
  }
  
  // Region selection overlay
  if (region) {
    const rx = tickToX(region.startTick);
    const rx2 = tickToX(region.endTick);
    const ry = pitchToY(region.highPitch);
    const ry2 = pitchToY(region.lowPitch) + vZoom;
    ctx.fillStyle = 'rgba(79, 195, 247, 0.12)';
    ctx.fillRect(rx, ry, rx2 - rx, ry2 - ry);
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(rx, ry, rx2 - rx, ry2 - ry);
    ctx.setLineDash([]);
  }

  // Playhead
  const phTick = playheadTick();
  {
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
  
  // ── Horizontal semitone grid lines (logarithmic spacing) ──
  for (let st = 0; st <= BEND_MAX_SEMITONES; st++) {
    const yUp = centsToY(st * 100, h);
    const yDn = centsToY(-st * 100, h);
    if (st === 0) {
      // Centre line — dashed, brighter
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const isOctave = st % 12 === 0;
      ctx.strokeStyle = isOctave ? '#3a3a3e' : '#242428';
      ctx.lineWidth = isOctave ? 0.8 : 0.4;
      ctx.beginPath(); ctx.moveTo(0, yUp); ctx.lineTo(w, yUp); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, yDn); ctx.lineTo(w, yDn); ctx.stroke();
      // Label octave boundaries
      if (isOctave) {
        ctx.fillStyle = '#555';
        ctx.font = '9px sans-serif';
        ctx.fillText(`+${st}`, 2, yUp - 2);
        ctx.fillText(`-${st}`, 2, yDn + 9);
      }
    }
  }
  
  // ── Vertical beat/bar grid ──
  const bl = barLengthTicks();
  for (let tick = 0; tick <= totalTicks(); tick += PPQ) {
    const x = tickToX(tick);
    if (x < -1 || x > w + 1) continue;
    const isBar = tick % bl === 0;
    ctx.strokeStyle = isBar ? '#333' : '#242428';
    ctx.lineWidth = isBar ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  
  // ── Bend line (logarithmic Y) ──
  const pts = project.pitchBend;
  if (pts.length > 0) {
    ctx.strokeStyle = BEND_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const firstY = centsToY(pts[0].cents, h);
    ctx.moveTo(tickToX(0), pts[0].tick === 0 ? firstY : midY);
    if (pts[0].tick > 0) ctx.lineTo(tickToX(pts[0].tick), firstY);
    
    for (let i = 0; i < pts.length; i++) {
      ctx.lineTo(tickToX(pts[i].tick), centsToY(pts[i].cents, h));
    }
    const lastPt = pts[pts.length - 1];
    ctx.lineTo(tickToX(totalTicks()), centsToY(lastPt.cents, h));
    ctx.stroke();
  }
  
  // ── Bend anchor points ──
  for (const pt of pts) {
    const px = tickToX(pt.tick);
    const py = centsToY(pt.cents, h);
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
    // Semitone label near selected point
    if (sel) {
      const st = pt.cents / 100;
      const label = (st >= 0 ? '+' : '') + st.toFixed(0) + 'st';
      ctx.fillStyle = '#ccc';
      ctx.font = '10px sans-serif';
      ctx.fillText(label, px + 8, py - 4);
    }
  }
  
  // ── Region overlay ──
  if (region) {
    const rx = tickToX(region.startTick);
    const rx2 = tickToX(region.endTick);
    ctx.fillStyle = 'rgba(79, 195, 247, 0.12)';
    ctx.fillRect(rx, 0, rx2 - rx, h);
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(rx, 0, rx2 - rx, h);
    ctx.setLineDash([]);
  }

  // ── Playhead ──
  {
    const px = tickToX(playheadTick());
    ctx.strokeStyle = PLAYHEAD_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
  }
  
  ctx.restore();
}

// ─── Tick ↔ bar:beat:tick formatting ─────────────────────────────
function tickToBarBeat(tick) {
  const bl = barLengthTicks();
  const bar = Math.floor(tick / bl) + 1;
  const beatInBar = Math.floor((tick % bl) / PPQ) + 1;
  const tickInBeat = Math.floor(tick % PPQ);
  return `${bar}:${beatInBar}:${String(tickInBeat).padStart(3, '0')}`;
}

function barBeatToTick(str) {
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN) || parts.length < 2) return null;
  const bar = (parts[0] || 1) - 1;
  const beat = (parts[1] || 1) - 1;
  const sub = parts[2] || 0;
  const bl = barLengthTicks();
  return bar * bl + beat * PPQ + sub;
}

function updateStatus() {
  const tick = playheadTick();
  document.getElementById('status-pos').textContent = tickToBarBeat(tick);

  const panel = document.getElementById('sel-panel');

  if (selectedNoteId) {
    const n = project.notes.find(n => n.id === selectedNoteId);
    if (n) {
      panel.classList.remove('hidden');
      const startSec = tickToSec(n.startTick);
      const durSec = tickToSec(n.durationTicks);
      const endSec = startSec + durSec;

      // Only update fields if they're not focused (user might be typing)
      const pitchEl = document.getElementById('sel-pitch');
      const velEl = document.getElementById('sel-vel');
      const startEl = document.getElementById('sel-start');
      const durEl = document.getElementById('sel-dur');

      if (document.activeElement !== pitchEl) pitchEl.value = pitchName(n.pitch);
      if (document.activeElement !== velEl) velEl.value = n.velocity;
      if (document.activeElement !== startEl) startEl.value = tickToBarBeat(n.startTick);
      if (document.activeElement !== durEl) durEl.value = tickToBarBeat(n.durationTicks);
      document.getElementById('sel-bend').checked = n.bendActive !== false;

      document.getElementById('sel-start-sec').textContent = startSec.toFixed(3);
      document.getElementById('sel-dur-sec').textContent = durSec.toFixed(3);
      document.getElementById('sel-end-sec').textContent = endSec.toFixed(3);

      const instName = project.instruments[n.instrument || 0]?.name || 'Inst ' + ((n.instrument||0)+1);
      document.getElementById('status-sel').textContent = `${pitchName(n.pitch)} | MIDI ${n.pitch} | ${instName}`;
    } else {
      panel.classList.add('hidden');
      document.getElementById('status-sel').textContent = '';
    }
  } else if (selectedBendId) {
    panel.classList.add('hidden');
    const b = project.pitchBend.find(b => b.id === selectedBendId);
    if (b) {
      const st = b.cents / 100;
      document.getElementById('status-sel').textContent = `Bend: ${st >= 0 ? '+' : ''}${st.toFixed(0)}st @ ${tickToBarBeat(b.tick)} (${tickToSec(b.tick).toFixed(3)}s)`;
    } else {
      document.getElementById('status-sel').textContent = '';
    }
  } else {
    panel.classList.add('hidden');
    document.getElementById('status-sel').textContent = '';
  }
}

// ─── Selection panel editing ─────────────────────────────────────
function parsePitchName(str) {
  // e.g. "C#5", "D3", "Eb4" → MIDI number or null
  const m = str.trim().match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = m[2];
  const oct = parseInt(m[3]);
  const base = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }[letter];
  if (base === undefined) return null;
  let midi = (oct + 1) * 12 + base;
  if (acc === '#') midi++;
  else if (acc === 'b') midi--;
  return clamp(midi, PITCH_MIN, PITCH_MAX);
}

function setupSelectionPanel() {
  const pitchEl = document.getElementById('sel-pitch');
  const velEl = document.getElementById('sel-vel');
  const startEl = document.getElementById('sel-start');
  const durEl = document.getElementById('sel-dur');
  const delBtn = document.getElementById('sel-delete');

  function getSelNote() {
    return selectedNoteId ? project.notes.find(n => n.id === selectedNoteId) : null;
  }

  pitchEl.addEventListener('change', () => {
    const n = getSelNote();
    if (!n) return;
    const midi = parsePitchName(pitchEl.value);
    if (midi !== null) { pushUndo(); n.pitch = midi; autosave(); renderAll(); }
    else pitchEl.value = pitchName(n.pitch);
  });

  velEl.addEventListener('change', () => {
    const n = getSelNote();
    if (!n) return;
    const v = parseFloat(velEl.value);
    if (!isNaN(v)) { pushUndo(); n.velocity = clamp(v, 0.05, 1); autosave(); renderAll(); }
  });

  startEl.addEventListener('change', () => {
    const n = getSelNote();
    if (!n) return;
    const tick = barBeatToTick(startEl.value);
    if (tick !== null && tick >= 0) { pushUndo(); n.startTick = tick; autoExtend(); autosave(); renderAll(); }
    else startEl.value = tickToBarBeat(n.startTick);
  });

  durEl.addEventListener('change', () => {
    const n = getSelNote();
    if (!n) return;
    const tick = barBeatToTick(durEl.value);
    if (tick !== null && tick > 0) { pushUndo(); n.durationTicks = tick; autoExtend(); autosave(); renderAll(); }
    else durEl.value = tickToBarBeat(n.durationTicks);
  });

  document.getElementById('sel-bend').addEventListener('change', (e) => {
    const n = getSelNote();
    if (!n) return;
    pushUndo(); n.bendActive = e.target.checked; autosave(); renderAll();
  });

  delBtn.addEventListener('click', deleteSelected);
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

// ─── Playhead ────────────────────────────────────────────────────
function playheadTick() {
  if (!isPlaying) return playStartTick;
  if (!audioCtx) return playStartTick;
  const elapsed = audioCtx.currentTime - playStartAudioTime;
  return playStartTick + secToTick(elapsed);
}

// ─── Auto-scroll ─────────────────────────────────────────────────
// Keeps a tick position visible by adjusting scrollX.
// margin = fraction of visible width to use as a buffer zone on each side.
function ensureTickVisible(tick, { margin = 0.15, center = false } = {}) {
  const visW = gridCanvas.width / (devicePixelRatio || 1);
  const px = tickToX(tick); // position relative to current scroll

  if (center) {
    // Jump so the tick is centred
    const targetScrollX = (tick / PPQ) * hZoom - visW / 2;
    scrollX = Math.max(0, targetScrollX);
    return;
  }

  const lo = visW * margin;
  const hi = visW * (1 - margin);

  if (px > hi) {
    // Playhead ran past the right edge — page forward so it's at the left margin
    scrollX = (tick / PPQ) * hZoom - lo;
  } else if (px < lo) {
    // Dragged past the left edge
    scrollX = Math.max(0, (tick / PPQ) * hZoom - lo);
  }
}

// ─── WebAudioFont integration ────────────────────────────────────────
let wafPlayer = null;
const wafPresets = {};
const WAF_VOICES = {
  'waf-piano': () => typeof _tone_0000_FluidR3_GM_sf2_file !== 'undefined' ? _tone_0000_FluidR3_GM_sf2_file : null,
  'waf-violin': () => typeof _tone_0400_FluidR3_GM_sf2_file !== 'undefined' ? _tone_0400_FluidR3_GM_sf2_file : null,
  'waf-cello': () => typeof _tone_0420_FluidR3_GM_sf2_file !== 'undefined' ? _tone_0420_FluidR3_GM_sf2_file : null,
  'waf-strings': () => typeof _tone_0480_FluidR3_GM_sf2_file !== 'undefined' ? _tone_0480_FluidR3_GM_sf2_file : null,
};

function isWafVoice(v) { return v && v.startsWith('waf-'); }

function initWaf() {
  if (wafPlayer || typeof WebAudioFontPlayer === 'undefined') return;
  wafPlayer = new WebAudioFontPlayer();
  for (const [name, getter] of Object.entries(WAF_VOICES)) {
    const preset = getter();
    if (preset) {
      wafPlayer.adjustPreset(audioCtx, preset);
      wafPresets[name] = preset;
    }
  }
}

// ─── Audio Engine ────────────────────────────────────────────────────
async function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  initWaf();
}

function scheduleNote(note, when, dur) {
  const inst = project.instruments[note.instrument || 0];
  const vt = inst?.voice || voiceType;

  // WebAudioFont voices — use sample playback instead of oscillator
  if (isWafVoice(vt) && wafPlayer && wafPresets[vt]) {
    const midi = note.pitch;
    const vol = note.velocity * 0.5;
    // Convert pitch bend curve to WAF slides
    // WAF slides: delta = semitones from base pitch, when = relative offset from note start
    let slides = null;
    if (note.bendActive !== false) {
      const startTick = note.startTick;
      const endTick = note.startTick + note.durationTicks;
      const segs = getBendSegments(startTick, endTick);
      if (segs.some(s => s.cents !== 0)) {
        slides = [];
        for (let i = 0; i < segs.length; i++) {
          slides.push({
            delta: segs[i].cents / 100,  // cents to semitones
            when: tickToSec(segs[i].tick - startTick)  // relative to note start
          });
        }
      }
    }
    wafPlayer.queueWaveTable(audioCtx, masterGain, wafPresets[vt], when, midi, dur, vol, slides);
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
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
    gain.gain.linearRampToValueAtTime(note.velocity * 0.5, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, when + Math.min(dur, 0.3));
  } else {
    gain.gain.linearRampToValueAtTime(note.velocity * 0.5, when + 0.005);
    // Hold, then release
    const releaseStart = when + dur - 0.04;
    if (releaseStart > when + 0.005) {
      gain.gain.setValueAtTime(note.velocity * 0.5, releaseStart);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  }
  
  // Pitch bend automation (only if bendActive)
  if (note.bendActive !== false) {
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
  }
  
  osc.start(when);
  osc.stop(when + dur + 0.05);
  
  activeVoices.push({ osc, gain, endTime: when + dur + 0.05 });
}

async function startPlayback() {
  await ensureAudio();
  isPlaying = true;
  playStartAudioTime = audioCtx.currentTime;
  // Set scheduledUpTo just before playStartTick so notes at exactly that tick get caught
  scheduledUpTo = playStartTick - 1;
  
  document.getElementById('btn-play').textContent = '⏹';
  
  // Run scheduler immediately so the first notes are scheduled without waiting 25ms
  schedulerTick();
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
  ensureTickVisible(playheadTick());
  renderAll();
  rafId = requestAnimationFrame(rafLoop);
}

// ─── Region helpers ──────────────────────────────────────────────────
function isInRegion(tick, pitch) {
  if (!region) return false;
  return tick >= region.startTick && tick <= region.endTick &&
         pitch >= region.lowPitch && pitch <= region.highPitch;
}

function isNoteInOrigRegion(n, startTick, endTick, lowPitch, highPitch) {
  return n.startTick >= startTick && n.startTick + n.durationTicks <= endTick &&
         n.pitch >= lowPitch && n.pitch <= highPitch;
}

function notesInRegion() {
  if (!region) return [];
  return project.notes.filter(n =>
    n.startTick >= region.startTick && n.startTick + n.durationTicks <= region.endTick &&
    n.pitch >= region.lowPitch && n.pitch <= region.highPitch
  );
}

function bendsInRegion() {
  if (!region) return [];
  return project.pitchBend.filter(b =>
    b.tick >= region.startTick && b.tick <= region.endTick
  );
}

function copyRegion() {
  if (!region) return;
  const notes = notesInRegion().map(n => ({ ...n, id: uuid(), startTick: n.startTick - region.startTick }));
  const bends = bendsInRegion().map(b => ({ ...b, id: uuid(), tick: b.tick - region.startTick }));
  clipboard = { notes, bends, duration: region.endTick - region.startTick };
}

function pasteAtPlayhead() {
  if (!clipboard) return;
  pushUndo();
  const baseTick = snapTick(playheadTick());
  for (const n of clipboard.notes) {
    project.notes.push({ ...n, id: uuid(), startTick: n.startTick + baseTick });
  }
  for (const b of clipboard.bends) {
    project.pitchBend.push({ ...b, id: uuid(), tick: b.tick + baseTick });
  }
  project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
  project.pitchBend.sort((a, b) => a.tick - b.tick);
  // Select the pasted region
  if (clipboard.notes.length > 0) {
    const pitches = clipboard.notes.map(n => n.pitch);
    region = {
      startTick: baseTick,
      endTick: baseTick + clipboard.duration,
      lowPitch: Math.min(...pitches),
      highPitch: Math.max(...pitches)
    };
  }
  autoExtend();
  autosave();
  renderAll();
}

function deleteRegion() {
  if (!region) return;
  pushUndo();
  const noteIds = new Set(notesInRegion().map(n => n.id));
  const bendIds = new Set(bendsInRegion().map(b => b.id));
  project.notes = project.notes.filter(n => !noteIds.has(n.id));
  project.pitchBend = project.pitchBend.filter(b => !bendIds.has(b.id));
  region = null;
  autosave();
  renderAll();
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

function isOnResizeHandleRight(x, y, note) {
  const nx = tickToX(note.startTick);
  const nw = (note.durationTicks / PPQ) * hZoom;
  const rightEdge = nx + nw;
  return x >= rightEdge - RESIZE_HANDLE_W && x <= rightEdge + 2;
}

function isOnResizeHandleLeft(x, y, note) {
  const nx = tickToX(note.startTick);
  return x >= nx - 2 && x <= nx + RESIZE_HANDLE_W;
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
    
    if (hit && isOnResizeHandleRight(x, y, hit)) {
      // Resize from right edge
      pushUndo();
      selectedNoteId = hit.id;
      selectedBendId = null;
      dragMode = 'resize';
      dragTarget = hit;
      dragStartX = x;
      dragOrigDur = hit.durationTicks;
      el.setPointerCapture(e.pointerId);
    } else if (hit && isOnResizeHandleLeft(x, y, hit)) {
      // Resize from left edge
      pushUndo();
      selectedNoteId = hit.id;
      selectedBendId = null;
      dragMode = 'resize-left';
      dragTarget = hit;
      dragStartX = x;
      dragOrigTick = hit.startTick;
      dragOrigDur = hit.durationTicks;
      el.setPointerCapture(e.pointerId);
    } else if (hit) {
      pushUndo();
      // Option/Alt+click: duplicate the note and drag the copy
      let target = hit;
      if (e.altKey) {
        const dup = { ...hit, id: uuid() };
        project.notes.push(dup);
        project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
        target = dup;
      }
      // Move — preview the note's pitch
      selectedNoteId = target.id;
      selectedBendId = null;
      dragMode = 'move';
      dragTarget = target;
      dragStartX = x; dragStartY = y;
      dragOrigTick = target.startTick;
      dragOrigPitch = target.pitch;
      dragPreviewPitch = target.pitch;
      previewNote(target);
      el.setPointerCapture(e.pointerId);
    } else if (e.shiftKey || e.button === 1) {
      // Pan
      dragMode = 'pan';
      dragStartX = e.clientX; dragStartY = e.clientY;
      el.setPointerCapture(e.pointerId);
    } else if (region && isInRegion(tick, pitch)) {
      // Click inside existing region — start region move
      dragMode = 'region-move';
      dragStartX = x; dragStartY = y;
      dragOrigTick = region.startTick;
      dragOrigPitch = region.highPitch;
      pushUndo();
      el.setPointerCapture(e.pointerId);
    } else {
      // Empty area — defer: might be click (insert note) or drag (region select)
      dragMode = 'pending';
      dragStartX = x; dragStartY = y;
      pendingClickTick = tick;
      pendingClickPitch = pitch;
      selectedNoteId = null;
      selectedBendId = null;
      region = null;
      el.setPointerCapture(e.pointerId);
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
      // Re-trigger audio preview when pitch changes
      if (dragTarget.pitch !== dragPreviewPitch) {
        dragPreviewPitch = dragTarget.pitch;
        previewNote(dragTarget);
      }
      ensureTickVisible(dragTarget.startTick + dragTarget.durationTicks);
    } else if (dragMode === 'resize' && dragTarget) {
      const dx = x - dragStartX;
      const tickDelta = (dx / hZoom) * PPQ;
      dragTarget.durationTicks = Math.max(minDuration(), snapTick(dragOrigDur + tickDelta));
      ensureTickVisible(dragTarget.startTick + dragTarget.durationTicks);
    } else if (dragMode === 'resize-left' && dragTarget) {
      const dx = x - dragStartX;
      const tickDelta = (dx / hZoom) * PPQ;
      const newStart = snapTick(dragOrigTick + tickDelta);
      const endTick = dragOrigTick + dragOrigDur;
      // Don't let start go past the end or below 0
      const clampedStart = Math.max(0, Math.min(newStart, endTick - minDuration()));
      dragTarget.durationTicks = endTick - clampedStart;
      dragTarget.startTick = clampedStart;
      ensureTickVisible(clampedStart);
    } else if (dragMode === 'pending') {
      const dx = Math.abs(x - dragStartX);
      const dy = Math.abs(y - dragStartY);
      if (dx > 4 || dy > 4) {
        // Threshold crossed — switch to region creation
        dragMode = 'region-create';
      }
    } else if (dragMode === 'region-create') {
      const t1 = xToTick(dragStartX), t2 = xToTick(x);
      const p1 = yToPitch(dragStartY), p2 = yToPitch(y);
      region = {
        startTick: snapTick(Math.min(t1, t2)),
        endTick: snapTick(Math.max(t1, t2)),
        lowPitch: Math.min(p1, p2),
        highPitch: Math.max(p1, p2)
      };
    } else if (dragMode === 'region-move') {
      const dx = x - dragStartX;
      const dy = y - dragStartY;
      const tickDelta = snapTick((dx / hZoom) * PPQ);
      const pitchDelta = -Math.round(dy / vZoom);
      // Move region bounds
      const dur = region.endTick - region.startTick;
      const pitchSpan = region.highPitch - region.lowPitch;
      region.startTick = Math.max(0, dragOrigTick + tickDelta);
      region.endTick = region.startTick + dur;
      region.highPitch = clamp(dragOrigPitch + pitchDelta, PITCH_MIN + pitchSpan, PITCH_MAX);
      region.lowPitch = region.highPitch - pitchSpan;
    } else if (dragMode === 'pan') {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      scrollX = Math.max(0, scrollX - dx);
      scrollY = Math.max(0, scrollY - dy);
      dragStartX = e.clientX; dragStartY = e.clientY;
    }
    renderAll();
  });
  
  const pointerUp = (e) => {
    if (dragMode === 'move' || dragMode === 'resize' || dragMode === 'resize-left') {
      autoExtend();
      autosave();
    } else if (dragMode === 'pending') {
      // No drag happened — insert a note
      const pitch = pendingClickPitch;
      const snapped = snapTick(pendingClickTick);
      if (pitch >= PITCH_MIN && pitch <= PITCH_MAX && snapped >= 0) {
        pushUndo();
        const n = {
          id: uuid(),
          pitch: clamp(pitch, PITCH_MIN, PITCH_MAX),
          startTick: Math.max(0, snapped),
          durationTicks: minDuration(),
          velocity: 0.8,
          bendActive: true,
          instrument: activeInstrument
        };
        project.notes.push(n);
        project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
        selectedNoteId = n.id;
        selectedBendId = null;
        autoExtend();
        autosave();
        previewNote(n);
      }
      renderAll();
    } else if (dragMode === 'region-move') {
      // Apply tick/pitch delta to all notes & bends in original region
      const tickDelta = region.startTick - dragOrigTick;
      const pitchDelta = region.highPitch - dragOrigPitch;
      for (const n of project.notes) {
        if (isNoteInOrigRegion(n, dragOrigTick, dragOrigTick + (region.endTick - region.startTick), dragOrigPitch - (region.highPitch - region.lowPitch), dragOrigPitch)) {
          n.startTick = Math.max(0, n.startTick + tickDelta);
          n.pitch = clamp(n.pitch + pitchDelta, PITCH_MIN, PITCH_MAX);
        }
      }
      const origEndTick = dragOrigTick + (region.endTick - region.startTick);
      for (const b of project.pitchBend) {
        if (b.tick >= dragOrigTick && b.tick <= origEndTick) {
          b.tick = Math.max(0, b.tick + tickDelta);
        }
      }
      project.pitchBend.sort((a, b) => a.tick - b.tick);
      autoExtend();
      autosave();
      renderAll();
    }
    dragMode = null; dragTarget = null; dragPreviewPitch = -1;
  };
  el.addEventListener('pointerup', pointerUp);
  el.addEventListener('pointercancel', pointerUp);
  
  // Cursor feedback for resize handles & regions
  el.addEventListener('pointermove', (e) => {
    if (dragMode) return; // already handled above
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = noteAt(x, y);
    if (hit && (isOnResizeHandleLeft(x, y, hit) || isOnResizeHandleRight(x, y, hit))) {
      el.style.cursor = 'ew-resize';
    } else if (hit) {
      el.style.cursor = 'grab';
    } else if (region && isInRegion(xToTick(x), yToPitch(y))) {
      el.style.cursor = 'move';
    } else {
      el.style.cursor = 'crosshair';
    }
  }, { passive: true });

  // Wheel: scroll + zoom
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom horizontal
      hZoom = clamp(hZoom * (e.deltaY < 0 ? 1.15 : 0.87), 20, 240);
    } else {
      // Two-finger trackpad: deltaX = horizontal, deltaY = vertical
      if (e.deltaX !== 0) scrollX = Math.max(0, scrollX + e.deltaX);
      if (e.deltaY !== 0) scrollY = Math.max(0, scrollY + e.deltaY);
    }
    autoExtend();
    renderAll();
  }, { passive: false });
}

// ─── Bend Lane Interaction ───────────────────────────────────────────
function bendPointAt(x, y) {
  const c = bendCanvas;
  const h = c.height / devicePixelRatio;
  
  for (let i = project.pitchBend.length - 1; i >= 0; i--) {
    const pt = project.pitchBend[i];
    const px = tickToX(pt.tick);
    const py = centsToY(pt.cents, h);
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
    } else if (region && xToTick(x) >= region.startTick && xToTick(x) <= region.endTick) {
      // Click inside existing region from bend lane — start region move
      dragMode = 'region-move';
      dragStartX = x; dragStartY = y;
      dragOrigTick = region.startTick;
      dragOrigPitch = region.highPitch;
      pushUndo();
      el.setPointerCapture(e.pointerId);
    } else {
      // Defer: click inserts, drag creates region
      dragMode = 'bend-pending';
      dragStartX = x; dragStartY = y;
      selectedBendId = null;
      selectedNoteId = null;
      region = null;
      el.setPointerCapture(e.pointerId);
    }
    renderAll();
  });
  
  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const h = rect.height;

    if (dragMode === 'bend' && dragTarget) {
      const dx = x - dragStartX;
      const tickDelta = (dx / hZoom) * PPQ;
      dragTarget.tick = Math.max(0, snapTick(dragOrigBendTick + tickDelta));
      const rawCents = yToCents(y, h);
      dragTarget.cents = clamp(snapCents(rawCents), -BEND_MAX_CENTS, BEND_MAX_CENTS);
      project.pitchBend.sort((a, b) => a.tick - b.tick);
      ensureTickVisible(dragTarget.tick);
    } else if (dragMode === 'bend-pending') {
      if (Math.abs(x - dragStartX) > 4) {
        dragMode = 'bend-region-create';
      }
    } else if (dragMode === 'bend-region-create') {
      const t1 = xToTick(dragStartX), t2 = xToTick(x);
      region = {
        startTick: snapTick(Math.min(t1, t2)),
        endTick: snapTick(Math.max(t1, t2)),
        lowPitch: PITCH_MIN,
        highPitch: PITCH_MAX
      };
    } else if (dragMode === 'region-move') {
      const dx = x - dragStartX;
      const tickDelta = snapTick((dx / hZoom) * PPQ);
      const dur = region.endTick - region.startTick;
      region.startTick = Math.max(0, dragOrigTick + tickDelta);
      region.endTick = region.startTick + dur;
    } else {
      return;
    }
    renderAll();
  });
  
  const pointerUp = () => {
    if (dragMode === 'bend') { autoExtend(); autosave(); }
    else if (dragMode === 'bend-pending') {
      // No drag — insert bend point
      const rect = el.getBoundingClientRect();
      const h = rect.height;
      const tick = snapTick(xToTick(dragStartX));
      const rawCents = yToCents(dragStartY, h);
      const cents = clamp(snapCents(rawCents), -BEND_MAX_CENTS, BEND_MAX_CENTS);
      pushUndo();
      const pt = { id: uuid(), tick: Math.max(0, tick), cents };
      project.pitchBend.push(pt);
      project.pitchBend.sort((a, b) => a.tick - b.tick);
      selectedBendId = pt.id;
      selectedNoteId = null;
      autoExtend();
      autosave();
      renderAll();
    } else if (dragMode === 'region-move') {
      // Apply tick delta to all notes & bends in original region
      const tickDelta = region.startTick - dragOrigTick;
      const pitchDelta = region.highPitch - dragOrigPitch;
      const origEndTick = dragOrigTick + (region.endTick - region.startTick);
      const origLowPitch = dragOrigPitch - (region.highPitch - region.lowPitch);
      for (const n of project.notes) {
        if (isNoteInOrigRegion(n, dragOrigTick, origEndTick, origLowPitch, dragOrigPitch)) {
          n.startTick = Math.max(0, n.startTick + tickDelta);
          n.pitch = clamp(n.pitch + pitchDelta, PITCH_MIN, PITCH_MAX);
        }
      }
      for (const b of project.pitchBend) {
        if (b.tick >= dragOrigTick && b.tick <= origEndTick) {
          b.tick = Math.max(0, b.tick + tickDelta);
        }
      }
      project.pitchBend.sort((a, b) => a.tick - b.tick);
      autoExtend();
      autosave();
      renderAll();
    }
    dragMode = null; dragTarget = null;
  };
  el.addEventListener('pointerup', pointerUp);
  el.addEventListener('pointercancel', pointerUp);
  
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      hZoom = clamp(hZoom * (e.deltaY < 0 ? 1.15 : 0.87), 20, 240);
    } else {
      if (e.deltaX !== 0) scrollX = Math.max(0, scrollX + e.deltaX);
      if (e.deltaY !== 0) scrollX = Math.max(0, scrollX + e.deltaY);
    }
    autoExtend();
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
    ensureTickVisible(tick);
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
  const inst = project.instruments[note.instrument || 0];
  const vt = inst?.voice || voiceType;

  // WAF preview — short sample hit
  if (isWafVoice(vt) && wafPlayer && wafPresets[vt]) {
    wafPlayer.queueWaveTable(audioCtx, masterGain, wafPresets[vt],
      audioCtx.currentTime, note.pitch, 0.3, 0.4);
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = vt === 'plucky' ? 'triangle' : vt;
  osc.frequency.value = pitchFreq(note.pitch);
  osc.connect(gain);
  gain.connect(masterGain);
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
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
    velocity: n.velocity,
    bendActive: n.bendActive !== false,
    instrument: n.instrument || 0
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
      durationSeconds: parseFloat(totalS.toFixed(3)),
      instruments: project.instruments || []
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
    // Enter blurs any focused input/select so you can get back to the grid
    if (e.code === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      e.preventDefault();
      e.target.blur();
      return;
    }
    // Don't capture when typing in inputs or modal is open
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (!document.getElementById('modal-overlay').classList.contains('hidden')) return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
      e.preventDefault();
      copyRegion();
    } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
      e.preventDefault();
      pasteAtPlayhead();
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      if (region) deleteRegion();
      else deleteSelected();
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
    } else if (e.code === 'Escape') {
      e.preventDefault();
      region = null;
      selectedNoteId = null;
      selectedBendId = null;
      renderAll();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      if (isPlaying) stopPlayback();
      playStartTick = 0;
      renderAll();
    } else if (e.code === 'Comma' || e.code === 'Period') {
      // , / . — cycle through notes overlapping the playhead
      e.preventDefault();
      cycleNoteAtPlayhead(e.code === 'Period' ? 1 : -1);
    } else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      if (selectedNoteId) {
        e.preventDefault();
        nudgeSelectedNote(0, e.code === 'ArrowUp' ? 1 : -1, e.shiftKey);
      }
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
      if (selectedNoteId) {
        nudgeSelectedNote(e.code === 'ArrowRight' ? 1 : -1, 0, e.shiftKey);
      } else {
        // Move playhead by snap unit (or beat with shift)
        const step = e.shiftKey ? PPQ : snapTicks();
        const dir = e.code === 'ArrowRight' ? 1 : -1;
        playStartTick = Math.max(0, snapTick(playStartTick + dir * step));
        ensureTickVisible(playStartTick);
        renderAll();
      }
    }
  });
}

// ─── Note cycling & nudging ──────────────────────────────────────────
function cycleNoteAtPlayhead(dir) {
  const tick = playheadTick();
  // Find all notes whose time range overlaps the playhead
  const overlapping = project.notes.filter(n =>
    tick >= n.startTick && tick < n.startTick + n.durationTicks
  );
  if (overlapping.length === 0) {
    // Nothing at playhead — try nearest note ahead or behind
    const sorted = [...project.notes].sort((a, b) => a.startTick - b.startTick);
    if (sorted.length === 0) return;
    let pick;
    if (dir > 0) {
      pick = sorted.find(n => n.startTick >= tick) || sorted[0];
    } else {
      pick = [...sorted].reverse().find(n => n.startTick <= tick) || sorted[sorted.length - 1];
    }
    selectedNoteId = pick.id;
    selectedBendId = null;
    previewNote(pick);
    renderAll();
    return;
  }
  // Sort overlapping by pitch (low to high) for consistent ordering
  overlapping.sort((a, b) => a.pitch - b.pitch);
  const curIdx = overlapping.findIndex(n => n.id === selectedNoteId);
  let nextIdx;
  if (curIdx === -1) {
    nextIdx = dir > 0 ? 0 : overlapping.length - 1;
  } else {
    nextIdx = (curIdx + dir + overlapping.length) % overlapping.length;
  }
  const pick = overlapping[nextIdx];
  selectedNoteId = pick.id;
  selectedBendId = null;
  previewNote(pick);
  renderAll();
}

function nudgeSelectedNote(tickDir, pitchDir, large) {
  const n = project.notes.find(n => n.id === selectedNoteId);
  if (!n) return;
  pushUndo();
  if (pitchDir !== 0) {
    // Shift = octave (12 semitones), otherwise 1 semitone
    const delta = large ? pitchDir * 12 : pitchDir;
    n.pitch = clamp(n.pitch + delta, PITCH_MIN, PITCH_MAX);
    previewNote(n);
  }
  if (tickDir !== 0) {
    // Shift = beat, otherwise snap unit
    const step = large ? PPQ : snapTicks();
    n.startTick = Math.max(0, n.startTick + tickDir * step);
    autoExtend();
    ensureTickVisible(n.startTick + n.durationTicks);
  }
  autosave();
  renderAll();
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
  voiceEl.addEventListener('change', () => {
    voiceType = voiceEl.value;
    ensureInstruments();
    project.instruments[activeInstrument].voice = voiceType;
    autosave();
  });
  
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
  
  // Save / Load / New
  document.getElementById('btn-save').addEventListener('click', showSaveModal);
  document.getElementById('btn-load').addEventListener('click', showLoadModal);
  document.getElementById('btn-new').addEventListener('click', showNewModal);
  
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
  
  // Import
  const importFileEl = document.getElementById('import-file');
  document.getElementById('imp-json').addEventListener('click', () => {
    importFileEl.click();
  });
  importFileEl.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importJSON(data, file.name);
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    importFileEl.value = ''; // reset so same file can be re-imported
  });
}

// ─── Import ──────────────────────────────────────────────────────────
function importJSON(data, filename) {
  // Support two formats:
  // 1. pitch-timeline/v1-export (our export format)
  // 2. Raw project (from IndexedDB save)
  
  if (data.schema === 'pitch-timeline/v1-export') {
    // Export format — reconstruct a project from it
    pushUndo();
    const p = data.project;
    project.title = p.title || filename.replace(/\.json$/, '') || 'Imported';
    project.settings.tempoBpm = p.tempoBpm || 120;
    project.settings.timeSignature = p.timeSignature || { numerator: 4, denominator: 4 };
    project.settings.bendRangeCents = p.bendRangeCents || BEND_MAX_CENTS;
    project.settings.totalBars = p.totalBars || 8;
    
    // Import notes — convert from export format back to internal
    project.notes = (data.notes || []).map(n => ({
      id: uuid(),
      pitch: n.pitch,
      startTick: n.startTick,
      durationTicks: n.durationTicks,
      velocity: n.velocity || 0.8,
      bendActive: n.bendActive !== false,
      instrument: n.instrument || 0
    }));
    
    // Import instruments list
    if (p.instruments && p.instruments.length > 0) {
      project.instruments = p.instruments;
    }
    
    // Import pitch bends
    project.pitchBend = (data.pitchBend || []).map(b => ({
      id: uuid(),
      tick: b.tick,
      cents: b.cents
    }));
    
    project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
    project.pitchBend.sort((a, b) => a.tick - b.tick);
    
  } else if (data.schema === 'pitch-timeline/v1' || data.notes) {
    // Raw project format
    pushUndo();
    if (data.title) project.title = data.title;
    if (data.settings) Object.assign(project.settings, data.settings);
    project.notes = (data.notes || []).map(n => ({
      id: n.id || uuid(),
      pitch: n.pitch,
      startTick: n.startTick,
      durationTicks: n.durationTicks,
      velocity: n.velocity || 0.8,
      bendActive: n.bendActive !== false,
      instrument: n.instrument || 0
    }));
    if (data.instruments && data.instruments.length > 0) {
      project.instruments = data.instruments;
    }
    project.pitchBend = (data.pitchBend || []).map(b => ({
      id: b.id || uuid(),
      tick: b.tick,
      cents: b.cents
    }));
  } else {
    alert('Unrecognized JSON format');
    return;
  }
  
  selectedNoteId = null;
  selectedBendId = null;
  region = null;
  playStartTick = 0;
  undoStack = []; redoStack = [];
  autoExtend();
  syncUIFromProject();
  autosave();
  renderAll();
  document.getElementById('project-title').value = project.title;
}

function syncUIFromProject() {
  document.getElementById('project-title').value = project.title;
  document.getElementById('inp-tempo').value = project.settings.tempoBpm;
  document.getElementById('sel-timesig').value = `${project.settings.timeSignature.numerator}/${project.settings.timeSignature.denominator}`;
  document.getElementById('sel-snap').value = project.settings.snapDivisor;
  renderInstrumentBar();
  syncVoiceToActiveInstrument();
}

// ─── Instrument Bar ──────────────────────────────────────────────────
function ensureInstruments() {
  if (!project.instruments || project.instruments.length === 0) {
    project.instruments = [{ name: 'Instrument 1', color: INSTRUMENT_COLORS[0], voice: 'triangle' }];
  }
  // Ensure all instruments have a voice
  for (const inst of project.instruments) {
    if (!inst.voice) inst.voice = 'triangle';
  }
  if (activeInstrument >= project.instruments.length) activeInstrument = 0;
}

function renderInstrumentBar() {
  ensureInstruments();
  const list = document.getElementById('instrument-list');
  list.innerHTML = '';
  project.instruments.forEach((inst, i) => {
    const btn = document.createElement('button');
    btn.className = 'inst-btn' + (i === activeInstrument ? ' active' : '');
    btn.textContent = inst.name;
    btn.style.color = inst.color;
    btn.style.borderColor = i === activeInstrument ? inst.color : 'transparent';
    btn.addEventListener('click', () => {
      activeInstrument = i;
      syncVoiceToActiveInstrument();
      renderInstrumentBar();
      renderAll();
    });
    btn.addEventListener('dblclick', () => {
      renameInstrument(i);
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showInstrumentContextMenu(i, e);
    });
    list.appendChild(btn);
  });
}

function syncVoiceToActiveInstrument() {
  ensureInstruments();
  const inst = project.instruments[activeInstrument];
  if (inst) {
    voiceType = inst.voice || 'triangle';
    document.getElementById('sel-voice').value = voiceType;
  }
}

function addInstrument() {
  ensureInstruments();
  const idx = project.instruments.length;
  const color = INSTRUMENT_COLORS[idx % INSTRUMENT_COLORS.length];
  project.instruments.push({ name: `Instrument ${idx + 1}`, color, voice: 'triangle' });
  activeInstrument = idx;
  autosave();
  renderInstrumentBar();
  renderAll();
}

function renameInstrument(idx) {
  const inst = project.instruments[idx];
  if (!inst) return;
  showModal('Rename Instrument',
    `<input type="text" id="modal-inst-name" value="${inst.name.replace(/"/g, '&quot;')}">`,
    [
      { label: 'Cancel' },
      { label: 'Rename', cls: 'modal-btn-primary', fn: () => {
        inst.name = document.getElementById('modal-inst-name').value.trim() || inst.name;
        autosave();
        renderInstrumentBar();
      }}
    ]
  );
  document.getElementById('modal-inst-name').addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      e.preventDefault();
      inst.name = e.target.value.trim() || inst.name;
      autosave();
      renderInstrumentBar();
      closeModal();
    }
  });
}

function showInstrumentContextMenu(idx, event) {
  // Simple: use a modal for instrument options
  const inst = project.instruments[idx];
  const noteCount = project.notes.filter(n => (n.instrument || 0) === idx).length;
  showModal(`${inst.name}`,
    `<p style="color:#ccc;font-size:13px">${noteCount} notes</p>` +
    `<label style="color:#ccc;font-size:13px">Color: <input type="color" id="modal-inst-color" value="${inst.color}"></label>`,
    [
      { label: 'Cancel' },
      project.instruments.length > 1 ? { label: 'Delete', cls: 'modal-btn-danger', fn: () => {
        pushUndo();
        // Move notes to instrument 0 or remove
        project.notes.forEach(n => { if ((n.instrument || 0) === idx) n.instrument = 0; });
        // Shift higher instrument indices down
        project.notes.forEach(n => { if ((n.instrument || 0) > idx) n.instrument--; });
        project.instruments.splice(idx, 1);
        if (activeInstrument >= project.instruments.length) activeInstrument = 0;
        autosave(); renderInstrumentBar(); renderAll();
      }} : null,
      { label: 'OK', cls: 'modal-btn-primary', fn: () => {
        inst.color = document.getElementById('modal-inst-color').value;
        autosave(); renderInstrumentBar(); renderAll();
      }}
    ].filter(Boolean)
  );
}

function setupInstrumentBar() {
  document.getElementById('btn-add-instrument').addEventListener('click', addInstrument);
  renderInstrumentBar();
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
    if (project.settings.bendRangeCents < BEND_MAX_CENTS) project.settings.bendRangeCents = BEND_MAX_CENTS;
  }
  
  setupUI();
  syncUIFromProject();
  setupInstrumentBar();
  setupSelectionPanel();
  setupGridEvents();
  setupBendEvents();
  setupRulerInteractions();
  setupKeyboard();
  
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
  
  // Initial save for new projects
  autosave();
  
  // Start polling for remote changes
  startPolling();
}

init();

// ─── Public API ──────────────────────────────────────────────────────
// Accessible via browser console or automation: window.composer
window.composer = {
  // Read the full project (internal format)
  getProject: () => JSON.parse(JSON.stringify(project)),
  
  // Read the export format (with seconds, pitchName, etc)
  getExport: () => buildExportData(),
  
  // Get just the notes array
  getNotes: () => project.notes.map(n => ({
    id: n.id, pitch: n.pitch, pitchName: pitchName(n.pitch),
    startTick: n.startTick, durationTicks: n.durationTicks,
    velocity: n.velocity, bendActive: n.bendActive !== false,
    instrument: n.instrument || 0
  })),
  
  // Get pitch bend points
  getBends: () => project.pitchBend.map(b => ({ id: b.id, tick: b.tick, cents: b.cents })),
  
  // Import a full project or export-format JSON (same as file import)
  load: (data) => { importJSON(typeof data === 'string' ? JSON.parse(data) : data, 'api'); },
  
  // Set individual notes (replaces all notes)
  setNotes: (notes) => {
    pushUndo();
    project.notes = notes.map(n => ({
      id: n.id || uuid(),
      pitch: n.pitch,
      startTick: n.startTick,
      durationTicks: n.durationTicks,
      velocity: n.velocity ?? 0.8,
      bendActive: n.bendActive !== false
    }));
    project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
    autoExtend(); autosave(); renderAll();
  },
  
  // Set pitch bend points (replaces all bends)
  setBends: (bends) => {
    pushUndo();
    project.pitchBend = bends.map(b => ({
      id: b.id || uuid(),
      tick: b.tick,
      cents: b.cents
    }));
    project.pitchBend.sort((a, b) => a.tick - b.tick);
    autosave(); renderAll();
  },
  
  // Add notes (appends, doesn't replace)
  addNotes: (notes) => {
    pushUndo();
    for (const n of notes) {
      project.notes.push({
        id: n.id || uuid(),
        pitch: n.pitch,
        startTick: n.startTick,
        durationTicks: n.durationTicks,
        velocity: n.velocity ?? 0.8,
        bendActive: n.bendActive !== false
      });
    }
    project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
    autoExtend(); autosave(); renderAll();
  },
  
  // Remove notes by ID
  removeNotes: (ids) => {
    const idSet = new Set(ids);
    pushUndo();
    project.notes = project.notes.filter(n => !idSet.has(n.id));
    autosave(); renderAll();
  },
  
  // Update specific note properties by ID
  updateNote: (id, props) => {
    const n = project.notes.find(n => n.id === id);
    if (!n) return false;
    pushUndo();
    if (props.pitch !== undefined) n.pitch = props.pitch;
    if (props.startTick !== undefined) n.startTick = props.startTick;
    if (props.durationTicks !== undefined) n.durationTicks = props.durationTicks;
    if (props.velocity !== undefined) n.velocity = props.velocity;
    if (props.bendActive !== undefined) n.bendActive = props.bendActive;
    autoExtend(); autosave(); renderAll();
    return true;
  },
  
  // Bulk update notes by ID
  updateNotes: (updates) => {
    pushUndo();
    for (const { id, ...props } of updates) {
      const n = project.notes.find(n => n.id === id);
      if (!n) continue;
      if (props.pitch !== undefined) n.pitch = props.pitch;
      if (props.startTick !== undefined) n.startTick = props.startTick;
      if (props.durationTicks !== undefined) n.durationTicks = props.durationTicks;
      if (props.velocity !== undefined) n.velocity = props.velocity;
      if (props.bendActive !== undefined) n.bendActive = props.bendActive;
    }
    project.notes.sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
    autoExtend(); autosave(); renderAll();
  },
  
  // Settings
  setTempo: (bpm) => { project.settings.tempoBpm = clamp(bpm, 20, 300); autosave(); renderAll(); },
  setTimeSignature: (num, den) => { project.settings.timeSignature = { numerator: num, denominator: den }; autosave(); renderAll(); },
  setSnap: (div) => { project.settings.snapDivisor = div; },
  
  // Utilities
  tickToSec, secToTick, pitchName, pitchFreq,
  PPQ: () => PPQ,
  barLengthTicks,
  
  // Transport
  play: () => startPlayback(),
  stop: () => stopPlayback(),
  rewind: () => { if (isPlaying) stopPlayback(); playStartTick = 0; renderAll(); },
  
  // Undo
  undo, redo,
};
