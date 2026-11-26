# Architecture review after round 5: paper-plane trouble

Security and privacy approved in rounds 3, 4 and 5; Glasses UX in rounds 2, 3, 4 and 5. Architecture has asked for
one change in each of rounds 3, 4 and 5, and each was real.

## Is the loop likely to end?

The three findings are one kind: `end()` in `src/telegram/account.ts`, the cleanup of a sign-in Telegram ended, runs
across two waits (the phone forgetting the sign-in, the old connection closing), and each round found another thing
that can happen during those waits.

- Round 3: a sign-in made during the wait lost its connection, because the drop came after the wait.
- Round 4: the app ending during the wait left the drop's failure with no handler.
- Round 5: the old removal failing late marked the new sign-in as one to remove.

Rounds 3 and 4 were each fixed where they were found. That is the pattern the loop rule warns about: a fix per
finding, and the next finding of the same kind.

## What changed after round 5

The cause is removed instead of the third symptom: a sign-in is not stored while an earlier removal is still on its
way. There is one removal at a time (`forgetting`), and `entered()` waits for it before it stores the new sign-in,
so the two writes to the phone can no longer cross, whichever way the old one ends. The connection is still replaced
in the same step that decides the sign-in has ended, before any wait.

Tests, in `src/telegram/account.test.ts`: "A5: keeps a sign-in made while an ended one was still being forgotten,
with its own connection", once with the old removal succeeding late and once with it failing late (round 5's
sequence); both fail when the wait is taken out.

The author also went through what else `end()` and `remove()` read or write after a wait: `forgetting` and `stale`,
set only there and in `entered()` after its own wait for the removal; and `era`, read once to decide whether to tell
listeners.

## Asked of Jarek

One more round for Architecture on this commit, and the same for the other two focuses, since a commit was added
after they approved.

## After round 6

Jarek allowed up to five more rounds. Round 6 found the same kind twice more: Security, that the removal counted as
done when one copy failed while the other was still on its way; Architecture, that a sign-out failing during the
cleanup swallowed the notice. So the cleanup no longer has waits at all:

- `end()` decides, replaces the connection and tells listeners in one synchronous step. Nothing can come between.
- Every write of the sign-in to the phone (`write`, `forgotten` in `src/telegram/account.ts`) takes its turn in one
  line (`inTurn`), and each changes `stale` inside its turn, before the next starts.
- `src/store.ts` reports a removal only when every copy has answered.

`forgetting`, named above, is gone with this.
