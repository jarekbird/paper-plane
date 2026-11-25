# Architecture review, round 1: paper-plane privacy page

Focus: Architecture. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-privacy, branch privacy-page, base main 70c2a20, head 84c2980 (the commit above it adds only these briefs). Diff: git diff 70c2a20..84c2980.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. No whole suites, builds
or npm run check; at most one targeted test per finding, with a hard time limit. Make no request to any outside
service (the relay named in the docs is live and costs money: never call it).
Other reviewers share this machine. Prove each finding with steps or one targeted test.
For each finding, decide whether it should be a repo-wide rule; if so, propose the rule (and its check if feasible).

What the change is: roadmap item 14, "Privacy screen: what leaves the phone, in plain words".
- src/phone/privacy.ts: `whatLeaves(build)` gives five headed lines for the build the app is in (`telegram`: the
  bundle has Telegram and is not the sample sign-in; `voice`: a relay is set and the run is not a scripted `#say=`).
- src/phone/page.ts draws them as the last section of the phone page, in every state of the page.
- src/main.ts says which build it is; src/app.ts hands it to the phone page.
- PRIVACY.md: the same five texts word for word (src/phone/privacy.test.ts holds that), with details: the Worker,
  the three models at OpenRouter, where things are kept on the phone.
- README links it; docs/proof/privacy/phone.png is the page in Even's simulator (a build with no Telegram, no voice).
Check every statement of fact in PRIVACY.md and src/phone/privacy.ts against the code: src/voice (what is sent),
worker/ (what the relay does), src/store.ts (where things are kept), app.json (where the app may connect),
src/glasses/app.ts (what is offered to the navigator; what needs a tap), CLAUDE.md rules S1, S5, S7, G5.
Tests: src/phone/privacy.test.ts. Author's checks at head: npm run check, 327 tests passed.

Known and not in this change: the page is not on the glasses (the roadmap says "screen"; the author read it as the
phone page, where there is room for sentences). A change now in review (dictation first, #10) is not in this base.
The live runs so far used made-up phrases only.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
