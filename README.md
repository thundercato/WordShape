# Word Ramble

A relaxed word and territory game for May. Play at **https://thundercato.github.io/WordShape/** in desktop, iPhone or iPad Safari. The game has a new name; its existing address is unchanged.

## This version

- Human versus computer, ten turns each. A completed pass counts as a turn. Purple is yours; teal is the computer's. Most owned letter tiles wins.
- Smiley has vertical EYE words in both eyes and SMILE in its mouth. Black squares have yellow letters. The two blank raised mouth corners are decoration, not playable cells.
- The first play must reuse a starting letter. Complete seed words used by that play remain; unused seed letters clear, preserving square artwork.
- A play claims its new or extended words and every existing word directly sharing the letters it reuses. Claims do not spread recursively through unrelated crossings. Artwork keeps its black centre and has coloured ownership borders and P/C badges.
- Smiley, varying hashtag lanes, and generated island, cloud, diamond and cross shapes. Generated geometry and seeds are validated and opening racks have verified moves.
- Easy, Normal and Hard affect rack helpfulness and the computer's vocabulary recognition. The computer can pass. Thinking stops within 15 seconds in an active foreground page; background browsers may pause timers.
- Pass tray accepts any number of retained letters, including none or all. Cancel costs nothing. Incompatible retained letters require an explicit choice before an unverified replacement is accepted.
- Tap placement; pointer dragging with a raised tile and a top-left aiming dot; pulsing destination; safe recall and cancellation; pinch zoom, zoom buttons, pan and Fit board.
- Exact rack multiplicities, full across/down validation and legal requested hints. Unused player letters remain. Board exhaustion is distinct from a search timeout or an unhelpful rack.
- Local saving includes both racks, ownership, turns, difficulty and pending computer turns. Draft tiles return to the rack after refresh. The former solo game's save is left separate because its rules differ.

## Running and editing

The deployed `index.html` is self-contained, including engine, styles, word data and licences. Download it and open it in a desktop browser, or use the hosted link. No runtime framework, paid service, accounts, adverts, analytics or language-model calls.

An iPhone HTML attachment may open in Files/Quick Look rather than execute correctly. Use the HTTPS link in Safari. Safari's Share → Add to Home Screen can create a shortcut; this is not a native iOS app. There is no service worker, offline installation or cloud save. Storage belongs to the browser and address; private browsing or storage restrictions may prevent lasting saves.

The separate `engine.js` contains pure rules and game-state operations; `ui.html` is its interface template. To rebuild after editing:

```sh
python3 package.py
```

This creates `dist/index.html` and the equivalent `dist/wordshape.html` (legacy filename). Deploy `dist/index.html` as the repository's root `index.html`.

## Dictionary

77,380 accepted British English words, 2–15 letters. Source: SCOWL en_GB-ise 2020.12.07, distributed through [wooorm/dictionaries](https://github.com/wooorm/dictionaries/tree/main/dictionaries/en-GB). [SCOWL source](http://wordlist.aspell.net/).

Redistributed under the upstream MIT/BSD-style terms; full required notices are in `DICTIONARY-LICENCE.txt` and embedded in the game's Words & credits panel. Copyright Kevin Atkinson and contributors; UKACD copyright (c) J Ross Beresford 1993–1999. All Rights Reserved.

Generation uses 6,258 forms from hand-selected familiar roots plus 556 stretch forms. These are subjective vocabulary categories, not measured frequencies or difficulty based solely on length. All levels accept the same validation dictionary. Recovery may use its broader, sometimes specialist vocabulary. The list can omit legitimate words.

Candidate placement search considers actual geometry, full perpendicular constraints, retained counts and rack capacity. The generator revalidates its target using Submit's validator and evaluates distinct word choices, not repeated placements. Cooperative, bounded searches do not declare exhaustion unless an exhaustive search establishes it. Rack quality is heuristic, not a guarantee of unlimited moves or filling the board. Narrow hashtag boards may end well before ten turns.

## Tests actually run

See `TESTING.md` and recorded logs in `tests/`. Real iPhone/Safari gesture and visual testing remains outstanding.

## Agent workflow and storage

Read [AGENTS.md](AGENTS.md) before work. Effective 7 September 2026, local packaging and tests remain the default. Do not introduce hosted builds, paid services or routine diagnostic uploads without explicit approval; newly approved optional diagnostic archives should expire after one day unless another duration is agreed.

The existing Pages publishing route is preserved. Root `index.html`, `dist/` and dictionary/licence assets are intentional delivery files, not disposable Actions artefacts. Do not remove them, change the live address or disable publishing as housekeeping. This documentation update changes no game rules, code, tests or release version and claims no new device acceptance.
