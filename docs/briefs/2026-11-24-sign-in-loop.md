# Why Security and Architecture have not approved after five rounds: paper-plane sign-in

Glasses UX approved rounds 4 and 5. Security and privacy and Architecture asked for changes in all five.

| Round | Security and privacy                                                       | Architecture                                                  |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1     | "Signed out" said for any error; picks shared by users; trace of real chats | A left attempt still saved its session; nothing drawn at launch |
| 2     | Removal counted when one of two storage copies accepted it                  | Leaving during the export step still saved the session        |
| 3     | A failure after the code was accepted left a usable session                 | A retry that found the sign-in gone left the glasses stuck    |
| 4     | The undo itself could fail on both sides, silently                          | An unreadable storage stopped launch before drawing           |
| 5     | Leaving and then a failing step skipped the undo                            | Telegram signing in right after the number was not handled    |

No finding came back, and none was caused by an earlier fix. Most are one kind: sign-in and sign-out are several
steps (Telegram accepts, export, store, listen; forget on the phone, end at Telegram), and each round found another
order in which a step fails or the user leaves while the phone then shows something other than the truth. None let
anyone else in; each could leave the user signed in, or not, without saying so.

Is the loop likely to end? The first versions handled "the user left" and "a step failed" in separate places, and
every round found a path between them. After round 5 there is one path: `entered` in `src/telegram/account.ts` runs
the steps, and anything but a clean finish, left or failed, at any step, goes through one undo that either removes
the sign-in, or, when it cannot, answers with the signed-in user so the phone shows it with the sign-out button.
`signOut` has its four outcomes spelled out and tested, and `src/store.ts` counts removal only when every copy is
gone. What is left untested by design: storage and network failing at every step at once, and the real Telegram,
which has never been reached (no app id).
