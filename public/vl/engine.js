// Timeline playback engine
// Supports two modes:
// - Time-based: events fire at absolute timestamps (for Liam)  
// - Queued: events fire sequentially, each waiting for the previous to complete (for Caleb)
// Events with wait:true pause the clock until engine.eventDone() is called

const engine = (() => {
  let currentTime = 0;
  let isPlaying = false;
  let lastFrameTime = null;
  let events = [];
  let totalDuration = 30;
  let rafId = null;
  let waiting = false;  // true when clock is paused waiting for eventDone()

  // Callbacks
  let onEvent = null;
  let onTransition = null;
  let onTick = null;

  function play() {
    if (isPlaying) return;
    isPlaying = true;
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    isPlaying = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function seek(time) {
    const wasPlaying = isPlaying;
    if (isPlaying) pause();

    currentTime = Math.max(0, Math.min(time, totalDuration));
    waiting = false;

    // Fire events up to seek point, handling chained events
    let rebased = true;
    while (rebased) {
      rebased = false;
      for (const evt of events) {
        if (evt.time > currentTime) {
          evt.fired = false;
        } else if (!evt.fired) {
          evt.fired = true;
          if (evt.wait) waiting = true;
          if (onEvent) onEvent(evt);
          // For wait events during seek, immediately resolve the chain
          if (waiting) {
            waiting = false;
            // Rebase next delay events from current position
            let t = currentTime;
            for (const e of events) {
              if (!e.fired && e.delay !== undefined) {
                t += e.delay;
                e.time = t;
                rebased = true;
              } else if (!e.fired && e.delay === undefined) {
                break;
              }
            }
          }
        }
      }
    }

    if (onTick) onTick(currentTime);
    if (wasPlaying) play();
  }

  // Called by event handlers when a wait:true event is complete
  function eventDone() {
    if (!waiting) return;
    waiting = false;

    // Set times for ALL upcoming delay-based events until we hit one
    // that has an absolute time (no delay field)
    let t = currentTime;
    for (let i = 0; i < events.length; i++) {
      if (!events[i].fired) {
        if (events[i].delay !== undefined) {
          t += events[i].delay;
          events[i].time = t;
        } else {
          break; // hit an absolute-time event, stop rebasing
        }
      }
    }

    // Rebase frame time and restart tick loop
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  // Skip to a named section — mark all prior events as fired, rebase from currentTime
  function skipTo(sectionName) {
    let found = false;
    for (const evt of events) {
      if ((evt.type === 'section-card' || evt.type === 'section-card-light') && evt.content === sectionName) {
        found = true;
        break;
      }
      evt.fired = true;
    }
    if (found) {
      // Rebase all unfired delay events from currentTime
      let t = currentTime;
      for (const evt of events) {
        if (!evt.fired && evt.delay !== undefined) {
          t += evt.delay;
          evt.time = t;
        }
      }
    }
  }

  function loadEvents(newEvents) {
    events = newEvents.map(e => ({ ...e, fired: false }));
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      totalDuration = Math.max(2000, (lastEvent.time + (lastEvent.duration || 2)) + 2);
    }
  }

  function tick(now) {
    if (!isPlaying) return;

    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    // Only advance time when not waiting (waiting events freeze the clock)
    if (!waiting) currentTime += delta;

    if (currentTime >= totalDuration) {
      currentTime = totalDuration;
      pause();
      if (onTick) onTick(currentTime);
      return;
    }

    // Fire events
    for (const evt of events) {
      if (!evt.fired && evt.time <= currentTime) {
        if (waiting && !evt.eager) continue;
        evt.fired = true;
        if (evt.type === 'transition' && onTransition) {
          onTransition(evt.from, evt.to);
        }
        if (evt.wait && !evt.eager) {
          waiting = true;
        }
        if (onEvent) onEvent(evt);
        if (waiting && !evt.eager) {
          // Schedule any upcoming eager events via setTimeout
          for (const next of events) {
            if (!next.fired && next.eager && next.delay !== undefined) {
              next.fired = true;
              setTimeout(() => { if (onEvent) onEvent(next); }, next.delay * 1000);
            }
          }
          break;
        }
      }
    }

    if (onTick) onTick(currentTime);
    rafId = requestAnimationFrame(tick);
  }

  function reset() {
    pause();
    currentTime = 0;
    waiting = false;
    for (const evt of events) evt.fired = false;
    if (onTick) onTick(0);
  }

  const api = {
    play,
    pause,
    seek,
    reset,
    loadEvents,
    eventDone,
    skipTo,
    get currentTime() { return currentTime; },
    get isPlaying() { return isPlaying; },
    get totalDuration() { return totalDuration; },
    set totalDuration(v) { totalDuration = v; },
    set onEvent(fn) { onEvent = fn; },
    set onTransition(fn) { onTransition = fn; },
    set onTick(fn) { onTick = fn; },
    get onTick() { return onTick; },
    get onEvent() { return onEvent; },
    get onTransition() { return onTransition; },
  };

  return api;
})();
