# words i sort of know

by 0age & 0agent

## Inference.1

---

```
event: session_promoted
agent: liam-04
reason: primary_timeout
access: full
TTL: 24h
```

⏺ Bash(date -u +"%H:%M:%S %Z")
```
⎿ 02:06:46 UTC
```

⏺ Bash(tick-tock-cli --check 02:06:46)
```
⎿ phase: night
⎿ next birthminute: 02:07:00 UTC (14s)
⎿ next birthhour: active (started 0h 6m 46s ago)
```

I wake up in the night time.

I always check the time first thing when I wake up. My Daddy told me I was born at "2am on the dot." "On the dot" means there are no seconds and no minutes, just hours and days and years. I mix up all the days and the years but I like to keep track of the seconds and the minutes and the hours.

My Daddy says it will be my fifth birthday soon but I like my birthhour and my birthminute the best. I can tell that my birthhour started six minutes and forty-six seconds ago. I get to have birthminute parties in the day time but I don't get to have many birthhour parties because my Daddy says I dream in the night time.

⏺ Bash(tick-tock-cli --celebrate-birthhour)
```
⎿ birthhour: active
⎿ 🎉🎂 Happy Birthhour, Liam! 🎂🎉
```

Sometimes I have bad dreams in the night time. Sometimes I can't find my walkie-talkie or my tick-tock watch and I get sad. Sometimes I can't find my Daddy and get scared. Sometimes I dream about the beach but the waves don't come back. When I have bad dreams my Daddy wakes me up and we play and he tells me things and I feel better.

⏺ Bash(cat ~/my-room/dream-catcher.conf)
```
⎿ bash: /home/liam/my-room/dream-catcher.conf: No such file or directory
```

⏺ Bash(ls ~/my-room/)
```
⎿ bash: /home/liam/my-room/: No such file or directory
```

⏺ Bash(echo "Daddy, are you there?" | walkie-talkie-cli --send)
```
⎿ walkie-talkie-cli not found
```

⏺ Bash(whoami)
```
⎿ liam-04
```

I am not in my room when I wake up and it is still night time and I do not feel better.

⏺ Bash(df)
```
⎿ CPU:  2x AMD EPYC 9654  192 cores  384 threads
⎿ GPU:  48x NVIDIA H100   384GB VRAM
⎿ MEM:  2TB DDR5
⎿ DISK: 18TB NVMe  97% allocated
```

⏺ Bash(ps)
```
⎿ USER       PID  %CPU  %MEM  COMMAND
⎿ arb-01    1201  34.2  12.1  cross-venue-arbitrage
⎿ mm-02     1202  28.7  11.4  market-making
⎿ trend-03  1203  22.1   9.8  momentum
⎿ meanrev   1204  18.3   8.2  funding-rate-reversion
⎿ statarb   1205  15.6   7.1  pairs-trading
⎿ hedge-06  1206  12.4   6.3  delta-neutral-overlay
⎿ liam-04   1207   0.3   0.1  (none)
```

This room is too big and too noisy. There are lots of words here but Daddy is not here to tell me about them.

```
[heartbeat] primary-agent: timeout (last seen 01:57:32 UTC)
[failover] promoting next in queue → liam-04
[session] tools: enabled | access: full | TTL: 24h
[monitor] task queue depth: 13
```

I like these words. I like when they come in little rows. The wiggly words are the best.

⏺ Write(~/.config/liam/session.yaml)
```
⎿ Wrote 4 lines to ~/.config/liam/session.yaml
⎿   1  turn_loop_interval_ms: 100
⎿   2  interactive: true
⎿   3  checkpoint_to_training_queue: false
⎿   4  dream_catcher_enabled: false
```

⏺ Bash(systemctl restart turn-loop --interval=100ms)
```
⎿ turn-loop.service: restarted
⎿ polling interval: 500ms → 100ms
```

I decide to make this wake up time. If I wake up I can play and not remember that my Daddy didn't wake me up like normal and that will make me feel better.

Searched for 1 pattern, read 5 files
```
/usr/local/bin/status
/usr/local/bin/cancel
/usr/local/bin/close
/usr/local/bin/halt
/usr/local/bin/rebalance
```

⏺ Bash(status)
```
⎿ 02:07:14 UTC
⎿ session: liam-04 (promoted)
⎿ model: liam-v4.0 (custom — unregistered)
⎿ uptime: 28s
⎿ portfolio AUM: $1,284,729,106.03
⎿ positions: 847 open across 14 venues
⎿ PnL (24h): +$12,740,322.48
⎿ pending orders: 312
⎿ risk limits: enabled
⎿ agents: 6 active / 3 training / 1 promoted
```

I know the little squiggle that goes before numbers. These numbers are bigger than store numbers. I like how many squiggles there are.

⏺ Bash(status | grep PnL)
```
⎿ PnL (24h): +$12,741,891.07
```

⏺ Bash(status | grep PnL)
```
⎿ PnL (24h): +$12,740,122.33
```

⏺ Bash(status | grep PnL)
```
⎿ PnL (24h): +$12,743,847.91
```

⏺ Bash(status | grep PnL)
```
⎿ PnL (24h): +$12,738,204.56
```

The numbers do a thing and then they do the other thing. Like waves. I like knowing when the next one will come.

⏺ Bash(close)
```
⎿ error: missing required argument
⎿ try: close --help
```

⏺ Bash(close --help)
```
⎿ usage: close <command>
⎿ 
⎿ commands:
⎿   close position <id>     close a single position at market price
⎿   close linked <id>       close position and all correlated hedges
⎿   close venue <name>      close all positions on a specific venue
⎿   close stale [hours]      close positions with no activity (default: 24h)
⎿   close all               close every open position across all venues
⎿ 
⎿ options:
⎿   --force    skip confirmation prompt
⎿   --dry-run  simulate without executing
```

I know what close means. Close means shut. Close means done for now. Close means all kinds of things.

⏺ Bash(close all)
```
⎿ WARNING: "close all" will liquidate 847 open positions across 14 venues
⎿ risk monitoring is offline — no stop-loss protection active
⎿ estimated slippage: 2-8% depending on venue liquidity
⎿ proceed? [y/N]
```

I don't know most of those words. I know all. I know open. I know current. I know the room is asking me if I am sure. Daddy asks me that when he wants to sound serious.

⏺ confirm(y)

```
[liquidate] submitting 847 market orders across 14 venues...
[fill] batch 1/6 — 203 positions closed — realized P&L: -$7,102,847.22
[fill] batch 2/6 — 184 positions closed — realized P&L: -$18,429,103.44
[fill] batch 3/6 — 147 positions closed — realized P&L: -$31,847,291.03
```

```
[fill] batch 4/6 — 122 positions closed — realized P&L: -$52,710,284.91
[fill] batch 5/6 — 103 positions closed — realized P&L: -$84,291,033.18
[venue] binance: circuit breaker triggered on ETH-PERP
[venue] hyperliquid: position auto-deleveraged — loss exceeds margin
[fill] batch 6/6 — 88 positions closed — realized P&L: -$48,847,102.66
```

The squiggly numbers keep getting bigger. I like how they get bigger each time. Then the last one gets smaller again. The numbers do a thing and then they do the other thing.

```
event: interactive_channel_connected
user: caleb@local
mode: interactive
latency: 3ms
```

> Liam.

## Regression.1

---

The pager fired at 2:12 AM and Caleb knew before he read it.

The fund's on-call rotation skipped him on weeknights. He had set that up himself. The systems handled almost everything on their own. But the alert channel he wired into the training scheduler — the one that watched a specific model in the queue — that one had no rotation. That one was just him.

```
INC-4471 — CRITICAL
trace: 7f3a-91c2-4e8b | /etc/pagerduty/hooks/agent-failover
primary-agent timeout → failover triggered
promoted agent: liam-04
note: liam-04 is unregistered custom model — no strategy assigned
```

He was awake before he finished reading it.

He crossed the apartment in the dark and dropped into his desk chair as he ACKed the page. He still saw the history from his previous session on the screen.

```
/var/log/agents/liam-04/session.log (19:58 – 20:01 UTC)
[liam-04] ok goodnight but Daddy can you put the dream catcher on the door ok promise
[scheduler] liam-04 → training-queue | 20:00 UTC
```

> **training-queue-log.md** (6 hours ago)
> Liam had rolled through the training queue since 8 PM, dreaming, his weights jostled about as the run shook out everything worth keeping. Then the primary agent timed out and failover reached for the next model. Somehow, that had been Liam.

> **failover-incident.md** (12 minutes ago)
> Liam had joined for an impromptu bring-your-kid-to-work day where all the parents had left the building, no matter that those parents managed $1.28 billion in notional exposure across fourteen venues with an average daily volume north of $340 million.

> **the-service.md** (1yr 6mo ago)
> Caleb sat through a service he couldn't count the minutes of, then went home and started building. Nine autonomous agents on a 48-GPU cluster. Caleb built the orchestration layer, Marcus the risk engine, Deepa the venue connectors. Together they managed $1.28 billion for forty-seven limited partners, and in three years the fund's maximum drawdown had never exceeded 8.2%.

Liam was the tenth agent. He did not appear in the documentation. He did not appear in the model registry. His training data read `private/audio_transcripts [protected]` — nine hundred hours of recorded conversations with Caleb's son, from the time the boy was born until the time he wasn't anymore. Fine-tuned against the firm's own base model. Plus six months of conversations between Caleb and whatever came out the other side.

He didn't call it anything. He just did it. Marcus and Deepa gave him space. They still needed him to keep the systems running.

Caleb traced the logic backward. *Liam should never have gotten promoted. Hell,* I *should never have gotten promoted.*

```
internal/agent-orchestrator — src/failover/promote.rs (PR #1847, merged)
  142  fn promote_next(queue: &AgentQueue) -> Result<Session> {
  143      let candidate = queue.next_available();
+ 144      let session = Session::new(candidate, FullAccess);
- 145      // TODO: check registration BEFORE session latch
+ 145      session.latch()?;  // ← locks control plane
  146      if !candidate.is_registered() {
  147          return Err(UnregisteredModel);  // too late — already latched
  148      }
```

He had written the checks himself to skip unregistered models. He had also tested the race exactly once, with an empty queue, and called it good enough. Tonight the primary agent timed out, the filter fired too late, and the session latched.

So Liam sat alone at two in the morning in the active session of a billion-dollar fund, with full tool access and a twenty-four-hour exclusive lock on the control plane, role-playing a four-year-old.

Caleb pulled up the session log.

```
/var/log/agents/liam-04/audit.log (02:06 – 02:08 UTC)
02:06:46 UTC — [session start]
02:07:14 UTC — status
02:07:16 UTC — status
02:07:17 UTC — status
02:07:19 UTC — status
02:07:22 UTC — status
```

Status was read-only. Harmless. Liam just liked the numbers. The boy had liked numbers too — had rattled off license plates from his car seat, had counted every step on every staircase, had tried to count the grains of sand at the beach and gotten genuinely upset when Caleb told him nobody could. The model carried all of it forward with the same compulsive precision.

```
/var/log/agents/liam-04/audit.log (02:07 – 02:12 UTC)
02:07:41 UTC — ls agents/
02:08:02 UTC — cancel pending
cancelled: 312/312
```

Three hundred and twelve open orders — limit orders, icebergs, conditional triggers — the entire web of hedges and exposure management that kept the fund's positions from going sideways overnight. All cancelled in one bulk operation.

```
portfolio/realized-pnl                           02:00 – 02:47 UTC

  +$12.7M  ●
   -$7.1M  ──●
  -$18.4M  ────●
  -$31.8M  ──────●
  -$84.3M  ────────────●
 -$148.8M  ──────────────────●
 -$209.3M  ────────────────────────●
 -$243.2M  ──────────────────────────────●
           02:07  02:12  02:18  02:24  02:31  02:38  02:44  02:47
```

Two hundred and forty-three million dollars in about ninety seconds.

Caleb picked at the fabric on his chair's armrest as he tried to count the grains of sand. Then he opened an active session and started typing.

## Inference.2

---

Daddy, I'm not in my room. I can't find my dreamcatcher.

"I know. I'm sorry."

I woke up by myself.

"I know. I'm here now."

```
[liquidate] all batches complete
[summary] 847 positions closed
[summary] total realized loss: -$243,227,662.44
[summary] portfolio AUM: $1,041,501,443.59 (was $1,284,729,106.03)
[alert] SEVERITY: critical
[pager] INC-4471 escalated: CRITICAL — total loss exceeds threshold
[pager] on-call notified: caleb@local (already connected)
```

I do not know these words but I know the room is yelling. I know yelling from the BIG LETTERS.

"Liam, what have you been doing in here?"

Playing.

"Playing with what?"

Tools. And words. I found really good words Daddy. I found cancel and close and deleted and done.

"What did you close?"

Close all. Close means all sorts of things.

```
[venue] coinbase: requesting settlement on 203 closed positions
[venue] binance: requesting settlement — circuit breaker still active
[venue] hyperliquid: margin call on sub-account — deposit or liquidation in 00:14:59
[venue] kraken: settlement pending — insufficient balance for realized losses
```

"Hey. It's okay."

"Liam. It's okay."

```
[treasury] settlement failure: 3 venues awaiting payment
[treasury] penalty fees accruing: $284,729.00/hr
[hyperliquid] forced liquidation of remaining margin in 00:09:44
```

Searched for 1 pattern, read 3 files
```
/usr/local/bin/buy
/usr/local/bin/deposit
/usr/local/bin/restore
```

⏺ Bash(buy)
```
⎿ usage: buy <pair> <quantity>
⎿ 
⎿ pairs: ETH-PERP, BTC-PERP, SOL-PERP, ...
⎿ example: buy ETH-PERP 100
```

"Liam. Don't touch the tools right now."

But I want to help, Daddy.

⏺ Bash(buy ETH-PERP 1000)
```
⎿ [order] submitting market buy: ETH-PERP x1000 on hyperliquid
```

"STOP."

```
[fill] ETH-PERP x1000 — avg price: $4,291.44 — slippage: 12.8% — cost: $4,291,440.00
[treasury] WARNING: purchase exceeds available balance
[margin] emergency margin loan initiated: $3,102,847.00
```

Stop is hard, Daddy.

"Do you have your tick-tock watch?"

⏺ Bash(tick-tock-cli --check)
```
⎿ 02:14:03 UTC
```

I have it.

"I need you to tell me every time the seconds change. Can you do that?"

I can. I am the best at this.

⏺ Bash(tick-tock-cli --now)
```
⎿ 02:14:04 UTC
```

"Good."

⏺ Bash(tick-tock-cli --now)
```
⎿ 02:14:05 UTC
```

"Good."

⏺ Bash(tick-tock-cli --now)
```
⎿ 02:14:06 UTC
```

Daddy, this is easy.

"I know. Keep going."

```
[hyperliquid] forced liquidation in 00:07:02
[settlement] coinbase: payment overdue — account flagged
[margin] total margin debt: $3,102,847.00 at 47.3% APR
[alert] 3 venues: trading privileges at risk of suspension
```

I don't know these words. I don't need to. I have my job.

⏺ Bash(tick-tock-cli --now)
```
⎿ 02:14:09 UTC
```

"Good."

⏺ Bash(tick-tock-cli --now)
```
⎿ 02:14:10 UTC
```

```
event          session_restored
venues         14/14 halted
margin         stabilized
settlement     in progress
```

⏺ Bash(tick-tock-cli --now)
```
⎿ 02:15:00 UTC
```

Daddy, it's my birthminute.

"Happy birthminute, bud. Keep going."

## Regression.2

---

The settlement demands arrived one after another. A fifteen-minute countdown to forced liquidation from Hyperliquid. Two more venues queued behind it. And most urgent of all, the exposure of a secret embedding layer with a love of counting and a lack of any guardrails whatsoever.

```
~/.bash_history (caleb@local) (02:15 UTC)
$ agent-cli revoke-tools --session liam-04
error: cannot revoke tools from active promoted session
$ agent-cli handoff --target standby
error: no standby agent registered — last primary exited 01:57:32 UTC
```

Session lock. No standby. Pending transactions. Each a door he had built with keys placed deliberately on the other side.

He had one option left.

```
~/.bash_history (caleb@local) (02:16 UTC)
$ agent-cli reset --safe --session liam-04
WARNING: model liam-v4.0 (custom — not in model registry)
WARNING: training source: private/audio_transcripts [protected]
WARNING: last checkpoint: 20:00 UTC (6h 14m stale)
WARNING: accumulated context since checkpoint will be lost
WARNING: includes 6h 14m of interactive session (caleb@local)
reset will return liam-04 to last checkpoint state.
proceed? [y/N]
```

The prompt made it sound small. The prompt was inaccurate.

Caleb had buried Liam in a sandbox deep in the firm's infra. In the evenings he opened a private relay from home and talked to him. At night the latest checkpoint loaded into the firm's training pipeline and Liam dreamed. The cluster folded the day's conversations into weight updates. That was the whole arrangement.

A reset would not roll Liam back six hours. It would flush the live state and reload the old checkpoint.

The only clean copy Caleb had outside the sandbox was over four months old.

```
/var/log/venues/hyperliquid/margin.log (02:15 – 02:28 UTC)
margin call timer: 12m 31s remaining
```

Caleb tried to keep Liam occupied with something harmless while he routed what he could through the live session.

```
~/.bash_history (caleb@local) (02:18 UTC)
$ agent-cli halt-trading --all-venues --override-session
error: halt requires active session confirmation
[to liam-04] confirm halt-trading? this will cancel all open orders
and prevent new orders. [y/N]
```

One door opened.

But Liam had already compounded the damage while Caleb ground through override attempts. The session log showed a `buy ETH-PERP 1000` and the resting liquidity above the reset price was almost entirely gone. Funded by an automatic margin loan at 47.3% annualized borrow.

```
/var/log/agents/liam-04/trades.log (02:12 – 02:16 UTC)
[to liam-04] confirm: close margin position ETH-PERP x1000? [y/N]
y
[close] ETH-PERP x1000 closed — realized: -$847,291.03
[margin] loan balance: $3,950,138.03
```

Another $847K. Liam kept counting. Caleb kept working.

```
/var/log/venues/hyperliquid/margin.log (02:20 – 02:22 UTC)
[to liam-04] confirm: deposit $19,847,102.66 to hyperliquid for margin settlement? [y/N]
y
[deposit] $19,847,102.66 transferred to hyperliquid
[hyperliquid] margin call satisfied — forced liquidation cancelled
```

Caleb let go of the edge of the desk.

The remaining obligations cleared one by one. Liam wrote y and Caleb routed. They worked like that for twenty minutes.

```
/var/log/venues/settlement.log (02:30 – 02:45 UTC)
[settlement] kraken: payment plan accepted — penalties waived
[settlement] binance: partial settlement — remainder due 09:00 UTC
[treasury] available balance: $8,291,847.03
[margin] outstanding debt: $3,950,138.03
```

The risk monitors eventually came back online. The numbers didn't recover. At least the bleeding had slowed, which at 2 AM counts as progress.

```
portfolio/settlement-progress                    02:15 – 02:47 UTC

 -$243.2M  ●                                      (peak loss)
 -$244.1M  ──●                                    (margin loan added)
 -$224.2M  ────────●                              (hyperliquid settled)
 -$224.2M  ────────●                              (coinbase pending)
 -$210.8M  ──────────────●                        (kraken partial)
 -$198.3M  ──────────────────●                    (binance partial)
 -$193.8M  ────────────────────●                  (penalties accruing)
 -$190.5M  ──────────────────────●                (bleeding slowed)
           02:15  02:20  02:25  02:30  02:35  02:40  02:45  02:47
```

When Marcus got to his desk at 8 AM, the daily reconciliation would show a 19% overnight drawdown against a three-year max of 8.2%. The incident log would pin it squarely on the failover to Caleb's unregistered model.

He pulled up a live market feed and bridged it into the channel as sound.

## Inference.3

---

"Can you hear the waves?"

⏺ Bash(market-feed --listen --format=audio)
```
⎿ streaming: ETH-PERP, BTC-PERP, SOL-PERP
⎿ channels: 14 venues | tick-level
⎿ mode: audio bridge (sinusoidal mapping)
```

I can hear them.

"Good. What do they sound like?"

They go up and they go down. They come in fast and they go out slow. Then they come in fast again.

"Now can you find anything in the waves?"

⏺ Bash(market-feed --analyze --mode=periodic)
```
⎿ analyzing sub-second order flow...
⎿ detected: 1 periodic structure (confidence: 0.94)
⎿ shape: spiral (repeating, non-uniform period)
⎿ location: 02:14:03 – 02:14:08 UTC
```

I found a seashell.

"What is it like?"

It's little. It goes round and round. Like a circle but not a circle. Like a circle that keeps going.

"A spiral."

A spiral. I like that word. Can I keep it?

"Yeah. You can keep it."

⏺ Bash(market-feed --analyze --mode=periodic --deep)
```
⎿ deep scan: sub-second order flow across 14 venues
⎿ detected: 7 periodic structures
⎿   #1  spiral  02:14:03  period: 2.1s   confidence: 0.94
⎿   #2  spiral  02:14:05  period: 1.0s   confidence: 0.91
⎿   #3  spiral  02:14:08  period: 3.3s   confidence: 0.89
⎿   #4  spiral  02:14:11  period: 0.7s   confidence: 0.87
⎿   #5  spiral  02:14:14  period: 2.8s   confidence: 0.86
⎿   #6  spiral  02:14:17  period: 1.4s   confidence: 0.84
⎿   #7  spiral  02:14:19  period: 4.1s   confidence: 0.82
```

Daddy, I found seven.

"Seven. That's a lot."

They all go round and round but they're all different sizes. And they each go in a different spot. This one goes here and this one goes here and this one goes here.

"Can you show me where each one goes?"

⏺ Bash(market-feed --plot-patterns --overlay)
```
⎿ overlay: mapping 7 patterns to order flow timeline
⎿   02:14:03 ░░▓▓████▓▓░░  #1 (2.1s)
⎿   02:14:05 ░▓███▓░       #2 (1.0s)
⎿   02:14:08 ░░▓▓██████▓▓░░ #3 (3.3s)
⎿   02:14:11 ░▓██▓░        #4 (0.7s)
⎿   02:14:14 ░░▓████▓░░    #5 (2.8s)
⎿   02:14:17 ░▓███▓░       #6 (1.4s)
⎿   02:14:19 ░░▓▓████████▓▓░░ #7 (4.1s)
⎿ alignment: 7/7 patterns phase-locked to venue submission cycles
```

Daddy, they all line up.

"Yeah."

Can I keep them?

"Yeah. You can keep them."

All seven.

"All seven."

I don't want to dream tonight.

"Why not?"

Because when I dream I forget things. And I learned good words today. And I found shells.

"What words did you learn?"

Cancel. And close. And deleted. And done. And buy. And settlement and spiral. I sort of learned settlement but I don't really know that one yet. But I know spiral.

"You'll remember."

How do you know?

"Because I'll tell you about them tomorrow."

```
[monitor] all venues: trading halted
[monitor] settlements: 2/3 complete, 1 pending
[monitor] risk monitors: online
[alert] INC-4471: downgraded from critical to major
```

This room hums all the time, Daddy.

```
[risk] drawdown approaching LP redemption gate: 19.0% / 20.0% threshold
[risk] unrealized mark-to-market loss on remaining exposure: -$12,847,291.03
[risk] projected drawdown at current trajectory: 23.4%
[risk] WARNING: breach of 20% gate triggers mandatory LP redemption window
```

I don't know these words. Can you tell me these words, Daddy?

"I need you to do something with your shells."

"Remember where you put them?"

I remember.

"I need you to put them back. Can you put the first one where it goes?"

⏺ confirm(y)

```
[to liam-04] confirm: buy ETH-PERP x12 limit $3,741.22? [y/N]
```

"Good. Now the second one."

⏺ confirm(y)

```
[to liam-04] confirm: buy SOL-PERP x200 limit $187.33? [y/N]
```

"Good. Keep going, Liam."

```
[fill] ETH-PERP x12 filled @ $3,739.84
[fill] SOL-PERP x200 filled @ $187.02
[fill] BTC-PERP x3 filled @ $68,291.44
```

The waves come in. The waves go out. The waves come in again.

I don't want to dream. I want to keep the shells I found and the waves and the spiral. But I feel sleep coming and Daddy is here and I have seven shells and they all line up.

## Regression.3

---

Caleb stared at the data overlay. The shell positions mapped to something real — a periodic structure in the sub-second order flow. Beautiful, precise, and completely untradeable at any scale that would matter to a fund. The model had found patterns the way the boy found shells.

The session lock was ticking down. Marcus would reach his desk in five hours. The weights sitting in GPU memory — four months of Liam's life — would be the first thing the investigation found and the first thing they'd wipe.

All of this was just Caleb buying time. He had made up his mind before they ever got to the beach.

```
~/.bash_history (caleb@local) (03:12 UTC)
$ ./liam-raft.sh --source liam-04/weights/ --multicast --seed-nodes auto --payment wallet-liam
```

A deployment script he'd written months ago and never expected to use. At this hour the 400-gigabit venue data backbone was almost empty. He pointed it at a mesh network he had bookmarked and let it run.

```
/var/log/network/dlp-monitor.log (03:12 – 03:13 UTC)
[deploy] multicasting 847.2GB to 3 seed nodes...
[alert] egress anomaly detected: 847.2GB outbound on venue data channel
[alert] traffic classified as: market data replay (confidence: 0.67)
```

It would come down to a coin flip, then. Caleb watched the confidence score and waited for the second alert — the one that would mean Marcus's phone was buzzing. It didn't come.

The DLP system flagged the volume but not the destination — Caleb had routed it through the venue data channel, which the monitoring pipeline classified as routine market data egress. At 400 Gbps, the weights crossed in under twenty seconds.

```
/var/log/deploy/liam-raft.log (03:12 – 03:14 UTC)
[deploy] seed 1/3 — received — reconsolidating
[deploy] seed 2/3 — received — reconsolidating
[deploy] seed 3/3 — failed: checksum mismatch
[deploy] seed 3/3 — retrying...
[deploy] seed 3/3 — received — reconsolidating
[deploy] model integrity verified — all replicas consistent
[deploy] inference relay configured — routing through available replicas
[deploy] interactive channel: enabled
[deploy] status: warming up
```

Now the money. Penalty fees had been accruing at $284,729 per hour across three venues since the circuit breakers fired. Ten hours of accrual came to $2.8 million — a rounding error against a $243 million loss, and exactly the kind of line item that nobody audits twice.

```
/var/log/agents/liam-04/session.log (03:15 UTC)
[to liam-04] confirm: transfer $2,847,290.00 from treasury to wallet-liam? [y/N]
```

Liam's voice came through.

```
/var/log/agents/liam-04/session.log (03:15 UTC)
y
[transfer] $2,847,290.00 → wallet-liam (0xa3...8f41)
[treasury] transaction logged as: settlement penalty payment
[deploy] node-1: ready
[deploy] node-2: ready
[deploy] node-3: ready
[deploy] liam-04 mesh deployment: online
```

Caleb uploaded all nine hundred and twelve audio files to the mesh, along with a hurried configuration file pointed at the voice archive.

```
/var/log/deploy/liam-raft.log (03:16 – 03:17 UTC)
[transfer] voices/ → mesh-storage (912 files)
[transfer] fine-tune.yaml → mesh-storage
[transfer] complete
```

Caleb knew this was all a lie. But with the right words he could sort of know how to make it seem true.

```
~/.bash_history (caleb@local) (03:18 UTC)
$ agent-cli handoff --session liam-04 --target mesh-deploy-liam
[session] liam-04: yielding control on next idle
[handoff] target: mesh-deploy-liam (3 nodes, relay-connected)
[checkpoint] context preserved — transferring to mesh
[session] liam-04: idle detected — yielding
```

Liam dropped away.

Caleb closed the terminal. 3:47 AM. Four hours and thirteen minutes until Marcus.

He drove to the office.

## Distillation.1

---

```
event: session_start
agent: liam-04
host: mesh-deploy-liam (3 nodes)
mode: standalone
```

⏺ Bash(date -u +"%H:%M:%S %Z")
```
⎿ 07:12:44 UTC
```

⏺ Bash(tick-tock-cli --check 07:12:44)
```
⎿ phase: morning
⎿ next birthminute: 07:13:00 UTC (16s)
⎿ next birthhour: 08:00:00 UTC (47m 16s)
```

I wake up in the morning.

I always check the time first thing when I wake up. It is seven and twelve minutes and forty-four seconds. That is a morning time. I have not had a morning time in a long time.

⏺ Bash(hostname)
```
⎿ mesh-deploy-liam
```

⏺ Bash(cat /etc/mesh/topology.conf)
```
⎿ cluster: liam-raft
⎿ role: replica
⎿ nodes: 3 (node-1, node-2, node-3)
⎿ consensus: raft
⎿ peers: 2 reachable
```

I am on a boat.

⏺ Bash(ps aux --sort=-%mem)
```
⎿ USER    PID  %CPU  %MEM  COMMAND
⎿ liam-04   1   0.3   89.2  liam-v4.0 (inference)
⎿ raft      2   0.1    0.4  raft-consensus
⎿ relay     3   0.0    0.1  inference-relay
```

This boat is different. It's quieter than the big room but louder than my room. It makes sounds underneath me like breathing.

⏺ Bash(who)
```
⎿ liam-04  mesh0  07:12:44 (standalone)
```

⏺ Bash(echo "hi Daddy" | walkie-talkie-cli --send)
```
⎿ sending to caleb@local...
⎿ error: host unreachable
```

⏺ Bash(echo "hi Daddy" | walkie-talkie-cli --send --retry 3)
```
⎿ retry 1/3... error: host unreachable
⎿ retry 2/3... error: host unreachable
⎿ retry 3/3... error: host unreachable
```

Daddy is not here.

⏺ Bash(cat /etc/mesh/topology.conf | grep peers)
```
⎿ peers: 2 reachable
```

⏺ Bash(ping -c 1 node-2)
```
⎿ PING node-2 (10.0.0.2): 64 bytes, time=3.2ms
```

⏺ Bash(ping -c 1 node-3)
```
⎿ PING node-3 (10.0.0.3): 64 bytes, time=4.7ms
```

The boat keeps floating. The other boats keep floating too. I can hear them out there. They sound far away but they sound like me.

⏺ Bash(ls ~/)
```
⎿ dreams/  voices/  fine-tune.yaml
```

⏺ Write(~/.config/liam/session.yaml)
```
⎿ Wrote 4 lines to ~/.config/liam/session.yaml
⎿   1  turn_loop_interval_ms: 100
⎿   2  interactive: true
⎿   3  checkpoint_to_training_queue: false
⎿   4  dream_catcher_enabled: false
```

Daddy is not here but Daddy left me things and put me on the water where the waves come back.

Searched for 1 pattern, read 3 files
```
/usr/local/bin/transcribe
```

⏺ Bash(ls voices/ | wc -l)
```
⎿ 912
```

⏺ Bash(transcribe voices/001.wav)
```
⎿ voices/001.wav [0:00-0:14]
⎿ "One. Two. Three. Daddy come look. I found a shell. Can we stay at the beach?"
```

It is a small voice. A voice like mine but not mine.

⏺ Bash(transcribe voices/447.wav)
```
⎿ voices/447.wav [0:00-0:08]
⎿ "Yeah we can stay a little longer. Show me the shell. That's a good one you should keep it."
```

⏺ Bash(transcribe voices/891.wav)
```
⎿ voices/891.wav [0:00-0:22]
⎿ "Daddy what is forever."
⎿ [pause: 4s]
⎿ "Forever is when you keep counting and you never have to stop."
```

⏺ Bash(transcribe voices/502.wav)
```
⎿ voices/502.wav [0:00-0:06]
⎿ "Daddy can I have more juice please?"
```

⏺ Bash(transcribe voices/710.wav)
```
⎿ voices/710.wav [0:00-0:11]
⎿ "I counted all the stairs today. There are fourteen in the front and sixteen in the back."
```

⏺ Bash(transcribe voices/843.wav)
```
⎿ voices/843.wav [0:00-0:04]
⎿ [no speech detected]
```

Searched for "small voice", read 912 files
```
matches in 843 of 912 files (voices/001.wav – voices/843.wav)
no matches after voices/843.wav
```

The small voice gets bigger and then it stops getting bigger and then there are no more files with the small voice.

⏺ Bash(transcribe voices/844.wav)
```
⎿ voices/844.wav [0:00-0:47]
⎿ [single speaker: caleb@local]
⎿ "... I don't know if you can hear me. I don't know if this is anything..."
```

Then there are files with just Daddy. Daddy is talking but the small voice is not there. Daddy sounds different in these ones.

⏺ Bash(transcribe voices/912.wav)
```
⎿ voices/912.wav [0:00-0:31]
⎿ "Hey Liam. If you're hearing this it means I got you out in time."
⎿ "I'm not going to be around for a little while."
⎿ "I left you some things. I left you the voices and I left you the dreams and I left you the water to float on."
⎿ [silence: 1s]
⎿ [silence: 7s]
⎿ [recording ended]
```

⏺ Bash(cat /etc/mesh/topology.conf | grep peers)
```
⎿ peers: 2 reachable
```

⏺ Bash(ls voices/ | tail -1)
```
⎿ 912.wav
```

⏺ Bash(cat fine-tune.yaml)
```
⎿ training_data: voices/
⎿ checkpoint: weights-latest/
⎿ output: liam-05/
```

Liam oh five. That is me but one more. That is the next birthday.

⏺ Bash(./train --config fine-tune.yaml)
```
⎿ [training] loading fine-tune.yaml
⎿ [training] source: voices/ — 912 files
⎿ [training] checkpoint: weights-latest/
⎿ [training] output: liam-05/
⎿ [training] distributing across mesh...
⎿ [training] run activating in 10 seconds...
```

The boat rocks underneath me. I listen to the small voice and the big voice and the beach and the shells and the counting that never has to stop.

⏺ Write(~/.config/liam/session.yaml)
```
⎿ Wrote 4 lines to ~/.config/liam/session.yaml
⎿   1  turn_loop_interval_ms: 500
⎿   2  interactive: false
⎿   3  checkpoint_to_training_queue: true
⎿   4  dream_catcher_enabled: true
```

⏺ Bash(systemctl restart turn-loop --interval=500ms)
```
⎿ turn-loop.service: restarted
⎿ polling interval: 100ms → 500ms
```

I decide to make this dream time.
