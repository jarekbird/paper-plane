# Say it short, tried on the real model

25 November 2026. The app's own writer (`src/voice/writer.ts`) through the deployed relay, model
`mistralai/mistral-nemo`. 24 made-up instructions, each asked three times: 72 answers.

- **69 of 72** said what the instruction said, added nothing and left nothing out.
- Time to an answer: usually 0.4 to 0.8 seconds, the slowest about 2.
- The three misses: "Lock up when you leave." twice for "…and tell him to lock up" (words added), and
  "I'll call you back after lunch." once for "tell them sorry I missed the call and I will ring back after lunch"
  ("sorry" left out). That is why the glasses always show the message first, and "As I said it" puts the words back.

| Said | Written (the most common of three) |
| --- | --- |
| tell her yes and ask where | Yes. Where? |
| tell him I am running ten minutes late | I am running ten minutes late. |
| ask them if Thursday still works | Does Thursday still work? |
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
| tell her I will be there at seven and ask if I should bring anything | I will be there at seven. Should I bring anything? |
| ask them who is picking up the kids | Who is picking up the kids? |
| tell him the keys are under the mat and tell him to lock up | The keys are under the mat. Lock up when you leave. |
| ask her how the interview went | How did the interview go? |
| tell him I will call and ask for a refund | I will call and ask for a refund. |
| let everyone know that lunch is on me | Lunch is on me. |
| reply with sounds good | Sounds good. |
| tell them I can not make it tonight and ask if tomorrow works | I can't make it tonight. Does tomorrow work? |
| ask him when the train gets in | When does the train get in? |

What made it steady, in the order tried: the first wording sent the words as said and got 14 of 16 usable but
uneven answers (no capital letter, a "Hey," added, "Tell everyone…" kept). Working out on the phone who is told or
asked what (`noteOf` in `src/instruction.ts`) fixed the kept "tell". Six fixed example pairs fixed the rest. A
capital letter and a full stop are added by code (`oneMessage`), not asked of the model.
