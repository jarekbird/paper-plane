# Architecture review, round 6: paper-plane trouble

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above 2b167a5 (it adds
only these briefs). Diff: git diff 06d6a1a..2b167a5.
Round 5 was at 6668495; what changed since: git diff 6668495..2b167a5 -- src (one fix, below).
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
The round-1 brief beside this one lists the parts and the cases; the briefs of rounds 2 to 5 list the earlier
findings and their fixes.

Round 5 (at 6668495): changes needed, one finding.
- F1 (the removal of an ended sign-in failing late overwrote a newer sign-in's state, so the next `known()` erased
  the new stored sign-in): the two writes to the phone can no longer cross. There is one removal at a time
  (`forgetting`, `remove()` in src/telegram/account.ts), and `entered()` waits for it (`await
  life.guard(forgotten())`) before it stores a new sign-in, whichever way the old removal ends. Tests:
  src/telegram/account.test.ts "A5: keeps a sign-in made while an ended one was still being forgotten, with its own
  connection", once with the old removal succeeding late and once failing late (your sequence); both fail when the
  wait is taken out.
Rounds 3, 4 and 5 each found one thing that can happen during the waits of `end()`. The note the review loop asks
for after round 5 is docs/briefs/2026-11-26-trouble-architecture-loop.md; Jarek allowed up to five more rounds.
Please go through `end()`, `remove()`, `forgotten()`, `entered()`, `forget()`, `signOut()` and `restore()` together
this round, for every order in which their waits can end, and report all you find at once.

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules, and that Telegram answers RANDOM_ID_DUPLICATE to a
random id it has seen is from its API documentation. A message Telegram took whose answer was lost shows as "Not
sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a password
still has no time limit: those steps have "Use another number".

Author's checks at 2b167a5: npm run check, 468 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
