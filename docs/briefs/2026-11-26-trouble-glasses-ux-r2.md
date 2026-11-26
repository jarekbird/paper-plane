# Glasses UX review, round 2: paper-plane trouble

Focus: Glasses UX. Report only findings in this focus.
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

You are the only reviewer running the simulator this round, so it should start: use port 5213 and a run folder
under /tmp/pp-ux-r2. `sim.hold` needs `Simulator.start({ mic: true })` even with `#say=`. Run `#trouble=unreachable`,
`#trouble=wait` and `#account=sample&trouble=ended` (README, "Run it"): trouble starts 8 s after launch and ends at
30 s. Look hardest at: the chat that could not load ("Tap to try again", by tap and by voice; what the menu
offers); every trouble notice by touch, menu and voice (A7); a reply tried again after "Not sent"; whether each
text fits its place.

What the change is: roadmap 15, "Trouble handled: no connection, Telegram asking to wait, signed out elsewhere".
The round-1 brief beside this one lists the parts and the cases the author went through; they still hold.

Round 1 (at 7821022): changes needed, one finding.
- F1 ("mark all read" said and confirmed showed Earshot's "That did not work" instead of the reason): the action's
  `run` now says the reason itself, the same from the menu and by voice. Tests: src/glasses/trouble.test.ts
  "marking all read, when Telegram is in trouble" (menu, and said then tapped).
Also changed since round 1, found by the author: a chat that could not load said "Tap to reply" under "Cannot
reach Telegram". It now says "Tap to try again"; a tap or "try again" loads it again; its menu offers only that
and an undo that is still open (src/glasses/trouble.test.ts, three cases under "a chat"). And a reply or a short
answer tried again after "Not sent" arrives once even when Telegram had taken the first try (Security's finding).

Findings of the other two focuses in round 1, for context only: F1 (restore went on after its lifetime ended: the awaits inside the callback given to `w…; F1 (a send given up after fifteen seconds could have reached Telegram, and the retry sen…

Known, and said in the pull request: none of this has run on Telegram; the error names, the connection states and
the random id are the ones mtcute 0.32.8 has in node_modules. A message Telegram took whose answer was lost shows
as "Not sent" until the user tries again or leaves; if they leave, it has gone out all the same. Giving a code or a
password still has no time limit: those steps have "Use another number".

Author's checks at 6f9de34: npm run check, 459 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
