# Letteramble: Quickfire

A browser word-search mini-game with exactly 15 answerable gaps and a fixed rack of 16 letters in two rows of eight. A 15 × 15 canvas leaves room for the gaps on narrow shapes. Every board has enough copies of the required letters and one spare. No refills or red herrings.

## Playing

Open the game in Safari, then Share → Add to Home Screen for a standalone shortcut. A connection is needed when opening it. Tap Start board to begin. Sound starts after interaction; the mute preference is saved locally. Reloading starts a fresh session. Updated home-screen artwork may require removing and adding the shortcut again.

## Words and layouts

- Twelve shapes: square, circle, plus, square ring, A, B, C, D, E, H, O and T. The plus removes a 4 × 4 square from each corner. Six colour themes cycle independently. Neither shape nor theme immediately repeats.
- The generator packs one deliberate crossing pair and fourteen separate words into the mask before adding background letters. Placed words cannot touch sideways or join end to end. Each word has one missing letter, with the crossing pair sharing a gap. Every gap is independently answerable.
- Only complete, maximal runs in the actual word layout count. Filler is outside that layout. THERE scores once, without THE, HER or ERE. An invalid full run such as AOTTERA cannot score OTTER or ERA within it. Words read left to right or top to bottom, with at least three letters.
- A crossing answer must make valid words in both directions. Correct words receive separate outlines. Crossing words reveal individually, shortest first, with a bounce and a rising magical chime.
- Unexpected dictionary words within a word's boundaries count when a complete matching still exists between the remaining gaps and unused rack slots. A blocking alternative retains its tile, incurs no penalty and is explained. This safeguards the fixed rack, including duplicate letters.

## Input and score

- Correct answers consume one physical rack tile, fading and disabling it without replacement. Two choices remain before the final gap and one afterwards.
- First opportunity: green, 2 points. After one missed opportunity: amber, 1 point. After two or more: red, 0 points. A crossing earns gold and 5 points total, including after a pass. Automatic answers always earn zero.
- Three manual passes per board. A pass requeues the gap with a reduced score; it never fills the answer automatically. Passing is penalised only when a usable answer is in the rack. When all three passes are spent, the button is disabled.
- Three hints per board. A hint highlights roughly 30% of unused physical rack tiles (rounded, at least one), including a safe answer. Its sparkles remain until the gap changes. A hint cannot be purchased again on the same visit. It neither advances the gap nor resets the countdown.
- Wrong letters wobble, remain in the rack, count as a missed opportunity and move to the next unresolved gap. They do not spend a manual pass.
- A timeout immediately loses that gap, including on its first visit. The game reveals its full word in a dark, inverted theme colour and consumes a matching rack tile in that colour for zero points. Timeouts do not spend manual passes.
- Keyboard: A–Z plays the first unused matching tile; Space passes.

## Timing and feedback

Each gap retains its initial allowance on revisits. Allowances interpolate from 30 seconds to 15 seconds over fifteen gaps: 30, 29, 28, 27, 26, 25, 24, 22, 21, 20, 19, 18, 17, 16, 15. There are fourteen transitions, so one step decreases by two seconds. The initial budget totals 337 seconds.

A monotonic clock measures active thinking time. Word reveals, instructions, results and time in the background are excluded. The tile's orbiting spark accelerates towards the deadline. Supported browsers receive a short haptic pulse at each of 5, 4, 3, 2 and 1 seconds; a longer pulse marks a pass, incorrect choice or timeout. Completion has its own pulse pattern. A quiet countdown sound and visible countdown remain available without vibration hardware. Reduced-motion users receive static focus outlines instead of animation.

The final speed bonus is `max(0, min(manuallySolvedGaps, floor((337 - activeSeconds) / 15)))`. It uses overall board time, is capped by manual solves, and is added exactly once. Results remain until Next board is pressed; the board then explodes and the next shape drops in. Total score carries across boards.

## Source

This folder contains the authored static game. No build step or dependencies are needed to play. Serve that directory through a static HTTP server. `engine.mjs` contains rules and generation, `clock.mjs` the active-time clock, `feedback.mjs` the haptic adapter and countdown cues, and `app.mjs` the interface and sound.

```sh
node --test tests/engine.test.mjs
```

## Dictionary and validation

72,825 British English SCOWL en_GB-ise word forms, 3–12 ASCII letters. Familiar words seed the layouts; the full dictionary validates alternatives. This is not an official Scrabble list. Full redistribution notices remain in `DICTIONARY-LICENCE.txt`, linked from the help panel.

20 automated checks pass, including 720 generated boards spanning all twelve shapes, 36 complete mixed-action games, maximal-run validation, safe alternatives, rack allocation, hint and pass limits, immediate timeouts, clock pauses, five countdown cues and bonus idempotence. The bottom row remains contained by explicit insets. The page can scroll on short displays. No browser screenshot or physical iPhone verification was performed for this revision.
