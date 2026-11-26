# Architecture review, round 7: paper-plane trouble

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above d4aa0cc (it adds
only these briefs). Diff: git diff 06d6a1a..d4aa0cc.
Round 6 was at 2b167a5; what changed since: git diff 2b167a5..d4aa0cc -- src docs/architecture.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff, with this round's commit first.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases; the briefs of rounds 2 to 6 list the earlier
findings and their fixes; docs/briefs/2026-11-26-trouble-architecture-loop.md says why the cleanup of an ended
sign-in was reworked rather than patched again.

What changed since round 6 (one commit, in src/telegram/account.ts and src/store.ts, with tests):
- `end()` has no waits any more. In one synchronous step it checks which sign-in the answer was for, marks the
  stored sign-in stale, replaces the connection and tells the listeners; the removal from the phone and the closing
  of the old connection run on behind it.
- Every write of the sign-in to the phone takes its turn in one line (`inTurn`): `write(session | null)` (a new
  sign-in, a sign-out, the undo of an attempt, the removal at launch) and `forgotten()` (the retried removal of an
  ended sign-in). Each changes `stale` inside its turn, before the next turn starts; `forgotten()` looks at `stale`
  when its turn comes, not when it was asked. A turn does not start once the lifetime has ended.
- `sessions.save(null)` in src/store.ts answers only when every copy has answered (`Promise.allSettled`), and
  fails if any copy failed.
- `forgetting` and the era check on the notice are gone with this.

Round 6 (at 2b167a5): changes needed, one finding.
- F1 (a sign-out that failed while an ended sign-in was still being forgotten swallowed the notice, and later
  `ended()` calls did nothing): the notice is given in the same step that decides the sign-in has ended, so no
  later call can come between. Test: src/telegram/account.test.ts "tells listeners at once that the sign-in ended,
  also when a sign-out the user starts next fails on every side" (your sequence).
As asked in round 6's brief, please go through `end`, `inTurn`, `write`, `forgotten`, `entered`, `forget`,
`signOut` and `restore` together, for every order in which their waits can end, and report all you find at once.

Not in this change, and as on main: when two sign-in attempts overlap, the undo of the earlier one (`forget`) is
not tied to its own attempt. It was reviewed with sign-in (#5) and is untouched here apart from taking its turn.

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules, and that Telegram answers RANDOM_ID_DUPLICATE to a
random id it has seen is from its API documentation. A message Telegram took whose answer was lost shows as "Not
sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a password
still has no time limit: those steps have "Use another number".

Author's checks at d4aa0cc: npm run check, 472 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
