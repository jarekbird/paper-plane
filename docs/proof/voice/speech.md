# Voice, tried with spoken audio

26 November 2026. The app in Even's simulator on the sample account, with the deployed relay and the real models:
speech-to-text (`openai/whisper-large-v3-turbo`) and the navigator (`typesafe/jev-1.14`). Each line is one hold. The
sound is real speech audio, made by a speech synthesizer (Piper, two voices) and fed to the simulator's microphone,
so the whole path runs: the hold, the recording, the relay, the words, the choice, the screen. It is not a person's
voice and not the glasses' microphone.

## What it found

Speech-to-text writes a sentence, with a capital and a full stop or an exclamation mark. The navigator had been
measured on bare words (`live.md`), and with the punctuation it is sometimes no longer sure of a command.

| Said | Heard as | What happened | State |
| --- | --- | --- | --- |
| Go home (in a chat) | Go home! | a reply to check: "Go home!" | open |
| As I said it (on a written-out reply) | As I said it. | a reply to check: "As I said it." | open |
| Open the chat with Anna | Open the chat with Anna. | asked which chat | fixed: opens the chat |

- **Fixed here:** a chat is found after "the chat with", "my conversation with" and the like, on the phone
  (`src/names.test.ts`). "The" or "chat" alone is no longer taken for a chat that only starts with that word.
- **Open:** a command said by its very name should run whatever punctuation the words came with. Every voice app
  needs that, so it belongs in Earshot (rule G4) and is proposed there. Until then "Go home." was taken for the
  command and "Go home!" for a reply. Nothing is sent either way: a reply waits for a tap, and a double tap
  drops it.

## The run after the change

22 holds in each voice. Words were back from speech-to-text 0.8 s after the hold ended, and the screen had
changed within 1.5 s, where they were timed.

### Voice 1 (US)

| On | Said | Heard as | What happened |
| --- | --- | --- | --- |
| the list of chats | Open Anna | Open an all. | asks which chat |
| the list of chats | Open Launch crew | Open launch crew. | the chat (Launch crew) |
| the list of chats | Open Glasses news | Open Classes News | the chat (Glasses news) |
| the list of chats | Message Anna I am running late | Message and I am running late. | asks which chat |
| the list of chats | Mark all read | Mark Hall read | asks: Mark all read: the chats on the list? Tap to confirm |
| a chat | Go home | Go home! | a reply to check: "Go home!" |
| a chat | Go back | Go back! | the list of chats |
| a chat | Like that | (not caught) | asks: Like: the top message from someone else? Tap to confirm |
| a chat | Save that | Save it. | asks: Save: the top message from someone else? Tap to confirm |
| a chat | Scroll down | roll down | the chat (Anna) |
| a chat | See you at twelve thirty | See you at 12:30 | a reply to check: "See you at 12:30" |
| the reply | Send | Send. | asks: Send? Tap to confirm |
| a chat | Sounds good, thanks | Sounds good, thanks. | a reply to check: "Sounds good, thanks." |
| the reply | Keep for later | Keep for later. | asks: Keep for later? Tap to confirm |
| a chat | I will be there in ten minutes | I will be there in 10 minutes | a reply to check: "I will be there in 10 minutes" |
| the reply | Actually make it twenty minutes | Actually make it 20 minutes | a reply to check: "Actually make it 20 minutes" |
| the reply | Go back | Go back! | the chat (Anna) |
| a chat | Tell her yes and ask where | Tell her yes and ask where. | a reply to check: "Yes, where?" |
| the reply | As I said it | As I said it. | a reply to check: "As I said it." |
| a chat | Message Sam the demo moved to four | (not caught) | a reply to check: "Message Sam the demo moved to 4" |
| the list of chats | Open the chat with Anna | Open the chat with Anna | the chat (Anna) |
| a chat | Take me home | Take me home. | the list of chats |

### Voice 2 (British)

| On | Said | Heard as | What happened |
| --- | --- | --- | --- |
| the list of chats | Open Anna | Open Anna | the chat (Anna) |
| the list of chats | Open Launch crew | Open Launch Crew. | the chat (Launch crew) |
| the list of chats | Open Glasses news | Open Glasses News | the chat (Glasses news) |
| the list of chats | Message Anna I am running late | Message Anna, I am running late. | a reply to check: "I am running late." |
| the list of chats | Mark all read | Mark or Read | asks "Which one?" |
| a chat | Go home | Go home. | the list of chats |
| a chat | Go back | Go back. | the list of chats |
| a chat | Like that | Like that. | asks: Like: the top message from someone else? Tap to confirm |
| a chat | Save that | Save that. | asks: Save: the top message from someone else? Tap to confirm |
| a chat | Scroll down | Scroll down. | the chat (Anna) |
| a chat | See you at twelve thirty | See you at 12:30. | a reply to check: "See you at 12:30." |
| the reply | Send | Zen. | a reply to check: "Zen." |
| a chat | Sounds good, thanks | Sounds good, thanks. | a reply to check: "Sounds good, thanks." |
| the reply | Keep for later | Keep for later. | asks: Keep for later? Tap to confirm |
| a chat | I will be there in ten minutes | I will be there in 10 minutes. | a reply to check: "I will be there in 10 minutes." |
| the reply | Actually make it twenty minutes | Actually make it 20 minutes. | a reply to check: "Actually make it 20 minutes." |
| the reply | Go back | Goodbye. | a reply to check: "Goodbye." |
| a chat | Tell her yes and ask where | (not caught) | a reply to check: "Yes, where?" |
| the reply | As I said it | As I said it. | a reply to check: "As I said it." |
| a chat | Message Sam the demo moved to four | (not caught) | a reply to check: "Message sound the demo moved to 4." |
| the list of chats | Open the chat with Anna | (not caught) | still waiting for the words after 9 s |
| a chat | Take me home | Take me home. | the list of chats |

## What it does not show

- **Short words are misheard in this set-up**: "Send" came back as "Zen." in voice 2, "Go back" as "Goodbye.".
  Sent straight to speech-to-text, without the simulator's microphone in between, the same recordings of voice 1
  came back right three times out of three ("Go home!", "Go back.", "Send."), so the stand-in microphone adds
  faults of its own. A person on real glasses is not measured here.
- A misheard command in a chat becomes a reply to check, never a sent message: nothing in these runs was sent
  without a tap.
- "Message Sam …" in an open chat, when Sam is not on the glasses, becomes a reply to the open chat.
