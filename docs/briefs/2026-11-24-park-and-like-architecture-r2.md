# Architecture review, round 2: paper-plane park-and-like

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head 0aa7d91. Diff: git diff 24f7f14..0aa7d91.
Round 1 was at 160e6b7; what changed since: git diff 160e6b7..0aa7d91 -- src.
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
Author's checks at head: npm run check, 151 tests passed. Earlier rounds' fixes:
- Architecture F1 (keeping wrote a draft after its screen had ended): `keep` takes an AbortSignal and checks it
  before and after asking for an existing draft (src/telegram/messenger.ts, src/demo/messenger.ts). The reply screen
  now runs keeping under the app's lifetime, not its own: a reply the user asked to keep is still kept, and said to
  be, when they leave the reply at once; nothing is written or said once the app has ended. Tests: the contract's
  "A4: keeps nothing for a caller that has already gone", the adapter's deferred-read case, and "a reply kept for
  later, when the user moves on".
- Architecture F2 (a like confirmed while newer history was loading landed on the older message): the chat counts
  its loads in flight and remembers which newest message its history was loaded for; Like and Save offer no target
  and say "Loading…" unless that still matches the inbox (`current` in src/glasses/app.ts). Test: "A5: is not liked
  by a tap that comes while a newer message is still loading".
- Glasses UX F1 (after six own replies Like and Save found no message, though an older one exists): not done as
  proposed, on purpose. Reaching past the six messages on screen would send a reaction to, or save, a message the
  user cannot see (S5: where it goes is shown before a tap). They stay limited to what is on screen, and the words
  now say that: "No message from someone else on screen". Test: "S5: is not liked or saved when it is not on
  screen". A reviewer who sees a flaw in this reasoning should say which.

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
