# Security and privacy review, round 6: paper-plane trouble

Focus: Security and privacy. Report only findings in this focus.
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

Round 5 (at 6668495): approve, no findings. One commit since, for Architecture's finding: the removal
of an ended sign-in from the phone and the storing of a new one could cross (a late failure of the old removal
marked the new sign-in for removal). Now there is one removal at a time, and `entered()` waits for it before it
stores a new sign-in (src/telegram/account.ts `remove`, `forgotten`, `entered`). Tests: src/telegram/account.test.ts
"A5: keeps a sign-in made while an ended one was still being forgotten", two cases. This round is for that commit:
look at the stored sign-in in every order of those waits (never one that Telegram ended left on the phone as a
sign-in, never a good one erased).

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules, and that Telegram answers RANDOM_ID_DUPLICATE to a
random id it has seen is from its API documentation. A message Telegram took whose answer was lost shows as "Not
sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a password
still has no time limit: those steps have "Use another number".

Author's checks at 2b167a5: npm run check, 468 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
