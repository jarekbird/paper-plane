# Architecture review, round 1: paper-plane quick-replies

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-replies, branch quick-replies, base main fdf970e, head a2124ac. Diff: git diff fdf970e..a2124ac.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not
start, review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff.
Author's checks at head: npm run check, 76 tests passed. Earlier rounds' fixes: none.

What changed, as the user meets it (roadmap items 7 and 9, on the sample account):
- A tap on a chat opens short answers under "To <chat>": three from fixed rules on the newest message, then the
  user's own phrases from the phone page. The tap on a row sends that row. By voice an answer asks for a tap first.
- After any send the chat's last row says "Sent. Tap to undo" for five seconds; a tap takes the message back.
- "Draft a reply" and the drafter are removed. The chat screen is now drawn with boxes, with swipes as actions.

Known and not in this change: the chat titles are still plain targets of "Open chat", so a model would be offered
them. No model is wired yet (voice is scripted speech and Earshot's offline matcher); roadmap item 8 makes them
private and matches a spoken name on the phone. The Telegram adapter has never signed in (no app id yet).

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
