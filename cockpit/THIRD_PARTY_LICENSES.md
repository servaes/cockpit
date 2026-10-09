# Third-party code in cockpit

cockpit folds six published Claude Code mods and one skill into one plugin. Their
code is reproduced here under the licences below, with the changes needed to make
them one module (renamed identifiers, one hook per event, the plugin name in state
and tool names). The original projects:

| Part of cockpit | Source | Author | Licence |
| --- | --- | --- | --- |
| The file tree (`hooks/tree.ts`, `git.ts`, `icons.ts`, `open.ts`, `rows.tsx`, the tree section of `register.tsx`) | [filetree](https://github.com/data-goblin/claude-code-filetree) 0.2.24 | Kurt Buhler | MIT |
| The savvy-flow band, agents panel, `progress` and `step` tools | [savvy-progress](https://github.com/johnnyvizz/claude-kit) 1.2.0 | johnnyvizz | MIT |
| The savvy-flow skill and the five worker agents (`skills/`, `agents/`) | [savvy-flow](https://github.com/johnnyvizz/claude-kit) 1.2.0 | johnnyvizz | MIT |
| `/goal`, the `tasks` tool, the goal band, footer and `/goals` (`hooks/goal-*.mjs`, the goal section) | goal-meter 1.0.0 (nateherk-mods) | Nate Herk | MIT |
| Replay Theater (`/replay`) | claude-code-playground-mods | Anthropic PBC | Apache-2.0 |
| The Caution guard (Blast Radius) | claude-code-playground | Anthropic PBC | Apache-2.0 |
| The next-step suggestions above the prompt (`next:` with 1/2/3 and 0 dismiss, the Tab ghost text; the next-steps section of `register.tsx`) | next-steps 1.0.0 (claude-community) | Thariq Shihipar | MIT |
| The cache block: the guard, keepwarm, the price table (the cache section of `register.tsx`); the Handoff note and Resume are cockpit's own | [cache-tax](https://github.com/karanb192/cache-tax) 2.2.1 | Karan Bansal | MIT |

## MIT License

Copyright (c) 2026 Kurt Buhler (filetree)
Copyright (c) 2026 johnnyvizz (savvy-progress, savvy-flow)
Copyright (c) 2026 Nate Herk (goal-meter)
Copyright (c) 2026 Karan Bansal (cache-tax)
Copyright (c) 2026 Thariq Shihipar (next-steps)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Apache License 2.0

Copyright 2026 Anthropic PBC (Replay Theater, Blast Radius)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
these files except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0. Unless required by
applicable law or agreed to in writing, software distributed under the License
is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
