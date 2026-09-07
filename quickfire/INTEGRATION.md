# Letteramble daily integration contract v1

Approved 7 September 2026. The browser prototypes remain separate ahead of one native iOS app.

## Stable game identifiers and completion

- `quickfire`: complete all three ordered daily boards, shape → agent → shape. Keep each board medal.
- `make-the-cut`: one bomb, six sequential wires with secret words of lengths 3–8. A daily completion requires defusing all six wires.
- `crack-the-case`: complete all six daily cases of lengths 3–8. Keep each medal.
- Fourth game is undecided. Add its stable identifier to the required-game manifest when released. Do not fabricate a completion for an unbuilt game.

Use Europe/London YYYY-MM-DD date keys. `recordCompletion(progress, gameId, day, details)` writes once. Ledger: `{schemaVersion:1, days:{"2026-09-07":{quickfire:{completed:true,medals:["bronze","gold","silver"],score:90}}}}`. Game details may add score/medals but must not overwrite another game's entry. Merge current stored entries before saving. `streak(progress, gameId, today)` tolerates today still being unfinished; it breaks after a missed full day. `ultimate` requires all released game IDs for the same date. Native implementation should preserve these identifiers and semantics, with dedicated migration and save validation.

## Current status

Quickfire produces completion records and shows its own streak. The shared calculator is tested for all three games, but no other game's completion writer is connected. Do not display an earned ultimate streak from Quickfire alone. These static prototypes have no cloud or cross-origin save sync. GitHub Pages games on thundercato.github.io can use the same localStorage key after explicit integration; separate Sites addresses cannot.

## Themes

`dist/bomb-themes.mjs` (GitHub: `quickfire/bomb-themes.mjs`) contains eight categories and villain briefings: food, animals, gardens, music, travel, sea, weather and colours. There are two validated candidates at every length from 3–8. Rotating category and six binary choices gives 512 distinct daily sets, checked over a year. Categories recur. The theme briefing provides broad intel without spelling out a code; valid guesses need not belong to the category, but hidden answers do. Existing locking, duplicate handling, rack and hint rules remain the bomb engine's responsibility. Theme content is prepared for that engine, not deployed as a new bomb game.

Agent letter boards reject any completed word not starting or ending with the agent letter. All generated words are from a familiar curated pool; the generator skips agents unable to fit fifteen distinct gaps. Q and other limited letters are not guaranteed a slot in the rotation.
