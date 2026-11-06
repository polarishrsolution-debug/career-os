"""Build the public, view-only data file for the Career OS site.

Usage: python3 scripts/build_public.py path/to/tracker.json [data/jobs.json]

Reads the full private tracker (from the Career OS dashboard) and writes only
what is safe to show publicly. Left out on purpose: notes, interview dates and
status details, history, preparation, applied/follow-up dates, and any role
that was rejected, withdrawn or has closed.
"""
import json, re, sys, datetime

MONTHS = {m: i for i, m in enumerate(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'], 1)}

def iso_added(a):
    a = str(a or '').strip()
    if re.match(r'before', a, re.I):
        return ''
    if re.match(r'^20\d\d-\d\d-\d\d', a):
        return a[:10]
    m = re.search(r'(\d{1,2}) (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (20\d\d)', a, re.I)
    if m:
        return '%s-%02d-%02d' % (m.group(3), MONTHS[m.group(2).lower()], int(m.group(1)))
    return ''

def sp_kind(s):
    s = s or ''
    return 'ok' if s.startswith('✅') else 'warn' if s.startswith('⚠') else 'unk'

def public_stage(r):
    st = r.get('interview_status') or ''
    if r.get('stage') == 'Closed' or re.match(r'rejected', st, re.I) or re.match(r'withdrawn', r.get('submission') or '', re.I) or re.search(r'declined', st, re.I):
        return None
    if re.search(r'offer', st, re.I):
        return 'Offer'
    if r.get('stage') == 'Interview stage':
        return 'Interview'
    if r.get('stage') == 'Applied' or r.get('submission') == 'Submitted':
        return 'Applied'
    return 'To apply'

def clean_sponsor(s):
    s = re.sub(r'^[^A-Za-z0-9]+', '', s or '').strip()
    return s[:220]

def main():
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else 'data/jobs.json'
    rows = json.load(open(src, encoding='utf-8'))
    if isinstance(rows, dict):
        rows = rows.get('rows') or rows.get('data') or []
    pub = []
    for r in rows:
        stg = public_stage(r)
        if not stg:
            continue
        deadline = r.get('deadline') or ''
        if stg == 'To apply' and deadline and deadline < datetime.date.today().isoformat():
            continue
        pub.append({
            'id': r.get('id'),
            'organisation': r.get('organisation') or '',
            'role': r.get('role') or '',
            'stage': stg,
            'watchlist': (r.get('sponsorship') or '').startswith('❔'),
            'sector': r.get('sector') or '',
            'location': r.get('location') or '',
            'salary': '' if re.search(r'not stated', r.get('salary') or '', re.I) else (r.get('salary') or ''),
            'deadline': deadline,
            'deadline_text': r.get('deadline_text') or '',
            'sponsorship': sp_kind(r.get('sponsorship')),
            'sponsorship_note': clean_sponsor(r.get('sponsorship')),
            'fit': r.get('fit') or '',
            'fit_reason': r.get('fit_reason') or '',
            'focus': r.get('jd_focus') or '',
            'url': r.get('url') if re.match(r'^https?://', r.get('url') or '') else '',
            'added': iso_added(r.get('added')),
            'new': str(r.get('id') or '').startswith('N'),
        })
    doc = {'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'rows': pub}
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print('wrote %d of %d roles to %s' % (len(pub), len(rows), out))

if __name__ == '__main__':
    main()
