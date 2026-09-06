# Letteramble: Quickfire

A browser word-search mini-game for Letteramble, designed around a 12 × 12 board, a 12-letter rack and a large PASS button. No runtime dependencies, adverts, analytics or paid services.

## Play

Open the hosted game in Safari. Share → Add to Home Screen adds a standalone shortcut. The game needs a connection when opened. Sounds start after a tap, as required by mobile browsers. Mute is a device-local preference. Reloading starts a fresh session.

Choose 10, 15 or 20 planted words. A change during play applies on the next board; changing an untouched board reshuffles it immediately. The clock measures active play, excluding instructions, time in the background and the completed-board screen.

## Rules

- Fill the sparkling question mark using a rack letter to complete at least one word containing that square. Accept any dictionary word of 3–12 letters, left to right or top to bottom, embedded anywhere in the row or column. Other question marks break words.
- PASS cycles through unresolved squares. It only records a missed opportunity if any current rack letter would complete a valid word. Misses are shown on the square when it returns, not immediately when passed.
- A wrong letter remains in the rack and advances the active square. It records a miss only if a valid rack answer existed.
- Green: 2 points with no missed opportunities. Amber: 1 point after one. Red: 0 points after two or more, still filling the square and replacing the letter.
- One placement completing at least one horizontal and one vertical word earns gold and 5 points total, overriding missed-opportunity scoring. Multiple words in one direction retain the normal placement score.
- Every successful placement replaces exactly one rack slot. Replacement draws mix needed letters with weighted random letters. There is no guarantee that every planted word will remain attainable.
- Count each new word occurrence containing the filled square; existing words cannot repeatedly score. A word extension counts as a new word. All words involved remain highlighted.
- A deliberate shared gap completes two crossing words on every board. A staged word pair, such as WALK then WALKING, has two gaps. Any further doubles can arise incidentally.
- The board refreshes only when exhaustive checking finds no valid move in any remaining gap with the post-replacement rack. Genuine red herrings may remain. Passing alone cannot end a playable board.

## Source and running

This folder contains the authored, deployable static game. Serve it through any ordinary static HTTP server. No build step or external runtime requests are needed, beyond loading the bundled assets. `engine.mjs` contains pure game rules, `app.mjs` handles presentation and sound, and `styles.css` contains the responsive layout and motion.

Run the rule checks with Node:

```sh
node --test tests/engine.test.mjs
```

## Dictionary

72,825 British English word forms, 3–12 ASCII letters. Reuses the original Letteramble SCOWL en_GB-ise 2020.12.07 dictionary via wooorm/dictionaries, filtered only by playable length. Original source repository revision: `2b8598af94ec941a88b637e6a05e04530fed904e` in thundercato/WordShape. No claim of an exhaustive English dictionary or official Scrabble list. Full redistribution notices are in `DICTIONARY-LICENCE.txt` and linked from the help panel.

Planted words come from a hand-picked familiar vocabulary, validated against the same full dictionary. Additional valid words can make the discovered word count higher than the 10/15/20 planted target.

## Validation

14 automated rule checks pass. Coverage includes embedded and unexpected words, no backwards/wrapped/two-letter answers, fair passes and mistakes, gold overrides, zero-point refills, staged extensions, post-replacement exhaustion and red herrings. Generated-board checks cover 90 seeded boards across all three modes; 30 complete simulated games check scoring and termination.

JavaScript syntax and local asset links are checked. No automated browser, visual or physical iPhone/Safari test has been performed. Responsive CSS reserves space for rack and PASS using the small viewport height, with a minimum readable board size and scrolling on very small screens. Reduced-motion preferences remove animation.
