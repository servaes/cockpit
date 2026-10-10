# Cockpit store keys

Every key the cockpit stores across sessions: each `$.store.get` and `$.store.set` call in `cockpit/hooks/register.tsx`, with its line number.

A key written with `${...}` changes at runtime: `ship:last:${shipRoot}` is set per project root, and `cache.every:${C.sid}` and `cache.deadline:${C.sid}` are set per session id. `CREW_CHATS_KEY` is defined on line 6110 as `const CREW_CHATS_KEY = 'crew.chats'`.

## Table A: every call

| Line | Call | Key |
|---|---|---|
| 884 | get | plan.ratio |
| 899 | set | plan.ratio |
| 3217 | get | settings |
| 3878 | set | progress.turns |
| 4004 | set | settings |
| 4226 | get | `ship:last:${shipRoot}` |
| 4342 | set | `ship:last:${shipRoot}` |
| 6047 | get | estimate.history |
| 6052 | get | progress.turns |
| 6054 | get | crew.codex |
| 6055 | get | crew.chats (CREW_CHATS_KEY) |
| 6089 | set | crew.chats (CREW_CHATS_KEY) |
| 6149 | set | crew.chats (CREW_CHATS_KEY) |
| 6273 | set | crew.chats (CREW_CHATS_KEY) |
| 6281 | set | crew.codex |
| 6309 | set | estimate.history |
| 6480 | set | `cache.every:${C.sid}` |
| 6483 | set | `cache.deadline:${C.sid}` |
| 6631 | get | `cache.deadline:${C.sid}` |
| 6636 | get | `cache.every:${C.sid}` |
| 6639 | get | cache.guard |
| 6640 | get | cache.always |
| 6641 | get | cache.autoHandoff |
| 6803 | set | cache.always |
| 6856 | set | cache.guard |
| 6867 | set | cache.autoHandoff |

## Table B: unique keys

| Key | Lines read (get) | Lines written (set) |
|---|---|---|
| plan.ratio | 884 | 899 |
| settings | 3217 | 4004 |
| progress.turns | 6052 | 3878 |
| `ship:last:${shipRoot}` | 4226 | 4342 |
| estimate.history | 6047 | 6309 |
| crew.codex | 6054 | 6281 |
| crew.chats (CREW_CHATS_KEY) | 6055 | 6089, 6149, 6273 |
| `cache.every:${C.sid}` | 6636 | 6480 |
| `cache.deadline:${C.sid}` | 6631 | 6483 |
| cache.guard | 6639 | 6856 |
| cache.always | 6640 | 6803 |
| cache.autoHandoff | 6641 | 6867 |

Totals: 26 calls (12 get, 14 set), 12 unique keys.
