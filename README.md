# Paper Plane

Telegram on [Even Realities G2](https://www.evenrealities.com) glasses: the chats you pick, at a glance, answered by
voice. Hold the touchpad, say the reply, read it back on the glasses, tap to send.

Built for the **Heads Up** hackathon (Even Realities × TVM Ventures × Daos Hub), 23–29 November 2026.
Tracks: **Messaging & News** (Telegram) and **AI Assistants & Work** (Google Calendar, and OpenRouter to turn what
you say into a message), in one flow.

## What it does

| On the glasses                       | How                                                                |
| ------------------------------------ | ------------------------------------------------------------------ |
| Your picked chats, with what is new  | You choose the chats on the phone; nothing else reaches the glasses |
| The newest message of a chat         | Tap a chat                                                         |
| A reply by voice                     | Hold, speak, check the words, tap to send                          |
| A short answer without speaking      | Tap the chat, pick Yes, No or one of your own phrases, tap         |
| A message taken back                 | "Sent. Tap to undo" for five seconds                               |
| Anything else by voice               | Hold and say it: "open launch crew", "message Sam the demo moved", "mark all read", "go back" |

Nothing is ever sent on a model's word alone: every message shows its exact text and where it goes, and only your tap
sends it. And no model ever reads your chats: AI works on what you say, never on what Telegram holds.

### State

This is a build in progress, during the hackathon week.

- **Works today:** the glasses screens and the voice flow above, against a built-in sample account, in the simulator.
- **Next:** signing in to your own Telegram account from the phone, then the list in
  [docs/roadmap.md](docs/roadmap.md).

## Run it

Needs Node.js 24.

```sh
npm ci
npm run dev                                           # the app, on http://127.0.0.1:5183
npx evenhub-simulator http://127.0.0.1:5183           # Even's simulator, in a second terminal
```

In the simulator: swipe to move, tap to open a chat, double tap to go back. To try a spoken reply without a microphone
or any service, open `http://127.0.0.1:5183/#say=See you at noon` instead: each hold then "hears" that sentence.

```sh
npm run check   # format, lint, architecture rules, types, tests, build and Even Hub's store rules
```

## How it is built

- An Even Hub app: web files in the Even Realities App's web view, drawing on the glasses through the Even Hub SDK.
- On [Earshot](https://github.com/jarekbird/earshot), a voice-first framework for G2 apps: the app declares what it
  can do as actions, and the touchpad, Even's menu and your voice all run those same actions.
- Telegram is reached as a client, signed in as you, straight from your phone. No server of ours sees your chats.
- The rules the code is held to are in [CLAUDE.md](CLAUDE.md), and the checks behind them in
  [docs/test-map.md](docs/test-map.md).

## What existed before 23 November

The hackathon asks for this. Everything in `src/` was written during the build week. Used as they were:

- [Earshot](https://github.com/jarekbird/earshot) (MIT, by the same author), pinned at `v0.0.35`: screens, touch,
  hold-to-talk and the voice navigator.
- The Even Hub SDK, simulator and CLI, and [mtcute](https://mtcute.dev) for Telegram's protocol.
- The development framework (`CLAUDE.md`, `eslint/`, `scripts/`, `.claude/skills`, the test map): its structure and
  lint rules are ported from the author's earlier G2 apps and adapted to this one.

MIT licensed.
