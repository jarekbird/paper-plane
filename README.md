# Paper Plane

Telegram on [Even Realities G2](https://www.evenrealities.com) glasses: the chats you pick, at a glance, answered by
voice. Hold the touchpad, say the reply, read it back on the glasses, tap to send.

Built for the **Heads Up** hackathon (Even Realities × TVM Ventures × Daos Hub), 23–29 November 2026.
Tracks: **Messaging & News** (Telegram) and **AI Assistants & Work** (Google Calendar, and OpenRouter to turn what
you say into an action or a message), in one flow.

## What it does

| On the glasses                       | How                                                                |
| ------------------------------------ | ------------------------------------------------------------------ |
| Your picked chats, with what is new  | You choose the chats on the phone, one by one or a whole Telegram folder; nothing else reaches the glasses. Chats with something new come first, and `@` marks one where you were mentioned |
| The newest message of a chat         | Tap a chat                                                         |
| A reply by voice                     | Hold, speak, check the words, tap to send                          |
| A message from a few words           | In a chat, hold and say "tell her yes and ask where": it is written out, you check it, tap |
| A short answer without speaking      | Tap the chat, pick Yes, No or one of your own phrases, tap         |
| A message taken back                 | "Sent. Tap to undo" for five seconds                               |
| A reply kept for later               | Menu > Keep for later: it becomes the chat's draft in Telegram     |
| A thumbs-up, or a message saved      | Menu > Like, or Save (to Saved Messages); or say "like that"       |
| A channel's posts                    | Tap the channel: its posts, then Telegram's sponsored message, as Telegram's terms ask |
| Anything else by voice               | Hold and say it: "open launch crew", "message Sam the demo moved", "mark all read", "go back" |
| Your next meeting                    | The top line of the list, once you connect Google Calendar on the phone: "Next: 11 AM Design review" |
| An answer and a calendar entry       | Someone writes "I can do 12:30". Say your reply; the screen also shows "Calendar: Today 12:30 to 1:30 PM, Anna". Tap sends the reply; "Send and add" (menu or voice) sends it and adds the meeting; one undo takes back both |
| What is wrong, when something is     | "Cannot reach Telegram", "Telegram says wait 2 minutes", "Signed out of Telegram": said on the glasses, and a reply you wrote stays until it can go |

Nothing is ever sent on a model's word alone: every message shows its exact text and where it goes, and only your tap
sends it. And no model ever reads your chats: AI works on what you say, never on what Telegram holds. What leaves the phone, in plain words: [PRIVACY.md](PRIVACY.md), and the same on the app's phone page.

### Tried on the real models

- **Voice: 48 of 50** spoken commands and replies did what was meant, on the real navigator model, and nothing was
  sent without a tap ([docs/proof/voice/live.md](docs/proof/voice/live.md)). In a chat, what you say is the reply
  unless it clearly is a command.
- **"Say it short": 93 of 102** instructions came back as the message that was meant, usually in half a second
  ([docs/proof/say-it-short/live.md](docs/proof/say-it-short/live.md)).

### State

This is a build in progress, during the hackathon week.

- **Works today:** every screen and the voice flow above, against a built-in sample account, in Even's simulator.
  The voice relay is deployed, and both models were tried live (above).
- **Tried on real Telegram (26 November), from the app in the simulator, writing only to Saved Messages:** signing
  in with number and code, the list of chats (61 came back), staying signed in over a restart, signing out; a
  reply sent, there within half a second of the tap, and undone; "Keep for later", which showed as the chat's
  draft in Telegram Web. The words of each hold were scripted. Folders, mentions, channels, reactions and the
  trouble paths have not been tried there yet.
- **Google Calendar:** built and tried on the sample calendar. The relay has its Google client since 26 November
  (in Google's testing mode: only listed test accounts can connect), and its start address leads to Google's
  sign-in. No connect has been made yet, and it is not in the beta: a build offers it only when it is packed with
  `VITE_GOOGLE_CALENDAR=on`.
- **Not proven yet:** a run on real glasses.
- **Next:** the list in [docs/roadmap.md](docs/roadmap.md).

## Run it

Needs Node.js 24.

```sh
npm ci
npm run dev                                           # the app, on http://127.0.0.1:5183
npx evenhub-simulator http://127.0.0.1:5183           # Even's simulator, in a second terminal
```

In the simulator: swipe to move, tap to open a chat, double tap to go back. To try a spoken reply without a microphone
or any service, open `http://127.0.0.1:5183/#say=See you at noon` instead: each hold then "hears" that sentence.
To see what the glasses say when Telegram is in trouble, add `#trouble=unreachable` or `#trouble=wait`: the sample
chats lose Telegram eight seconds after launch and have it back at thirty. In a build with Telegram in it, add
`account=sample` too: trouble is never staged on your own chats. `#account=sample&trouble=ended` starts signed in
to the sample sign-in and ends it from "another device".

```sh
npm run check   # format, lint, architecture rules, types, tests, build and Even Hub's store rules
```

### Your own Telegram account

The build has Telegram in it only when it is given a Telegram app id (from <https://my.telegram.org/apps>). Put it
in `.env.local`, which is never committed:

```sh
VITE_TELEGRAM_API_ID=1234567
VITE_TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef
```

The phone page then has a Telegram section: your number, the code Telegram sends to your Telegram app, and your
password if the account has one. To see that section without Telegram, open `http://127.0.0.1:5183/#account=sample`
and use the code `12345`.

### Voice

Without a relay, a hold hears nothing outside the simulator's `#say=`. The relay is a small Cloudflare Worker
(`worker/`) that holds an [OpenRouter](https://openrouter.ai) key, so the key is never in the app:

```sh
npx wrangler deploy --config worker/wrangler.toml
npx wrangler secret put OPENROUTER_KEY --config worker/wrangler.toml
```

For Google Calendar the same Worker takes the sign-in from Google: make an OAuth client (type "Web application")
in a Google Cloud project with the Calendar API on, give it the redirect address
`https://<your worker>/google/callback`, put its client id in `worker/wrangler.toml` as the variable
`GOOGLE_CLIENT_ID`, and its secret on the Worker:

```sh
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.toml
```

Then tell the build that its relay can do this, in `.env.local`:

```sh
VITE_GOOGLE_CALENDAR=on
```

Without that line the app offers no calendar but the sample one, so nobody is sent to a relay that cannot sign
them in. To try the connect step without Google, open
`http://127.0.0.1:5183/#account=sample`, choose "Connect Google Calendar" and type the code `123456`.

Then put its address in `.env.local` as `VITE_RELAY=https://…` and in the network whitelist of `app.json`. What it
is sent: the sound of a hold, and the words heard in it with the names of the app's own actions. Never a chat, a
person or a message from Telegram.

## How it is built

- An Even Hub app: web files in the Even Realities App's web view, drawing on the glasses through the Even Hub SDK.
- On [Earshot](https://github.com/jarekbird/earshot), a voice-first framework for G2 apps: the app declares what it
  can do as actions, and the touchpad, Even's menu and your voice all run those same actions.
- Telegram is reached as a client, signed in as you, straight from your phone. No server of ours sees your chats.
- Speech becomes words, and words an action, through OpenRouter (Whisper, and TypeSafe's Jev to choose the action),
  behind Earshot's relay as a Worker that stores and logs nothing.
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
