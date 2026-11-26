# Glasses UX review, round 1: paper-plane, the Worker's Google client id

Focus: Glasses UX. Report only findings in this focus.
Repo /home/jarek/src/paper-plane-google, branch google-client, base main c278c08, head: the commit above 5c5530f (it
adds only these briefs). Diff: git diff c278c08..5c5530f.
Read CLAUDE.md, docs/architecture.md and docs/test-map.md first.

Work in that worktree at head; read it with git show and git diff. Never edit, commit, install, check out, switch,
reset, stash or clean it, and write nothing inside it: keep any script of yours under /tmp. The worktree has no
node_modules of its own: to run a test, use `NODE_PATH` or run it from /home/jarek/src/paper-plane only if the
file is unchanged there; otherwise reason from the code. No whole suites, builds or npm run check; at most one
targeted test per finding, with a hard time limit. Do not start the simulator or a dev server. Make no request to
any outside service: no Telegram, no Google, not the relay, no `wrangler` or `evenhub` command. Other reviewers
share this machine. Stop every process you started. For each finding, decide whether it should be a repo-wide
rule; if so, propose the rule (and its check if feasible). Please report everything in your focus that you would
hold the merge for now, not one finding a round.

Scope: the whole diff: README.md words; nothing on the glasses or the phone page changes (the beta build is packed without VITE_GOOGLE_CALENDAR, so it still shows no Google Calendar section).

What the change is. A Google Cloud project "Paper Plane" now exists (free, no billing; Calendar API on; sign-in in
Google's testing mode, so only listed test accounts can connect), with one OAuth client of type "Web application"
whose only redirect address is the Worker's `/google/callback`.
- worker/wrangler.toml: the client's id as the variable `GOOGLE_CLIENT_ID`, where README and docs/ci.md already said
  it goes.
- worker/worker.test.ts: the test that pins the settings file line by line accepts exactly one such line, by its
  shape; a new test (S3) says the file names the id and never a secret.
- README.md: the state of Google Calendar.
The client's secret went from Google's page to a private file and from there to `wrangler secret put` by standard
input; the file is deleted; it was never printed and is not in the repository. The Worker was deployed from this
branch with Jarek's go for the Google setup: its Google start address now redirects to Google's sign-in.

Known: no connect has been made yet (Google wants a second phone check of the test account before it lets it
approve the app). The beta is packed without `VITE_GOOGLE_CALENDAR`, so it shows no Google Calendar.

Author's checks at 5c5530f: npm run check, 718 tests passed.

Answer: approve or changes needed, then each finding as
F<k> [blocker|should|nit] file:line: what fails, and how to reproduce it. Rule: <proposed rule and check, or none>.
