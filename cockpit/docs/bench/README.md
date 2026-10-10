# Crew 2.0 benchmark

The data behind the benchmark table in [the PRD](../crew-2.0-prd.md): 5 tasks, each done 3 ways, with the cost measured from the agents' own transcripts.

| Way | What it is |
|---|---|
| A | everything on Opus, the old default |
| B | Threads-style: Opus plans, Sonnet builds, Haiku checks |
| C | the cockpit router picks the place and the model |

## Files

- `tasks.json`, `t2.json`: the task prompts.
- `setup.sh`: makes one throwaway worktree per way and task under `wt/`, which git ignores. Task 3 gets a bug planted.
- `ids.txt`: which agent ran which task.
- `cost.py`: reads each agent's transcript and prices it with the API rates. Its output is `costs.jsonl`.
- `durations.txt`: minutes per run.
- `results/`: what each run produced, as a diff or a report.
- `judge/`: the blind review of task 5. X, Y and Z are the three ways, shuffled.
- `kinds.mjs`: the router's kind patterns run over the tasks.
- `codex/`: Codex's review of the command guard and its first smoke test.
- `router/`: the tools that mined past prompts for the router's synonyms. `mine-prompts.py` reads `~/.claude/projects` and writes `prompts.txt`, which stays local because it holds personal prompts.
