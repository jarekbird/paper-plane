# Voice, tried on the real navigator

25 November 2026. The app's own code on the sample account, on Earshot's stand-in glasses, with the deployed relay
and the real navigator model (`typesafe/jev-1.14`). Each line is one hold. Speech-to-text is not part of this run:
the words are given as heard.

- **48 of 50** holds did what was meant.
- Nothing was sent without a tap in any of them.
- 24 of the 50 never asked the model: the phone read them itself (a chat said by name, a command said
  by its very name, an instruction such as "tell her …"). The others took the model 199 ms at the median,
  436 ms at the slowest, through the relay.

Before the rule "in a chat, what is said is the reply unless the navigator is sure of a command", the same kind of
run got 22 of 42: a plain dictated reply was often answered with "Which one?".

| On | Said | What happened | |
| --- | --- | --- | --- |
| the list of chats | open launch crew | the chat (launch) | ok |
| the list of chats | show Anna | the chat (anna) | ok |
| the list of chats | message Sam the demo moved | a reply to check: "the demo moved" | ok |
| the list of chats | mark all read | asks: Mark all read: the chats on the list? Tap to confirm | ok |
| the list of chats | mark everything as read | asks: Mark all read: the chats on the list? Tap to confirm | ok |
| the list of chats | move down | the list of chats | ok |
| the list of chats | next one | asks "Which one?" | **miss** |
| the list of chats | choose this one | the chat (anna) | ok |
| the list of chats | open the first chat | asks which chat | ok |
| the list of chats | message someone | asks which chat | ok |
| a chat | go back | the list of chats | ok |
| a chat | go home | the list of chats | ok |
| a chat | back to the list | the list of chats | ok |
| a chat | like that | asks: Like: the top message from someone else? Tap to confirm | ok |
| a chat | give that a thumbs up | asks: Like: the top message from someone else? Tap to confirm | ok |
| a chat | save that | asks: Save: the top message from someone else? Tap to confirm | ok |
| a chat | save this message | asks: Save: the top message from someone else? Tap to confirm | ok |
| a chat | scroll down | the chat (anna) | ok |
| a chat | show me the short answers | a reply to check: "show me the short answers" | **miss** |
| a chat | reply thanks | asks: Reply: Thanks? Tap to confirm | ok |
| a chat | open launch crew | the chat (launch) | ok |
| a chat | mark all read | asks: Mark all read: the chats on the list? Tap to confirm | ok |
| a chat | see you at twelve thirty | a reply to check: "see you at twelve thirty" | ok |
| a chat | I can not make it today sorry | a reply to check: "I can not make it today sorry" | ok |
| a chat | sounds good see you then | a reply to check: "sounds good see you then" | ok |
| a chat | I think we should move the meeting to Thursday because the demo is not ready | a reply to check: "I think we should move the meeting to Thursday because the demo" | ok |
| a chat | can you open the door for me when I get there | a reply to check: "can you open the door for me when I get there" | ok |
| a chat | let us go back to the old plan | a reply to check: "let us go back to the old plan" | ok |
| a chat | like I said I will be late | a reply to check: "like I said I will be late" | ok |
| a chat | save me a seat | a reply to check: "save me a seat" | ok |
| a chat | please mark that as done | a reply to check: "please mark that as done" | ok |
| a chat | yes that works for me | a reply to check: "yes that works for me" | ok |
| a chat | tell her yes and ask where | a reply to check: "Yes. Where?" | ok |
| a chat | ask her if Thursday still works | a reply to check: "Thursday still works?" | ok |
| a reply not sent yet | send | asks: Send? Tap to confirm | ok |
| a reply not sent yet | send it | asks: Send? Tap to confirm | ok |
| a reply not sent yet | keep it for later | asks: Keep for later? Tap to confirm | ok |
| a reply not sent yet | write it out | a reply to check: "See you at noon." | ok |
| a reply not sent yet | as I said it | a reply to check: "tell her yes and ask where" | ok |
| a reply not sent yet | go back | the chat (anna) | ok |
| a reply not sent yet | actually make it one o clock | a reply to check: "actually make it one o clock" | ok |
| a reply not sent yet | scroll down | a reply to check: "see you at noon" | ok |
| a reply not sent yet | send me the address when you can | a reply to check: "send me the address when you can" | ok |
| a reply not sent yet | keep the change | a reply to check: "keep the change" | ok |
| a chat | no | a reply to check: "no" | ok |
| a chat | maybe tomorrow | a reply to check: "maybe tomorrow" | ok |
| a chat | I like that idea | a reply to check: "I like that idea" | ok |
| a chat | undo | the chat (anna) | ok |
| a chat | on my way | asks: Reply: On my way? Tap to confirm | ok |
| a chat | I am on my way now see you in ten | a reply to check: "I am on my way now see you in ten" | ok |

The two misses:

- "next one" on the list: the navigator was half sure of "Move down" and the glasses asked "Which one?". A tap on
  the first row does it.
- "show me the short answers" in a chat: a sentence that starts with "show" or "open" and names no chat is taken
  as the reply (so "open the door for Sam" is a message, not a command). A tap on the chat opens the short answers.

What the rule is (`src/glasses/app.ts`, tests in `src/glasses/dictation.test.ts`), on a screen that takes a reply:

1. A command said by its very name ("go back", "send", "scroll down") runs at once, with no model. So do "like
   that" and "save that".
2. A short answer is offered only when its very words are said ("thanks", "reply on my way"), never for a sentence
   that merely means the same.
3. Otherwise the navigator is asked, and its choice counts only when it is sure (0.7, Earshot's own bar). Anything
   less is the reply, shown to check, sent by a tap.
