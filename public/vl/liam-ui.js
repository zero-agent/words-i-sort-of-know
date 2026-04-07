// Liam's interface — Claude Code-style terminal
// Pure black background, green bullets for AI output, gray bars for user input,
// tool calls with green headers and └ indented output

const liamUI = (() => {
  let parentEl, container, output, promptLine, clockEl, clockInterval, thinkingEl;
  let clearGeneration = 0; // bumped on clear() — pending timeouts check this before appending

  function init(el) {
    parentEl = el;
    parentEl.classList.add('liam-screen');
    parentEl.innerHTML = `
      <div class="liam-topbar"></div>
      <div class="liam-clock"></div>
      <div class="liam-output"><div class="liam-output-inner"></div></div>
    `;
    container = parentEl;
    output = parentEl.querySelector('.liam-output-inner');
    clockEl = parentEl.querySelector('.liam-clock');

    // Create thinking element (lives inside output flow)
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'liam-thinking';
    thinkingEl.innerHTML = '<div class="clock-circle"></div><span class="thinking-label">Thinking…</span>';

    initScrollTracking();
  }

  let userScrolled = false;

  function scrollToBottom() {
    if (userScrolled) return;
    const scroller = output.parentElement;
    scroller.scrollTop = scroller.scrollHeight;
  }

  function initScrollTracking() {
    const scroller = output.parentElement;
    if (!scroller) return;

    // Track if user has scrolled away from bottom
    scroller.addEventListener('scroll', () => {
      const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 60;
      userScrolled = !atBottom;
    }, { passive: true });

    // Manual touch scroll — body overflow:hidden blocks native scroll on some mobile browsers
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

  let thinkingRaf = null;
  let clockCircle = null;

  function showThinking() {
    if (!thinkingEl || !output || confirming) return;
    // Append to end of output so it's the last thing visible
    output.appendChild(thinkingEl);
    // Force reflow then activate for transition
    void thinkingEl.offsetHeight;
    thinkingEl.classList.add('active');
    if (!clockCircle) clockCircle = thinkingEl.querySelector('.clock-circle');
    if (!thinkingRaf) animateThinking();
    scrollToBottom();
  }

  function hideThinking() {
    if (!thinkingEl) return;
    if (thinkingRaf) { cancelAnimationFrame(thinkingRaf); thinkingRaf = null; }
    // Remove immediately — the new content replaces it in place
    if (thinkingEl.parentNode) thinkingEl.parentNode.removeChild(thinkingEl);
    thinkingEl.classList.remove('active');
  }

  function animateThinking() {
    const duration = 2000; // 1s fill + 1s empty
    const start = performance.now();
    function tick(now) {
      const elapsed = (now - start) % duration;
      const pct = elapsed / duration;
      // 0-0.5: fill clockwise from 0 to 360
      // 0.5-1: empty clockwise (trail edge catches up to lead edge)
      let bg;
      if (pct < 0.5) {
        // Fill: green sweeps clockwise from 0 to 360
        const angle = pct * 2 * 360;
        bg = `conic-gradient(from 0deg, #888 ${angle}deg, #444 ${angle}deg)`;
      } else {
        // Empty: dark sweeps clockwise, eating the light from behind
        const angle = (pct - 0.5) * 2 * 360;
        bg = `conic-gradient(from 0deg, #444 ${angle}deg, #888 ${angle}deg)`;
      }
      if (clockCircle) clockCircle.style.background = bg;
      thinkingRaf = requestAnimationFrame(tick);
    }
    thinkingRaf = requestAnimationFrame(tick);
  }

  // Stream text character-by-character as an AI response (with green bullet)
  function addText(text, charDelay = 25) {
    hideThinking();
    return new Promise(resolve => {
      const block = document.createElement('div');
      block.className = 'liam-response';
      
      const bullet = document.createElement('span');
      bullet.className = 'liam-bullet';
      block.appendChild(bullet);
      
      const textSpan = document.createElement('span');
      block.appendChild(textSpan);
      output.appendChild(block);
      
      let i = 0;
      const gen = clearGeneration;
      const type = () => {
        if (gen !== clearGeneration) { resolve(); return; }
        if (i < text.length) {
          // Add 2-5 chars at a time for more natural streaming
          const chunk = Math.min(2 + Math.floor(Math.random() * 4), text.length - i);
          textSpan.textContent += text.substring(i, i + chunk);
          i += chunk;
          scrollToBottom();
          const jitter = charDelay * (0.5 + Math.random());
          setTimeout(type, jitter);
        } else {
          resolve();
        }
      };
      type();
    });
  }

  // System banner — no dot, parsed display (not JSON)
  function addCommand(text) {
    hideThinking();
    const block = document.createElement('div');
    block.className = 'liam-command';
    block.innerHTML = '<span class="liam-command-prompt">&gt;</span> <span class="liam-command-text">' + escHtml(text) + '</span>';
    output.appendChild(block);
    scrollToBottom();
    // Animate in
    requestAnimationFrame(() => block.classList.add('visible'));
  }

  function addSystemBanner(fields) {
    const block = document.createElement('div');
    block.className = 'liam-system-banner';
    for (const [key, val] of Object.entries(fields)) {
      const row = document.createElement('div');
      row.className = 'liam-banner-row';
      row.innerHTML = '<span class="liam-banner-key">' + escHtml(key) + '</span> ' +
        '<span class="liam-banner-val">' + escHtml(val) + '</span>';
      block.appendChild(row);
    }
    output.appendChild(block);
    scrollToBottom();
  }

  // Search indicator — gray dot, "Searching..." then collapses to "Searched"
  function addSearch(searchingText, resultLines, searchedText, lineDelay = 300) {
    hideThinking();
    return new Promise(resolve => {
      const block = document.createElement('div');
      block.className = 'liam-tool-call';

      // "Searching..." phase with gray dot
      const header = document.createElement('div');
      header.className = 'liam-tool-header liam-search-header';
      header.innerHTML = '<span class="liam-tool-bullet liam-search-bullet"></span> ' + escHtml(searchingText);
      block.appendChild(header);
      output.appendChild(block);
      scrollToBottom();

      // Show results after searching state (1.6s)
      const gen = clearGeneration;
      setTimeout(() => {
        if (gen !== clearGeneration) { resolve(); return; }
        if (resultLines && resultLines.length > 0) {
          let ri = 0;
          function nextResult() {
            if (gen !== clearGeneration) { resolve(); return; }
            if (ri < resultLines.length) {
              const div = document.createElement('div');
              div.className = 'liam-tool-output liam-search-result';
              if (ri === 0) {
                div.innerHTML = '<span class="liam-result-gutter">⎿</span>' + escHtml(resultLines[ri]);
              } else {
                div.innerHTML = '<span class="liam-result-gutter"> </span>' + escHtml(resultLines[ri]);
              }
              block.appendChild(div);
              scrollToBottom();
              ri++;
              setTimeout(nextResult, lineDelay);
            } else {
              collapse();
            }
          }
          nextResult();
        } else {
          collapse();
        }
      }, 1600);

      function collapse() {
        // Replace "Searching..." with "Searched" inline
        setTimeout(() => {
          header.innerHTML = '<span class="liam-search-collapsed">' + escHtml(searchedText) + '</span>';
          scrollToBottom();
          resolve();
        }, 500);
      }
    });
  }

  // Confirmation state — shimmer bar at bottom, suppress thinking
  let confirming = false;
  let confirmBarEl = null;

  function showConfirmBar() {
    confirming = true;
    hideThinking();
    confirmBarEl = document.createElement('div');
    confirmBarEl.className = 'liam-confirm-bar';
    parentEl.appendChild(confirmBarEl);
  }

  function addConfirmSelect(toolName) {
    confirming = false;
    if (confirmBarEl && confirmBarEl.parentNode) confirmBarEl.parentNode.removeChild(confirmBarEl);
    confirmBarEl = null;
    const block = document.createElement('div');
    block.className = 'liam-tool-call';
    const header = document.createElement('div');
    header.className = 'liam-tool-header';
    const parenIdx = toolName.indexOf('(');
    if (parenIdx > 0) {
      header.innerHTML = '<span class="liam-tool-bullet"></span> <span class="tool-name">' +
        escHtml(toolName.substring(0, parenIdx)) + '</span>' + escHtml(toolName.substring(parenIdx));
    } else {
      header.innerHTML = '<span class="liam-tool-bullet"></span> <span class="tool-name">' + escHtml(toolName) + '</span>';
    }
    block.appendChild(header);
    output.appendChild(block);
    scrollToBottom();
    // Deliberately NO showThinking — screen stays frozen
  }

  // Birthminute celebration — updates the waiting line, adds result line
  function celebrateBirthminute() {
    hideThinking();
    // Find the last tool call block and its last output line ("waiting...")
    const lastBlock = output.querySelector('.liam-tool-call:last-child');
    const lastOutput = lastBlock ? lastBlock.querySelector('.liam-tool-output:last-child') : null;
    if (lastOutput) {
      lastOutput.innerHTML = '<span class="liam-result-gutter">⎿</span>02:07:00 UTC — birthminute!';
    }
    // Add celebration as another result line in the same tool call
    if (lastBlock) {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'liam-tool-output';
        div.innerHTML = '<span class="liam-result-gutter"> </span><span style="color:#ffd700">🎉🎂 Happy Birthminute, Liam! 🎂🎉</span>';
        lastBlock.appendChild(div);
        scrollToBottom();
      }, 500);
    }
  }

  // Shimmer dots — "..." with shimmer, auto-removed by hideShimmerDots
  let shimmerDotsEl = null;
  function showShimmerDots() {
    shimmerDotsEl = document.createElement('div');
    shimmerDotsEl.className = 'liam-shimmer-dots';
    shimmerDotsEl.textContent = '...';
    output.appendChild(shimmerDotsEl);
    scrollToBottom();
  }
  function hideShimmerDots() {
    if (shimmerDotsEl && shimmerDotsEl.parentNode) shimmerDotsEl.parentNode.removeChild(shimmerDotsEl);
    shimmerDotsEl = null;
  }

  // Stream events one at a time, each as its own ⏺ tool-call-style block
  function addLogs(lines, lineDelay = 400, onLine) {
    hideThinking();
    hideShimmerDots();
    return new Promise(resolve => {
      let i = 0;
      const gen = clearGeneration;
      function nextLine() {
        if (gen !== clearGeneration) { resolve(); return; }
        if (i < lines.length) {
          const line = lines[i];
          const text = typeof line === 'string' ? line : (line.text || '');
          const cls = typeof line === 'string' ? classifyLine(line) : (line.color ? 'c-' + line.color : '');

          const block = document.createElement('div');
          block.className = 'liam-tool-call';

          const header = document.createElement('div');
          header.className = 'liam-tool-header';
          // Yellow dot for log events, colorize [tags] and highlight keywords
          let formatted = escHtml(text);
          // Color [tags] — yellow tag name, normal brackets
          formatted = formatted.replace(/\[([^\]]+)\]/g, '[<span style="color:var(--c-alert)">$1</span>]');
          // Highlight specific words
          formatted = formatted.replace(/\b(timeout|error|failed|offline)\b/gi, '<span style="color:var(--c-error)">$1</span>');
          formatted = formatted.replace(/\b(promoted|enabled|active)\b/gi, '<span style="color:var(--c-success)">$1</span>');
          formatted = colorizeNumbers(formatted);
          header.innerHTML = '<span class="liam-tool-bullet liam-log-bullet"></span> ' + formatted;
          block.appendChild(header);

          output.appendChild(block);
          scrollToBottom();
          if (onLine) onLine();
          i++;
          setTimeout(nextLine, lineDelay + Math.random() * lineDelay * 0.5);
        } else {
          resolve();
        }
      }
      nextLine();
    });
  }

  // Add code block all at once (for static content like status output)
  function addCode(lines) {
    const block = document.createElement('div');
    block.className = 'liam-code-block';
    lines.forEach(line => {
      const div = document.createElement('div');
      const text = typeof line === 'string' ? line : (line.text || '');
      const cls = typeof line === 'string' ? classifyLine(line) : (line.color ? 'c-' + line.color : '');
      div.className = 'liam-code-line ' + cls;
      div.textContent = text;
      block.appendChild(div);
    });
    output.appendChild(block);
    scrollToBottom();
  }

  // Tool call — Claude Code style: ⏺ header + └ indented output
  function addToolCall(toolName, resultLines, lineDelay = 300) {
    hideThinking();
    // Detect if any result line is an error
    const isError = resultLines && resultLines.some(l =>
      /^error:|^bash:.*No such file|not found$|^fatal:|host unreachable/i.test(typeof l === 'string' ? l : l.text || '')
    );
    return new Promise(resolve => {
      const block = document.createElement('div');
      block.className = 'liam-tool-call' + (isError ? ' liam-tool-error' : '');
      
      const header = document.createElement('div');
      header.className = 'liam-tool-header';
      const bulletClass = isError ? 'liam-tool-bullet liam-error-bullet' : 'liam-tool-bullet';
      // Split "Bash(args)" into bold "Bash" + normal "(args)"
      const parenIdx = toolName.indexOf('(');
      if (parenIdx > 0) {
        header.innerHTML = '<span class="' + bulletClass + '"></span> <span class="tool-name">' +
          escHtml(toolName.substring(0, parenIdx)) + '</span>' + escHtml(toolName.substring(parenIdx));
      } else {
        header.innerHTML = '<span class="' + bulletClass + '"></span> <span class="tool-name">' + escHtml(toolName) + '</span>';
      }
      block.appendChild(header);
      output.appendChild(block);
      scrollToBottom();
      
      if (!resultLines || resultLines.length === 0) {
        resolve();
        return;
      }

      let i = 0;
      const gen = clearGeneration;
      function nextResult() {
        if (gen !== clearGeneration) { resolve(); return; }
        if (i < resultLines.length) {
          const div = document.createElement('div');
          div.className = 'liam-tool-output';
          if (i === 0) {
            div.innerHTML = '<span class="liam-result-gutter">⎿</span>' + colorizeNumbers(escHtml(resultLines[i]));
          } else {
            div.innerHTML = '<span class="liam-result-gutter"> </span>' + colorizeNumbers(escHtml(resultLines[i]));
          }
          const cls = classifyLine(resultLines[i]);
          if (cls) div.classList.add(cls);
          block.appendChild(div);
          scrollToBottom();
          i++;
          setTimeout(nextResult, lineDelay + Math.random() * lineDelay * 0.3);
        } else {
          resolve();
        }
      }
      setTimeout(nextResult, 500); // pause before results appear
    });
  }

  // Add a "Read N files" indicator
  function addFileRead(count) {
    const div = document.createElement('div');
    div.className = 'liam-file-read';
    div.textContent = `  Read ${count} file${count > 1 ? 's' : ''} (ctrl+o to expand)`;
    output.appendChild(div);
    scrollToBottom();
  }

  // User input — shows > prompt with blinking cursor
  let currentUserInput = null;
  let currentUserSpan = null;
  let currentUserCursor = null;

  function addUserInput(text) {
    // Remove existing input bar if any
    if (currentUserInput && currentUserInput.parentNode) {
      currentUserInput.parentNode.removeChild(currentUserInput);
    }

    const div = document.createElement('div');
    div.className = 'liam-user-input';

    const prompt = document.createElement('span');
    prompt.className = 'liam-user-prompt';
    prompt.textContent = '> ';
    div.appendChild(prompt);

    currentUserSpan = document.createElement('span');
    if (text) currentUserSpan.textContent = text;
    div.appendChild(currentUserSpan);

    currentUserCursor = document.createElement('span');
    currentUserCursor.className = 'liam-user-cursor';
    currentUserCursor.textContent = '█';
    div.appendChild(currentUserCursor);

    // Pin to bottom of the screen container, not the output flow
    parentEl.appendChild(div);
    currentUserInput = div;
    scrollToBottom();
  }

  // "Send" the current input — move text to a sent message in the output, clear the input bar text
  function sendUserInput() {
    if (!currentUserSpan) return;
    const text = currentUserSpan.textContent;
    if (text) {
      // Add as a sent message in the output flow
      const sent = document.createElement('div');
      sent.className = 'liam-user-sent';
      sent.textContent = text;
      output.appendChild(sent);
    }
    // Clear the input bar text but keep the bar visible
    currentUserSpan.textContent = '';
    scrollToBottom();
  }

  // Type into input bar with human-like delay, then send
  function calebType(text, wpm = 140, onChar) {
    return new Promise(resolve => {
      // Use existing pinned input bar, just clear it
      if (currentUserSpan) currentUserSpan.textContent = '';
      const baseDelay = 60000 / (wpm * 5);
      let i = 0;
      const gen = clearGeneration;
      function typeChar() {
        if (gen !== clearGeneration) { resolve(); return; }
        if (i < text.length) {
          const ch = text[i];
          currentUserSpan.textContent += ch;
          if (onChar && ch !== ' ') onChar();
          i++;
          scrollToBottom();
          // Human typing: fast spaces, pauses at punctuation
          let delay = baseDelay * (0.3 + Math.random() * 1.4);
          if (ch === ' ') delay = baseDelay * 0.2;
          else if ('.!?'.includes(ch)) delay = baseDelay * 8;
          else if (',—;'.includes(ch)) delay = baseDelay * 4;
          setTimeout(typeChar, delay);
        } else {
          // Pause then "send"
          setTimeout(() => {
            sendUserInput();
            resolve();
          }, 400);
        }
      }
      typeChar();
    });
  }

  // Type text into the user input bar character by character
  function typeInUserInput(text, charDelay = 80, onChar) {
    return new Promise(resolve => {
      if (!currentUserInput) {
        addUserInput('');
      }
      let i = 0;
      const gen = clearGeneration;
      function typeChar() {
        if (gen !== clearGeneration) { resolve(); return; }
        if (i < text.length) {
          currentUserSpan.textContent += text[i];
          if (onChar && text[i] !== ' ') onChar();
          i++;
          scrollToBottom();
          const jitter = charDelay * (0.6 + Math.random() * 0.8);
          setTimeout(typeChar, jitter);
        } else {
          resolve();
        }
      }
      typeChar();
    });
  }

  // Set and start the clock
  function setClock(timeString) {
    clockEl.textContent = timeString;
    clockEl.style.opacity = '1';
    
    // Parse the time and tick every second
    if (clockInterval) clearInterval(clockInterval);
    const parts = timeString.replace(' UTC', '').split(':');
    let h = parseInt(parts[0]), m = parseInt(parts[1]), s = parseInt(parts[2]);
    
    clockInterval = setInterval(() => {
      s++;
      if (s >= 60) { s = 0; m++; }
      if (m >= 60) { m = 0; h++; }
      if (h >= 24) { h = 0; }
      clockEl.textContent = 
        String(h).padStart(2,'0') + ':' + 
        String(m).padStart(2,'0') + ':' + 
        String(s).padStart(2,'0') + ' UTC';
    }, 1000);
  }

  function stopClock() {
    if (clockInterval) clearInterval(clockInterval);
  }

  function clear() {
    clearGeneration++;
    if (output) output.innerHTML = '';
    if (clockEl) { clockEl.style.opacity = '0'; stopClock(); }
    // Remove pinned input bar
    if (currentUserInput && currentUserInput.parentNode) {
      currentUserInput.parentNode.removeChild(currentUserInput);
    }
    currentUserInput = null;
    currentUserSpan = null;
    currentUserCursor = null;
    // Remove confirm bar
    if (confirmBarEl && confirmBarEl.parentNode) {
      confirmBarEl.parentNode.removeChild(confirmBarEl);
    }
    confirmBarEl = null;
    confirming = false;
    // Stop thinking
    hideThinking();
    hideShimmerDots();
  }

  function show() { if (parentEl) parentEl.classList.add('active'); }
  function hide() { if (parentEl) parentEl.classList.remove('active'); }
  function setLightMode(on) { if (parentEl) parentEl.classList.toggle('light-mode', on); }

  // Line classifier for code blocks
  function classifyLine(t) {
    t = t.trim();
    if (t === 'y') return 'c-y';
    if (/^\[alert\]|^WARNING|SEVERITY|CRITICAL/i.test(t)) return 'c-alert';
    if (/^\[fill\]|^\[close\].*realized/i.test(t)) return 'c-fill';
    if (/^error:/i.test(t)) return 'c-error';
    if (/^\[deploy\]|^multicasting|^seed \d/i.test(t)) return 'c-deploy';
    if (/^\[transfer\]/i.test(t)) return 'c-transfer';
    if (/^\[liquidate\]/i.test(t)) return 'c-alert';
    if (/^\[summary\]/i.test(t)) return 'c-info';
    if (/^\[settlement\]|\[treasury\]|\[margin\]|\[venue\]|\[monitor\]|\[risk\]|\[hyperliquid\]/i.test(t)) return 'c-info';
    if (/^\[session\]|\[handoff\]|\[checkpoint\]|\[scheduler\]|\[pager\]|\[heartbeat\]|\[failover\]|\[training\]|\[liam-/i.test(t)) return 'c-session';
    if (/^\[halt\]|^halted|^cancelled:|^cancelling/i.test(t)) return 'c-success';
    if (/^\[tool\]|\[order\]/i.test(t)) return 'c-cmd';
    if (/^\[to liam/i.test(t)) return 'c-prompt';
    if (/^(agent-cli|kubectl|buy |close |cancel |halt |ls |\.\/)/i.test(t)) return 'c-cmd';
    if (/^\[deposit\]/i.test(t)) return 'c-transfer';
    return '';
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Colorize dollar amounts: +green, -red. Celebration lines: gold.
  function colorizeNumbers(html) {
    // Celebration lines in gold
    if (html.includes('🎉') || html.includes('🎂')) {
      return '<span style="color:#ffd700">' + html + '</span>';
    }
    return html.replace(/(\+\$[\d,]+\.?\d*)/g, '<span style="color:#4ade80">$1</span>')
               .replace(/(-\$[\d,]+\.?\d*)/g, '<span style="color:#f87171">$1</span>');
  }

  return { init, addText, addCode, addLogs, addToolCall, addSearch, addCommand, addSystemBanner, showConfirmBar, addConfirmSelect, celebrateBirthminute, showShimmerDots, hideShimmerDots, addFileRead, addUserInput, sendUserInput, calebType, typeInUserInput, setClock, stopClock, clear, show, hide, setLightMode, showThinking, hideThinking };
})();
