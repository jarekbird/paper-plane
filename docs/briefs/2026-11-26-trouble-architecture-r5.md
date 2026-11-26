# Architecture review, round 5: paper-plane trouble

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above 6668495 (it adds
only these briefs). Diff: git diff 06d6a1a..6668495.
Round 4 was at 31e0327; what changed since: git diff 31e0327..6668495 -- src (one fix, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff, with this round's commit first. This is round 5: by the repository's review loop, more
rounds after it need Jarek's word, so please report everything in your focus that you would hold the merge for now.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases; the briefs of rounds 2 to 4 list the earlier
findings and their fixes.

Round 4 (at 31e0327): changes needed, one finding.
- F1 (the promise of the dropped connection was started before the wait for the phone to forget the sign-in and
  awaited after it; when the app ended in between, its failure had no handler): it gets a handler where it is
  started (`dropped.catch(() => {})` in `end()`, src/telegram/account.ts); the connection is still replaced in the
  same step as the check. Test: src/telegram/account.test.ts "A4: leaves no failure unheard when the app ends
  while an ended sign-in is still being forgotten and its connection dropped" (your sequence, listening for
  `unhandledRejection`; it fails without the handler).
The author also went through the other promises this change starts without awaiting at once (`late` in
`answerWithin`, the abandoned call after a limit, `end()` itself, the reload started by "Try again") and found each
either raced, awaited or caught.

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules, and that Telegram answers RANDOM_ID_DUPLICATE to a
random id it has seen is from its API documentation. A message Telegram took whose answer was lost shows as "Not
sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a password
still has no time limit: those steps have "Use another number".

Author's checks at 6668495: npm run check, 467 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
