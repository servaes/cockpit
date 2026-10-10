"""Cost of benchmark subagents, from their own transcripts: every assistant message's usage, priced
per model at API list prices (USD per million tokens: input, output, cache read, cache write).
Usage: python3 -I cost.py <subagents dir> <agent id>... ; prints one JSON line per agent."""
import json, os, re, sys

PRICES = [  # same table as hooks/register.tsx PRICES
    (r'fable|mythos', (10, 50, 0.25, 12.5)),
    (r'opus-5-5', (4, 20, 0.2, 5)),
    (r'opus', (5, 25, 0.5, 6.25)),
    (r'sonnet', (2, 10, 0.2, 2.5)),
    (r'haiku', (1, 5, 0.1, 1.25)),
]

def price(model):
    for pat, p in PRICES:
        if re.search(pat, model or ''):
            return p
    return None

root = sys.argv[1]
for aid in sys.argv[2:]:
    path = os.path.join(root, f'agent-{aid}.jsonl')
    tot = {'input': 0, 'output': 0, 'read': 0, 'write': 0}
    usd = 0.0
    models = set()
    calls = 0
    seen = set()
    try:
        for line in open(path, encoding='utf-8'):
            try:
                e = json.loads(line)
            except Exception:
                continue
            if e.get('type') != 'assistant':
                continue
            m = e.get('message') or {}
            mid = m.get('id')
            # one API response can be split over several lines; count it once
            if mid and mid in seen:
                continue
            if mid:
                seen.add(mid)
            u = m.get('usage') or {}
            model = m.get('model', '')
            p = price(model)
            if not p or not u:
                continue
            models.add(model)
            calls += 1
            i, o = u.get('input_tokens', 0), u.get('output_tokens', 0)
            r, w = u.get('cache_read_input_tokens', 0), u.get('cache_creation_input_tokens', 0)
            tot['input'] += i; tot['output'] += o; tot['read'] += r; tot['write'] += w
            usd += (i * p[0] + o * p[1] + r * p[2] + w * p[3]) / 1e6
    except FileNotFoundError:
        print(json.dumps({'id': aid, 'error': 'no transcript'}))
        continue
    print(json.dumps({'id': aid, 'models': sorted(models), 'calls': calls, **tot, 'usd': round(usd, 4)}))
