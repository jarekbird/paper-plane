# Security and privacy review, round 2: paper-plane quick-replies

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-replies, branch quick-replies, base main fdf970e, head 24b3eaa. Diff: git diff fdf970e..24b3eaa.
Round 1 was at a2124ac; what changed since: git diff a2124ac..24b3eaa -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not
start, review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff.
Author's checks at head: npm run check, 79 tests passed. Earlier rounds' fixes:
- Glasses UX F1 and Security F1 (a quick reply cut in its row was sent in full): a reply that does not fit its row
  opens the full "To <chat> ... Tap to send" screen instead of sending; test "a short answer too long for its row".
- Architecture F1 (a send that lands late closed a screen opened meanwhile): the answers list and the spoken reply go
  back only if their own screen is still on show; a sent spoken reply says "Sent" and cannot be sent again; tests
  "a send that takes a while".

Known and not in this change: the chat titles are still plain targets of "Open chat" (no model is wired; roadmap
item 8 makes them private). The Telegram adapter has never signed in (no app id yet).

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
