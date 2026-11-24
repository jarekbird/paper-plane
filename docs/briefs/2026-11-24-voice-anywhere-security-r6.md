# Security and privacy review, round 6: paper-plane voice-anywhere

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-anywhere, base main 916babc, head cfdd095. Diff: git diff 916babc..cfdd095.
Round 5 was at cd21e06; what changed since: git diff cd21e06..cfdd095 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then
docs/briefs/2026-11-24-voice-anywhere-glasses-ux-loop.md: it says what five rounds found and what the design now is.
Jarek allowed five more rounds on 2026-11-24.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Scripted speech: open the page with `#say=message Robert ask Anna about lunch|message Anna see you there`.
Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not start,
review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-23-quick-replies-*-r3.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 124 tests passed. Earlier rounds' fixes: rounds 1 to 4 as in the round-5
brief beside this one. Round 5:
- Glasses UX F1 (an unknown name after "message" let a later name become the recipient): `addressed` in
  src/names.ts accepts a chat only when its name comes directly after the first command word (message, tell, text,
  with an optional "to"; open, show). The app resolves recipients only through it; anything else opens "Which
  chat?". The search of a whole sentence (`findNamed`) is used directly only at "Which chat?", where the user is
  asked for a name. By design, phrasings such as "open chat Sam" or "show me Sam" now ask which chat.
- Architecture F1 (a notice on an ended shell): the touch path of "Mark all read" ignores LifetimeEnded.
- By the author: a reply needs at least one letter or digit, so "Message Sam." opens the chat and starts no reply.

Known and not in this change: mute (undecided). No model or Worker is wired: voice here is scripted speech and
Earshot's offline word matcher; how real speech spells a name is for the voice test with the real navigator. The
Telegram adapter has never signed in.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
