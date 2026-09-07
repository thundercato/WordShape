# WordShape / Word Ramble agent instructions

Read the current `README.md`, `TESTING.md` and approved user request before changing the game. Fetch remote state before resuming an old branch. Do not infer a new game redesign or native port from housekeeping instructions.

## Local validation and deployment

- This is a browser game. Use the documented local Python packaging process and existing tests; do not introduce a native Xcode or hosted macOS build pipeline.
- Preserve game rules, dictionary/licence notices, saves and the existing GitHub Pages address and publishing settings unless the task explicitly changes them.
- Root `index.html`, `dist/`, dictionaries and related web assets are intentional delivery files. Never delete them as 'build rubbish' or add ignore rules that break deployment.
- Existing standard Pages publishing may continue. Do not disable or replace it as an Actions storage cleanup.
- Report automated checks and real Safari/device acceptance separately. Do not weaken tests or claim device checks that were not performed.

## Build costs and storage: effective 7 September 2026

- Local test/packaging is the default. Do not add paid services, hosted test/build workflows, automatic retries, schedules or persistent runner services without Adam's explicit approval of scope, run count and cost.
- Any new diagnostic/build archive upload must be explicitly requested, opt-in and retained for one day unless another duration is approved. This rule is not permission to alter deployment-required files or existing Pages internals.
- Preserve source, tags, release assets, useful test records and local unresolved diagnostic evidence. Never delete a repository or rewrite its history merely to reduce the Actions artefact meter.
- Before an approved artefact cleanup, inventory every page, identify exact IDs and originating completed runs, then verify successful deletions. Report actual deleted bytes separately from forecast savings and accrued billing.
- Keep operations-only documentation changes separate from product releases. These instructions do not create a new app/game version or approve unrelated changes.
