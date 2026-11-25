# Glasses UX review, round 2: paper-plane voice relay

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-relay, base main d20941a, head ac1713d (the commit above it adds only these briefs). Diff: git diff d20941a..ac1713d.
Round 1 was at 100a4b1; what changed since: git diff 100a4b1..ac1713d -- src docs/test-map.md (one fix, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. The folders dist and dist-telegram
in the worktree are the author's builds at head: read them, do not rebuild them. Make no request to any outside
service: not to the relay's address (nothing is deployed there), not to OpenRouter, not to Cloudflare.
Other reviewers share this machine. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is for: on real glasses a hold heard nothing, because the app had a transcriber only in the
simulator (a scripted sentence, `#say=`). What it does:
- src/voice/hearing.ts: `hearingThrough(relay)` gives the glasses code Earshot's speech-to-text and navigator model
  (`openRouter` of Earshot 0.0.35, pinned), asked through a relay over https. Earshot's compaction is not used.
- src/main.ts: with `VITE_RELAY` in the build, that is the app's hearing; `#say=` still wins; with neither, no voice.
- worker/: Earshot's relay as a Cloudflare Worker (worker.ts, wrangler.toml). It holds the OpenRouter key as a
  secret, forwards three calls with listed fields and models, and has no storage binding and no log setting.
- app.json: the relay's address joins the network whitelist (rule S2 names the Worker), and the permission text says
  what a hold sends. package.json: the Telegram build of the check is built with the relay address, so the store
  check covers a bundle that names it. tsconfig and vitest now cover worker/.
- The navigator's question already held nothing read from Telegram (chat titles are private targets, a chat said by
  name is matched on the phone: src/glasses/app.ts, merged earlier). New tests read the requests themselves.
Tests: src/voice/hearing.test.ts, src/voice.test.ts, worker/worker.test.ts.
Round 1 checks, still true: both builds pass the store check; a dry run of the Worker
build (wrangler 4.156.0, nothing deployed) bundles to 4 KiB with one variable, UPSTREAM.

Round 1: Architecture approve, Glasses UX approve, Security and privacy changes needed, one finding:
- Security F1 (an answer of the relay that could not be read became an error whose cause quoted the answer, and
  Earshot's shell prints errors that are not a SayError): src/voice/hearing.ts hands on a LifetimeEnded as it is, a
  SayError with its words and status and no cause, and anything else as fixed words with the status only. Tests:
  src/voice/hearing.test.ts, the three cases from "S4: an answer that cannot be read".
Author's checks at head: npm run check, 282 tests passed.

Known and not in this change: the Worker is not deployed and no request has reached a real model from this app
(that needs Jarek's key; the voice test of about 40 phrases against the real navigator is roadmap work). The relay
answers any page (Earshot's design): what bounds misuse of the key is the key's own spending limit at OpenRouter
(Jarek chose a new key with a $10 limit). Quick replies are offered to the navigator by their text (fixed answers,
merged earlier). The glasses' words for a relay that fails are Earshot's own.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
