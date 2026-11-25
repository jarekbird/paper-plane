# Glasses UX review, round 2: paper-plane say it short

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-short, branch say-it-short, base main 6c67228, head 6e979d8 (the commit above it adds only these briefs). Diff: git diff 6c67228..6e979d8.
Round 1 was at 4726c2a; what changed since: git diff 4726c2a..6e979d8 -- src docs/test-map.md (three fixes, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Make no request to any outside
service: not to the relay's address (nothing is deployed there), not to OpenRouter.
To run the app use skill `simulator` with a run folder under /tmp, then stop it: the page
`#say=tell her yes and ask where` makes each hold hear that sentence and uses the sample writer.
Other reviewers share this machine and the simulator's ports. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is: roadmap item 6, "Say it short: 'tell her yes and ask where' becomes a full message to check and
send".
- src/instruction.ts: `instructed(words)`, a fixed grammar read on the phone: tell/ask + her/him/them/everyone,
  let + one of those + know, or say/reply/answer/respond + that/with/yes/no. `oneMessage(text)` makes a writer's
  answer one line, without wrapping quotes, and nothing when it is over 600 characters.
- src/messenger.ts: `Writer { write(words, signal) }`. src/demo/writer.ts: a stand-in with fixed rules, no model.
  src/voice/writer.ts: one chat-completions request through the relay (model mistralai/mistral-nemo, which the
  relay lists), carrying a fixed instruction and the words said. src/writer.contract.ts runs against both.
- src/glasses/app.ts, the draft screen: a reply that was spoken, is an instruction, and has a writer starts in
  "Writing it out…" with the words on show; the answer replaces them; a tap sends what is shown. Menu and voice
  actions: "Write it out" (while the words are as said) and "As I said it" (after). The writer has twelve seconds.
  A failure, an empty or unshowable answer, or the time running out leaves the words as said with the notice
  "Could not write it out". Send and Keep are blocked while writing, and Send stays behind the existing gate that
  the newest frame is drawn. A saved phrase or short answer is never rewritten (only `spoken` drafts are).
- The navigator wrapper: with a chat open, an instruction is passed on as the reply without asking a model.
- src/main.ts: the sample writer with `#say=`, the relay's writer with VITE_RELAY, else none (the actions are hidden).
Tests: src/instruction.test.ts, src/demo/writer.test.ts, src/voice/writer.test.ts, src/glasses/short.test.ts.
Round 1's simulator run on the sample account: the written reply,
"As I said it", and sending; screenshots in docs/proof/say-it-short/.

Round 1: all three said changes needed. Fixed, each with tests in src/glasses/short.test.ts:
- Security F1 (saying "send" sent a written message with no touch): the draft's Send has risk `voice`, so a Send
  chosen by voice asks "Tap to confirm" on every reply, written or as said. A tap on the draft sends as before.
- Architecture F1 and Glasses UX F2 ("Write it out" was offered on a saved phrase picked by touch): the two writer
  actions exist only on a spoken draft.
- Glasses UX F1 (a replaced text kept the old scroll place): the scroller goes back to the first line when the
  text is replaced, written or put back.
Author's checks at head: npm run check, 317 tests passed.

Known and not in this change: the real model has never been asked (the Worker is not deployed; it needs Jarek's
key), so the instruction given to the model in src/voice/writer.ts is untried and its answers unmeasured. With no
chat open, an instruction is not treated specially ("tell her yes" on the list asks "Which chat?" as before).
A literal message that happens to fit the grammar ("tell her I said hi", meant word for word) is written out; "As I
said it" is the way back, and that trade is the author's reading of the roadmap line, not yet put to Jarek.
G5 as decided by Jarek: only the user's words go to a model; nothing read from Telegram does.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
