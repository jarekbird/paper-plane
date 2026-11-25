# Security and privacy review, round 7: paper-plane park-and-like

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head b46b0c7. Diff: git diff 24f7f14..b46b0c7.
Round 6 was at 7df0525; what changed since: git diff 7df0525..b46b0c7 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then
docs/briefs/2026-11-24-park-and-like-security-loop.md. Jarek allowed five more rounds on 2026-11-24 (this is the
second of them).

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit.
Run the app with skill `simulator` in a run folder under /tmp, use the changed features before reading the code,
then stop it: open a chat by a tap, then Even's menu has Like and Save; with `#say=see you at twelve thirty` a hold
on the chat opens a reply whose menu has "Keep for later". Other reviewers share the simulator and dev-server
ports: if the simulator will not start, review from the tests and the code and say so. Prove each finding with
steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-24-voice-anywhere-*-r7.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 166 tests passed. Earlier rounds' fixes: rounds 1 to 5 as in the earlier
briefs beside this one. Round 6, Security F1 (an edit under a notice card was saved unseen, because the frame under
the card counted as shown):
- src/glasses/display.ts now also tells its listeners each time a frame has finished drawing while no card is over
  the screen (`onClear`), and when a card leaves (`onUncover`). It counts finished frames itself (`drawn`), because
  Earshot's `watch` reports "end" before `glasses.shown` is updated.
- The chat records, at each such moment, the first message from someone else in view, as its id and text
  (`seenClear`). Like and Save take a message only if it is that one (`seen`), by touch and by voice alike. An edit
  that loads and draws under a card changes the text but not `seenClear`, so there is no target and the glasses say
  "Loading…". When the card leaves, the app redraws; that frame's end updates `seenClear`.
- Tests: "S5: is not saved when its ending is edited under a notice that covers it", "can be liked right after it
  was saved, while the notice is still up, when nothing changed".
- Send, Keep for later and the short answers stay gated only on the newest frame being drawn: their text is fixed
  when their screen is made and cannot change under a card.

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client. Out of
reach by design: a change Telegram has not yet reported to the app, and how much of a message taller than the
display the user has scrolled through (one line in view counts).

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
