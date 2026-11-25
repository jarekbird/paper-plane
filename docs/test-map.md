# Test map

What runs where, for Jarek's shared rule "Small, independent tests and CI feedback". This file is that rule's test
map for this repository; it adds commands and coverage, and replaces none of the rule.

## Layers

| Layer | What | Focused command | Whole suite |
|---|---|---|---|
| web | `src/`, `worker/`, `scripts/` and `eslint/` with Vitest. No test calls an outside service: services are tested against `src/demo` and fakes, the glasses against Earshot's fake bridge (`earshot/testing`) | `npx vitest related --run <changed files>`, or `npx vitest run <file> -t '<case>'` | `npm run check` |
| sim | None yet. The app in Even's simulator is run by hand (skill `simulator`); there is no simulator test config and no `sim` job in CI | none | none |

`npm run check` is, in order: `prettier --check .`, `eslint src`, `node scripts/architecture.mjs`, `tsc --noEmit`,
`vitest run`, `vite build`, `node scripts/store-check.mjs dist`, `npm run build:telegram`,
`node scripts/store-check.mjs dist-telegram`. `scripts/ci.test.mjs` holds it to that list. CI runs it on every push and pull request (`docs/ci.md`).

Cadence, from the shared rule:

- **Editing:** `npx prettier --check <files>`, `npx eslint <files>`, `npx tsc --noEmit`, and the focused tests of what
  changed. Rerun only what failed.
- **Before a commit:** the same, plus the guards below for every part you touched.
- **Delivery:** `npm run check` once on the exact commit, from a clean worktree, through the host's whole-suite
  runner where the host has one. A pass counts only for that tree.
- A case that fails is rerun alone once. If it then passes, that is a recorded flake, not a fix.

Every case owns its state: a fresh `Lifetime`, its own demo messenger and its own store (`memoryPlace`), ended in
`afterEach`. No case depends on another's order or output. Independence is unproven by a run: there is no
`exorcism.json` here, so it rests on that ownership.

## Guards

They scan the whole tree, so a focused selection never picks them up. They run in seconds: run them with every
focused run in a part you touched.

- `npx eslint src`: the rules in `eslint/plugin.js`, configured in `eslint.config.js`, over the TypeScript syntax
  tree; `plane/awaits` also reads types. Tested by `eslint/rules.test.js` and the files in `eslint/fixtures`
  (`npx vitest run eslint`). Inline `eslint-disable` comments are off.
- `node scripts/architecture.mjs` (G3 and the module map in `docs/architecture.md`), tested by
  `scripts/architecture.test.mjs`. `npm run architecture` regenerates the map.
- `scripts/ci.test.mjs`: the shape of CI. Run it with any change to `.github/workflows/` or the `check` script.
- `node scripts/store-check.mjs <folder>`, after a build into that folder: Even Hub's store rules for `app.json`, and
  every URL in the built files against the whitelist (Earshot's check). It reads scripts as JavaScript, so a URL
  joined from parts is found, and one whose host is only known at run time fails. `npm run build:telegram` builds
  the app with Telegram in it, under a made-up app id, into `dist-telegram`.

The lint rules read syntax, not text: comments and ordinary strings do not trip them, and a name is found however it
is spelled out (member, destructuring, `['fet' + 'ch']`, a multi-line call). They do not follow values through
variables or run code, and they read only `src`: what a library does on its own (a socket or a store `@mtcute/*`
opens) is for review. `plane/opaque` refuses `eval`, `Function`, `Reflect` and any use of `globalThis`, `window` or
`self` other than reading one named property or handing it to `life.listen`. Test files (`*.test.ts`) are exempt
from every lint rule here.

## Rules

Every rule of `CLAUDE.md` has a row; `scripts/architecture.mjs` fails when one is missing. "Review" is skill
`review-loop`.

| Rule | Check |
|---|---|
| **G1** | No check yet: a product goal, for review. |
| **G2** | No check yet: for review. |
| **G3** | `scripts/architecture.mjs`: `AGENTS.md` and `.agents/skills` are links to `CLAUDE.md` and `.claude/skills`, every skill `CLAUDE.md` names exists, every rule has a row here, and every ID a lint rule cites is a rule. |
| **G4** | No check yet: Earshot is pinned in `package.json`; that nothing here patches it is for review. |
| **G5** | As S1: `src/voice.test.ts` reads every request the app makes in a hold, on the list and in a chat, and finds nothing read from Telegram in it. `src/glasses/short.test.ts` and `src/voice/writer.test.ts`: the writer is given the words that were said and its own fixed instruction, nothing of the chat. |
| **G6** | No check yet: channels are not built. |
| **S1** | Only `src/telegram` imports `@mtcute/*` (`plane/imports`). `src/voice/hearing.test.ts`: the exact two requests the app makes of the relay (the sound; the words and the choices), their fields, and the one host. `src/voice.test.ts`: the whole path on Earshot's stand-in glasses with the sample account, where no request holds a chat title, a person's name or message text, and a chat said by name asks no model. `src/glasses/app.test.ts`, "by voice, from any screen": the same for the question alone, with the user's saved phrases. Writing a message out: `src/voice/writer.test.ts` (the exact request) and `src/glasses/short.test.ts` (only the words said reach the writer; an instruction on an open chat asks no navigator model). `src/phone/privacy.test.ts`: the phone page says what leaves the phone for the build it is in, and `PRIVACY.md` says the same word for word. |
| **S2** | `node scripts/store-check.mjs` in `npm run check`, on both builds: the one without an app id (`dist`) and the one with Telegram in it (`dist-telegram`, built with a made-up id). It is `earshot-check` with the list `NOT_DESTINATIONS`; `scripts/store-check.test.mjs` holds that list to things no web view can connect to. `src/telegram/transport.test.ts` holds every socket address to the whitelist. `vite.config.ts` strips the two web links the Telegram library carries. |
| **S3** | In part: the app id is read from `.env.local` at build time (`src/env.d.ts`, `src/main.ts`), and `.gitignore` keeps `.env.*` out. `src/voice/hearing.test.ts`: the app's requests carry no key. `worker/worker.test.ts`: the Worker adds the key on the way to OpenRouter and its answer does not carry it. That no key is in the repository: no check yet. |
| **S4** | In part: `src/voice/hearing.test.ts`: an error from the relay reaches the shell (which logs it) as fixed words and a status, without its cause and without a word of the answer. `worker/worker.test.ts`: the Worker has no log setting and its code names no log. `src/telegram/options.test.ts`: the Telegram library's logging is off. The rest: no check yet. `src/voice/writer.test.ts`: the writer fails without a word of what was said or answered. |
| **S5** | In part: `src/glasses/app.test.ts`, "a reply said aloud" and "a short answer" (shown first, sent only by a tap; chosen by voice, asks for a tap; a row cut short is shown in full first; the text sent is the text shown), and `src/phrases.test.ts` (a saved phrase is kept as the glasses show it). Also there: "a reply kept for later" and "the newest message from someone else" (keeping, liking and saving ask for a tap when said, and a like chosen for one message never lands on a newer one). Calendar events: no check yet. `src/glasses/short.test.ts`: a message the writer made is shown first and sent only by a tap, exactly as shown; no tap sends while it is being written or before the glasses drew it; the words as said stay when the writer fails; a saved phrase is never rewritten. Saying "send" on any reply asks for a tap; a long message that replaces another starts at its first line. `src/glasses/dictation.test.ts`: a sentence is never turned into a short answer that only means the same, and a command the navigator is not sure of sends nothing: the words become a reply to check. |
| **S6** | No check yet. |
| **S7** | `worker/worker.test.ts`: `worker/wrangler.toml` is held to its exact lines (no storage binding, no log setting), the Worker's code names no storage, log or background work, and it forwards only the calls, fields and models Earshot's relay lists. The Google sign-in entry: not built. |
| **A1** | `plane/imports`: a service imports no `src/glasses` or `src/phone`, and from `earshot` none of `Router`, `Shell`, `Glasses`, the views or their types (`SCREENS` in `eslint.config.js`). |
| **A2** | `plane/imports`: `src/glasses` and `src/phone` import no service folder and nothing outside `src/telegram` imports `@mtcute/*`. `plane/names`: `fetch`, `WebSocket`, `XMLHttpRequest`, `EventSource`, `WebTransport`, `RTCPeerConnection` and `sendBeacon` only in `src/telegram`, `src/google` and `src/voice`. "Each only its own hosts": `src/telegram/transport.test.ts` and `src/voice/hearing.test.ts`; `src/google` is not built. |
| **A3** | `plane/imports`: only `src/main.ts` imports the Even SDK. `plane/names`: the bridge's drawing, event and recording methods nowhere in `src`; its storage methods and the web view's storage only in `src/store.ts`. |
| **A4** | `plane/names`: no `setTimeout`, `setInterval`, `requestAnimationFrame`, `requestIdleCallback` or `addEventListener` in `src`. `plane/lifetime`: a socket is opened inside `life.own(...)`, and the handle of `onChange`, `onMic`, `onInput` or `subscribe` is never dropped. A `fetch` without `life.signal`: no check yet. |
| **A5** | In part: `plane/awaits` (reads types): in a function that owns a `Lifetime`, every `await` is `await life.guard(...)`, with no `.then()` and no lifetime read again after an await. Binding input to its target and rechecking it: no check yet (t3-g2's `recheck` rule names one controller's fields and was not ported). |
| **A6** | In part: `tsc` holds each service to the interfaces of `src/messenger.ts`, and `src/messenger.contract.ts` is the contract, run against the demo by `src/demo/messenger.test.ts`. The same contract runs against the Telegram adapter over a stand-in client that, like mtcute, tells nothing about the user's own writes (`src/telegram/messenger.test.ts`). Against Telegram itself (by hand, on Jarek's account), and that every call has a demo counterpart: no check yet. Signing in has its own contract, `src/account.contract.ts`, run against the sample account and against the Telegram account over a stand-in client (`src/demo/account.test.ts`, `src/telegram/account.test.ts`). `src/writer.contract.ts` runs against the sample writer and the writer behind the relay (over a stand-in for the relay). |
| **A7** | No check yet: Earshot's `Shell` gives a screen no raw touches, but reading `glasses.onInput` is not refused. `src/glasses/dictation.test.ts`: by voice, a command said by its name runs the same action as its touch, without a model. |
| **A8** | In part: `src/glasses/short.test.ts`: without a writer nothing offers to write a reply out. |
| **C1** | No check yet: neither t3-g2 nor g2-messaging checks it by lint or script. Review. |
| **C2** | No check yet. Review. |
| **C3** | In part: `plane/names` refuses `clipboard` and `execCommand` in `src`. |
| **C4** | No check yet. Review. |
| **C5** | No check yet. |

## Selection

- A change to `eslint/` or `eslint.config.js` runs `npx vitest run eslint` and `npx eslint src`.
- A change to `scripts/` or `.github/workflows/` runs `npx vitest run scripts`.
- A change to `CLAUDE.md`, a skill, this file or an import between modules runs `node scripts/architecture.mjs`.
- A change to `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` or `app.json`
  selects the whole of `npm run check`.
- A change under `src/glasses` or `src/phone` is also run in the simulator by hand (skill `simulator`).

## Not covered yet

- A simulator layer. Earshot ships the driver (`earshot/sim`); a test config, a test page and a CI job `sim` are to
  be added together, with each case owning its simulator, ports and output folder.
- The real glasses: fonts, scrolling and timing differ in the simulator.
- Telegram, Google and the Worker themselves: no test reaches them, and none may from `npm run check`.
- `worker/`: no lint, config check or tests until it exists (S7).
