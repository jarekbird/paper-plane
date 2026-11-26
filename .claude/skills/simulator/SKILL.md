---
name: simulator
description: Run Paper Plane in the Even Hub simulator and drive it from a script, on the demo account. Use to self-verify a change, take glasses screenshots, read the app's console, or reproduce a bug.
---

# Simulator driver

Earshot ships the driver (`earshot/sim`); the simulator is `@evenrealities/evenhub-simulator`, pinned in
`package.json`. Headless it needs Linux with `Xvfb`, `libwebkit2gtk-4.1-0` and `libasound2t64`. A run is one script,
kept with everything it makes in its own folder, `.sim/<name>/` (ignored by Git), so runs with different names work
side by side.

1. Start the app on a free port of 127.0.0.1, with a hard limit:
   `timeout --kill-after=10 3600 npx vite --port <port> --strictPort`. Never `--host`.
2. Write `.sim/<name>/run.mjs` and run it from the repository root with `timeout --kill-after=30 900 node`:

   ```js
   import { writeFileSync } from 'node:fs'
   import { Simulator } from 'earshot/sim'

   const sim = await Simulator.start({ url: 'http://127.0.0.1:<port>/#trace', limitSeconds: 900 })
   try {
     await sim.shows('<text of the first screen>')
     await sim.input('tap')
     console.log(sim.shown(), sim.menu())
     writeFileSync(new URL('glasses.png', import.meta.url), await sim.screenshot('glasses'))
   } finally {
     await sim.stop()
   }
   ```

3. Stop the dev server. `sim.stop()` ends the simulator and its hidden display and removes its home folder; check
   that nothing of yours is left running.

| Call | Does |
|---|---|
| `sim.input(kind)` | `tap`, `double`, `up`, `down`, `press`, `release`, `menu` |
| `sim.hold(ms)` | A long press: press, wait, release |
| `sim.shows(text)`, `sim.shown()` | Waits until the glasses show the text; the lines on show |
| `sim.menu()`, `sim.pick(name)` | The items of Even's menu; opens it and picks one |
| `sim.screenshot('glasses' \| 'phone')` | PNG bytes of the glasses (576×288) or the phone page |
| `sim.logged(match)`, `sim.read()`, `sim.entries` | The app's console |
| `sim.until(what, check, ms)` | Waits for anything else, and says what the console last said when time runs out |

- The page's hash sets the run (`src/main.ts`): `trace` makes Earshot log each frame, which `shows`, `shown`, `menu`
  and `pick` read; `say=<line>|<line>` makes each hold hear the next line, with no microphone and no service.
  `trouble=unreachable` or `trouble=wait` puts the sample chats in that trouble from second 8 to second 30 after
  launch; `account=sample&trouble=ended` starts signed in to the sample sign-in and ends it at second 8.
- With `Simulator.start({ url, mic: true })` the simulator's microphone hears a steady tone, so `hold` records.
- The app runs on the demo account. Never point a run at a real Telegram or Google account but Jarek's, and only
  when he asks; the console and screenshots of such a run are never committed (S4).
- Evidence for a pull request is the screenshots and the console, kept in `.sim/<name>/`.
- The simulator is not the glasses: check fonts, scrolling and timing on the device.
