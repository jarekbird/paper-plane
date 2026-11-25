# Architecture review, round 2: paper-plane dictation first

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-dictate, branch dictation-first, base main 70c2a20, head 71fddd6 (the commits between are the round-1 briefs and one fix). Diff: git diff 70c2a20..71fddd6 -- . ':!docs/briefs'.
Round 1 was at 4809503; what changed since: git diff 4809503..71fddd6 -- src docs/proof README.md (below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Make no request to any outside
service: the relay at paper-plane-relay.jarekbird.workers.dev is deployed and spends Jarek's money, so never call
it or OpenRouter; judge the real model's part from docs/proof/voice/live.md and the code.
Other reviewers share this machine. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is for: the first run of the app's voice on the real navigator model (typesafe/jev-1.14 through the
relay) got 22 of 42. In a chat a plain dictated reply ("see you at twelve thirty") was mostly answered with
Earshot's "Which one?" list, "yes that works for me" offered to send the short answer "OK" instead, and commands
came back just under Earshot's bar now and then. What it does, all in the navigator wrapper of src/glasses/app.ts
(`model.choose`) and only on a screen that takes a reply (a chat, the short answers, a reply not sent yet):
1. A short answer ("Reply: OK") is chosen only when its very words are said ("ok", "reply thanks"), with no model.
   The model's own vote for a short answer is ignored.
2. Otherwise the model is asked, with the other choice described as a message to a person (`A_MESSAGE`), and its
   choice counts as a command only from a chance of 0.6 up (`SURE`). Anything less is passed on as the reply, which
   the existing agents show as a reply to check. So "Which one?" and "No match" no longer appear on these screens.
   Earshot still asks "Tap to confirm" for an action with risk `voice` (Send, Keep, Like, Save, Reply, Undo, Mark
   all read).
The earlier rules stay in front of it: an instruction ("tell her …") is the reply without a model, and a sentence
that starts with message/tell/text/open/show is read on the phone. On the list of chats nothing changes.
Tests: src/glasses/dictation.test.ts (chances in them are the ones measured on the real model).
docs/proof/voice/live.md: the same 50 holds on the real model after the change: 48 of 50, nothing sent without a tap.
README: both live scores. Author's checks at head: npm run check, 338 tests passed.

Round 1: Security and privacy approve; Architecture and Glasses UX changes needed, one finding each:
- Architecture F1 (recognising a command by its name ahead of the model is generic voice behaviour and belongs in
  Earshot, G4; the app also decoded Earshot's "(show the list)" label): removed, with the app's table of "like
  that" phrases. No words are matched to commands in this app any more. To keep plain commands working in a chat
  the bar is the one measured on the real model, 0.6: asked three times each, every command tried scored 0.68 or
  more ("go home" the lowest), and of 20 dictated replies none reached 0.6 for a command but "scroll through the
  photos I sent" (Scroll down, 0.57 to 0.62). docs/proof/voice/live.md has the numbers. Whether Earshot should run
  a command said by its name without the model is a proposal for Jarek (he decided for Earshot on 2026-11-20 that
  the model decides every hold), not part of this change.
- Glasses UX F1 ("like", "save", "mark all read" by their bare names became replies when the model was unsure):
  measured, the model is sure of them (like 0.98, save 0.88 to 0.94, mark all read 0.91), so they run under the
  rule above. Tests in src/glasses/dictation.test.ts use the measured chances.

Known and not in this change: "show me the short answers" in a chat is still taken as the reply (the open/show rule, merged in
#3). On the list "next one" still gets "Which one?". Speech-to-text was not part of the live run: words were given
as heard. What the model is sent is unchanged except the wording of the other choice (S1, G5).

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
