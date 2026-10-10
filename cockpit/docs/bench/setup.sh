#!/bin/bash
# One throwaway worktree of the cockpit repo per arm and task, at the current commit, under this folder.
# Task 3 gets its bug planted (the Crew chats count reads the gone chats); nothing here is ever committed.
set -euo pipefail
REPO="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
HERE="$(cd "$(dirname "$0")" && pwd)"
for arm in A B C; do
  for n in 1 2 3 4 5; do
    wt="$HERE/wt/$arm$n"
    [ -d "$wt" ] && continue
    git -C "$REPO" worktree add --detach "$wt" HEAD >/dev/null 2>&1
    if [ "$n" = 3 ]; then
      sed -i '' "s/const crewRunning = (): CrewChat\[\] => crewChats.filter(c => c.status !== 'gone')/const crewRunning = (): CrewChat[] => crewChats.filter(c => c.status === 'gone')/" "$wt/cockpit/hooks/register.tsx"
      grep -q "c.status === 'gone')" "$wt/cockpit/hooks/register.tsx" || { echo "plant failed in $wt"; exit 1; }
    fi
  done
done
git -C "$REPO" worktree list | grep -c "/bench/wt/"
