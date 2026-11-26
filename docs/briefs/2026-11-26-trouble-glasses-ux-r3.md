# Glasses UX review, round 3: paper-plane trouble

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above a830e9f (it adds
only these briefs). Diff: git diff 06d6a1a..a830e9f.
Round 2 was at 6f9de34; what changed since: git diff 6f9de34..a830e9f -- src docs README.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev, which spends Jarek's money.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff. You are the only reviewer running the simulator this round: port 5213, run folder under /tmp/pp-ux-r3;
`sim.hold` needs `Simulator.start({ mic: true })` even with `#say=`. The sample account cannot stage a lost answer
from the page's hash, so judge that case from src/glasses/trouble.test.ts and at most one targeted test.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases the author went through; the round-2 brief lists
round 1's findings and fixes.

Round 2 (at 6f9de34): approve, no findings. Changed since, for the other two focuses:
- A reply or a short answer that is tried again after "Not sent", when Telegram had in fact taken the first try,
  now ends with a "Sent" card and the chat, with no "Sent. Tap to undo": the app cannot tell which message to take
  back (src/glasses/app.ts, the two places that call `messenger.send`). Tests: src/glasses/trouble.test.ts "S5:
  arrives once…" and "S5: a short answer arrives once too…".
- Nothing else on the glasses changed.

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules, and that Telegram answers RANDOM_ID_DUPLICATE to a
random id it has seen is from its API documentation. A message Telegram took whose answer was lost shows as "Not
sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a password
still has no time limit: those steps have "Use another number".

Author's checks at a830e9f: npm run check, 465 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
