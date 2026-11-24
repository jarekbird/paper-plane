# Glasses UX review, round 3: paper-plane quick-replies

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-replies, branch quick-replies, base main fdf970e, head 14c79d7. Diff: git diff fdf970e..14c79d7.
Round 2 was at 24b3eaa; what changed since: git diff 24b3eaa..14c79d7 -- src docs/test-map.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not
start, review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff.
Author's checks at head: npm run check, 90 tests passed. Earlier rounds' fixes:
- Round 1, Glasses UX F1 and Security F1: a quick reply that does not fit its row opens the full reply to check.
- Round 1, Architecture F1: a send that lands late goes back only from its own screen, if that is still on show.
- Round 2, Security F1 (the check screen showed cleaned text and sent the original): a reply is cleaned once and that
  text is both shown and sent; saved phrases are cleaned when added and when loaded (src/phrases.ts).
- Round 2, Architecture F1 (unsend told no listener on Telegram): src/telegram/messenger.ts holds the messenger over
  a small client interface and tells listeners itself after send, read and unsend; the shared contract runs against
  it in src/telegram/messenger.test.ts. The contract's ordering check now skips chats with no newest message.

Known and not in this change: the chat titles are still plain targets of "Open chat" (no model is wired; roadmap
item 8 makes them private). The Telegram adapter has never signed in (no app id yet).

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
