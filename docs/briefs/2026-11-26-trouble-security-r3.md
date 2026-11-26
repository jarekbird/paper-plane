# Security and privacy review, round 3: paper-plane trouble

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above a830e9f (it adds
only these briefs). Diff: git diff 06d6a1a..a830e9f.
Round 2 was at 6f9de34; what changed since: git diff 6f9de34..a830e9f -- src docs README.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev, which spends Jarek's money.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff. Do not start the simulator: your focus is the code.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases the author went through; the round-2 brief lists
round 1's findings and fixes.

Round 2 (at 6f9de34): changes needed, two findings.
- F1 (the lookup by text could pick another message with the same words, and undo would take that one back):
  there is no lookup any more, and no undo for such a message. When a later try of an attempt is answered
  RANDOM_ID_DUPLICATE, `Messenger.send` answers null: sent before, nothing to take back. The glasses say "Sent" and
  the chat reloads. Tests: src/messenger.contract.ts "S5: answers such a try with no message, so nothing else the
  user wrote can be taken back in its place" (both services); src/glasses/trouble.test.ts "S5: arrives once"
  (no "Tap to undo" after it).
- F2 (a lookup that found nothing dropped the identity, so the next try sent the message again): the identity
  stays with the attempt for as long as the attempt lives. Tests: src/telegram/messenger.test.ts "S5: keeps the
  identity of an attempt Telegram already has" (forty newer messages, two more tries, one random id, one message);
  "S5: does not read 'already used' as sent on the first try of an attempt".

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules, and that Telegram answers RANDOM_ID_DUPLICATE to a
random id it has seen is from its API documentation. A message Telegram took whose answer was lost shows as "Not
sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a password
still has no time limit: those steps have "Use another number".

Author's checks at a830e9f: npm run check, 465 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
