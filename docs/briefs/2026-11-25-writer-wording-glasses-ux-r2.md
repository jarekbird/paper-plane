# Glasses UX review, round 2: paper-plane writer wording

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-writer, branch writer-wording, base main 380b267, head c9a2d99 (the commit above it adds only these briefs). Diff: git diff 380b267..c9a2d99.
Round 1 was at 144e0a0; what changed since: git diff 144e0a0..c9a2d99 -- src docs/proof (one fix, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Make no request to any outside
service: the relay at paper-plane-relay.jarekbird.workers.dev is now deployed and spends Jarek's money, so do not
call it or OpenRouter; judge the wording from docs/proof/say-it-short/live.md and the code.
Other reviewers share this machine. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is: a follow-up to "Say it short" (merged as #8), after the writer was first tried on the real
model (mistralai/mistral-nemo through the relay; Jarek gave the key for this).
- src/instruction.ts: `noteOf(words)` replaces the opening of an instruction on the phone: "tell her yes and ask
  where" becomes "Tell them: yes and ask where"; "ask them if Thursday works" becomes "Ask them: if Thursday works".
  Nothing after the opening is changed. Words that are not an instruction become "Tell them: <words>".
  `oneMessage` now also starts the message with a capital letter and ends it with a full stop when it ends in a
  letter or a digit.
- src/voice/writer.ts: new fixed instruction, seven fixed example pairs (made up, none from a chat), and the note as
  the last message. Still one request with the fields model, max_tokens and messages.
- src/demo/writer.ts: the sample writer builds on the same note; it splits only "and ask" before a question word.
- docs/proof/say-it-short/live.md: 28 made-up instructions, three times each: 80 of 84 faithful, with the misses.
Round 1: Architecture approve, Security and privacy approve, Glasses UX changes needed, one finding:
- Glasses UX F1 (a later "and ask him" was split off on the phone and became a question for the reader): the phone
  no longer splits anything after the opening; the model reads the rest, with an example pair for each reading
  ("…and tell her to come in" for the reader, "I will ring Robin and ask her…" for a third person). Tests:
  src/instruction.test.ts ("changes nothing after that"), src/demo/writer.test.ts. On the real model the two nested
  test sentences came back right six times of six.
Tests: src/instruction.test.ts, src/voice/writer.test.ts, src/demo/writer.test.ts; the glasses tests are unchanged.
Author's checks at head: npm run check, 321 tests passed.

Known and not in this change: the model still adds or drops words now and then (4 of 84); the glasses show the
message before anything is sent and "As I said it" puts the words back (S5, merged in #8). The relay forwards no
temperature setting (Earshot's relay lists the fields), so steadiness comes from the examples. What is sent is still
only the user's own words, reshaped on the phone (G5, S1).

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
