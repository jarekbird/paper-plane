# Why Security and privacy has not approved after five rounds: paper-plane park-and-like

Glasses UX approved rounds 3, 4 and 5. Architecture approved rounds 3 and 4. Security and privacy approved round 1
and asked for changes in rounds 2 to 5.

| Round | Security and privacy finding                                                     | Window                  |
| ----- | -------------------------------------------------------------------------------- | ----------------------- |
| 2     | Like and Save took a loaded message that was scrolled out of view                 | until the user scrolls  |
| 3     | A message edited after the chat opened kept its old text, yet Save sent the new   | until the next reload   |
| 4     | The same, while the list of chats was still refreshing                            | one request             |
| 5     | The same, after the new text had loaded but before the glasses had drawn it       | one draw, milliseconds  |

No finding came back, and none was caused by an earlier fix. All four are one kind: what the user acts on must be
what the glasses show (S5). Each round closed one way for the two to differ, and the next reviewer found a narrower
one. None could send a message; they could like or save a message whose text differed from the one on screen.

Is the loop likely to end? With one more patch per window, no. The round-5 fix is a rule instead of a patch: the
app tracks the newest frame it asked the glasses to draw (`src/glasses/display.ts`), and no action that writes
runs unless the glasses report showing that frame. It covers Like, Save, Keep for later, Send and the short
answers, so the same question cannot be asked of the next action. What stays out of reach: a change Telegram has
not yet reported to the app, and what the user's eyes took in.

Round 5 also had one Architecture finding of another kind: with an adapter that reports its own reads, marking a
chat read repeated itself while the list of chats was slow to refresh. The chat now remembers which newest message
it has marked read.
