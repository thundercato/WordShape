# Word Ramble v2 verification

Executed against the bundled game and pure engine:

- 20 engine groups: EYE/SMILE geometry, HELP and THIS seed-clearing examples, mandatory opening overlap, no mutation on invalid opening, direct ownership capture and recapture without recursive spread, two perpendicular constraints, illegal side words, duplicate counts, single-tile extensions, bounds/gaps/overwrites, 50 generated seed topologies, incomplete-search honesty, keep 0–8 and keep-all passes, incompatible retained letters, vocabulary recognition once per distinct word, ten-turn limits, true exhaustion and save validation.
- Nine complete match simulations: all three board choices at all three difficulty levels. Every played move and generator target is checked through Submit's validator. Exact totals are in `tests/engine-v2-results.txt`.
- UI tests execute the actual embedded scripts in LinkeDOM: start, tap/recall, all keep counts and cancellation, top-left drag target/drop, capture loss, cancelled and outside drags, pinch and Fit scale maths, dragging into keep tray, HELP commitment, duplicate-submit protection, computer response and saved pending-turn restoration, tile-score restore, keep-all completed pass, invalid-submit persistence and storage failure recovery.

Reproduce:

```sh
python3 package.py
node tests/engine-v2.test.cjs
npm ci
node tests/ui-v2.test.cjs
```

Node and LinkeDOM are test tools only. The runnable HTML has no runtime dependencies.

Not tested: physical iPhone/iPad, actual Safari or desktop browser interaction, rendered visual layout, real pointer capture, accessibility assistive technology and older-phone timing. The provided remote browser rejected the preview with ERR_BLOCKED_BY_CLIENT; synthetic DOM and pointer tests are not a substitute for device testing.

On May's phone, check the aiming-dot feel and corner accuracy; rack access while zoomed; pinch/pan; portrait/landscape; drag cancellation; returning to Safari after backgrounding; refresh during computer thinking; pass with retained letters; and ownership borders on the black artwork.

The computer has a 14.5-second search deadline, then plays or passes. Foreground browser scheduling and speed still need measurement on a real phone. Board/rack preparation yields during searches; initial dictionary indexing is synchronous. Background tabs may pause timers. Hashtag geometry can genuinely exhaust early. New rules use a separate v2 save and do not convert old solo scores.
