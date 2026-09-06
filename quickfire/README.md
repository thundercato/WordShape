# Letteramble: Quickfire

A browser word-search mini-game for Letteramble: a 12 × 12 board, exactly 15 question marks and a fixed rack of 16 letters in two rows of eight. Every gap has a planted answer and the initial rack contains enough copies of every required letter, plus one spare. No red herrings, refills, adverts, analytics or paid services.

## Play

Open the hosted game in Safari. Share → Add to Home Screen adds a standalone shortcut. The game needs a connection when opened. Tap Start board to begin the countdown. Sound starts after a tap; mute is saved as a device-local preference. Reloading starts a new session.

## Rules

- Complete a dictionary word containing the active gap. Words may be embedded in surrounding letters, reading left to right or top to bottom, 3–12 letters long.
- A correct answer consumes one rack tile. Its letter remains visible but faded and disabled. Used letters never refill. Automatic answers consume a tile too, showing it in red. Two choices remain for the final gap; one remains after the board is complete.
- First opportunity: green, 2 points. After one miss: amber, 1 point. A second pass, timeout or incorrect choice fills the gap automatically in red, for zero points. Incorrect choices retain the wrongly selected tile; an automatic resolution instead consumes the actual answer.
- Multiple word occurrences in **any direction** earn gold and 5 points total for that placement, including OTTER and ERA overlapping in one row. Automatic fills always score zero. Each word is revealed individually, shortest first, with its own board highlight, bounce and increasingly high magical chime. Reveals do not consume playing time.
- Passing cycles unresolved gaps. Each gap has its own time allowance based on its initial position in the sequence. Allowances interpolate from 30 seconds for gap 1 to 15 seconds for gap 15: 30, 29, 28, 27, 26, 25, 24, 22, 21, 20, 19, 18, 17, 16, 15. Fifteen gaps have fourteen transitions, so one step decreases by two seconds. Revisits retain the same allowance with a fresh countdown.
- The fixed rack is protected by an exact matching check. Unexpected valid words count when the remaining unused letters can still complete all unresolved gaps. A valid but blocking choice stays in the rack, does not move the active gap or add a miss, and explains why. This is an intentional change from the original unlimited-refill version. Automatic answers use a complete remaining assignment, so alternate valid words cannot strand the board.
- A board ends only when all 15 gaps are filled. Results stay visible until Next board is pressed, then the old board explodes and a new one drops in.

## Timing and score

Only active thinking time counts towards the overall board time. The clock pauses during animation, instructions, results and while the page is hidden. A monotonic clock handles deadlines; timeouts use the same action as PASS.

The initial allowances total 337 seconds. The board speed bonus is:

`max(0, min(manuallySolvedGaps, floor((337 - activeSeconds) / 15)))`

This awards one point per 15 seconds saved against the complete board budget, capped at the number of gaps the player solved themselves. Automatic fills do not independently earn a speed reward. The bonus is calculated and added once on completion. Results show word points, time, bonus and board score; the top score carries across boards.

## Source and running

This folder contains the authored deployable static game. No build step is required. Serve that folder through any static HTTP server. `engine.mjs` contains rules and board generation, `clock.mjs` contains the active-time clock, and `app.mjs` handles the interface, input and sound.

```sh
node --test tests/engine.test.mjs
```

## Dictionary

72,825 British English word forms, 3–12 ASCII letters. Reuses the original Letteramble SCOWL en_GB-ise 2020.12.07 dictionary via wooorm/dictionaries, filtered only by playable length. Full redistribution notices are in `DICTIONARY-LICENCE.txt`, linked from the help panel. This is not an exhaustive English dictionary or an official Scrabble list.

## Validation

15 automated checks pass, including OTTER/ERA order and scoring, fixed-rack consumption, duplicate allocation, timeout/auto-fill behaviour, safe alternative words, pause/resume timing, bonus idempotence, 60 generated boards and 30 complete games mixing manual answers, passes and timeouts. HTML/script references, local assets, manifest and JavaScript syntax are checked.

The board now uses an explicit inset on all four sides rather than a percentage height; the bottom row cannot extend beyond its frame. Responsive sizing accounts for viewport height and safe areas and preserves a readable minimum size, with page scrolling where needed. No browser screenshot or physical iPhone verification has been performed for this revision.
