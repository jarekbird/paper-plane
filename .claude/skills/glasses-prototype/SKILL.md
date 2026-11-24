---
name: glasses-prototype
description: Prototype a Paper Plane glasses screen as an Earshot view on the demo account, and check its frames against the display's limits. Use before building a new screen, row text or menu change, or when Jarek asks to see one.
---

# Glasses prototypes

A screen here is an Earshot screen: a view (`list`, `text` or `boxes`) and its actions. Earshot lays it out and
draws it, so the prototype is the screen itself on the demo account, before any service is wired.

1. Write the screen in `src/glasses`, fed only by `src/demo` through the interfaces of `src/messenger.ts` (A2, A6).
   Every input is an action (A7).
2. Write its frames as a test, each named for what the user did to get there. Draw on Earshot's fake bridge
   (`fakeBridge` from `earshot/testing`) and assert `fake.lines()`, `fake.menuItems()` and, for what is said over
   the page, `fake.overlay()`. Sample text only: no real message, name or number (S4).
3. Check every frame yourself:
   - One thing on screen and a few words, from the user's view (C5).
   - 576×288, rows of 27 px. At most seven text boxes, 999 bytes each, and four pictures.
   - No line is cut or wraps by accident: measure with `textWidth`, cut with `fitText`, wrap with `wrapText`, after
     `cleanText` or `oneLine` on any text that came from a message (S6).
   - Every character is in the font (`hasGlyph`): √ × ‖ → ≡ are, ✓ ✗ ⏸ ↳ ☰ are not.
   - Even's menu shows ten items; Earshot folds the rest behind "More…".
   - A screen that writes shows the exact text and where it goes, and only a tap sends (S5).
4. For a picture, run the demo in the simulator and take `screenshot('glasses')` (skill `simulator`).
5. These frames are your own design check. Show Jarek the pictures (Markdown image links with absolute paths) only
   when he asks.

The simulator is not the glasses: check a tight layout on the device.
