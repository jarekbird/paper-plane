# Glasses UX review, round 2: paper-plane, a chat named after "the chat with"

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-voice, branch voice-names, base main 6597df1, head: the commit above cb7420b (it adds
only these briefs). Diff: git diff 6597df1..cb7420b.
Round 1 was at 38d6b05; what changed since: git diff 38d6b05..cb7420b.
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

Scope: the whole diff: What the user meets: saying "Go home", "Send", "Undo", "As I said it", "Keep for later" exactly; saying a sentence that happens to be an action's name while dictating a reply (it is now always the command); "open the chat with Anna" and the like; and whether docs/proof/voice/speech.md and the README line say what the code does.

Round 1 (at 38d6b05): changes needed, one finding.
- F1 (with chats "Chat club" and "Anna" picked, "open the chat with Anna" opened Chat club: the first word of a
  title was matched at "chat", and the wider range took it): `addressed` now looks for the name in what follows
  each of the words between the open-word and the name, and takes it only where it starts there; and `findNamed`
  no longer takes "the", "chat" and the like alone for a chat that only starts with that word (which on main made
  "open the door" open a chat named "The Crew"). Tests: src/names.test.ts, "does not take one of those words for a
  chat that only starts with it…" (your case, and "open the chat club", "open chat club", "open the crew", "show
  me the crew", two Annas) and "does not take \"the\" or \"chat\" alone…"; both fail on the old code.

Also changed since round 1: the rule "a command said by its very name runs without the model" is taken out of this
change (Architecture found it belongs in Earshot, rule G4). src/glasses/app.ts and src/glasses/dictation.test.ts are
as on main again, and docs/proof/voice/speech.md and the README line say that fault is open.

What the change is now. The app was tried with spoken audio for the first time: synthesized speech fed to the
simulator's microphone on the sample account, through the deployed relay and the real speech-to-text and navigator
models (docs/proof/voice/speech.md, with the run made on this code). One fault is fixed here: "Open the chat with
Anna" asked "Which chat?", because the phone looked for the name right after the command word only. `addressed`
(src/names.ts) now lets a few words stand between an open-word and the name (the, my, me, up, chat, conversation,
with); a message-word is as strict as before.

Known, and said in the proof note: speech-to-text's punctuation can make a command a reply to check ("Go home!");
short words were often misheard through the simulator's stand-in microphone; a person's voice on real glasses is
not measured. "Message Sam …" in an open chat, when Sam is not picked, becomes a reply to the open chat (an open
question for Jarek, not changed here).

Author's checks at cb7420b: npm run check, 721 tests passed. Spoken runs on this code: 22 holds in each of two voices; "Open the chat with Anna" opened the chat in
voice 1, and in voice 2 the words had not come back when the run looked.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
