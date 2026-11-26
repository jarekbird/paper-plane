# Security and privacy review, round 2: paper-plane trouble

Focus: Security and privacy. Report only findings in this focus.
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
hardest at: the identity of an attempt (src/telegram/messenger.ts `tried`, src/glasses/app.ts `attempt` and
`attempts`): can one identity ever cover two different messages or two chats, can "already used" be read as sent
when nothing of this attempt was sent, can undo then take back the wrong message; the library setting in
src/telegram/options.ts; an ended sign-in the phone could not forget (`stale`, `forgotten`).

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases the author went through; they still hold.

Round 1 (at 7821022): changes needed, two findings.
- F1 (a send given up after fifteen seconds could have reached Telegram, and the retry sent it twice): a message
  the user confirmed is now one attempt. `Messenger.send(chat, text, attempt?)`: the draft screen makes one attempt
  per text it shows (a new one when the words change), the chat screen one per short answer until it is sent. The
  Telegram adapter gives every try of an attempt the same random id (mtcute's `randomId`), reads Telegram's
  RANDOM_ID_DUPLICATE as "sent", and looks the message up among the newest thirty for undo; if it is not there it
  fails and the next try gets a new id. mtcute retries every error of Telegram's own (code 500) without end by
  default, so src/telegram/options.ts excepts that one answer. The sample messenger has the counterpart
  (`loseAnswer`). Tests: src/messenger.contract.ts (both services), src/telegram/messenger.test.ts (three cases
  after "S5: gives a message one identity"), src/telegram/options.test.ts, src/glasses/trouble.test.ts (three
  cases from "S5: arrives once"). Never run on Telegram: that Telegram answers RANDOM_ID_DUPLICATE is from its API
  documentation and mtcute's error list.
- F2 (an ended sign-in whose removal from the phone failed still counted as known, with no retry): the account
  remembers it (`stale`), does not count it as a sign-in (`known()` false, `restore()` null), and tries the removal
  again on every `known()` and `restore()`; a new sign-in that is stored clears it. Tests:
  src/telegram/account.test.ts "S3: keeps trying to remove an ended sign-in" and the one after it.

Findings of the other two focuses in round 1, for context only: F1 (restore went on after its lifetime ended: the awaits inside the callback given to `w…; F1 ("mark all read" said and confirmed showed Earshot's "That did not work" instead of t…

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules. A message Telegram took whose answer was lost shows
as "Not sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a
password still has no time limit: those steps have "Use another number".

Author's checks at 6f9de34: npm run check, 459 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
