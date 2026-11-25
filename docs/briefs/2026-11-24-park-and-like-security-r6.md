# Security and privacy review, round 6: paper-plane park-and-like

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head 7df0525. Diff: git diff 24f7f14..7df0525.
Round 5 was at b830ce4; what changed since: git diff b830ce4..7df0525 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then
docs/briefs/2026-11-24-park-and-like-security-loop.md: it says what five rounds found and what the design now is.
Jarek allowed five more rounds on 2026-11-24.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it: open a chat by a tap, then Even's menu has Like and Save; with `#say=see you at twelve thirty` a hold on
the chat opens a reply whose menu has "Keep for later". Other reviewers share this worktree and the same simulator
and dev-server ports: if the simulator will not start, review from the tests and the code and say so. Prove each
finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-24-voice-anywhere-*-r7.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 164 tests passed. Earlier rounds' fixes: rounds 1 to 4 as in the round-5
brief beside this one. Round 5:
- Security F1 (Save acted after the edited text had loaded but before the glasses drew it): src/glasses/display.ts
  wraps Earshot's Glasses and records the number of the newest frame asked for (its `watch`, at "ask");
  `upToDate()` is true when `glasses.shown` has reached it. Earshot's shell draws synchronously in `redraw`, so any
  change the app shows asks for a frame before the action can run. Send, Keep for later, the short answers, Like
  and Save are refused with "Loading…" while it is false (`unseen`, and `newest` for the two that have a target).
  Tests: "S5: is not saved while the glasses have not yet drawn its edited text", "S5: is not sent by a tap that
  comes before the glasses have drawn which row is chosen". Undo and "Mark all read" do not depend on shown text and
  are not gated.
- Architecture F1 (marking read repeated itself while the list of chats was slow to refresh, with an adapter that
  reports its own reads): the chat remembers the newest message it has marked read (`readUpTo`) and does not ask
  again for the same one; a failed read forgets it. Test: "is marked read once, also when Telegram reports the read
  itself and the list of chats is slow to refresh".

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client. Out of
reach by design: a change Telegram has not yet reported to the app.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
