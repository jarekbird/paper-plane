# Glasses UX review, round 1: paper-plane dictation first

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-dictate, branch dictation-first, base main 70c2a20, head 4809503 (the commit above it adds only these briefs). Diff: git diff 70c2a20..4809503.
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
1. A command said by its very name ("go back", "send", "scroll down", "reply") is chosen at once, with no model. So
   are "like that / it / this" and "save that / it / this", the phrases the README names. This holds on every
   screen. Earshot still asks "Tap to confirm" for an action with risk `voice` (Send, Keep, Like, Save, Reply, Undo,
   Mark all read), because the choice still comes from the navigator.
2. A short answer ("Reply: OK") is chosen only when its very words are said ("ok", "reply thanks"), with no model.
   The model's own vote for a short answer is ignored.
3. Otherwise the model is asked, with the other choice described as a message to a person (`A_MESSAGE`), and its
   choice counts only at 0.7 or more (Earshot's own bar for "sure"). Anything less is passed on as the reply, which
   the existing agents show as a reply to check. So "Which one?" and "No match" no longer appear on these screens.
The earlier rules stay in front of it: an instruction ("tell her …") is the reply without a model, and a sentence
that starts with message/tell/text/open/show is read on the phone. On the list of chats nothing changes but 1.
Tests: src/glasses/dictation.test.ts (chances in them are the ones measured on the real model).
docs/proof/voice/live.md: the same 50 holds on the real model after the change: 48 of 50, nothing sent without a tap.
README: both live scores. Author's checks at head: npm run check, 338 tests passed.

Known and not in this change: a reply that is exactly a command's name ("send", "go back") cannot be dictated; "tell
her send" can. "show me the short answers" in a chat is still taken as the reply (the open/show rule, merged in
#3). On the list "next one" still gets "Which one?". Speech-to-text was not part of the live run: words were given
as heard. What the model is sent is unchanged except the wording of the other choice (S1, G5).

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
