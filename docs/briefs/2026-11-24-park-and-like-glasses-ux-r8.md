# Glasses UX review, round 8: paper-plane park-and-like

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head dcda153. Diff: git diff 24f7f14..dcda153.
Round 7 was at b46b0c7; what changed since: git diff b46b0c7..dcda153 -- src (one small change, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then
docs/briefs/2026-11-24-park-and-like-security-loop.md. Jarek allowed five more rounds on 2026-11-24 (this is the
third of them).

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
Author's checks at head: npm run check, 168 tests passed. Earlier rounds' fixes: rounds 1 to 6 as in the earlier
briefs beside this one. Round 7, Architecture F1 (two keeps for one chat at once both found no draft, and the second
replaced the first): src/telegram/messenger.ts runs keeps for the same chat one after the other (`keeping`, a
promise per chat, removed when it settles), so the second sees the first one's draft and answers false, as
src/demo already did. The cancel signal is still checked before and after the read. Test: the contract's "keeps
only the first of two replies kept for one chat at the same moment", run against both.

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client. Out of
reach by design: a change Telegram has not yet reported to the app; a draft typed on another device between this
app's check and its save.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
