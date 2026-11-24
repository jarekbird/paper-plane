# Why Glasses UX has not approved after five rounds: paper-plane voice-anywhere

Architecture and Security and privacy each approved three of five rounds. Glasses UX asked for changes in all five.

| Round | Glasses UX finding                                                            | Kind                         |
| ----- | ----------------------------------------------------------------------------- | ---------------------------- |
| 1     | A name inside the message took over as recipient; "that", "saying" were cut    | Reading the spoken sentence  |
| 2     | A name said at "Which chat?" became a message to the chat underneath           | Which screen a hold is for   |
| 3     | Punctuation after the name was stripped ("-5 degrees")                         | Reading the spoken sentence  |
| 4     | Command words inside the message won over "message <chat>"                     | Reading the spoken sentence  |
| 5     | An unknown name after "message" let a later name become the recipient          | Reading the spoken sentence  |

No finding came back a second time, and none was caused by an earlier fix. Four of the five are one kind: the app
turns a free sentence into a recipient and a message, and each fresh reviewer tries a phrasing the last one did not.
Each was smaller than the one before, and none could send anything without the user's tap.

Is the loop likely to end? With the first design, no: a search for a name anywhere in the sentence has no end of
odd cases. The round-5 fix changes the design rather than adding a case: a chat is the one meant only when its name
comes directly after the command word (message, tell, text, open, show); everything else asks "Which chat?". That
leaves one place a recipient can come from, so this kind of finding should stop. What may still come: first names
shared by two chats, possessives ("Sam's"), and how speech-to-text spells a name. Those belong to the voice test
against the real navigator (roadmap, "How each feature is tested"), which needs the Worker and is not in this change.

After round 5 the author also added, unasked: a lone full stop after the name starts no reply.
