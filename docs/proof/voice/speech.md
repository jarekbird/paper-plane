# Voice, tried with spoken audio

26 November 2026. The app in Even's simulator on the sample account, with the deployed relay and the real models:
speech-to-text (`openai/whisper-large-v3-turbo`) and the navigator (`typesafe/jev-1.14`). Each line is one hold. The
sound is real speech audio, made by a speech synthesizer (Piper, two voices) and fed to the simulator's microphone,
so the whole path runs: the hold, the recording, the relay, the words, the choice, the screen. It is not a person's
voice and not the glasses' microphone.

## What it found, and what changed

Speech-to-text writes a sentence, with a capital and a full stop or an exclamation mark. The navigator had been
measured on bare words (`live.md`), and with the punctuation it was sometimes no longer sure of a command.

| Said | Heard as | Before | Now |
| --- | --- | --- | --- |
| Go home (in a chat) | Go home! | a reply to check: "Go home!" | the list of chats |
| As I said it (on a written-out reply) | As I said it. | a reply to check: "As I said it." | the reply as it was said |
| Open the chat with Anna | Open the chat with Anna. | asks which chat | the chat (Anna) |

- A command said by its very name now runs without asking the model, however the words were written
  (`src/glasses/dictation.test.ts`). What needs a tap still asks for it.
- A chat is found after "the chat with", "my conversation with" and the like, on the phone (`src/names.test.ts`).

## The run after the change

22 holds in each voice. Words were back from speech-to-text 0.8 s after the hold ended, and the screen had
changed within 1.5 s, where they were timed.

### Voice 1 (US)

| On | Said | Heard as | What happened |
| --- | --- | --- | --- |
| the list of chats | Open Anna | Open an up! | asks which chat |
| the list of chats | Open Launch crew | Open launch crew. | the chat (Launch crew) |
| the list of chats | Open Glasses news | Open Glasses News | the chat (Glasses news) |
| the list of chats | Message Anna I am running late | Message Anna I am running late | a reply to check: "I am running late" |
| the list of chats | Mark all read | Markle read. | the list of chats |
| a chat | Go home | Câu hùng | a reply to check: "Câu hùng" |
| a chat | Go back | Go back. | the list of chats |
| a chat | Like that | Like that. | asks: Like: the top message from someone else? Tap to confirm |
| a chat | Save that | (card not caught) | a reply to check: "That." |
| a chat | Scroll down | (card not caught) | the chat (Anna) |
| a chat | See you at twelve thirty | See you at 12:30. | a reply to check: "See you at 12:30." |
| the reply | Send | Cent. | a reply to check: "Cent." |
| a chat | Sounds good, thanks | Sounds good, thanks. | a reply to check: "Sounds good, thanks." |
| the reply | Keep for later | (card not caught) | asks: Keep for later? Tap to confirm |
| a chat | I will be there in ten minutes | I will be there in 10 minutes | a reply to check: "I will be there in 10 minutes" |
| the reply | Actually make it twenty minutes | Actually make it 20 minutes | a reply to check: "Actually make it 20 minutes" |
| the reply | Go back | Go back. | the chat (Anna) |
| a chat | Tell her yes and ask where | Tell her yes and ask where. | a reply to check: "Yes, where?" |
| the reply | As I said it | As I said it | a reply to check: "Tell her yes and ask where." |
| a chat | Message Sam the demo moved to four | (card not caught) | a reply to check: "Message Sam the demo moved to 4" |
| the list of chats | Open the chat with Anna | Open the chat with Anna! | the chat (Anna) |
| a chat | Take me home | Take me home. | the list of chats |

### Voice 2 (British)

| On | Said | Heard as | What happened |
| --- | --- | --- | --- |
| the list of chats | Open Anna | Open Anna. | the chat (Anna) |
| the list of chats | Open Launch crew | Open Launch Crew. | the chat (Launch crew) |
| the list of chats | Open Glasses news | Open Glasses News | the chat (Glasses news) |
| the list of chats | Message Anna I am running late | Message Anna, I am running late. | a reply to check: "I am running late." |
| the list of chats | Mark all read | Mark or read. | asks "Which one?" |
| a chat | Go home | Go home. | the list of chats |
| a chat | Go back | Goodbye. | a reply to check: "Goodbye." |
| a chat | Like that | Like that. | asks: Like: the top message from someone else? Tap to confirm |
| a chat | Save that | Save that. | asks: Save: the top message from someone else? Tap to confirm |
| a chat | Scroll down | (card not caught) | the chat (Anna) |
| a chat | See you at twelve thirty | See you at 12.30. | a reply to check: "See you at 12.30." |
| the reply | Send | Sen. | a reply to check: "Sen." |
| a chat | Sounds good, thanks | Sounds good, thanks. | a reply to check: "Sounds good, thanks." |
| the reply | Keep for later | (card not caught) | asks: Keep for later? Tap to confirm |
| a chat | I will be there in ten minutes | I will be there in 10 minutes. | a reply to check: "I will be there in 10 minutes." |
| the reply | Actually make it twenty minutes | Actually make it 20 minutes. | a reply to check: "Actually make it 20 minutes." |
| the reply | Go back | Goodbye. | a reply to check: "Goodbye." |
| a chat | Tell her yes and ask where | (card not caught) | a reply to check: "Yes, where?" |
| the reply | As I said it | As I said it. | a reply to check: "Tell her yes and ask where." |
| a chat | Message Sam the demo moved to four | (card not caught) | a reply to check: "Message sound the demo moved to four." |
| the list of chats | Open the chat with Anna | Open the chat with Anna. | the chat (Anna) |
| a chat | Take me home | Take me home. | the list of chats |

## What it does not show

- **Short words are misheard in this set-up**: "Send" came back as "Cent." and "Sen.", "Go back" as "Goodbye.",
  "Go home" once as words of another language. Sent straight to speech-to-text, without the simulator's microphone
  in between, the same recordings came back right three times out of three ("Go home!", "Go back.", "Send." in
  voice 1), so the stand-in microphone adds faults of its own. A person on real glasses is not measured here.
- A misheard command in a chat becomes a reply to check, never a sent message: nothing in these runs was sent
  without a tap.
- "Message Sam …" in an open chat, when Sam is not on the glasses, becomes a reply to the open chat.
