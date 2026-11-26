# Architecture review after round 5: paper-plane calendar

Security and privacy approved in rounds 4 and 5, Glasses UX in round 5. Architecture has asked for changes in every
round, and each finding was real.

## Is the loop likely to end?

The findings fall into two kinds.

- Rounds 1 to 3 were one kind: whose sign-in a result belongs to. A renewal, a retry, a calendar object and an undo
  each had to learn which Google sign-in they were made under. That kind ended in round 3, when the sign-in became
  part of the key and of the calendar itself (`GoogleKey`, `account.signIn()`, `calendarOver` reading it once), and
  rounds 4 and 5 found nothing more of it.
- Rounds 4 and 5 were another kind: the moment of a write to the phone's store. Round 4: a cancel that comes while
  the write waits its turn. Round 5: a cancel that comes during the write, and a write that fails in one of the two
  places the store keeps. Each was fixed where it was found, which is the pattern the loop rule warns about.

## What changed after round 5

The second kind is answered once instead of case by case: after any write that failed or was overtaken by a cancel,
the account looks at what the store holds and goes by that (`stored` and `holds` in `src/google/account.ts`).

- Connecting: the sign-in counts as kept only if the store holds it; a cancel seen after the write puts back what was
  there before, in the same turn, and Google is told to end the unused sign-in.
- Disconnecting: it counts as done when the sign-in can no longer be read, also when one copy could not be written;
  the sign-in counter moves and listeners are told exactly then.
- Renewing: the renewed key counts only if the store holds it.

Tests, in `src/google/account.test.ts`: "A5: is not connected when the user left while the sign-in was being
written…" and "A8: counts as disconnected, and tells its listeners, when one of the phone's two copies could not be
written…" (round 5's two sequences, the second through the real two-place store); both fail without the change.

The author also went through the other places that write: the Worker's one-time store (one entry, one turn at a
time, its own tests) and the Telegram account (reworked the same way in pull request 15).

## Asked of Jarek

Up to five more rounds, for Architecture on this commit and for the other two focuses, since a commit was added
after they approved.
