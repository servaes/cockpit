# Cockpit store keys (cockpit/hooks/register.tsx)

Every `$.store.get(...)` and `$.store.set(...)` call in `cockpit/hooks/register.tsx`, by line number. 26 calls in total: 12 gets and 14 sets. `$.store.delete(...)` calls are not listed here.

## Calls

| Line | Call | Key |
|-----:|------|-----|
| 884 | get | `'plan.ratio'` |
| 899 | set | `'plan.ratio'` |
| 3217 | get | `'settings'` |
| 3878 | set | `'progress.turns'` |
| 4004 | set | `'settings'` |
| 4226 | get | `` `ship:last:${shipRoot}` `` |
| 4342 | set | `` `ship:last:${shipRoot}` `` |
| 6047 | get | `'estimate.history'` |
| 6052 | get | `'progress.turns'` |
| 6054 | get | `'crew.codex'` |
| 6055 | get | `CREW_CHATS_KEY` (= `'crew.chats'`, defined at line 6110) |
| 6089 | set | `CREW_CHATS_KEY` |
| 6149 | set | `CREW_CHATS_KEY` |
| 6273 | set | `CREW_CHATS_KEY` |
| 6281 | set | `'crew.codex'` |
| 6309 | set | `'estimate.history'` |
| 6480 | set | `` `cache.every:${C.sid}` `` |
| 6483 | set | `` `cache.deadline:${C.sid}` `` |
| 6631 | get | `` `cache.deadline:${C.sid}` `` |
| 6636 | get | `` `cache.every:${C.sid}` `` |
| 6639 | get | `'cache.guard'` |
| 6640 | get | `'cache.always'` |
| 6641 | get | `'cache.autoHandoff'` |
| 6803 | set | `'cache.always'` |
| 6856 | set | `'cache.guard'` |
| 6867 | set | `'cache.autoHandoff'` |

## Distinct keys

| Key | Get lines | Set lines |
|-----|-----------|-----------|
| `plan.ratio` | 884 | 899 |
| `settings` | 3217 | 4004 |
| `progress.turns` | 6052 | 3878 |
| `estimate.history` | 6047 | 6309 |
| `crew.codex` | 6054 | 6281 |
| `crew.chats` | 6055 | 6089, 6149, 6273 |
| `ship:last:<shipRoot>` | 4226 | 4342 |
| `cache.deadline:<sid>` | 6631 | 6483 |
| `cache.every:<sid>` | 6636 | 6480 |
| `cache.guard` | 6639 | 6856 |
| `cache.always` | 6640 | 6803 |
| `cache.autoHandoff` | 6641 | 6867 |

12 distinct key patterns. Three are dynamic: `ship:last:<shipRoot>` is keyed by the session's root folder, and `cache.deadline:<sid>` and `cache.every:<sid>` are keyed by the session id.
