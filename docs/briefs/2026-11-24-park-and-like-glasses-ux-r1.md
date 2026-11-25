# Glasses UX review, round 1: paper-plane park-and-like

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-park, branch park-and-like, base main 24f7f14, head 160e6b7. Diff: git diff 24f7f14..160e6b7.
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
Author's checks at head: npm run check, 144 tests passed. Earlier rounds' fixes: none.

What changed, as the user meets it (roadmap items 11 and 12, on the sample account):
- Reply screen: "Keep for later" (menu, or said) saves the reply as the chat's Telegram draft and goes back to the
  chat; if a draft is already waiting on the phone it says so and keeps nothing. Double tap still drops the reply.
- Chat screen: "Like" sends a thumbs-up to the newest message from someone else, and the chat then shows it;
  "Save" copies that message to Saved Messages.
- Said, each asks for a tap. Like and Save are actions with one target, the newest message's id, so Earshot finds it
  again at the tap and runs nothing if a newer message arrived (the pattern "Mark all read" uses).
- src/messenger.ts gains keep, save and like; src/demo and src/telegram/messenger.ts implement them; the shared
  contract covers them. `life.own(() => router.close())` ends every screen with the app.

Decisions made on purpose: keeping is an explicit action, not what leaving a reply does; a like is only the
thumbs-up, and is not taken back from the glasses; "this" and "that" always mean the newest message from someone
else, which is the first line on screen.

Known and not in this change: reading a Telegram draft back onto the glasses. No model or Worker is wired: voice here
is scripted speech and Earshot's offline word matcher, whose choices for free sentences are not this app's code. The
Telegram adapter has never signed in, so keep, save and like are proven only against a stand-in client.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
