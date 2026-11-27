# Architecture review, round 1: paper-plane, commands said by name

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-names, base main 6597df1, head: the commit above 38d6b05 (it adds
only these briefs). Diff: git diff 6597df1..38d6b05.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. The worktree has no
node_modules of its own; for a targeted test run it from /home/jarek/src/paper-plane only if the file is the same
there, otherwise reason from the code. No whole suites, builds or npm run check; at most one targeted test per
finding, with a hard time limit. Do not start the simulator or a dev server. Make no request to any outside
service: no Telegram, no Google, not the relay, no OpenRouter. Other reviewers share this machine. Stop every
process you started. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and
its check if feasible). Please report everything in your focus that you would hold the merge for now, not one
finding a round.

Scope: the whole diff: src/glasses/app.ts (the model wrapper, where the app already answers some questions itself before asking the navigator), src/names.ts, their tests. One question to judge: rule G4 says a need every voice app has goes into Earshot. The app already answers a short answer said word for word, a chat said by name and an instruction ("tell her ...") without the model, in this same wrapper; this change adds an action said by its exact name. Is that still the app using Earshot's seam for the navigator's model, or does it belong in Earshot first? Say which, and whether you would hold the merge for it.

What the change is. The app was tried with spoken audio for the first time: synthesized speech fed to the
simulator's microphone on the sample account, through the deployed relay and the real speech-to-text and navigator
models (docs/proof/voice/speech.md). Two faults showed, both fixed here, each with a test that fails on the old
code:
- Speech-to-text writes sentences: "Go home!", "As I said it.". The navigator had been measured on bare words, and
  with the punctuation its chance for the command fell under the app's bar (0.6 in a chat), so the words became a
  reply to check. Now, in the app's wrapper of the navigator's model (src/glasses/app.ts), one offered option whose
  `say` is exactly the words heard (`sameWords`: case and punctuation apart) is answered without asking the model.
  An action that asks for a tap when said still asks. Tests: src/glasses/dictation.test.ts, "runs a command said by
  its very name…" and "S5: takes \"Send.\" on a reply for the command, and still sends only after a tap".
- "Open the chat with Anna" asked "Which chat?": the phone looked for the name right after the command word only.
  `addressed` (src/names.ts) now lets a few words stand between an open-word and the name (the, my, me, up, chat,
  conversation, with); a message-word is as strict as before. Test: src/names.test.ts, "finds the chat in \"open
  the chat with Anna\"…", which also holds "open the door for Sam" and "show the plan to Sam" out.

Known, and said in the proof note: short words were often misheard through the simulator's stand-in microphone
("Send" as "Cent."), while the same recordings sent straight to speech-to-text came back right; a person's voice on
real glasses is not measured. "Message Sam …" in an open chat, when Sam is not picked, still becomes a reply to
the open chat (an open question for Jarek, not changed here).

Author's checks at 38d6b05: npm run check, 721 tests passed. Spoken runs after the change: 22 holds in each of two
voices; "Go home!" went to the list, "As I said it." brought back the words as said, and "Open the chat with
Anna." opened the chat, in both voices where the words were heard right.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
