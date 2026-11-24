---
name: develop
description: The development process for Paper Plane, from a decided item to an open pull request with green checks. Use for every feature and fix.
---

# Develop

1. **Decided.** Build only what Jarek has decided. The hackathon's terms are in `docs/hackathon.md`. A product
   choice nobody has made is asked of Jarek with `AskUserQuestion`, not guessed.
2. **Design.**
   - Name the data shape. A service call starts as an interface in `src/messenger.ts` (A2), with its counterpart in
     `src/demo` (A6).
   - A change that adds or moves a module, a connection or a data flow updates the overview in
     `docs/architecture.md` first, as part of its plan.
   - For a flow (voice, sending, sign-in), write its states and transitions first. A flow that writes ends on a
     screen that shows the exact text and where it goes, and sends only on a tap (S5).
   - What leaves the phone, keys, sign-in and the whitelist follow the S-rules. A choice no rule covers is asked of
     Jarek with `AskUserQuestion`.
   - For a new screen or menu, prototype it with skill `glasses-prototype` and check the frames against the device
     limits yourself. Send them to Jarek only when he asks.
3. **Build.** Work in your own worktree and branch, never on `main`. Write each test first and see it fail (C4). One
   commit per item, carrying its code, tests and docs. While editing and before each commit, run the focused tests
   and guards `docs/test-map.md` selects. A new rule or a changed one gets its row there and, where it can, its check
   in `eslint/plugin.js`. `npm run architecture` regenerates a stale module map.
4. **Self-verify.** Run the feature with skill `simulator`, on the demo account. Never sign in to a Telegram or
   Google account but Jarek's, and only when he asks. Keep the screenshots and the console as evidence. Stop every
   process you started.
5. **Review.** Use skill `review-loop`.
6. **Pull request.** Rebase onto `origin/main`, run `npm run check` once on that commit, push the branch and open a
   pull request into `main`. The body follows `.github/pull_request_template.md`; every section is required. CI
   (`docs/ci.md`) must be green on the exact head commit. Who merges: `docs/ci.md`. Remove the worktree once it merges.

Shipping to the Even Hub is not set up (`docs/ci.md`).
