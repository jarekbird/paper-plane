# Architecture review, round 8: paper-plane trouble

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-trouble, branch trouble, base main 06d6a1a, head: the commit above 1d9ae93 (it adds
only these briefs). Diff: git diff 06d6a1a..1d9ae93.
Round 7 was at d4aa0cc; what changed since: git diff d4aa0cc..1d9ae93 -- src (one fix, below).
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit
(`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the simulator or a dev server. Make
no request to any outside service: no Telegram, and not the relay at paper-plane-relay.jarekbird.workers.dev.
Other reviewers share this machine. Stop every process you started. Prove each finding with steps or one targeted
test. For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible).

Scope: the whole diff, with this round's commit first.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases; the briefs of rounds 2 to 7 list the earlier
findings and their fixes.

Round 7 (at d4aa0cc): changes needed, one finding.
- F1 (after `chats()` gave up at its limit, the loop over `iterDialogs` went on and could ask for another page):
  the loop checks the limit's signal for every dialog and stops, which ends the iterator. Test:
  src/telegram/messenger.test.ts "A4: asks Telegram for no further page of chats once it has given up on the list"
  (your sequence; fails without the check).
The author then went through every other call the adapter makes for more than one request of its own: `keep`
checks its caller's signal between its two calls already; `sponsoredMessages` in src/telegram/client.ts resolved
the peer and then called, and now checks the signal between the two and hands it to the call.

Known, and said in the pull request:
- None of this has run on Telegram; the error names, the connection states and the random id are the ones mtcute
  0.32.8 has in node_modules, and that Telegram answers RANDOM_ID_DUPLICATE to a random id it has seen is from its
  API documentation.
- A library method that makes more than one request inside itself and takes no abort signal (marking read with
  mentions, the history of a chat it has to look up first) may still finish after the app gave up on it. The app
  shows that call as failed; only a send is taken back out of the line, because only a send could do harm late.
- A message Telegram took whose answer was lost shows as "Not sent" until the user tries again or leaves; if they
  leave, it has gone out all the same.
- Giving a code or a password still has no time limit: those steps have "Use another number".
- When two sign-in attempts overlap, the undo of the earlier one is as on main (reviewed with sign-in, #5).

Author's checks at 1d9ae93: npm run check, 473 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
