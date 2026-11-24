# Security and privacy review, round 7: paper-plane voice-anywhere

Focus: Security and privacy. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-anywhere, base main 916babc, head 4e2a429. Diff: git diff 916babc..4e2a429.
Round 6 was at cfdd095; what changed since: git diff cfdd095..4e2a429 -- src.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first, then
docs/briefs/2026-11-24-voice-anywhere-glasses-ux-loop.md. Jarek allowed five more rounds on 2026-11-24 (this is the
second of them).

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it. No whole suites, builds or npm run check; at most one targeted test per finding.
Run the app with skill `simulator` in your own run folder, use the changed features before reading the code, then
stop it. Scripted speech: open the page with `#say=message Robert I will go back tomorrow|tell me when you arrive`.
Other reviewers share this worktree and the same simulator and dev-server ports: if the simulator will not start,
review from the tests and the code and say so. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

Scope: the whole diff, but docs/briefs/2026-11-23-quick-replies-*-r3.md are the last change's briefs, not to review.
Author's checks at head: npm run check, 127 tests passed. Earlier rounds' fixes: rounds 1 to 5 as in the earlier
briefs beside this one. Round 6, Glasses UX F1 ("message Robert I will go back tomorrow" went back):
- `commandOf` (src/names.ts) now knows a command by its first word alone: message, tell, text; open, show.
- The app's navigator model (`model` in src/glasses/app.ts) answers every such sentence itself, so the word
  matcher or a real model never sees it and nothing later in the sentence can act as a command. The table:
  1. a picked chat named right after the word: "Message someone" or "Open chat", resolved by `addressed`;
  2. no such chat, and the screen on show is not a chat: the same action, which then asks "Which chat?";
  3. no such chat, and a chat, its short answers or its reply is on show: the words are the reply to that chat
     (the "pass" option, taken by the `dictate` agent), because replies often start with these words ("tell me
     when you arrive", "open the door when you get there"). It is shown as "To <chat>" before any tap;
  4. the words are exactly an offered action's name ("message someone"): left to the given model, which picks it.
  The reviewer of round 6 expected "Which chat?" in case 3; the author chose the reply there, for the reason given.
  A sentence that does not start with one of the five words is left to the given model as before; what Earshot's
  offline word matcher makes of such sentences is not this app's code and is replaced by the real navigator.

Known and not in this change: mute (undecided). No model or Worker is wired. The Telegram adapter has never signed
in.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
