# Test map

What runs where, for Jarek's shared rule "Small, independent tests and CI feedback". This file is that rule's test
map for this repository; it adds commands and coverage, and replaces none of the rule.

## Layers

| Layer | What | Focused command | Whole suite |
|---|---|---|---|
| web | `src/`, `scripts/` and `eslint/` with Vitest. No test calls an outside service: services are tested against `src/demo` and fakes, the glasses against Earshot's fake bridge (`earshot/testing`) | `npx vitest related --run <changed files>`, or `npx vitest run <file> -t '<case>'` | `npm run check` |
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
| **G5** | In part, as S1: the question a model would get holds nothing read from Telegram. When `src/voice` exists, a test of the exact request it sends. |
| **G6** | No check yet: channels are not built. |
| **S1** | In part: only `src/telegram` imports `@mtcute/*` (`plane/imports`), and `src/glasses/app.test.ts`, "by voice, from any screen": a model that records its question is offered no chat title, message text or saved phrase. What the Worker is sent: no check yet (there is no Worker). |
| **S2** | `node scripts/store-check.mjs` in `npm run check`, on both builds: the one without an app id (`dist`) and the one with Telegram in it (`dist-telegram`, built with a made-up id). It is `earshot-check` with the list `NOT_DESTINATIONS`; `scripts/store-check.test.mjs` holds that list to things no web view can connect to. `src/telegram/transport.test.ts` holds every socket address to the whitelist. `vite.config.ts` strips the two web links the Telegram library carries. |
| **S3** | In part: the app id is read from `.env.local` at build time (`src/env.d.ts`, `src/main.ts`), and `.gitignore` keeps `.env.*` out. That no key is in the repository or the bundle: no check yet. |
| **S4** | No check yet. |
| **S5** | In part: `src/glasses/app.test.ts`, "a reply said aloud" and "a short answer" (shown first, sent only by a tap; chosen by voice, asks for a tap; a row cut short is shown in full first; the text sent is the text shown), and `src/phrases.test.ts` (a saved phrase is kept as the glasses show it). Also there: "a reply kept for later" and "the newest message from someone else" (keeping, liking and saving ask for a tap when said, and a like chosen for one message never lands on a newer one). Calendar events: no check yet. |
| **S6** | No check yet. |
| **S7** | No check yet: `worker/` is not built. g2-messaging's relay checks (storage names in its source, its `wrangler.jsonc` read as JSONC) are the model when it is. |
| **A1** | `plane/imports`: a service imports no `src/glasses` or `src/phone`, and from `earshot` none of `Router`, `Shell`, `Glasses`, the views or their types (`SCREENS` in `eslint.config.js`). |
| **A2** | `plane/imports`: `src/glasses` and `src/phone` import no service folder and nothing outside `src/telegram` imports `@mtcute/*`. `plane/names`: `fetch`, `WebSocket`, `XMLHttpRequest`, `EventSource`, `WebTransport`, `RTCPeerConnection` and `sendBeacon` only in `src/telegram`, `src/google` and `src/voice`. "Each only its own hosts": no check yet. |
| **A3** | `plane/imports`: only `src/main.ts` imports the Even SDK. `plane/names`: the bridge's drawing, event and recording methods nowhere in `src`; its storage methods and the web view's storage only in `src/store.ts`. |
| **A4** | `plane/names`: no `setTimeout`, `setInterval`, `requestAnimationFrame`, `requestIdleCallback` or `addEventListener` in `src`. `plane/lifetime`: a socket is opened inside `life.own(...)`, and the handle of `onChange`, `onMic`, `onInput` or `subscribe` is never dropped. A `fetch` without `life.signal`: no check yet. |
| **A5** | In part: `plane/awaits` (reads types): in a function that owns a `Lifetime`, every `await` is `await life.guard(...)`, with no `.then()` and no lifetime read again after an await. Binding input to its target and rechecking it: no check yet (t3-g2's `recheck` rule names one controller's fields and was not ported). |
| **A6** | In part: `tsc` holds each service to the interfaces of `src/messenger.ts`, and `src/messenger.contract.ts` is the contract, run against the demo by `src/demo/messenger.test.ts`. The same contract runs against the Telegram adapter over a stand-in client that, like mtcute, tells nothing about the user's own writes (`src/telegram/messenger.test.ts`). Against Telegram itself (by hand, on Jarek's account), and that every call has a demo counterpart: no check yet. Signing in has its own contract, `src/account.contract.ts`, run against the sample account and against the Telegram account over a stand-in client (`src/demo/account.test.ts`, `src/telegram/account.test.ts`). |
| **A7** | No check yet: Earshot's `Shell` gives a screen no raw touches, but reading `glasses.onInput` is not refused. |
| **A8** | No check yet. |
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
