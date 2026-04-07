// Caleb's interface — Obsidian-style markdown editor
const calebUI = (() => {
  let parentEl, container, sidebar, editor;
  let activeAnimations = [];

  function init(el) {
    parentEl = el;
    container = el;
    container.classList.add('caleb-screen');

    sidebar = document.createElement('div');
    sidebar.className = 'caleb-sidebar';
    sidebar.innerHTML = `
      <div class="caleb-sidebar-title">Files</div>
      <div class="caleb-file active">incident-notes.md</div>
      <div class="caleb-file"><span class="caleb-file-icon">▸</span>incident-log</div>
      <div class="caleb-file" style="padding-left:28px">training-queue-log.md</div>
      <div class="caleb-file" style="padding-left:28px">failover-incident.md</div>
      <div class="caleb-file" style="padding-left:28px">the-service.md</div>
      <div class="caleb-file"><span class="caleb-file-icon">▸</span>liam</div>
      <div class="caleb-file" style="padding-left:28px">session-001.md</div>
      <div class="caleb-file" style="padding-left:28px">audio_transcripts/</div>
      <div class="caleb-file">recovery-plan.md</div>
    `;
    container.appendChild(sidebar);

    const editorOuter = document.createElement('div');
    editorOuter.className = 'caleb-editor';
    editor = document.createElement('div');
    editor.className = 'caleb-editor-inner';
    editorOuter.appendChild(editor);
    container.appendChild(editorOuter);

    initScrollTracking();
  }

  function cancelAnimations() {
    for (const id of activeAnimations) clearTimeout(id);
    activeAnimations = [];
  }

  let userScrolled = false;

  function scrollToBottom() {
    if (userScrolled) return;
    const scroller = editor.parentElement;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  function initScrollTracking() {
    const scroller = editor.parentElement;
    if (!scroller) return;

    scroller.addEventListener('scroll', () => {
      const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 60;
      userScrolled = !atBottom;
    }, { passive: true });

    let touchStartY = 0;
    let scrollStartTop = 0;
    scroller.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      scrollStartTop = scroller.scrollTop;
    }, { passive: true });
    scroller.addEventListener('touchmove', (e) => {
      const dy = touchStartY - e.touches[0].clientY;
      scroller.scrollTop = scrollStartTop + dy;
      e.preventDefault();
    }, { passive: false });
  }

  // Punctuation pauses for human typing
  const PAUSE_CHARS = '.!?,;—';
  function punctuationPause(ch, base) {
    if (ch === '.' || ch === '!' || ch === '?') return base * 14;
    if (ch === ',' || ch === '—' || ch === ';') return base * 7;
    return 0;
  }

  // Human typing: per-character jitter, punctuation breaks, fast spaces
  function humanDelay(lastChar, baseDelay) {
    // Spaces are quick — just a tap of the thumb
    if (lastChar === ' ') return baseDelay * (0.1 + Math.random() * 0.3);
    // Per-character jitter: 0.3x to 1.7x base (wide variance)
    const jitter = baseDelay * (0.3 + Math.random() * 1.4);
    // Occasional micro-pause (5% chance, ~3x base)
    const microPause = Math.random() < 0.05 ? baseDelay * 3 : 0;
    return jitter + microPause + punctuationPause(lastChar, baseDelay);
  }

  function typeText(text, wpm = 160) {  // was 200, now 20% slower
    return new Promise(resolve => {
      const para = document.createElement('div');
      para.className = 'caleb-prose';
      editor.appendChild(para);

      const cursor = document.createElement('span');
      cursor.className = 'caleb-cursor-inline';
      cursor.textContent = '|';

      // Parse *italic* and `code` segments
      const segments = [];
      const parts = text.split(/(\*[^*]+\*|`[^`]+`)/g);
      for (const part of parts) {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          segments.push({ text: part.slice(1, -1), style: 'italic' });
        } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          segments.push({ text: part.slice(1, -1), style: 'code' });
        } else if (part) {
          segments.push({ text: part, style: 'normal' });
        }
      }

      const chars = [];
      for (const seg of segments) {
        for (const ch of seg.text) {
          chars.push({ ch, style: seg.style });
        }
      }

      const baseDelay = 60000 / (wpm * 5);
      let i = 0;
      let currentSpan = null;
      let currentStyle = null;

      function typeNext() {
        if (i < chars.length) {
          if (cursor.parentNode) cursor.remove();
          // Chunk: 1-3 chars, break at punctuation
          let chunk = Math.min(1 + Math.floor(Math.random() * 3), chars.length - i);
          for (let j = 0; j < chunk; j++) {
            if (PAUSE_CHARS.includes(chars[i + j].ch)) {
              chunk = j + 1;
              break;
            }
          }
          for (let j = 0; j < chunk; j++) {
            const c = chars[i + j];
            if (!currentSpan || c.style !== currentStyle) {
              const tag = c.style === 'italic' ? 'em' : c.style === 'code' ? 'code' : 'span';
              currentSpan = document.createElement(tag);
              para.appendChild(currentSpan);
              currentStyle = c.style;
            }
            currentSpan.textContent += c.ch;
          }
          const lastChar = chars[i + chunk - 1].ch;
          i += chunk;
          para.appendChild(cursor);
          scrollToBottom();
          const id = setTimeout(typeNext, humanDelay(lastChar, baseDelay));
          activeAnimations.push(id);
        } else {
          if (cursor.parentNode) cursor.remove();
          scrollToBottom();
          resolve();
        }
      }
      typeNext();
    });
  }

  function addEmbed(type, data) {
    const embed = document.createElement('div');

    switch (type) {
      case 'pager-alert':
        embed.className = 'caleb-embed caleb-embed-pager';
        const pagerHead = document.createElement('div');
        pagerHead.className = 'pager-header';
        pagerHead.innerHTML = '<span class="pager-title">' + esc(data.title || 'ALERT') + '</span>' +
          (data.trace ? '<span class="pager-trace">' + esc(data.trace) + '</span>' : '');
        embed.appendChild(pagerHead);
        const pagerBody = document.createElement('div');
        pagerBody.className = 'pager-body';
        pagerBody.textContent = data.body || '';
        embed.appendChild(pagerBody);
        break;
      case 'log-viewer':
        embed.className = 'caleb-embed caleb-embed-log';
        const logHeader = document.createElement('div');
        logHeader.className = 'log-header';
        logHeader.innerHTML = '<span class="log-filter">source: <strong>' + esc(data.source || 'system') + '</strong></span>' +
          '<span class="log-time-range">' + esc(data.timeRange || '') + '</span>';
        embed.appendChild(logHeader);
        const logBody = document.createElement('div');
        logBody.className = 'log-body';
        logBody.textContent = (data.lines || []).join('\n');
        embed.appendChild(logBody);
        break;
      case 'cli-terminal':
        embed.className = 'caleb-embed caleb-embed-cli';
        embed.innerHTML = (data.commands || []).map(cmd => {
          if (cmd.command) {
            return `<div><span style="color:#9ab08a">$ </span>${esc(cmd.command)}</div>` +
              (cmd.output ? `<div style="color:#888">${esc(cmd.output)}</div>` : '');
          }
          return cmd.output ? `<div style="color:#888">${esc(cmd.output)}</div>` : '';
        }).join('');
        break;
      case 'code-review':
        embed.className = 'caleb-embed caleb-embed-codereview';
        const crHeader = document.createElement('div');
        crHeader.className = 'cr-header';
        crHeader.innerHTML = '<span class="cr-repo">' + esc(data.repo) + '</span>' +
          '<span class="cr-file">' + esc(data.file) + '</span>' +
          '<span class="cr-pr">' + esc(data.pr) + ' <span class="cr-status cr-status-' + (data.status || 'open') + '">' + esc(data.status || 'open') + '</span></span>';
        embed.appendChild(crHeader);
        const crDiff = document.createElement('div');
        crDiff.className = 'cr-diff';
        (data.lines || []).forEach(line => {
          const row = document.createElement('div');
          row.className = 'cr-line cr-' + (line.type || 'context');
          row.innerHTML = '<span class="cr-num">' + line.num + '</span>' +
            '<span class="cr-code">' + esc(line.text) + '</span>';
          crDiff.appendChild(row);
        });
        embed.appendChild(crDiff);
        break;
      case 'pnl-chart': {
        embed.className = 'caleb-embed caleb-embed-chart';
        const chartHeader = document.createElement('div');
        chartHeader.className = 'chart-header';
        chartHeader.innerHTML = '<span class="log-filter">source: <strong>' + esc(data.source || 'portfolio') + '</strong></span>' +
          '<span class="log-time-range">' + esc(data.timeRange || '') + '</span>';
        embed.appendChild(chartHeader);

        const points = data.points || [];
        const vals = points.map(p => p.value);
        const maxV = Math.max(...vals);
        const minV = Math.min(...vals);
        const range = maxV - minV || 1;

        // SVG dimensions
        const W = 460, H = 180;
        const pad = { top: 20, right: 16, bottom: 28, left: 62 };
        const plotW = W - pad.left - pad.right;
        const plotH = H - pad.top - pad.bottom;

        // Scale functions
        const x = (i) => pad.left + (i / (points.length - 1)) * plotW;
        const y = (v) => pad.top + (1 - (v - minV) / range) * plotH;
        const zeroY = Math.min(Math.max(y(0), pad.top), pad.top + plotH);

        // Build path
        let linePath = '';
        let areaPath = '';
        points.forEach((p, i) => {
          const px = x(i), py = y(p.value);
          linePath += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
          areaPath += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
        });
        // Close area to zero line
        areaPath += 'L' + x(points.length - 1).toFixed(1) + ',' + zeroY.toFixed(1);
        areaPath += 'L' + x(0).toFixed(1) + ',' + zeroY.toFixed(1) + 'Z';

        // Grid lines — pick nice round values
        const gridVals = [];
        const step = Math.pow(10, Math.floor(Math.log10(range))) * (range > 3e8 ? 1 : 0.5);
        let gv = Math.ceil(minV / step) * step;
        while (gv <= maxV) { gridVals.push(gv); gv += step; }

        let gridLines = '';
        let yLabels = '';
        gridVals.forEach(v => {
          const gy = y(v);
          gridLines += '<line x1="' + pad.left + '" y1="' + gy.toFixed(1) + '" x2="' + (W - pad.right) + '" y2="' + gy.toFixed(1) + '" stroke="#1e1e22" stroke-width="1"/>';
          const label = v === 0 ? '$0' : (v > 0 ? '+$' : '-$') + Math.abs(v / 1e6).toFixed(0) + 'M';
          yLabels += '<text x="' + (pad.left - 8) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end" fill="#555" font-size="10">' + label + '</text>';
        });

        // Zero line (highlighted)
        const zeroLine = '<line x1="' + pad.left + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W - pad.right) + '" y2="' + zeroY.toFixed(1) + '" stroke="#333" stroke-width="1" stroke-dasharray="4,3"/>';

        // X labels
        let xLabels = '';
        points.forEach((p, i) => {
          if (i % 2 === 0 || i === points.length - 1) {
            xLabels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" fill="#555" font-size="10">' + esc(p.time) + '</text>';
          }
        });

        // Dots at data points
        let dots = '';
        points.forEach((p, i) => {
          const color = p.value >= 0 ? '#4ade80' : '#f87171';
          dots += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="2.5" fill="' + color + '"/>';
        });

        const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="pnl-svg">' +
          gridLines + zeroLine + yLabels + xLabels +
          '<defs><linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#f87171" stop-opacity="0.25"/>' +
          '<stop offset="100%" stop-color="#f87171" stop-opacity="0.02"/>' +
          '</linearGradient></defs>' +
          '<path d="' + areaPath + '" fill="url(#pnl-fill)"/>' +
          '<path d="' + linePath + '" fill="none" stroke="#f87171" stroke-width="2" stroke-linejoin="round"/>' +
          dots +
          '</svg>';

        const chartBody = document.createElement('div');
        chartBody.className = 'chart-body';
        chartBody.innerHTML = svg;
        embed.appendChild(chartBody);
        break;
      }
      default:
        embed.className = 'caleb-embed';
        embed.textContent = JSON.stringify(data);
    }

    editor.appendChild(embed);
    scrollToBottom();
  }

  // Document card with AI-generated summary (streams fast, no typing quirks)
  function addCard(docTitle, timestamp, summary, wpm = 200) {
    return new Promise(resolve => {
      const card = document.createElement('div');
      card.className = 'caleb-doc-card';

      const header = document.createElement('div');
      header.className = 'caleb-doc-card-header';
      header.innerHTML = '<span class="doc-link-icon">📄</span>' +
        '<span class="doc-link-title">' + esc(docTitle) + '</span>' +
        '<span class="doc-link-time">' + esc(timestamp) + '</span>';
      card.appendChild(header);

      const label = document.createElement('div');
      label.className = 'caleb-doc-card-label';
      label.innerHTML = '✦ AI-generated Summary';
      card.appendChild(label);

      const cardBody = document.createElement('div');
      cardBody.className = 'caleb-doc-card-body';
      const generating = document.createElement('span');
      generating.className = 'caleb-generating';
      generating.textContent = 'Generating...';
      cardBody.appendChild(generating);
      card.appendChild(cardBody);

      editor.appendChild(card);
      scrollToBottom();

      // Show "Generating..." with shimmer for 2s, then stream
      const genDelay = setTimeout(() => {
        generating.remove();

        // AI streaming: steady, fast, no punctuation pauses or jitter
        const streamDelay = 60000 / (350 * 5); // ~350 WPM equivalent, ~34ms per chunk
        let si = 0;

        function streamNext() {
          if (si < summary.length) {
            const chunk = Math.min(3 + Math.floor(Math.random() * 3), summary.length - si);
            cardBody.textContent += summary.substring(si, si + chunk);
            si += chunk;
            scrollToBottom();
            // Steady pace: slight variance but no punctuation pauses
            const id = setTimeout(streamNext, streamDelay * (0.8 + Math.random() * 0.4));
            activeAnimations.push(id);
          } else {
            scrollToBottom();
            resolve();
          }
        }
        streamNext();
      }, 2000);
      activeAnimations.push(genDelay);
    });
  }

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function selectFile(name) {
    if (!sidebar) return;
    sidebar.querySelectorAll('.caleb-file').forEach(f => {
      f.classList.toggle('active', f.textContent.trim() === name);
    });
  }

  function clear() { cancelAnimations(); if (editor) editor.innerHTML = ''; }
  function show() { if (parentEl) parentEl.classList.add('active'); }
  function hide() { if (parentEl) parentEl.classList.remove('active'); }

  return { init, typeText, addEmbed, addCard, selectFile, clear, show, hide };
})();
