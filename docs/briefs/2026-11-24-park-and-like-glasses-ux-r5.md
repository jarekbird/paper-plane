# Glasses UX review, round 5: paper-plane park-and-like

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head b830ce4. Diff: git diff 24f7f14..b830ce4.
Round 4 was at 72f3f81; what changed since: git diff 72f3f81..b830ce4 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it: open a chat by a tap, then Even's menu has Like and Save; with `#say=see you at twelve thirty` a hold on
the chat opens a reply whose menu has "Keep for later". Other reviewers share this worktree and the same simulator
and dev-server ports: if the simulator will not start, review from the tests and the code and say so. Prove each
finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-24-voice-anywhere-*-r7.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 161 tests passed. Earlier rounds' fixes:
- Round 1: keeping takes a cancel signal and belongs to the app's lifetime; Like and Save wait while a chat loads.
- Round 2: Like and Save take the first message from someone else with a line in view; a failed or out-of-date load
  offers no target.
- Round 3: the chat reloads on every reported change; a target's id is the message's id and its text as shown.
- Round 4, Security F1 (after an edit, Save still copied unseen text while the inbox was refreshing its chats): the
  chat screen subscribes to `messenger.onChange` itself and starts its load in the same call, so `pending` is true,
  and no target is offered, from the change notification on. `inbox.onChange` is now used there only to mark the
  chat read when the inbox counts something new (`markRead`). Test: "S5: is not saved from the old text when it is
  edited and the list of chats is still refreshing". What cannot be known: a change Telegram has not yet reported.

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
