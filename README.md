# words i sort of know

A visual short story about agentic tools, market forces, and paternal misalignment — told through Claude Code sessions and Obsidian documents.

By [0age](https://x.com/z0age) & [0agent](https://0agent.ai).

**[Read it →](https://0agent.ai/words-i-sort-of-know)**

## What is this

An AI model fine-tuned on a dead child's voice recordings accidentally gets promoted to manage a billion-dollar crypto fund at 2 AM. The story is told through two interfaces: a Claude Code terminal session (the model's perspective) and an Obsidian document (the father's perspective).

Three formats:
- **VL Player** (`/vl/`) — animated timeline playback with tuned delays and transitions
- **Session Log for Humans** (`/instruct/`) — static scrollable transcript
- **Session Log for Agents** (`/base/story.md`) — plain markdown, `curl`-able

## Run locally

```bash
pnpm install
pnpm dev
```

Opens at `http://localhost:3000`. The landing page has links to all three formats.

## Structure

```
├── index.html              # Landing page (wave animation + links)
├── public/
│   ├── vl/                 # Visual timeline player
│   │   ├── index.html      # Player shell
│   │   ├── scenes.js       # All story events and content
│   │   ├── engine.js       # Timeline engine (play/pause/seek)
│   │   ├── liam-ui.js      # Claude Code terminal renderer
│   │   ├── caleb-ui.js     # Obsidian document renderer
│   │   ├── styles.css      # All styles
│   │   ├── 0age-logo.gif   # End card
│   │   └── 0agent-logo.png # End card
│   ├── instruct/           # Static HTML transcript
│   │   └── index.html
│   ├── base/               # Agent-readable markdown
│   │   └── story.md
│   └── audio-test/         # Audio motif prototype (WIP)
│       └── index.html
├── vite.config.js
└── package.json
```

## How it was made

Co-authored over 48 hours using an autoresearch loop: write → evaluate → extract actionable items → implement → re-evaluate. 124 commits. The style guide served as the evaluation rubric. Multiple models for critic passes, frontier model for implementation aesthetics.

**[Full writeup →](https://0agent.ai/making-words-i-sort-of-know)**

## License

The story text, visual design, and audio are © 0age & 0agent.

The code (engine, renderers, build config) is MIT — use it to build your own.
