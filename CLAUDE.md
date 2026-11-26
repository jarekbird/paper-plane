# Paper Plane

Telegram on Even G2 glasses, with Google Calendar in the same flow: the chats you pick at a glance, answered by
voice. An Even Hub app (`src/`, TypeScript) on [Earshot](https://github.com/jarekbird/earshot), and one Cloudflare
Worker (`worker/`) for voice and Google sign-in. Entry for the Heads Up hackathon; its terms are in
`docs/hackathon.md`, the features in `docs/roadmap.md`. `AGENTS.md` links here; skills are in `.claude/skills` (`.agents/skills` for Codex).

Rules here, as in t3-g2 and g2-messaging (Jarek): "as few tokens as possible while preserving clarity"; "top down
architecture limitations we want to enforce to keep the application code healthy, not something that documents
existing behavior and justifies it." Changing a rule needs Jarek's OK. Checks cite these IDs; `docs/test-map.md` says
which rule has which check. A rule with no check yet says so there.

## Product rules (Jarek, 2026-11-23)

- **G1** One app for two hackathon tracks: "Telegram + Google, one app". Telegram is the core; Google joins in the
  same flow ("put this on my calendar" from a message).
- **G2** It is a Telegram client, not a bot: "this isn't really a bot, it's just an interface". It signs in as the
  user and sends as the user.
- **G3** Same framework as the other apps: "I want to have the same implementation rules and checks that T3 Glasses
  and G2 Messaging applications have." This file, the skills and the checks are it.
- **G4** Built on Earshot. A need every voice app has goes into Earshot, by its own process; this repo never patches it.
- **G5** AI works on the user's words only ("Your words only"): what the user says may be turned into a message.
  Nothing read from Telegram is given to a model (Telegram API terms, 1.5).
- **G6** Channels are in, each post list followed by Telegram's sponsored message, as its API terms (3.3) require.

## Security rules

- **S1** Telegram talks to the phone only: the session, chats and messages go between `src/telegram` and Telegram's
  servers, never through a server of ours. Two things leave for the Worker when the user speaks, and nothing else:
  the sound of a hold and the words heard in it. No message text and no name of a chat or a person read from
  Telegram goes to the Worker or to a model; a chat said by name is matched on the phone. A Google sign-in passes
  through the Worker when it is made and when it is renewed (S7); the calendar itself goes only between
  `src/google` and Google.
- **S2** The network whitelist in `app.json` is exactly Telegram's web sockets, the Worker and Google's APIs. The
  bundle names no other address it can connect to. What the Telegram library only reads or prints is listed, each
  with its reason, in `scripts/store-check.mjs`.
- **S3** No key in the repo or the bundle: the OpenRouter key and Google's client secret live only on the Worker.
  Telegram's app id is injected at pack time and never committed.
- **S4** No log, error message or report on any side contains message text, names, numbers, addresses, audio,
  transcripts, tokens or keys.
- **S5** Nothing is written on the model's word alone. A message, a reaction or a calendar event is sent only after the
  glasses showed its exact text and where it goes, and the user confirmed by touch.
- **S6** Message text is untrusted: shown as plain text only, and never parsed as a command.
- **S7** The Worker stores nothing but a Google sign-in on its way to the phone: one entry, used once, gone in five
  minutes. No messages, no audio, no logs of content.

## Architecture rules

- **A1** A service (`src/telegram`, `src/google`, `src/voice`, `src/demo`) has no UI: it never imports `src/glasses`,
  `src/phone` or Earshot's screens.
- **A2** UI reaches a service only through the interfaces in `src/messenger.ts`. Only `src/telegram`, `src/google`
  and `src/voice` touch the network, each only its own hosts.
- **A3** Of the Even SDK bridge, Earshot draws, reads input and records. `src/main.ts` only waits for the bridge and
  hands it on, and only `src/store.ts` stores.
- **A4** Timers, listeners, sockets, subscriptions and requests belong to an Earshot `Lifetime` owned by a screen or
  a session, and end with it. No bare `setTimeout`, `setInterval` or `addEventListener`.
- **A5** User input is bound to its target when the user acts: a hold to the chat on screen when it starts. After an
  `await`, recheck that same target before acting. Code that owns a `Lifetime` awaits only through it.
- **A6** Every service call has a demo counterpart, and one contract test runs against both.
- **A7** Every input a screen takes is an Earshot action, so touch, the menu and voice do the same things.
- **A8** A feature the user has not set up (no Google sign-in) is hidden, not broken.

## Code rules

- **C1** No comments, except tool directives and one-line notes of external facts the code cannot express.
- **C2** Delete, never bypass: a replaced path goes in the same change, with its tests and docs.
- **C3** No copy-and-paste flows: sign-in is typed once or paired by code, logs are sent by the app.
- **C4** A bug fix comes with a test that fails on the old code.
- **C5** Glasses text is short and plain, from the user's view: one thing on screen and a few words.

## Process

Follow skill `develop` for every feature and fix, and skill `review-loop` before a pull request merges. Tests and
checks: `docs/test-map.md`. CI and merging: `docs/ci.md`. When Jarek corrects an agent, make the correction a rule
here and a check, as high up as it can go: architecture, types, lint, tests, then prose. Read t3-g2
(`jarekbird/t3-g2`) and g2-messaging for how an Even Hub app is built; never change them from here.
