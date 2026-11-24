# Architecture review, round 3: paper-plane voice-anywhere

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-anywhere, base main 916babc, head 1627a65. Diff: git diff 916babc..1627a65.
Round 2 was at 3ecec79; what changed since: git diff 3ecec79..1627a65 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Scripted speech: open the page with `#say=message someone|Sam`, open a chat by a tap, then hold twice.
Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not start,
review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-23-quick-replies-*-r3.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 110 tests passed. Earlier rounds' fixes:
- Round 1, Security F1 and Architecture F1: what was said is dropped once its own hold has been acted on.
- Round 1, Glasses UX F1 and F2: the first chat named is the recipient; nothing after the name is trimmed.
- Round 2, Glasses UX F1 (a name said at "Which chat?" became a message to the chat underneath): the three
  per-screen flags are replaced by a record of which screen shows which chat (`chatOn`); a hold is bound to the
  screen it started on (`held`), and dictation applies only if that screen is still on show and is a chat, its
  short answers or its reply. A new agent (`choose`) takes a name said at the picker as the choice, and says "No
  chat by that name" otherwise. Tests: the two "A5: ... Which chat?" cases.

Known and not in this change: mute (undecided). No model or Worker is wired: voice here is scripted speech and
Earshot's offline word matcher. The Telegram adapter has never signed in.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
