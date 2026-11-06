"""Build the data file for the public Career OS site.

Usage: python3 scripts/build_public.py path/to/tracker.json [data/jobs.json]

Reads the full tracker from Adnan's Career OS dashboard and writes every role,
with all of its fields, to data/jobs.json as {"updated": ..., "rows": [...]}.
Adnan asked on 6 Nov 2026 for the public site to show everything. The only
change made is that history and prep are always real lists.
"""
import json, sys, datetime

def arr(v):
    if isinstance(v, str):
        try:
            v = json.loads(v)
        except Exception:
            v = []
    return v if isinstance(v, list) else []

def main():
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else 'data/jobs.json'
    rows = json.load(open(src, encoding='utf-8'))
    if isinstance(rows, dict):
        rows = rows.get('rows') or rows.get('data') or []
    clean = []
    for r in rows:
        if not isinstance(r, dict) or not r.get('id') or not r.get('organisation'):
            continue
        r = dict(r)
        for k in ('history', 'prep'):
            if k in r:
                r[k] = arr(r[k])
        clean.append(r)
    doc = {'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'rows': clean}
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print('wrote %d roles to %s' % (len(clean), out))

if __name__ == '__main__':
    main()
