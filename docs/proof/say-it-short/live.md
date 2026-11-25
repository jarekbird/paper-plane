# Say it short, tried on the real model

25 November 2026. The app's own writer (`src/voice/writer.ts`) through the deployed relay, model
`mistralai/mistral-nemo`. 34 made-up instructions, each asked three times: 102 answers.

- **93 of 102** said what the instruction said, added nothing and left nothing out.
- Time to an answer: usually 0.4 to 0.8 seconds, the slowest about 2.
- The nine misses, three sentences that missed all three times: "Lock up when you leave." for "…and tell him to
  lock up" (words added), "The blue one is mine too." for "tell her that and the blue one are mine" ("that" left
  out), and "With a big thank you." for "answer with a big thank you" (reads oddly). That is why the glasses always
  show the message first, and "As I said it" puts the words back.

| Said | Written (the most common of three) |
| --- | --- |
| tell her yes and ask where | Yes. Where? |
| tell him I am running ten minutes late | I am running ten minutes late. |
| ask them if Thursday still works | Does Thursday still work for you? |
| tell everyone the demo moved to four | The demo moved to 4. |
| let her know I got the keys | I got the keys. |
| say yes and ask what time | Yes. What time? |
| reply that I will call tonight | I will call tonight. |
| answer no, not this week | No, not this week. |
| respond with thanks and see you there | Thanks, see you there. |
| tell her I love the idea but I need to check with Sam first | I love the idea but I need to check with Sam first. |
| ask him to send me the address | Can you send me the address? |
| tell them sorry I missed the call and I will ring back after lunch | Sorry I missed the call, I will ring back after lunch. |
| say no | No. |
| tell her happy birthday | Happy birthday! |
| ask her whether she wants pizza or sushi tonight | Do you want pizza or sushi tonight? |
| tell her I will be there at seven and ask if I should bring anything | I'll be there at 7. Should I bring anything? |
| ask them who is picking up the kids | Who is picking up the kids? |
| tell him the keys are under the mat and tell him to lock up | The keys are under the mat. Lock up when you leave. |
| ask her how the interview went | How did the interview go? |
| tell him I will call and ask for a refund | I will call and ask for a refund. |
| let everyone know that lunch is on me | Lunch is on me. |
| reply with sounds good | Sounds good. |
| tell them I can not make it tonight and ask if tomorrow works | I can't make it tonight. Does tomorrow work? |
| ask him when the train gets in | When does the train get in? |
| tell her I will call Sam and ask him if he can help | I will call Sam and ask him if he can help. |
| tell her I will call Sam and ask if he can help | I will call Sam and ask if he can help. |
| tell him the report is done and ask him to check page two | The report is done. Can you check page two? |
| tell them I will talk to Maria and tell her about the trip | I will talk to Maria and tell her about the trip. |
| tell her that and the blue one are mine | The blue one is mine too. |
| reply that works for me | That works for me. |
| tell him that I will be there by nine | I'll be there by 9. |
| say that sounds great | Sounds great! |
| reply with or without you, I am going | With or without you, I'm going. |
| answer with a big thank you | With a big thank you. |

What made it steady, in the order tried:

1. The first wording sent the words as said: 14 of 16 usable but uneven answers (no capital letter, a "Hey," added,
   "Tell everyone…" kept in the message).
2. The phone now replaces the opening ("tell her", "ask them", "let him know") with "Tell them:" or "Ask them:"
   (`noteOf` in `src/instruction.ts`), so the model cannot take the reader for a third person.
3. Twelve fixed, made-up example pairs go with every request. Earlier tries also split "and ask …" on the phone
   and dropped a "that" or a "with" after the opening; each changed what some sentence meant, so everything after
   the opening is left to the model.
4. A capital letter and a full stop are added by code (`oneMessage`), not asked of the model.
