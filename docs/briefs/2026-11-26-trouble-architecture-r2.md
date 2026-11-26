# Architecture review, round 2: paper-plane trouble

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above 6f9de34 (it adds
only these briefs). Diff: git diff 06d6a1a..6f9de34.
Round 1 was at 7821022; what changed since: git diff 7821022..6f9de34 -- src docs README.md.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script and any run folder of yours under /tmp. No
whole suites, builds or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Make no request to any outside service: no
Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev, which spends Jarek's money.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff.

Do not start the simulator this round: three at once did not start in round 1, and your focus is the code. Look
hardest at: `send(chat, text, attempt?)` in src/messenger.ts and its two implementations (A6); restore in
src/telegram/account.ts, which now guards each step; `forgotten` there; the new action on a failed chat in
src/glasses/app.ts; docs/architecture.md and docs/test-map.md against the change.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases the author went through; they still hold.

Round 1 (at 7821022): changes needed, one finding.
- F1 (restore went on after its lifetime ended: the awaits inside the callback given to `within` were not guarded):
  restore now guards each step itself (`await life.guard(within(() => …))` three times), so nothing follows a step
  once the lifetime has ended; `answerWithin` also aborts a waiting call when its lifetime ends (`life.own`), and
  gives that up again when the call is answered. Tests: src/telegram/account.test.ts "A4: asks Telegram nothing
  more for a launch once the app has ended", src/telegram/messenger.test.ts "A4: takes a message that is still
  being sent out of the line when the app ends" and "A4: leaves no timer behind".
  Your proposal to widen `plane/awaits` to callbacks nested in a function that owns a Lifetime: tried on main, it
  reports six places in code this change does not touch (src/glasses/app.ts and one more file), so it goes into a
  pull request of its own, as the review loop asks for a proposed check; this branch no longer has such a callback.

Findings of the other two focuses in round 1, for context only: F1 (a send given up after fifteen seconds could have reached Telegram, and the retry sen…; F1 ("mark all read" said and confirmed showed Earshot's "That did not work" instead of t…

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules. A message Telegram took whose answer was lost shows
as "Not sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a
password still has no time limit: those steps have "Use another number".

Author's checks at 6f9de34: npm run check, 459 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
