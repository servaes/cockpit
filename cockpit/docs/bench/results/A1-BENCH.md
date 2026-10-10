# Cockpit store keys

Every `$.store.get` / `$.store.set` call in `cockpit/hooks/register.tsx` (26 calls, 12 distinct keys). `CREW_CHATS_KEY` is `'crew.chats'` (line 6110); `${C.sid}` is the session id, `${shipRoot}` the ship folder.

| Line | Call | Key |
|---:|---|---|
| 884 | get | `plan.ratio` |
| 899 | set | `plan.ratio` |
| 3217 | get | `settings` |
| 3878 | set | `progress.turns` |
| 4004 | set | `settings` |
| 4226 | get | `ship:last:${shipRoot}` |
| 4342 | set | `ship:last:${shipRoot}` |
| 6047 | get | `estimate.history` |
| 6052 | get | `progress.turns` |
| 6054 | get | `crew.codex` |
| 6055 | get | `crew.chats` (via `CREW_CHATS_KEY`) |
| 6089 | set | `crew.chats` (via `CREW_CHATS_KEY`) |
| 6149 | set | `crew.chats` (via `CREW_CHATS_KEY`) |
| 6273 | set | `crew.chats` (via `CREW_CHATS_KEY`) |
| 6281 | set | `crew.codex` |
| 6309 | set | `estimate.history` |
| 6480 | set | `cache.every:${C.sid}` |
| 6483 | set | `cache.deadline:${C.sid}` |
| 6631 | get | `cache.deadline:${C.sid}` |
| 6636 | get | `cache.every:${C.sid}` |
| 6639 | get | `cache.guard` |
| 6640 | get | `cache.always` |
| 6641 | get | `cache.autoHandoff` |
| 6803 | set | `cache.always` |
| 6856 | set | `cache.guard` |
| 6867 | set | `cache.autoHandoff` |

## Distinct keys

- `plan.ratio`: 884, 899
- `settings`: 3217, 4004
- `progress.turns`: 3878, 6052
- `ship:last:${shipRoot}`: 4226, 4342
- `estimate.history`: 6047, 6309
- `crew.codex`: 6054, 6281
- `crew.chats`: 6055, 6089, 6149, 6273
- `cache.every:${C.sid}`: 6480, 6636
- `cache.deadline:${C.sid}`: 6483, 6631
- `cache.guard`: 6639, 6856
- `cache.always`: 6640, 6803
- `cache.autoHandoff`: 6641, 6867

Not listed above (deletes, not get/set): `$.store.delete` at 6407, 6408, 6411, 6479, 6633, 6634.
