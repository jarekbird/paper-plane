# Glasses UX review, round 1: paper-plane on Earshot 0.0.62

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-earshot, branch earshot-0.0.62, base main 1479512, head: the commit above a7718a2 (it
adds only these briefs). Diff: git diff 1479512..a7718a2.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first. Earshot's own notes of each version are in
node_modules/earshot/CHANGELOG.md if the package ships them, else in ~/src/earshot-named/CHANGELOG.md (a checkout of
Earshot at 0.0.62; read only).

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. This worktree has its
own node_modules with Earshot 0.0.62. No whole suites, builds or npm run check; at most one targeted test per
finding, with a hard time limit (`timeout --kill-after=20 120 npx vitest run <file> -t '<case>'`). Do not start the
simulator or a dev server. Make no request to any outside service: no Telegram, no Google, not the relay, no
OpenRouter, no `wrangler` or `evenhub` command. Other reviewers share this machine. Stop every process you started.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if
feasible). Please report everything in your focus that you would hold the merge for now, not one finding a round.

Scope: the whole diff: What a user meets with Earshot 0.0.62 (read its CHANGELOG.md in node_modules/earshot or at github.com/jarekbird/earshot, 0.0.36 to 0.0.62): a tap or swipe that takes a notice away does nothing else; a tap acts only on what the glasses already show; a hold ends when the screen changes under it; a notice goes under "Listening"; a list the shell made closes when a row is said by name. Do the app's screens and words still fit (for example "Tap to send" under the card of heard words: the first tap now only takes the card away)? The three adapted tests show the new waits.

What the change is. The app moves from Earshot 0.0.35 to 0.0.62, its framework's current version. Why now: on real
glasses a tap sends a message here, and Earshot since fixed that a tap which took a notice away also ran what was
under it (0.0.44), that a tap acted on a frame not yet shown (0.0.45) and that an unknown gesture was read as a tap
(0.0.43); the relay stopped handing back the words of an upstream's error (0.0.50).
- package.json, package-lock.json: the pin.
- worker/worker.ts: `relayOptions` takes more settings since 0.0.36 and 0.0.51 (live speech, `calls`); all unset
  here, so the relay forwards the same three calls as before.
- src/glasses/app.ts: `untargeted` takes `target` out of the navigator's question before the app's wrapper hands it
  to its model transport, since a target's id here holds chat ids or message text. Earshot's own transport never
  sent targets; this keeps S1 and G5 true for the question itself.
- Three tests wait before a tap, as a user now must: for a notice to go (src/voice.test.ts, src/glasses/
  dictation.test.ts) and for the cursor to be shown (src/glasses/app.test.ts). No other test changed.
- README: the pin's version.

Author's proof, on this code (the scripts and logs are outside the repository, rule S4):
- npm run check, 721 tests passed.
- Sample account in the simulator with spoken audio through the deployed relay: 10 holds, the same outcomes as on
  0.0.35.
- Jarek's own Telegram account in the simulator, in Saved Messages only, each result checked in Telegram Web: a
  reply sent, kept, replaced, dropped; a quick reply sent and undone; a message from another device arriving;
  "Go home"; "Keep for later" (24 of 26 checks, the two misses being the test's own expectation of "You:" in Saved
  Messages, the same as on 0.0.35); the network cut by a local proxy: "Cannot reach Telegram", "Not sent. Tap to try
  again", and one copy sent after it returned (7 of 7); with a test Google account: connect, a reply that adds a
  meeting, one undo for both (13 of 15, the misses being an empty test calendar and a frame read while loading).

Known: the deployed Worker still runs the relay of 0.0.35; it is deployed again after this merges (Earshot 0.0.41
asks for that), and both the beta's old client and the new one are tried against it. Real glasses are not tried.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
