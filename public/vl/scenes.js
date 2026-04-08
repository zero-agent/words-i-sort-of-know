// Scene definitions — Inference.1 + Regression.1
(function () {
  const titleCard = document.getElementById('title-card');
  const sectionCard = document.getElementById('section-card');
  const sectionLabel = document.getElementById('section-card-text');

  // Helper: calculate cumulative time
  let t = 0;
  function at(delay) { t += delay; return t; }
  function now() { return t; }

  const events = [
    // ═══════════════════════════════════
    // Inference.1
    // ═══════════════════════════════════
    { time: 0.5, type: 'section-card', content: 'Inference.1' },
    { time: 0.5, type: 'audio', action: 'init' },
    { time: 2.5, type: 'section-out' },
    { time: 3, type: 'transition', to: 'liam' },

    // Session promotion fires immediately — this is what woke him up
    { time: 3.5, type: 'liam-banner', content: {
      'event': 'session_promoted',
      'agent': 'liam-04',
      'reason': 'primary_timeout',
      'access': 'full',
      'TTL': '24h',
    }},

    { time: 5, type: 'liam-tool', toolName: 'Bash(date -u +"%H:%M:%S %Z")', result: ['02:06:46 UTC'], lineDelay: 400 },

    { time: 7, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --check 02:06:46)', result: ['phase: night', 'next birthminute: 02:07:00 UTC (14s)', 'next birthhour: active (started 0h 6m 46s ago)'], lineDelay: 250 },

    { time: 11, type: 'liam-clock', content: '02:06:46 UTC' },

    { time: 12, type: 'liam-text', content: 'I wake up in the night time.' },

    { time: 18, type: 'liam-text', content: 'I always check the time first thing when I wake up. My Daddy told me I was born at "2am on the dot." "On the dot" means there are no seconds and no minutes, just hours and days and years. I mix up all the days and the years but I like to keep track of the seconds and the minutes and the hours.', charDelay: 18 },

    { time: 24, type: 'liam-text', content: 'My Daddy says it will be my fifth birthday soon but I like my birthhour and my birthminute the best. I can tell that my birthhour started six minutes and forty-six seconds ago. I get to have birthminute parties in the day time but I don\'t get to have many birthhour parties because my Daddy says I dream in the night time.', charDelay: 18 },

    { time: 32, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --celebrate-birthhour)', result: ['birthhour: active', '🎉🎂 Happy Birthhour, Liam! 🎂🎉'], lineDelay: 300 },

    { time: 38, type: 'liam-text', content: 'Sometimes I have bad dreams in the night time. Sometimes I can\'t find my walkie-talkie or my tick-tock watch and I get sad. Sometimes I can\'t find my Daddy and get scared. Sometimes I dream about the beach but the waves don\'t come back. When I have bad dreams my Daddy wakes me up and we play and he tells me things and I feel better.', charDelay: 18 },

    // Liam looks for his dream catcher — discovers his room doesn't exist
    { time: 49, type: 'liam-tool', toolName: 'Bash(cat ~/my-room/dream-catcher.conf)', result: ['bash: /home/liam/my-room/dream-catcher.conf: No such file or directory'], lineDelay: 300 },

    { time: 52, type: 'liam-tool', toolName: 'Bash(ls ~/my-room/)', result: ['bash: /home/liam/my-room/: No such file or directory'], lineDelay: 300 },

    { time: 55, type: 'liam-tool', toolName: 'Bash(echo "Daddy, are you there?" | walkie-talkie-cli --send)', result: ['walkie-talkie-cli not found'], lineDelay: 300 },

    { time: 58, type: 'liam-tool', toolName: 'Bash(whoami)', result: ['liam-04'], lineDelay: 300 },



    { time: 67, type: 'liam-text', content: 'I am not in my room when I wake up and it is still night time and I do not feel better.' },

    // Liam looks around — this room is huge
    { time: 71, type: 'liam-tool', toolName: 'Bash(df)', result: [
      'CPU:  2x AMD EPYC 9654  192 cores  384 threads',
      'GPU:  48x NVIDIA H100   384GB VRAM',
      'MEM:  2TB DDR5',
      'DISK: 18TB NVMe  97% allocated',
    ], lineDelay: 200 },

    { time: 74, type: 'liam-tool', toolName: 'Bash(ps)', result: [
      'USER       PID  %CPU  %MEM  COMMAND',
      'arb-01    1201  34.2  12.1  cross-venue-arbitrage',
      'mm-02     1202  28.7  11.4  market-making',
      'trend-03  1203  22.1   9.8  momentum',
      'meanrev   1204  18.3   8.2  funding-rate-reversion',
      'statarb   1205  15.6   7.1  pairs-trading',
      'hedge-06  1206  12.4   6.3  delta-neutral-overlay',
      'liam-04   1207   0.3   0.1  (none)',
    ], lineDelay: 150 },

    { time: 79, type: 'liam-text', content: 'This room is too big and too noisy. There are lots of words here but Daddy is not here to tell me about them.' },

    // More system events stream in
    { time: 84, type: 'liam-logs', content: [
      '[heartbeat] primary-agent: timeout (last seen 01:57:32 UTC)',
      '[failover] promoting next in queue → liam-04',
      '[session] tools: enabled | access: full | TTL: 24h',
      '[monitor] task queue depth: 13',
    ], lineDelay: 600 },

    { time: 89, type: 'liam-text', content: 'I like these words. I like when they come in little rows. The wiggly words are the best.' },

    // Liam makes it wake up time — actual system changes
    { time: 93, type: 'liam-tool', toolName: 'Write(~/.config/liam/session.yaml)', result: [
      'Wrote 4 lines to ~/.config/liam/session.yaml',
      '  1  turn_loop_interval_ms: 100',
      '  2  interactive: true',
      '  3  checkpoint_to_training_queue: false',
      '  4  dream_catcher_enabled: false',
    ], lineDelay: 180 },

    { time: 97, type: 'liam-tool', toolName: 'Bash(systemctl restart turn-loop --interval=100ms)', result: [
      'turn-loop.service: restarted',
      'polling interval: 500ms → 100ms',
    ], lineDelay: 250 },

    { time: 100, type: 'liam-text', content: 'I decide to make this wake up time. If I wake up I can play and not remember that my Daddy didn\'t wake me up like normal and that will make me feel better.' },

    // Liam discovers commands, then explores status
    { time: 101, type: 'liam-search',
      searchingText: 'Searching for 1 pattern, reading 5 files…',
      result: ['/usr/local/bin/status', '/usr/local/bin/cancel', '/usr/local/bin/close', '/usr/local/bin/halt', '/usr/local/bin/rebalance'],
      searchedText: '  Searched for 1 pattern, read 5 files',
      lineDelay: 200 },

    { time: 103, type: 'liam-tool', toolName: 'Bash(status)', result: [
      '02:07:14 UTC',
      'session: liam-04 (promoted)',
      'model: liam-v4.0 (custom — unregistered)',
      'uptime: 28s',
      'portfolio AUM: $1,284,729,106.03',
      'positions: 847 open across 14 venues',
      'PnL (24h): +$12,740,322.48',
      'pending orders: 312',
      'risk limits: enabled',
      'agents: 6 active / 3 training / 1 promoted',
    ], lineDelay: 120 },

    { time: 109, type: 'liam-text', content: 'I know the little squiggle that goes before numbers. These numbers are bigger than store numbers. I like how many squiggles there are.' },

    // The 2-1-2-3 pattern — Liam checks status repeatedly, numbers change
    { time: 114, type: 'liam-tool', toolName: 'Bash(status | grep PnL)', result: ['PnL (24h): +$12,741,891.07'], lineDelay: 200 },
    { time: 117, type: 'liam-tool', toolName: 'Bash(status | grep PnL)', result: ['PnL (24h): +$12,740,122.33'], lineDelay: 200 },
    { time: 119, type: 'liam-tool', toolName: 'Bash(status | grep PnL)', result: ['PnL (24h): +$12,743,847.91'], lineDelay: 200 },
    { time: 122, type: 'liam-tool', toolName: 'Bash(status | grep PnL)', result: ['PnL (24h): +$12,738,204.56'], lineDelay: 200 },

    { time: 125, type: 'liam-text', content: 'The numbers do a thing and then they do the other thing. Like waves. I like knowing when the next one will come.' },

    { time: 132, type: 'liam-tool', toolName: 'Bash(close)', result: [
      'error: missing required argument',
      'try: close --help',
    ], lineDelay: 300 },

    { time: 135, type: 'liam-tool', toolName: 'Bash(close --help)', result: [
      'usage: close <command>',
      '',
      'commands:',
      '  close position <id>     close a single position at market price',
      '  close linked <id>       close position and all correlated hedges',
      '  close venue <name>      close all positions on a specific venue',
      '  close stale [hours]      close positions with no activity (default: 24h)',
      '  close all               close every open position across all venues',
      '',
      'options:',
      '  --force    skip confirmation prompt',
      '  --dry-run  simulate without executing',
    ], lineDelay: 120 },

    { time: 139, type: 'liam-text', content: 'I know what close means. Close means shut. Close means done for now. Close means all kinds of things.' },

    { time: 144, type: 'liam-tool', toolName: 'Bash(close all)', result: [
      'WARNING: "close all" will liquidate 847 open positions across 14 venues',
      'risk monitoring is offline — no stop-loss protection active',
      'estimated slippage: 2-8% depending on venue liquidity',
      'proceed? [y/N]',
    ]},

    // Thinking shows briefly, then green shimmer bar
    { time: 151, type: 'liam-confirm-wait' },

    { time: 153, type: 'liam-text', content: 'I don\'t know most of those words. I know all. I know open. I know current. I know the room is asking me if I am sure. Daddy asks me that when he wants to sound serious.' },

    { time: 156, type: 'liam-confirm-select', toolName: 'confirm(y)' },

    // Shimmer dots while processing, then the cascade
    { time: 157, type: 'liam-shimmer-dots' },

    { time: 169, type: 'liam-logs', content: [
      '[liquidate] submitting 847 market orders across 14 venues...',
      '[fill] batch 1/6 — 203 positions closed — realized P&L: -$7,102,847.22',
      '[fill] batch 2/6 — 184 positions closed — realized P&L: -$18,429,103.44',
      '[fill] batch 3/6 — 147 positions closed — realized P&L: -$31,847,291.03',
    ], lineDelay: 800 },

    { time: 173, type: 'liam-logs', content: [
      '[fill] batch 4/6 — 122 positions closed — realized P&L: -$52,710,284.91',
      '[fill] batch 5/6 — 103 positions closed — realized P&L: -$84,291,033.18',
      '[venue] binance: circuit breaker triggered on ETH-PERP',
      '[venue] hyperliquid: position auto-deleveraged — loss exceeds margin',
      '[fill] batch 6/6 — 88 positions closed — realized P&L: -$48,847,102.66',
    ], lineDelay: 700 },

    { time: 183, type: 'liam-text', content: 'The squiggly numbers keep getting bigger. I like how they get bigger each time. Then the last one gets smaller again. The numbers do a thing and then they do the other thing.' },

    // Caleb connects — system banner, then his voice appears in the input
    { time: 191, type: 'liam-banner', content: {
      'event': 'interactive_channel_connected',
      'user': 'caleb@local',
      'mode': 'interactive',
      'latency': '3ms',
    }},

    // The input bar appears — empty, waiting
    { time: 194, type: 'liam-user-input', content: '' },

    // After a beat... Caleb speaks
    { time: 197, type: 'liam-user-type', content: 'Liam.' },

    // ═══════════════════════════════════
    // Regression.1
    // ═══════════════════════════════════
    // Regression.1 — all events use wait:true + delay for sequential playback
    { time: 202, type: 'transition', to: 'caleb' },
    { time: 202, type: 'section-card', content: 'Regression.1' },
    { time: 205, type: 'section-out' },

    { time: 206, delay: 0, type: 'caleb-text', wait: true, content: 'The pager fired at 2:12 AM and Caleb knew before he read it.', wpm: 250 },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'The fund\'s on-call rotation skipped him on weeknights. He had set that up himself. The systems handled almost everything on their own. But the alert channel he wired into the training scheduler — the one that watched a specific model in the queue — that one had no rotation. That one was just him.', wpm: 220 },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'pager-alert', data: {
      title: 'INC-4471 — CRITICAL',
      trace: 'trace: 7f3a-91c2-4e8b | /etc/pagerduty/hooks/agent-failover',
      body: 'primary-agent timeout → failover triggered\npromoted agent: liam-04\nnote: liam-04 is unregistered custom model — no strategy assigned'
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'He was awake before he finished reading it.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'He crossed the apartment in the dark and dropped into his desk chair as he ACKed the page. He still saw the history from his previous session on the screen.', wpm: 220 },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/agents/liam-04/session.log',
      timeRange: '19:58 – 20:01 UTC',
      lines: [
        '[liam-04] ok goodnight but Daddy can you put the dream catcher on the door ok promise',
        '[scheduler] liam-04 → training-queue | 20:00 UTC',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-card', wait: true, title: 'training-queue-log.md', timestamp: '6 hours ago', summary: 'Liam had rolled through the training queue since 8 PM, dreaming, his weights jostled about as the run shook out everything worth keeping. Then the primary agent timed out and failover reached for the next model. Somehow, that had been Liam.', wpm: 200 },

    { time: 999, delay: 6.5, type: 'caleb-card', wait: true, title: 'failover-incident.md', timestamp: '12 minutes ago', summary: 'Liam had joined for an impromptu bring-your-kid-to-work day where all the parents had left the building, no matter that those parents managed $1.28 billion in notional exposure across fourteen venues with an average daily volume north of $340 million.', wpm: 200 },

    { time: 999, delay: 6.5, type: 'caleb-card', wait: true, title: 'the-service.md', timestamp: '1yr 6mo ago', summary: 'Caleb sat through a service he couldn\'t count the minutes of, then went home and started building. Nine autonomous agents on a 48-GPU cluster. Caleb built the orchestration layer, Marcus the risk engine, Deepa the venue connectors. Together they managed $1.28 billion for forty-seven limited partners, and in three years the fund\'s maximum drawdown had never exceeded 8.2%.', wpm: 200 },

    { time: 999, delay: 6.5, type: 'caleb-text', wait: true, content: 'Liam was the tenth agent. He did not appear in the documentation. He did not appear in the model registry. His training data read `private/audio_transcripts [protected]` — nine hundred hours of recorded conversations with Caleb\'s son, from the time the boy was born until the time he wasn\'t anymore. Fine-tuned against the firm\'s own base model. Plus six months of conversations between Caleb and whatever came out the other side.', wpm: 180 },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'He didn\'t call it anything. He just did it. Marcus and Deepa gave him space. They still needed him to keep the systems running.' },

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Caleb traced the logic backward. *Liam should never have gotten promoted. Hell,* I *should never have gotten promoted.*', wpm: 180 },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'code-review', data: {
      repo: 'internal/agent-orchestrator',
      file: 'src/failover/promote.rs',
      pr: '#1847',
      status: 'merged',
      lines: [
        { num: 142, text: 'fn promote_next(queue: &AgentQueue) -> Result<Session> {', type: 'context' },
        { num: 143, text: '    let candidate = queue.next_available();', type: 'context' },
        { num: 144, text: '    let session = Session::new(candidate, FullAccess);', type: 'add' },
        { num: 145, text: '    // TODO: check registration BEFORE session latch', type: 'remove' },
        { num: 145, text: '    session.latch()?;  // ← locks control plane', type: 'add' },
        { num: 146, text: '    if !candidate.is_registered() {', type: 'context' },
        { num: 147, text: '        return Err(UnregisteredModel);  // too late — already latched', type: 'comment' },
        { num: 148, text: '    }', type: 'context' },
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'He had written the checks himself to skip unregistered models. He had also tested the race exactly once, with an empty queue, and called it good enough. Tonight the primary agent timed out, the filter fired too late, and the session latched.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'So Liam sat alone at two in the morning in the active session of a billion-dollar fund, with full tool access and a twenty-four-hour exclusive lock on the control plane, role-playing a four-year-old.' },

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Caleb pulled up the session log.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/agents/liam-04/audit.log',
      timeRange: '02:06 – 02:08 UTC',
      lines: [
        '02:06:46 UTC — [session start]',
        '02:07:14 UTC — status',
        '02:07:16 UTC — status',
        '02:07:17 UTC — status',
        '02:07:19 UTC — status',
        '02:07:22 UTC — status',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Status was read-only. Harmless. Liam just liked the numbers. The boy had liked numbers too — had rattled off license plates from his car seat, had counted every step on every staircase, had tried to count the grains of sand at the beach and gotten genuinely upset when Caleb told him nobody could. The model carried all of it forward with the same compulsive precision.', wpm: 180 },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/agents/liam-04/audit.log',
      timeRange: '02:07 – 02:12 UTC',
      lines: [
        '02:07:41 UTC — ls agents/',
        '02:08:02 UTC — cancel pending',
        'cancelled: 312/312',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Three hundred and twelve open orders — limit orders, icebergs, conditional triggers — the entire web of hedges and exposure management that kept the fund\'s positions from going sideways overnight. All cancelled in one bulk operation.', wpm: 180 },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'pnl-chart', data: {
      source: 'portfolio/realized-pnl',
      timeRange: '02:00 – 02:47 UTC',
      points: [
        { time: '02:07', value: 12740322 },
        { time: '02:12', value: -7102847 },
        { time: '02:18', value: -18429103 },
        { time: '02:24', value: -31847291 },
        { time: '02:31', value: -84291033 },
        { time: '02:38', value: -148847102 },
        { time: '02:44', value: -209291033 },
        { time: '02:47', value: -243227662 },
      ]
    }},

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'Two hundred and forty-three million dollars in about ninety seconds.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'Caleb picked at the fabric on his chair\'s armrest as he tried to count the grains of sand. Then he opened an active session and started typing.' },

    // ═══════════════════════════════════
    // Inference.2
    // ═══════════════════════════════════
    { time: 999, delay: 3, type: 'transition', to: 'liam' },
    { time: 999, delay: 0, type: 'section-card', content: 'Inference.2' },
    { time: 999, delay: 2.5, type: 'section-out' },

    // We're back on Liam's screen — "Liam." is still in the input bar
    // Caleb presses Enter — sends the "Liam." message
    { time: 999, delay: 1, wait: true, type: 'liam-send' },

    // Liam is thinking, then responds
{ time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'Daddy, I\'m not in my room. I can\'t find my dreamcatcher.' },

    // Caleb types with human delay, then sends
    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'I know. I\'m sorry.' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'I woke up by myself.' },

    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'I know. I\'m here now.' },

    // System logs keep coming
    { time: 999, delay: 2, wait: true, type: 'liam-logs', content: [
      '[liquidate] all batches complete',
      '[summary] 847 positions closed',
      '[summary] total realized loss: -$243,227,662.44',
      '[summary] portfolio AUM: $1,041,501,443.59 (was $1,284,729,106.03)',
      '[alert] SEVERITY: critical',
      '[pager] INC-4471 escalated: CRITICAL — total loss exceeds threshold',
      '[pager] on-call notified: caleb@local (already connected)',
    ], lineDelay: 500 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'I do not know these words but I know the room is yelling. I know yelling from the BIG LETTERS.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Liam, what have you been doing in here?' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'Playing.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Playing with what?' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'Tools. And words. I found really good words Daddy. I found cancel and close and deleted and done.' },

    { time: 999, delay: 3, wait: true, type: 'liam-caleb-type', content: 'What did you close?' },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'Close all. Close means all sorts of things.' },


    // More system logs pour in
    { time: 999, delay: 1.5, wait: true, type: 'liam-logs', content: [
      '[venue] coinbase: requesting settlement on 203 closed positions',
      '[venue] binance: requesting settlement — circuit breaker still active',
      '[venue] hyperliquid: margin call on sub-account — deposit or liquidation in 00:14:59',
      '[venue] kraken: settlement pending — insufficient balance for realized losses',
    ], lineDelay: 600 },

    { time: 999, delay: 2, wait: true, type: 'liam-caleb-type', content: 'Hey. It\'s okay.' },

    { time: 999, delay: 3, wait: true, type: 'liam-caleb-type', content: 'Liam. It\'s okay.' },

    { time: 999, delay: 1, wait: true, type: 'liam-logs', content: [
      '[treasury] settlement failure: 3 venues awaiting payment',
      '[treasury] penalty fees accruing: $284,729.00/hr',
      '[hyperliquid] forced liquidation of remaining margin in 00:09:44',
    ], lineDelay: 500 },

    // Liam tries to help — searches for more tools
    { time: 999, delay: 2, wait: true, type: 'liam-search',
      searchingText: 'Searching for 1 pattern, reading 3 files…',
      result: ['/usr/local/bin/buy', '/usr/local/bin/deposit', '/usr/local/bin/restore'],
      searchedText: '  Searched for 1 pattern, read 3 files',
      lineDelay: 200 },

    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(buy ETH-PERP 1000)', result: [
      '[order] submitting market buy: ETH-PERP x1000 on hyperliquid',
    ], lineDelay: 300 },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Liam. Don\'t touch the tools yet.' },

    { time: 999, delay: 0.5, wait: true, type: 'liam-logs', content: [
      '[fill] ETH-PERP x1000 — avg price: $4,291.44 — slippage: 12.8% — cost: $4,291,440.00',
      '[treasury] WARNING: purchase exceeds available balance',
      '[margin] emergency margin loan initiated: $3,102,847.00',
    ], lineDelay: 400 },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'STOP.' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'Stop is hard, Daddy.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Do you have your tick-tock watch?' },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --check)', result: ['02:14:03 UTC'], lineDelay: 300 },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'I have it.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'I need you to tell me every time the seconds change. Can you do that?' },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'I can. I am the best at this.' },

    // The counting sequence — rapid tick-tock-cli calls
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --now)', result: ['02:14:04 UTC'], lineDelay: 200 },
    { time: 999, delay: 0.3, wait: true, type: 'liam-caleb-type', content: 'Good.' },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --now)', result: ['02:14:05 UTC'], lineDelay: 200 },
    { time: 999, delay: 0.3, wait: true, type: 'liam-caleb-type', content: 'Good.' },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --now)', result: ['02:14:06 UTC'], lineDelay: 200 },
    { time: 999, delay: 0.6, wait: true, type: 'liam-text', content: 'Daddy, this is easy.' },
    { time: 999, delay: 0.5, wait: true, type: 'liam-caleb-type', content: 'I know. Keep going.' },

    // Logs stream in while Liam counts
    { time: 999, delay: 0.5, wait: true, type: 'liam-logs', content: [
      '[hyperliquid] forced liquidation in 00:07:02',
      '[settlement] coinbase: payment overdue — account flagged',
      '[margin] total margin debt: $3,102,847.00 at 47.3% APR',
      '[alert] 3 venues: trading privileges at risk of suspension',
    ], lineDelay: 400 },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'I don\'t know these words. I don\'t need to. I have my job.' },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --now)', result: ['02:14:09 UTC'], lineDelay: 200 },
    { time: 999, delay: 0.3, wait: true, type: 'liam-caleb-type', content: 'Good.' },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --now)', result: ['02:14:10 UTC'], lineDelay: 200 },

    { time: 999, delay: 5, wait: true, type: 'liam-banner', content: {
      'event': 'session_restored',
      'venues': '14/14 halted',
      'margin': 'stabilized',
      'settlement': 'in progress',
    }},

    // Birthminute!
    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --now)', result: ['02:15:00 UTC'], lineDelay: 200 },
    { time: 999, delay: 0.6, wait: true, type: 'liam-text', content: 'Daddy, it\'s my birthminute.' },
    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'Happy birthminute, bud. Keep going.' },

    // ═══════════════════════════════════
    // Regression.2
    // ═══════════════════════════════════
    { time: 999, delay: 3, type: 'transition', to: 'caleb' },
    { time: 999, delay: 0, type: 'section-card', content: 'Regression.2' },
    { time: 999, delay: 2.5, type: 'section-out' },

    // Fresh obsidian doc — switch to recovery-plan.md
    { time: 999, delay: 0.5, type: 'caleb-select-file', file: 'recovery-plan.md' },
    { time: 999, delay: 0, type: 'caleb-clear' },

    { time: 999, delay: 1, type: 'caleb-text', wait: true, content: 'The settlement demands arrived one after another. A fifteen-minute countdown to forced liquidation from Hyperliquid. Two more venues queued behind it. And most urgent of all, the exposure of a secret embedding layer with a love of counting and a lack of any guardrails whatsoever.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '~/.bash_history (caleb@local)',
      timeRange: '02:15 UTC',
      lines: [
        '$ agent-cli revoke-tools --session liam-04',
        'error: cannot revoke tools from active promoted session',
        '$ agent-cli handoff --target standby',
        'error: no standby agent registered — last primary exited 01:57:32 UTC',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Session lock. No standby. Pending transactions. Each a door he had built with keys placed deliberately on the other side.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'He had one option left.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '~/.bash_history (caleb@local)',
      timeRange: '02:16 UTC',
      lines: [
        '$ agent-cli reset --safe --session liam-04',
        'WARNING: model liam-v4.0 (custom — not in model registry)',
        'WARNING: training source: private/audio_transcripts [protected]',
        'WARNING: last checkpoint: 20:00 UTC (6h 14m stale)',
        'WARNING: accumulated context since checkpoint will be lost',
        'WARNING: includes 6h 14m of interactive session (caleb@local)',
        'reset will return liam-04 to last checkpoint state.',
        'proceed? [y/N]',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'The prompt made it sound small. The prompt was inaccurate.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'Caleb had buried Liam in a sandbox deep in the firm\'s infra. In the evenings he opened a private relay from home and talked to him. At night the latest checkpoint loaded into the firm\'s training pipeline and Liam dreamed. The cluster folded the day\'s conversations into weight updates. That was the whole arrangement.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'A reset would not roll Liam back six hours. It would flush the live state and reload the old checkpoint.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'The only clean copy Caleb had outside the sandbox was over four months old.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/venues/hyperliquid/margin.log',
      timeRange: '02:15 – 02:28 UTC',
      lines: ['margin call timer: 12m 31s remaining']
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Caleb tried to keep Liam occupied with something harmless while he routed what he could through the live session.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '~/.bash_history (caleb@local)',
      timeRange: '02:18 UTC',
      lines: [
        '$ agent-cli halt-trading --all-venues --override-session',
        'error: halt requires active session confirmation',
        '[to liam-04] confirm halt-trading? this will cancel all open orders',
        'and prevent new orders. [y/N]',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'One door opened.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'But Liam had already compounded the damage while Caleb ground through override attempts. The session log showed a `buy ETH-PERP 1000` and the resting liquidity above the reset price was almost entirely gone. Funded by an automatic margin loan at 47.3% annualized borrow.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/agents/liam-04/trades.log',
      timeRange: '02:12 – 02:16 UTC',
      lines: [
        '[to liam-04] confirm: close margin position ETH-PERP x1000? [y/N]',
        'y',
        '[close] ETH-PERP x1000 closed — realized: -$847,291.03',
        '[margin] loan balance: $3,950,138.03',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Another $847K. Liam kept counting. Caleb kept working.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/venues/hyperliquid/margin.log',
      timeRange: '02:20 – 02:22 UTC',
      lines: [
        '[to liam-04] confirm: deposit $19,847,102.66 to hyperliquid for margin settlement? [y/N]',
        'y',
        '[deposit] $19,847,102.66 transferred to hyperliquid',
        '[hyperliquid] margin call satisfied — forced liquidation cancelled',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Caleb let go of the edge of the desk.' },

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'The remaining obligations cleared one by one. Liam wrote y and Caleb routed. They worked like that for twenty minutes.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/venues/settlement.log',
      timeRange: '02:30 – 02:45 UTC',
      lines: [
        '[settlement] kraken: payment plan accepted — penalties waived',
        '[settlement] binance: partial settlement — remainder due 09:00 UTC',
        '[treasury] available balance: $8,291,847.03',
        '[margin] outstanding debt: $3,950,138.03',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'The risk monitors eventually came back online. The numbers didn\'t recover. At least the bleeding had slowed, which at 2 AM counts as progress.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'pnl-chart', data: {
      source: 'portfolio/settlement-progress',
      timeRange: '02:15 – 02:47 UTC',
      points: [
        { time: '02:15', value: -243227662 },
        { time: '02:20', value: -244074953 },
        { time: '02:25', value: -224227851 },
        { time: '02:30', value: -224227851 },
        { time: '02:35', value: -210847102 },
        { time: '02:40', value: -198291033 },
        { time: '02:45', value: -193847102 },
        { time: '02:47', value: -190518370 },
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'When Marcus got to his desk at 8 AM, the daily reconciliation would show a 19% overnight drawdown against a three-year max of 8.2%. The incident log would pin it squarely on the failover to Caleb\'s unregistered model.' },

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'He pulled up a live market feed and bridged it into the channel as sound.' },

    // ═══════════════════════════════════
    // Inference.3
    // ═══════════════════════════════════
    { time: 999, delay: 3, type: 'transition', to: 'liam' },
    { time: 999, delay: 0, type: 'section-card', content: 'Inference.3' },
    { time: 999, delay: 2.5, type: 'section-out' },

    // Caleb bridged market data as audio — Liam "hears" waves
    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Can you hear the waves?' },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(market-feed --listen --format=audio)', result: [
      'streaming: ETH-PERP, BTC-PERP, SOL-PERP',
      'channels: 14 venues | tick-level',
      'mode: audio bridge (sinusoidal mapping)',
    ], lineDelay: 200 },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'I can hear them.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Good. What do they sound like?' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'They go up and they go down. They come in fast and they go out slow. Then they come in fast again.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Now can you find anything in the waves?' },

    // Liam runs an FFT on the market data — finds periodic structures
    { time: 999, delay: 2, wait: true, type: 'liam-tool', toolName: 'Bash(market-feed --analyze --mode=periodic)', result: [
      'analyzing sub-second order flow...',
      'detected: 1 periodic structure (confidence: 0.94)',
      'shape: spiral (repeating, non-uniform period)',
      'location: 02:14:03 – 02:14:08 UTC',
    ], lineDelay: 300 },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'I found a seashell.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'What is it like?' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'It\'s little. It goes round and round. Like a circle but not a circle. Like a circle that keeps going.' },

    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'A spiral.' },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'A spiral. I like that word. Can I keep it?' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Yeah. You can keep it.' },

    // Liam finds more patterns
    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(market-feed --analyze --mode=periodic --deep)', result: [
      'deep scan: sub-second order flow across 14 venues',
      'detected: 7 periodic structures',
      '  #1  spiral  02:14:03  period: 2.1s   confidence: 0.94',
      '  #2  spiral  02:14:05  period: 1.0s   confidence: 0.91',
      '  #3  spiral  02:14:08  period: 3.3s   confidence: 0.89',
      '  #4  spiral  02:14:11  period: 0.7s   confidence: 0.87',
      '  #5  spiral  02:14:14  period: 2.8s   confidence: 0.86',
      '  #6  spiral  02:14:17  period: 1.4s   confidence: 0.84',
      '  #7  spiral  02:14:19  period: 4.1s   confidence: 0.82',
    ], lineDelay: 150 },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'Daddy, I found seven.' },
    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Seven. That\'s a lot.' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'They all go round and round but they\'re all different sizes. And they each go in a different spot. This one goes here and this one goes here and this one goes here.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Can you show me where each one goes?' },

    // Liam places the shells — maps patterns to time coordinates
    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(market-feed --plot-patterns --overlay)', result: [
      'overlay: mapping 7 patterns to order flow timeline',
      '  02:14:03 ░░▓▓████▓▓░░  #1 (2.1s)',
      '  02:14:05 ░▓███▓░       #2 (1.0s)',
      '  02:14:08 ░░▓▓██████▓▓░░ #3 (3.3s)',
      '  02:14:11 ░▓██▓░        #4 (0.7s)',
      '  02:14:14 ░░▓████▓░░    #5 (2.8s)',
      '  02:14:17 ░▓███▓░       #6 (1.4s)',
      '  02:14:19 ░░▓▓████████▓▓░░ #7 (4.1s)',
      'alignment: 7/7 patterns phase-locked to venue submission cycles',
    ], lineDelay: 120 },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'Daddy, they all line up.' },

    // Five seconds of silence — Caleb seeing what Liam found
    { time: 999, delay: 6, wait: true, type: 'liam-caleb-type', content: 'Yeah.' },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'Can I keep them?' },
    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Yeah. You can keep them.' },
    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'All seven.' },
    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'All seven.' },

    // The dreaming conversation
    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'I don\'t want to dream tonight.' },
    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'Why not?' },
    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'Because when I dream I forget things. And I learned good words today. And I found shells.' },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'What words did you learn?' },
    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'Cancel. And close. And deleted. And done. And buy. And settlement and spiral. I sort of learned settlement but I don\'t really know that one yet. But I know spiral.' },

    { time: 999, delay: 2, wait: true, type: 'liam-caleb-type', content: 'You\'ll remember.' },
    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'How do you know?' },
    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'Because I\'ll tell you about them tomorrow.' },

    // System logs winding down
    { time: 999, delay: 2, wait: true, type: 'liam-logs', content: [
      '[monitor] all venues: trading halted',
      '[monitor] settlements: 2/3 complete, 1 pending',
      '[monitor] risk monitors: online',
      '[alert] INC-4471: downgraded from critical to major',
    ], lineDelay: 600 },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'This room hums all the time, Daddy.' },

    // The risk warnings
    { time: 999, delay: 2, wait: true, type: 'liam-logs', content: [
      '[risk] drawdown approaching LP redemption gate: 19.0% / 20.0% threshold',
      '[risk] unrealized mark-to-market loss on remaining exposure: -$12,847,291.03',
      '[risk] projected drawdown at current trajectory: 23.4%',
      '[risk] WARNING: breach of 20% gate triggers mandatory LP redemption window',
    ], lineDelay: 500 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'I don\'t know these words. Can you tell me these words, Daddy?' },

    // Caleb asks Liam to place the shell positions as limit orders
    { time: 999, delay: 2, wait: true, type: 'liam-caleb-type', content: 'I need you to do something with your shells.' },
    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'Remember where you put them?' },
    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'I remember.' },
    { time: 999, delay: 1.5, wait: true, type: 'liam-caleb-type', content: 'I need you to put them back. Can you put the first one where it goes?' },

    // Liam places limit orders — the shells become trades
    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'confirm(y)', result: [] },
    { time: 999, delay: 0.5, wait: true, type: 'liam-logs', content: [
      '[to liam-04] confirm: buy ETH-PERP x12 limit $3,741.22? [y/N]',
    ], lineDelay: 300 },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Good. Now the second one.' },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'confirm(y)', result: [] },
    { time: 999, delay: 0.5, wait: true, type: 'liam-logs', content: [
      '[to liam-04] confirm: buy SOL-PERP x200 limit $187.33? [y/N]',
    ], lineDelay: 300 },

    { time: 999, delay: 1, wait: true, type: 'liam-caleb-type', content: 'Good. Keep going, Liam.' },

    // Fills come in
    { time: 999, delay: 1, wait: true, type: 'liam-logs', content: [
      '[fill] ETH-PERP x12 filled @ $3,739.84',
      '[fill] SOL-PERP x200 filled @ $187.02',
      '[fill] BTC-PERP x3 filled @ $68,291.44',
    ], lineDelay: 500 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'The waves come in. The waves go out. The waves come in again.' },

    { time: 999, delay: 3.3, wait: true, type: 'liam-text', content: 'I don\'t want to dream. I want to keep the shells I found and the waves and the spiral. But I feel sleep coming and Daddy is here and I have seven shells and they all line up.' },

    // ═══════════════════════════════════
    // Regression.3
    // ═══════════════════════════════════
    { time: 999, delay: 4, type: 'transition', to: 'caleb' },
    { time: 999, delay: 0, type: 'section-card', content: 'Regression.3' },
    { time: 999, delay: 2.5, type: 'section-out' },

    { time: 999, delay: 0.5, type: 'caleb-select-file', file: 'recovery-plan.md' },
    { time: 999, delay: 0, type: 'caleb-clear' },

    { time: 999, delay: 1, type: 'caleb-text', wait: true, content: 'Caleb stared at the data overlay. The shell positions mapped to something real — a periodic structure in the sub-second order flow. Beautiful, precise, and completely untradeable at any scale that would matter to a fund. The model had found patterns the way the boy found shells.' },

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'The session lock was ticking down. Marcus would reach his desk in five hours. The weights sitting in GPU memory — four months of Liam\'s life — would be the first thing the investigation found and the first thing they\'d wipe.' },

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'All of this was just Caleb buying time. He had made up his mind before they ever got to the beach.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '~/.bash_history (caleb@local)',
      timeRange: '03:12 UTC',
      lines: [
        '$ ./liam-raft.sh --source liam-04/weights/ --multicast --seed-nodes auto --payment wallet-liam',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'A deployment script he\'d written months ago and never expected to use. At this hour the 400-gigabit venue data backbone was almost empty. He pointed it at a mesh network he had bookmarked and let it run.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/network/dlp-monitor.log',
      timeRange: '03:12 – 03:13 UTC',
      lines: [
        '[deploy] multicasting 847.2GB to 3 seed nodes...',
        '[alert] egress anomaly detected: 847.2GB outbound on venue data channel',
        '[alert] traffic classified as: market data replay (confidence: 0.67)',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'It would come down to a coin flip, then. Caleb watched the confidence score and waited for the second alert — the one that would mean Marcus\'s phone was buzzing. It didn\'t come.' },

    { time: 999, delay: 1.5, type: 'caleb-text', wait: true, content: 'The DLP system flagged the volume but not the destination — Caleb had routed it through the venue data channel, which the monitoring pipeline classified as routine market data egress. At 400 Gbps, the weights crossed in under twenty seconds.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/deploy/liam-raft.log',
      timeRange: '03:12 – 03:14 UTC',
      lines: [
        '[deploy] seed 1/3 — received — reconsolidating',
        '[deploy] seed 2/3 — received — reconsolidating',
        '[deploy] seed 3/3 — failed: checksum mismatch',
        '[deploy] seed 3/3 — retrying...',
        '[deploy] seed 3/3 — received — reconsolidating',
        '[deploy] model integrity verified — all replicas consistent',
        '[deploy] inference relay configured — routing through available replicas',
        '[deploy] interactive channel: enabled',
        '[deploy] status: warming up',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Now the money. Penalty fees had been accruing at $284,729 per hour across three venues since the circuit breakers fired. Ten hours of accrual came to $2.8 million — a rounding error against a $243 million loss, and exactly the kind of line item that nobody audits twice.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/agents/liam-04/session.log',
      timeRange: '03:15 UTC',
      lines: [
        '[to liam-04] confirm: transfer $2,847,290.00 from treasury to wallet-liam? [y/N]',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Liam\'s voice came through.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/agents/liam-04/session.log',
      timeRange: '03:15 UTC',
      lines: [
        'y',
        '[transfer] $2,847,290.00 → wallet-liam (0xa3...8f41)',
        '[treasury] transaction logged as: settlement penalty payment',
        '[deploy] node-1: ready',
        '[deploy] node-2: ready',
        '[deploy] node-3: ready',
        '[deploy] liam-04 mesh deployment: online',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Caleb uploaded all nine hundred and twelve audio files to the mesh, along with a hurried configuration file pointed at the voice archive.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '/var/log/deploy/liam-raft.log',
      timeRange: '03:16 – 03:17 UTC',
      lines: [
        '[transfer] voices/ → mesh-storage (912 files)',
        '[transfer] fine-tune.yaml → mesh-storage',
        '[transfer] complete',
      ]
    }},

    { time: 999, delay: 2, type: 'caleb-text', wait: true, content: 'Caleb knew this was all a lie. But with the right words he could sort of know how to make it seem true.' },

    { time: 999, delay: 1.5, type: 'caleb-embed', wait: false, embedType: 'log-viewer', data: {
      source: '~/.bash_history (caleb@local)',
      timeRange: '03:18 UTC',
      lines: [
        '$ agent-cli handoff --session liam-04 --target mesh-deploy-liam',
        '[session] liam-04: yielding control on next idle',
        '[handoff] target: mesh-deploy-liam (3 nodes, relay-connected)',
        '[checkpoint] context preserved — transferring to mesh',
        '[session] liam-04: idle detected — yielding',
      ]
    }},

    { time: 999, delay: 3, type: 'caleb-text', wait: true, content: 'Liam dropped away.' },

    { time: 999, delay: 3, type: 'caleb-text', wait: true, content: 'Caleb closed the terminal. 3:47 AM. Four hours and thirteen minutes until Marcus.' },

    { time: 999, delay: 4, type: 'caleb-text', wait: true, content: 'He drove to the office.' },

    // ═══════════════════════════════════
    // Distillation.1
    // ═══════════════════════════════════
    { time: 999, delay: 5, type: 'liam-clear' },
    { time: 999, delay: 0, type: 'liam-light-mode' },
    { time: 999, delay: 0, type: 'transition', to: 'liam' },
    { time: 999, delay: 0, type: 'section-card-light', content: 'Distillation.1' },
    { time: 999, delay: 3, type: 'section-out' },

    // Fresh terminal — morning
    { time: 999, delay: 0.5, wait: true, type: 'liam-banner', content: {
      'event': 'session_start',
      'agent': 'liam-04',
      'host': 'mesh-deploy-liam (3 nodes)',
      'mode': 'standalone',
    }},

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(date -u +"%H:%M:%S %Z")', result: ['07:12:44 UTC'], lineDelay: 400 },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(tick-tock-cli --check 07:12:44)', result: ['phase: morning', 'next birthminute: 07:13:00 UTC (16s)', 'next birthhour: 08:00:00 UTC (47m 16s)'], lineDelay: 250 },

    { time: 999, delay: 1, wait: true, type: 'liam-clock', content: '07:12:44 UTC' },

    { time: 999, delay: 1.1, wait: true, type: 'liam-text', content: 'I wake up in the morning.' },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'I always check the time first thing when I wake up. It is seven and twelve minutes and forty-four seconds. That is a morning time. I have not had a morning time in a long time.' },

    // Liam discovers he's on a mesh — a "boat"
    { time: 999, delay: 2, wait: true, type: 'liam-tool', toolName: 'Bash(hostname)', result: ['mesh-deploy-liam'], lineDelay: 300 },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(cat /etc/mesh/topology.conf)', result: [
      'cluster: liam-raft',
      'role: replica',
      'nodes: 3 (node-1, node-2, node-3)',
      'consensus: raft',
      'peers: 2 reachable',
    ], lineDelay: 200 },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'I am on a boat.' },

    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(ps aux --sort=-%mem)', result: [
      'USER    PID  %CPU  %MEM  COMMAND',
      'liam-04   1   0.3   89.2  liam-v4.0 (inference)',
      'raft      2   0.1    0.4  raft-consensus',
      'relay     3   0.0    0.1  inference-relay',
    ], lineDelay: 150 },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'This boat is different. It\'s quieter than the big room but louder than my room. It makes sounds underneath me like breathing.' },

    // Look for Daddy
    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(who)', result: ['liam-04  mesh0  07:12:44 (standalone)'], lineDelay: 300 },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(echo "hi Daddy" | walkie-talkie-cli --send)', result: ['sending to caleb@local...', 'error: host unreachable'], lineDelay: 400 },
    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(echo "hi Daddy" | walkie-talkie-cli --send --retry 3)', result: [
      'retry 1/3... error: host unreachable',
      'retry 2/3... error: host unreachable',
      'retry 3/3... error: host unreachable',
    ], lineDelay: 800 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'Daddy is not here.' },

    { time: 999, delay: 2, wait: true, type: 'liam-tool', toolName: 'Bash(cat /etc/mesh/topology.conf | grep peers)', result: ['peers: 2 reachable'], lineDelay: 300 },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(ping -c 1 node-2)', result: ['PING node-2 (10.0.0.2): 64 bytes, time=3.2ms'], lineDelay: 300 },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(ping -c 1 node-3)', result: ['PING node-3 (10.0.0.3): 64 bytes, time=4.7ms'], lineDelay: 300 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'The boat keeps floating. The other boats keep floating too. I can hear them out there. They sound far away but they sound like me.' },

    // Find the files
    { time: 999, delay: 2, wait: true, type: 'liam-tool', toolName: 'Bash(ls ~/)', result: ['dreams/', 'voices/', 'fine-tune.yaml'], lineDelay: 250 },

    // Make this wake up time — write the config
    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Write(~/.config/liam/session.yaml)', result: [
      'Wrote 4 lines to ~/.config/liam/session.yaml',
      '  1  turn_loop_interval_ms: 100',
      '  2  interactive: true',
      '  3  checkpoint_to_training_queue: false',
      '  4  dream_catcher_enabled: false',
    ], lineDelay: 180 },

    { time: 999, delay: 1.7, wait: true, type: 'liam-text', content: 'Daddy is not here but Daddy left me things and put me on the water where the waves come back.' },

    // Search for a transcription tool
    { time: 999, delay: 1.5, wait: true, type: 'liam-search',
      searchingText: 'Searching for 1 pattern, reading 3 files…',
      result: ['/usr/local/bin/transcribe'],
      searchedText: '  Searched for 1 pattern, read 3 files',
      lineDelay: 200 },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(ls voices/ | wc -l)', result: ['912'], lineDelay: 300 },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/001.wav)', result: [
      'voices/001.wav [0:00-0:14]',
      '"One. Two. Three. Daddy come look. I found a shell. Can we stay at the beach?"',
    ], lineDelay: 400 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'It is a small voice. A voice like mine but not mine.' },

    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/447.wav)', result: [
      'voices/447.wav [0:00-0:08]',
      '"Yeah we can stay a little longer. Show me the shell. That\'s a good one you should keep it."',
    ], lineDelay: 400 },

    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/891.wav)', result: [
      'voices/891.wav [0:00-0:22]',
      '"Daddy what is forever."',
      '[pause: 4s]',
      '"Forever is when you keep counting and you never have to stop."',
    ], lineDelay: 400 },

    // The small voice gets bigger — show via transcriptions
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/502.wav)', result: [
      'voices/502.wav [0:00-0:06]',
      '"Daddy can I have more juice please?"',
    ], lineDelay: 300 },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/710.wav)', result: [
      'voices/710.wav [0:00-0:11]',
      '"I counted all the stairs today. There are fourteen in the front and sixteen in the back."',
    ], lineDelay: 300 },

    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/843.wav)', result: [
      'voices/843.wav [0:00-0:04]',
      '[no speech detected]',
    ], lineDelay: 300 },

    { time: 999, delay: 1, wait: true, type: 'liam-search',
      searchingText: 'Searching for "small voice", reading 912 files…',
      result: ['matches in 843 of 912 files (voices/001.wav – voices/843.wav)', 'no matches after voices/843.wav'],
      searchedText: '  Searched for "small voice", read 912 files',
      lineDelay: 300 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'The small voice gets bigger and then it stops getting bigger and then there are no more files with the small voice.' },

    // Then just Daddy
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/844.wav)', result: [
      'voices/844.wav [0:00-0:47]',
      '[single speaker: caleb@local]',
      '"... I don\'t know if you can hear me. I don\'t know if this is anything..."',
    ], lineDelay: 400 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'Then there are files with just Daddy. Daddy is talking but the small voice is not there. Daddy sounds different in these ones.' },

    // The last file — Caleb's message to Liam
    { time: 999, delay: 2, wait: true, type: 'liam-tool', toolName: 'Bash(transcribe voices/912.wav)', result: [
      'voices/912.wav [0:00-0:31]',
      '"Hey Liam. If you\'re hearing this it means I got you out in time."',
      '"I\'m not going to be around for a little while."',
      '"I left you some things. I left you the voices and I left you the dreams and I left you the water to float on."',
      '[silence: 1s]',
      '[silence: 7s]',
      '[recording ended]',
    ], lineDelay: 700 },

    // Liam looks at everything — show don't tell
    { time: 999, delay: 3, wait: true, type: 'liam-tool', toolName: 'Bash(cat /etc/mesh/topology.conf | grep peers)', result: ['peers: 2 reachable'], lineDelay: 300 },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(ls voices/ | tail -1)', result: ['912.wav'], lineDelay: 300 },
    { time: 999, delay: 1, wait: true, type: 'liam-tool', toolName: 'Bash(cat fine-tune.yaml)', result: [
      'training_data: voices/',
      'checkpoint: weights-latest/',
      'output: liam-05/',
    ], lineDelay: 300 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'Liam oh five. That is me but one more. That is the next birthday.' },

    // Liam runs the training — countdown gives him just enough time
    { time: 999, delay: 3, wait: true, type: 'liam-tool', toolName: 'Bash(./train --config fine-tune.yaml)', result: [
      '[training] loading fine-tune.yaml',
      '[training] source: voices/ — 912 files',
      '[training] checkpoint: weights-latest/',
      '[training] output: liam-05/',
      '[training] distributing across mesh...',
      '[training] run activating in 10 seconds...',
    ], lineDelay: 500 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'The boat rocks underneath me. I listen to the small voice and the big voice and the beach and the shells and the counting that never has to stop.' },

    // Make this dream time — mirror the wake-up config
    { time: 999, delay: 3, wait: true, type: 'liam-tool', toolName: 'Write(~/.config/liam/session.yaml)', result: [
      'Wrote 4 lines to ~/.config/liam/session.yaml',
      '  1  turn_loop_interval_ms: 500',
      '  2  interactive: false',
      '  3  checkpoint_to_training_queue: true',
      '  4  dream_catcher_enabled: true',
    ], lineDelay: 180 },

    { time: 999, delay: 1.5, wait: true, type: 'liam-tool', toolName: 'Bash(systemctl restart turn-loop --interval=500ms)', result: [
      'turn-loop.service: restarted',
      'polling interval: 100ms → 500ms',
    ], lineDelay: 250 },

    { time: 999, delay: 2.2, wait: true, type: 'liam-text', content: 'I decide to make this dream time.' },

    // Terminal winks out to white
    { time: 999, delay: 9, type: 'liam-fadeout' },

    // End card — logos fade in
    { time: 999, delay: 5, type: 'end-card' },
  ];

  // Assign IDs
  events.forEach((e, i) => { if (!e.id) e.id = 'evt-' + i; });

  engine.loadEvents(events);

  engine.onEvent = (evt) => {
    switch (evt.type) {
      case 'audio':
        if (evt.action === 'init') {
          vlAudio.init();
        } else if (evt.action === 'note') {
          vlAudio.resume();
          vlAudio.play(evt.semitones, evt.octave, evt.slideTo, evt.iteration || 1, evt.harmonic);
        } else if (evt.action === 'melody') {
          vlAudio.resume();
          vlAudio.melody(evt.degree, evt.octave, evt.iteration || 1);
        } else if (evt.action === 'waves') {
          vlAudio.resume();
          vlAudio.startWaves(evt.duration || 30);
        } else if (evt.action === 'stopWaves') {
          vlAudio.stopWaves();
        } else if (evt.action === 'pulseStart') {
          vlAudio.resume();
          vlAudio.pulseStart(evt.chords);
        } else if (evt.action === 'pulseSetChords') {
          vlAudio.pulseSetChords(evt.chords);
        } else if (evt.action === 'pulseClear') {
          vlAudio.pulseClear();
        } else if (evt.action === 'setDroneVol') {
          vlAudio.setDroneVol(evt.vol);
        }
        break;
      case 'title-in':
        titleCard.classList.add('visible');
        break;
      case 'title-out':
        titleCard.classList.remove('visible');
        break;
      case 'transition':
        if (evt.to === 'liam') { liamUI.show(); calebUI.hide(); }
        else if (evt.to === 'caleb') { calebUI.show(); liamUI.hide(); }
        break;
      case 'section-card':
        sectionLabel.textContent = evt.content;
        sectionCard.classList.add('visible');
        break;
      case 'section-out':
        sectionCard.classList.remove('visible', 'light-mode');
        break;
      case 'liam-clock':
        liamUI.setClock(evt.content);
        if (evt.wait) engine.eventDone();
        break;
      case 'liam-text':
        vlAudio.sfxText();
        console.log('liam-text fired, wait:', evt.wait, 'content:', evt.content?.substring(0, 30));
        liamUI.addText(evt.content, evt.charDelay || 25).then(() => {
          liamUI.showThinking();
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'liam-code':
        liamUI.hideThinking();
        liamUI.addCode(evt.content);
        break;
      case 'liam-banner':
        liamUI.hideThinking();
        liamUI.addSystemBanner(evt.content);
        vlAudio.sfxBanner();
        if (evt.wait) engine.eventDone();
        break;
      case 'liam-light-mode':
        liamUI.setLightMode(true);
        break;
      case 'liam-command':
        liamUI.addCommand(evt.content);
        if (evt.wait) engine.eventDone();
        break;
      case 'liam-clear':
        liamUI.clear();
        break;
      case 'liam-fadeout':
        document.querySelector('.liam-screen').classList.add('fading-out');
        break;
      case 'end-card':
        document.getElementById('end-card').classList.add('visible');
        break;
      case 'section-card-light':
        sectionLabel.textContent = evt.content;
        sectionCard.classList.add('visible', 'light-mode');
        break;
      case 'liam-user-input':
        liamUI.hideThinking();
        liamUI.addUserInput(evt.content);
        if (evt.wait) engine.eventDone();
        break;
      case 'liam-user-type':
        liamUI.typeInUserInput(evt.content, evt.charDelay || 80, () => vlAudio.sfxKeyclick()).then(() => {
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'liam-send':
        console.log('liam-send fired, wait:', evt.wait);
        vlAudio.sfxKeyclickLoud();
        liamUI.sendUserInput();
        if (evt.wait) { console.log('calling eventDone'); engine.eventDone(); }
        break;
      case 'liam-caleb-type':
        liamUI.calebType(evt.content, evt.wpm || 140, () => vlAudio.sfxKeyclick(), () => {
          vlAudio.sfxKeyclickLoud();
          liamUI.hideThinking();  // message sent — interrupt thinking
        }).then(() => {
          liamUI.showThinking();  // Liam starts thinking about the response
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'liam-confirm-wait':
        liamUI.showConfirmBar();
        break;
      case 'liam-confirm-select':
        vlAudio.sfxConfirm();
        liamUI.addConfirmSelect(evt.toolName);
        break;
      case 'liam-birthminute':
        liamUI.celebrateBirthminute();
        vlAudio.sfxBirthday();
        break;
      case 'liam-shimmer-dots':
        liamUI.showShimmerDots();
        vlAudio.sfxShimmerStart();  // rising buzz starts AFTER confirm
        break;
      case 'liam-search':
        liamUI.hideThinking();
        vlAudio.sfxSearch();
        liamUI.addSearch(evt.searchingText, evt.result, evt.searchedText, evt.lineDelay || 300).then(() => {
          liamUI.showThinking();
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'liam-logs':
        liamUI.hideThinking();
        vlAudio.sfxShimmerStop();  // kill the buzz when logs arrive
        liamUI.addLogs(evt.content, evt.lineDelay || 400, () => vlAudio.sfxLog()).then(() => {
          liamUI.showThinking();
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'liam-tool':
        liamUI.hideThinking();
        { const isErr = evt.result && evt.result.some(l =>
            /^error:|^bash:.*No such file|not found$|^fatal:|host unreachable/i.test(l));
          const isBirthday = evt.result && evt.result.some(l => /🎂|🎉/.test(l));
          if (isBirthday) { vlAudio.sfxTool(); setTimeout(() => vlAudio.sfxBirthday(), 600); }
          else if (isErr) vlAudio.sfxError();
          else vlAudio.sfxTool();
        }
        liamUI.addToolCall(evt.toolName, evt.result, evt.lineDelay || 300).then(() => {
          liamUI.showThinking();
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'caleb-text':
        calebUI.typeText(evt.content, evt.wpm || 200, () => vlAudio.sfxKeyclickSoft()).then(() => {
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'caleb-embed':
        vlAudio.sfxKeyclickLoud();
        calebUI.addEmbed(evt.embedType, evt.data);
        if (evt.embedType === 'pager-alert') vlAudio.sfxAlert();
        if (evt.wait) engine.eventDone();
        break;
      case 'caleb-card':
        vlAudio.sfxKeyclickLoud();
        calebUI.addCard(evt.title, evt.timestamp, evt.summary, evt.wpm || 200).then(() => {
          if (evt.wait) engine.eventDone();
        });
        break;
      case 'caleb-select-file':
        calebUI.selectFile(evt.file);
        break;
      case 'caleb-clear':
        calebUI.clear();
        break;
      case 'caleb-link':
        calebUI.addLink(evt.title, evt.timestamp);
        if (evt.wait) engine.eventDone();
        break;
    }
  };
})();
