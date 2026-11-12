dash.calc('events', {
inputs: ['jobs'], title: 'Schedule events',
description: 'Dated interviews, interviews still to be dated, application deadlines and follow-ups, with days from today.',
fn: (jobs) => {
const M = {jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11};
const n = new Date(), t0 = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const parse = (s) => { const m = String(s || '').match(/([0-9]{1,2}) (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (20[0-9][0-9])(?:,? ([0-9]{1,2}):([0-9]{2}))?/i); return m ? {ms: Date.UTC(Number(m[3]), M[m[2].toLowerCase()], Number(m[1])), time: m[4] ? m[4].padStart(2, '0') + ':' + m[5] : ''} : null; };
const out = [];
for (const r of jobs) {
const st = r.interview_status || '', base = {id: r.id, org: r.organisation, role: r.role, status: st};
if (r.stage === 'Interview stage' && !/offer/i.test(st)) {
const p = parse(r.interview_datetime);
if (p && !/^interviewed/i.test(st)) out.push(Object.assign({type: 'interview', date: day(p.ms), days: Math.round((p.ms - t0) / 864e5), time: p.time, where: (String(r.interview_datetime).split('—')[1] || '').trim()}, base));
else if (!p && !/^interviewed/i.test(st)) out.push(Object.assign({type: 'tbc', date: '', days: null, time: '', where: ''}, base));
}
if (r.submission === 'Not started' && r.deadline && r.stage !== 'Closed') out.push(Object.assign({type: 'deadline', date: r.deadline, days: Math.round((Date.parse(r.deadline + 'T00:00:00Z') - t0) / 864e5), time: '', where: r.location || ''}, base));
if (r.follow_up && r.stage === 'Applied') out.push(Object.assign({type: 'follow', date: r.follow_up, days: Math.round((Date.parse(r.follow_up + 'T00:00:00Z') - t0) / 864e5), time: '', where: ''}, base));
}
return out.sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999) || (a.time || '99').localeCompare(b.time || '99'));
},
});
dash.calc('conflicts', {
inputs: ['events'], title: 'Interview clashes',
description: 'Pairs of upcoming interviews on the same day less than four hours apart.',
fn: (events) => {
const iv = events.filter((e) => e.type === 'interview' && e.days != null && e.days >= 0 && e.time);
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const out = [];
for (let i = 0; i < iv.length; i++) for (let j = i + 1; j < iv.length; j++) {
const a = iv[i], b = iv[j];
if (a.date === b.date && Math.abs(mins(a.time) - mins(b.time)) < 240) out.push({date: a.date, days: a.days, gap: Math.abs(mins(a.time) - mins(b.time)), a_id: a.id, a_org: a.org, a_time: a.time, a_where: a.where, b_id: b.id, b_org: b.org, b_time: b.time, b_where: b.where});
}
return out;
},
});
dash.calc('priorities', {
inputs: ['jobs', 'events', 'conflicts'], title: 'Priority actions',
description: 'What needs doing, most urgent first: clashes, interviews today or tomorrow, closing deadlines, dates to get, outcomes to record and follow-ups.',
fn: (jobs, events, conflicts) => {
const out = [];
for (const c of conflicts) out.push({rank: 0, tone: 'red', title: 'Resolve interview clash', sub: c.a_org + ' ' + c.a_time + ' and ' + c.b_org + ' ' + c.b_time + ' on the same day', id: c.a_id, when: c.days === 0 ? 'Today' : c.days === 1 ? 'Tomorrow' : 'In ' + c.days + ' days'});
for (const e of events) {
const where = e.where ? ' · ' + e.where : '';
if (e.type === 'interview' && e.days >= 0 && e.days <= 1) out.push({rank: 1, tone: 'red', title: 'Interview ' + (e.days ? 'tomorrow' : 'today') + ': ' + e.org, sub: e.role + (e.time ? ' · ' + e.time : '') + where, id: e.id, when: e.time || (e.days ? 'Tomorrow' : 'Today')});
else if (e.type === 'interview' && e.days > 1 && e.days <= 7) out.push({rank: 4, tone: 'amber', title: 'Prepare for interview: ' + e.org, sub: e.role + where, id: e.id, when: 'In ' + e.days + ' days'});
else if (e.type === 'interview' && e.days < 0 && /^interview (booked|invited)/i.test(e.status)) out.push({rank: 3, tone: 'amber', title: 'Record the interview outcome: ' + e.org, sub: e.role, id: e.id, when: 'Overdue'});
else if (e.type === 'deadline' && e.days >= 0 && e.days <= 2) out.push({rank: 2, tone: 'red', title: 'Apply: ' + e.org, sub: e.role, id: e.id, when: e.days === 0 ? 'Closes today' : 'Closes in ' + e.days + (e.days === 1 ? ' day' : ' days')});
else if (e.type === 'deadline' && e.days > 2 && e.days <= 7) out.push({rank: 5, tone: 'amber', title: 'Apply: ' + e.org, sub: e.role, id: e.id, when: 'Closes in ' + e.days + ' days'});
else if (e.type === 'tbc') out.push({rank: 3, tone: 'amber', title: 'Get the interview date: ' + e.org, sub: e.role + ' · ' + (e.status || 'Invited'), id: e.id, when: 'Date TBC'});
else if (e.type === 'follow' && e.days <= 0) out.push({rank: 4, tone: 'purple', title: 'Follow up: ' + e.org, sub: e.role, id: e.id, when: e.days === 0 ? 'Due today' : 'Overdue ' + -e.days + 'd'});
}
for (const r of jobs) if (r.stage === 'Interview stage' && /offer/i.test(r.interview_status || '')) out.push({rank: 1, tone: 'gold', title: 'Respond to the offer: ' + r.organisation, sub: r.role, id: r.id, when: 'Offer'});
return out.sort((a, b) => a.rank - b.rank);
},
});
dash.calc('summary', {
inputs: ['jobs', 'events', 'conflicts', 'priorities'], title: 'Headline counts',
description: 'Roles tracked, applications, interviews, the next seven days, clashes, follow-ups, sponsorship tiers among open roles and response rates.',
fn: (jobs, events, conflicts, priorities) => {
const sub = jobs.filter((r) => r.submission === 'Submitted');
const iv = jobs.filter((r) => r.stage === 'Interview stage').length;
const rej = jobs.filter((r) => /^rejected/i.test(r.interview_status || '')).length;
const open = jobs.filter((r) => r.stage === 'To apply' || r.stage === 'Watchlist — verify licence');
const k = (r) => (r.sponsorship || '').startsWith('✅') ? 'ok' : (r.sponsorship || '').startsWith('⚠') ? 'warn' : 'unk';
return [
{metric: 'total', n: jobs.length},
{metric: 'applied', n: sub.length},
{metric: 'interviews', n: iv},
{metric: 'iv7', n: events.filter((e) => e.type === 'interview' && e.days >= 0 && e.days <= 7).length},
{metric: 'conflicts', n: conflicts.length},
{metric: 'closing7', n: events.filter((e) => e.type === 'deadline' && e.days >= 0 && e.days <= 7).length},
{metric: 'followups', n: events.filter((e) => e.type === 'follow' && e.days <= 0).length},
{metric: 'actions', n: priorities.length},
{metric: 'new', n: jobs.filter((r) => r.id.startsWith('N')).length},
{metric: 'shortlist', n: jobs.filter((r) => r.stage === 'To apply' && k(r) !== 'unk').length},
{metric: 'sp_ok', n: open.filter((r) => k(r) === 'ok').length},
{metric: 'sp_warn', n: open.filter((r) => k(r) === 'warn').length},
{metric: 'sp_unk', n: open.filter((r) => k(r) === 'unk').length},
{metric: 'rate', n: sub.length ? iv / sub.length : 0},
{metric: 'response', n: sub.length ? (iv + rej) / sub.length : 0},
{metric: 'rejected', n: rej},
{metric: 'today_new', n: jobs.filter((r) => { const a = String(r.added || ''), t = new Date(), iso = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())).toISOString().slice(0, 10); const long = t.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getMonth()] + ' ' + t.getFullYear(); return a.slice(0, 10) === iso || a === long; }).length},
];
},
});
dash.calc('pipeline', {
inputs: ['jobs'], title: 'Pipeline', description: 'Roles in each pipeline column: to apply, applied, interview, offer, rejected or closed.',
fn: (jobs) => {
const col = (r) => r.stage === 'Closed' ? 'closed' : /offer/i.test(r.interview_status || '') ? 'offer' : r.stage === 'Interview stage' ? 'interview' : r.stage === 'Applied' ? 'applied' : 'apply';
return [['apply', 'To apply'], ['applied', 'Applied'], ['interview', 'Interview'], ['offer', 'Offer'], ['closed', 'Rejected / closed']].map(([c, label]) => ({col: c, label, n: jobs.filter((r) => col(r) === c).length}));
},
});
dash.calc('funnel', {
inputs: ['jobs'], title: 'Conversion funnel', description: 'Roles tracked, applications sent, roles that reached interview and offers.',
fn: (jobs) => [
{step: 'Tracked', n: jobs.length},
{step: 'Applied', n: jobs.filter((r) => r.submission === 'Submitted').length},
{step: 'Interview', n: jobs.filter((r) => r.stage === 'Interview stage').length},
{step: 'Offer', n: jobs.filter((r) => /offer/i.test(r.interview_status || '')).length},
],
});
dash.calc('outcomes', {
inputs: ['jobs'], title: 'Application outcomes', description: 'Submitted or withdrawn applications by their latest outcome.',
fn: (jobs) => {
const o = (r) => /^withdrawn/i.test(r.submission || '') ? 'Withdrawn' : r.submission !== 'Submitted' ? null : /offer/i.test(r.interview_status || '') ? 'Offer' : /^rejected/i.test(r.interview_status || '') ? 'Rejected' : r.stage === 'Interview stage' ? 'Interview' : 'Awaiting response';
return ['Awaiting response', 'Interview', 'Offer', 'Rejected', 'Withdrawn'].map((label) => ({label, n: jobs.filter((r) => o(r) === label).length}));
},
});
dash.calc('bySector', {
inputs: ['jobs'], title: 'Interview rate by sector', description: 'Interview-stage roles divided by applications sent, per sector.',
fn: (jobs) => ['Non-university', 'University'].map((sector) => {
const a = jobs.filter((r) => r.sector === sector && r.submission === 'Submitted');
const i = a.filter((r) => r.stage === 'Interview stage');
return {sector, applied: a.length, interviews: i.length, rate: a.length ? i.length / a.length : 0};
}),
});
dash.calc('rejBy', {
inputs: ['jobs'], title: 'Rejections by role type', description: 'Rejected applications matched to role types by words in the job title.',
fn: (jobs) => {
const rej = jobs.filter((r) => /^rejected/i.test(r.interview_status || ''));
return [['Business / Systems Analyst', /analyst/i], ['Product Manager / Owner', /product/i], ['Project / Delivery / Change', /project|programme|delivery|change|transformation/i], ['Data / BI / AI', /data|insight|intelligence|automation|analytics/i], ['Implementation / CRM', /implementation|crm|salesforce|consultant/i]]
.map(([label, re]) => ({label, n: rej.filter((r) => re.test(r.role)).length}));
},
});
dash.calc('fitDist', {
inputs: ['jobs'], title: 'Fit distribution', description: 'Roles by fit score band; roles without a numeric score are left out.',
fn: (jobs) => {
const num = (f) => { const m = String(f || '').match(/([0-9]+(?:[.][0-9]+)?)/); if (!m) return null; const v = parseFloat(m[1]); return /[/]100/.test(f) || v > 10 ? v / 10 : v; };
const bands = [['Under 7', 0, 7], ['7–7.9', 7, 8], ['8–8.4', 8, 8.5], ['8.5–8.9', 8.5, 9], ['9+', 9, 11]];
return bands.map(([label, lo, hi]) => ({label, n: jobs.filter((r) => { const v = num(r.fit); return v != null && v >= lo && v < hi; }).length}));
},
});
dash.calc('salaryDist', {
inputs: ['jobs'], title: 'Salary range', description: 'Roles by the lowest advertised annual salary; day rates and unstated pay counted as Not stated.',
fn: (jobs) => {
const low = (s) => { s = String(s || ''); if (/day|hour|hr/i.test(s)) return null; const m = s.replace(/,/g, '').match(/£ ?([0-9]+(?:[.][0-9]+)?) ?(k)?/i); if (!m) return null; let v = Number(m[1]); if (m[2] || v < 1000) v *= 1000; return v; };
const bands = [['<£45k', 0, 45000], ['£45–55k', 45000, 55000], ['£55–65k', 55000, 65000], ['£65k+', 65000, 1e9]];
const out = bands.map(([label, lo, hi]) => ({label, n: jobs.filter((r) => { const v = low(r.salary); return v != null && v >= lo && v < hi; }).length}));
out.push({label: 'Not stated', n: jobs.filter((r) => low(r.salary) == null).length});
return out;
},
});
dash.calc('byFamily', {
inputs: ['jobs'], title: 'Roles by type', description: 'Roles matched to role types by words in the job title.',
fn: (jobs) => [
['Business / Systems Analyst', /analyst|business architect/i], ['Product Manager', /product manager|head of product|product lead|product and service owner/i],
['Product Owner', /product owner/i], ['Project / Delivery / Change', /project|programme|delivery|change|transformation|scrum/i],
['Data / BI / AI', /data|insight|intelligence|[^a-z]bi[^a-z]|[^a-z]ai[^a-z]|automation|analytics/i], ['Implementation / CRM', /implementation|deployment|crm|salesforce|consultant|systems specialist/i],
].map(([label, re]) => ({label, n: jobs.filter((r) => re.test(' ' + r.role + ' ')).length})).sort((a, b) => b.n - a.n),
});
dash.calc('byRegion', {
inputs: ['jobs'], title: 'Roles by region', description: 'Roles matched to regions by place names in the location.',
fn: (jobs) => [
['London', /london|farringdon|waterloo|docklands|canary wharf/i], ['North & Yorkshire', /sheffield|leeds|manchester|york|bradford|hull|durham|lancaster|preston|chester|newcastle|liverpool|northallerton|knutsford|blackpool|barnsley|rotherham|salford|horsforth/i],
['Midlands', /birmingham|nottingham|leicester|lutterworth|northampton|milton keynes|coventry|derby/i], ['South & East', /oxford|bath|bristol|reading|bognor|swindon|gloucester|watford|cambridge|hove|woking|norwich|egham|uxbridge/i],
['Scotland', /glasgow|edinburgh|st andrews|scotland|dundee|aberdeen/i], ['Wales', /cardiff|swansea|wales|llandaff/i], ['Remote / multi-site', /remote|multi-location|united kingdom|^uk( |$)|uk [/]/i],
].map(([label, re]) => ({label, n: jobs.filter((r) => re.test(r.location || '')).length})).sort((a, b) => b.n - a.n),
});

(() => {
const CO = window.CO = {};
CO.os = window.os = {page: 'today', stage: '', q: '', sector: '', spons: '', fit: '', region: '', family: '', quick: '', orgtype: '', group: 'type', sort: 'deadline', dir: 1, sel: '', edit: false, draft: null};
CO.REG = {
london: /london|farringdon|waterloo|docklands|canary wharf/i, north: /sheffield|leeds|manchester|york|bradford|hull|durham|lancaster|preston|chester|newcastle|liverpool|northallerton|knutsford|blackpool|barnsley|rotherham|salford|horsforth/i,
midlands: /birmingham|nottingham|leicester|lutterworth|northampton|milton keynes|coventry|derby/i, south: /oxford|bath|bristol|reading|bognor|swindon|gloucester|watford|cambridge|hove|woking|norwich|egham|uxbridge/i,
scotland: /glasgow|edinburgh|st andrews|scotland|dundee|aberdeen/i, wales: /cardiff|swansea|wales|llandaff/i, remote: /remote|multi-location|united kingdom|^uk( |$)|uk [/]/i,
};
CO.FAM = {
pm: /product manager|head of product|product lead|product and service owner/i, po: /product owner/i, ba: /analyst|business architect/i,
delivery: /project|programme|delivery|change|transformation|scrum/i, data: /data|insight|intelligence|[^a-z]bi[^a-z]|[^a-z]ai[^a-z]|automation|analytics/i, impl: /implementation|deployment|crm|salesforce|consultant|systems specialist/i,
};
const M = {jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11};
CO.el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
CO.svgEl = (t, a) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const k in a) e.setAttribute(k, a[k]); return e; };
CO.failBox = (h) => h.append(CO.el('div', 'fail', 'Failed to load'));
CO.pct = d3.format('.0%');
CO.fitNum = (f) => { const m = String(f || '').match(/([0-9]+(?:[.][0-9]+)?)/); if (!m) return null; const v = parseFloat(m[1]); return /[/]100/.test(f) || v > 10 ? v / 10 : v; };
CO.spKind = (s) => (s || '').startsWith('✅') ? 'ok' : (s || '').startsWith('⚠') ? 'warn' : 'unk';
CO.SP = {ok: ['Confirmed in advert', 'green'], warn: ['Licensed, not confirmed', 'blue'], unk: ['Licence unknown', 'amber']};
CO.COLS = {apply: ['To apply', 'blue'], applied: ['Applied', 'purple'], interview: ['Interview', 'green'], offer: ['Offer', 'gold'], closed: ['Closed', 'grey']};
CO.colOf = (r) => r.stage === 'Closed' ? 'closed' : /offer/i.test(r.interview_status || '') ? 'offer' : r.stage === 'Interview stage' ? 'interview' : r.stage === 'Applied' ? 'applied' : 'apply';
CO.plain = (a) => (a || '').replace(/^[^A-Za-z0-9]+/, '');
CO.isUrl = (u) => /^https?:[/][/]/.test(u || '');
CO.todayUtc = () => { const n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); };
CO.todayIso = () => new Date(CO.todayUtc()).toISOString().slice(0, 10);
CO.addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
CO.daysTo = (iso) => (iso ? Math.round((Date.parse(iso + 'T00:00:00Z') - CO.todayUtc()) / 864e5) : null);
CO.fmtDay = (v) => d3.utcFormat('%a %-d %b')(typeof v === 'number' ? new Date(v) : new Date(v + 'T00:00:00Z'));
CO.ivParse = (s) => { const m = String(s || '').match(/([0-9]{1,2}) (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (20[0-9][0-9])(?:,? ([0-9]{1,2}):([0-9]{2}))?/i); return m ? {ms: Date.UTC(Number(m[3]), M[m[2].toLowerCase()], Number(m[1])), time: m[4] ? m[4].padStart(2, '0') + ':' + m[5] : ''} : null; };
const HUES = ['#3b6fd8', '#12a28c', '#7c5cd6', '#d4703a', '#c2417a', '#2f8fbf', '#5b8c2a', '#b5672a', '#0f7c90', '#8a6d1c'];
CO.hue = (s) => { let h = 7; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 9973; return HUES[h % HUES.length]; };
CO.initials = (s) => { const w = String(s || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(' ').filter((x) => x && !/^(of|the|and|for|uk|ltd|plc|group|limited|via)$/i.test(x)); return (((w[0] || '?')[0]) + ((w[1] || '')[0] || '')).toUpperCase(); };
CO.av = (org, cls) => { const a = CO.el('div', 'av' + (cls ? ' ' + cls : ''), CO.initials(org)); const h = CO.hue(org); a.style.background = 'linear-gradient(135deg, ' + h + ', color-mix(in srgb, ' + h + ' 65%, #0f2537))'; return a; };
CO.fitColor = (f) => f == null ? 'var(--color-fg-muted)' : f >= 8.5 ? 'var(--acc)' : f >= 7.5 ? 'var(--c1)' : 'var(--color-warn)';
CO.norm = (r) => {
if (typeof r.history !== 'string' && typeof r.prep !== 'string') return r;
const o = Object.assign({}, r);
for (const k of ['history', 'prep']) if (typeof o[k] === 'string') { try { const v = JSON.parse(o[k]); o[k] = Array.isArray(v) ? v : []; } catch (e) { o[k] = []; } }
return o;
};
CO.addedIso = (r) => { const a = String(r.added || ''); if (/^20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]/.test(a)) return a.slice(0, 10); const p = CO.ivParse(a); return p ? new Date(p.ms).toISOString().slice(0, 10) : ''; };
CO.sub = (r) => {
const c = CO.colOf(r), st = r.interview_status || '', rd = Number(r.round) > 1 ? 'Round ' + r.round + ' · ' : '';
if (c === 'interview') { const p = CO.ivParse(r.interview_datetime); return rd + (/^interviewed/i.test(st) ? 'Awaiting outcome' : /^task/i.test(st) ? 'Task stage' : p ? (Math.round((p.ms - CO.todayUtc()) / 864e5) < 0 ? 'Outcome to record' : 'Booked') : 'Invited, date TBC'); }
if (c === 'offer') return /accepted/i.test(st) ? 'Accepted' : 'Offer received';
if (c === 'applied') return r.follow_up && CO.daysTo(r.follow_up) <= 0 ? 'Follow-up due' : 'Awaiting reply';
if (c === 'closed') return /^rejected/i.test(st) ? 'Rejected' : /declined/i.test(st) ? 'Offer declined' : /^withdrawn/i.test(r.submission || '') ? (r.applied_on || /interview|offer|awaiting/i.test(st) ? 'Withdrawn' : 'Not applying') : 'Deadline passed';
if ((r.sponsorship || '').startsWith('❔')) return 'Watchlist';
return 'Not applied yet';
};
CO.ORGS = ['University & HE', 'NHS & health', 'Council', 'Government & public bodies', 'Schools & colleges', 'Edtech & HE suppliers', 'Charity & housing', 'Banks & finance', 'Consultancy, legal & recruitment', 'Other companies'];
const ORG_RE = [
['NHS & health', /[^a-z]nhs[^a-z]|hospital|ambulance|integrated care|[^a-z]icb[^a-z]|health board|healthcare trust|mental health|community health/i],
['Council', /council|borough|combined authority|county hall|[^a-z]gla[^a-z]|greater london authority/i],
['Government & public bodies', /department for|ministry|[^a-z]dwp[^a-z]|hmrc|home office|cabinet office|civil service|government|[^a-z]gds[^a-z]|bank of england|british business bank|genomics england|police|fire and rescue|dvla|ofsted|ofgem|ofcom|ofwat|met office|[^a-z]hm [a-z]|agency|parliament|national audit|land registry|companies house|ordnance survey/i],
['University & HE', /universit|higher education|[^a-z]ucl[^a-z]|imperial college|king.s college|london school of|[^a-z]lse[^a-z]|uwtsd|[^a-z]jisc[^a-z]|[^a-z]ucas[^a-z]|institute of technology/i],
['Schools & colleges', /academy trust|academies|multi.academy|[^a-z]mat[^a-z]|school|sixth form|further education|college/i],
['Edtech & HE suppliers', /tribal|tes global|planet education|pen group|ellucian|unit4|edtech|studyportals|kortext|anthology|blackboard|instructure|pearson/i],
['Charity & housing', /charity|housing association|housing group|[^a-z]homes[^a-z]|[^a-z]cic[^a-z]|foundation[^a-z]*$/i],
['Banks & finance', /bank|building society|insur|aviva|barclays|lloyds|natwest|hsbc|santander|nationwide|lendable|experian|equifax|flywire|yapily|taptap|incard|teya|payment|fintech|credit|capital|finance|wise[^a-z]|monzo|revolut|starling|zopa/i],
['Consultancy, legal & recruitment', /consult|capgemini|accenture|deloitte|[^a-z]pwc[^a-z]|kpmg|[^a-z]ey[^a-z]|robert walters|morgan mckinley|investigo|[^a-z]fdm[^a-z]|netcompany|alten|advania|lorien|recruit|scrumconnect|hays|freshfields|dla piper|solicitor|[^a-z]law[^a-z]|[^a-z]llp[^a-z]|via [a-z]/i],
];
CO.orgType = (r) => {
if (r.org_type && CO.ORGS.includes(r.org_type)) return r.org_type;
const txt = ' ' + [r.organisation, r.legal_entity].join(' ') + ' ';
for (const [k, re] of ORG_RE) if (re.test(txt)) return k;
if (r.sector === 'University') return 'University & HE';
return 'Other companies';
};
CO.label = (r) => CO.COLS[CO.colOf(r)][0] + ' · ' + CO.sub(r);
CO.actions = (r) => {
const c = CO.colOf(r), st = r.interview_status || '', today = CO.todayIso();
const p = CO.ivParse(r.interview_datetime), n = p ? Math.round((p.ms - CO.todayUtc()) / 864e5) : null;
const ivBase = Object.assign({}, CO.moveTo(r, 'interview'));
const rej = {l: '✗ Rejected', p: {interview_status: 'Rejected'}, w: 'Rejected'};
const wd = {l: 'Withdraw', p: {submission: 'Withdrawn'}, w: 'Withdrew the application', ghost: true};
if (c === 'apply') return [{l: '✓ I applied today', p: CO.moveTo(r, 'applied'), w: 'Applied · follow-up set for ' + CO.fmtDay(CO.addDays(today, 10)), pri: true}, {l: 'Not applying', p: {submission: 'Withdrawn'}, w: 'Not applying', ghost: true}];
if (c === 'applied') return [{l: '📅 Got an interview invite', form: true, base: Object.assign(ivBase, {interview_status: 'Interview invited', interview_datetime: 'TBC'}), w: 'Invited to interview', pri: true}, {l: '↻ I followed up', p: {follow_up: CO.addDays(today, 7)}, w: 'Followed up · next follow-up ' + CO.fmtDay(CO.addDays(today, 7))}, rej, wd];
if (c === 'interview') {
if (/^interviewed/i.test(st)) return [{l: '🎉 Offer received', p: {interview_status: 'Offer received'}, w: 'Offer received', pri: true}, {l: '➜ Invited to next round', form: true, base: {interview_status: 'Interview invited', interview_datetime: 'TBC', round: (Number(r.round) || 1) + 1}, w: 'Invited to round ' + ((Number(r.round) || 1) + 1)}, rej, wd];
const done = {l: '✓ Interview done', p: {interview_status: 'Interviewed — awaiting outcome'}, w: 'Interview done · awaiting outcome', pri: n != null && n <= 0};
const date = {l: p ? '📅 Change date or time' : '📅 Set interview date', form: true, base: {interview_status: 'Interview booked'}, w: p ? 'Interview moved' : 'Interview booked', pri: !p};
return n != null && n <= 0 ? [done, date, rej, wd] : [date, done, rej, wd];
}
if (c === 'offer') return /accepted/i.test(st) ? [{l: 'Undo acceptance', p: {interview_status: 'Offer received'}, w: 'Offer back to received', ghost: true}] : [{l: '✓ Accept the offer', p: {interview_status: 'Offer accepted'}, w: 'Offer accepted', pri: true}, {l: 'Decline the offer', p: {interview_status: 'Offer declined', submission: 'Withdrawn'}, w: 'Offer declined', ghost: true}];
return [{l: '↺ Reopen', p: r.applied_on || /interview|offer|rejected/i.test(st) ? {submission: 'Submitted', interview_status: 'Awaiting response'} : {submission: 'Not started', interview_status: '—'}, w: 'Reopened', ghost: true}];
};

CO.next = (r) => {
const c = CO.colOf(r), st = r.interview_status || '';
if (c === 'closed') return {t: /^rejected/i.test(st) ? 'Not taken forward' : /^withdrawn/i.test(r.submission || '') ? 'Withdrawn' : 'Closed', s: CO.plain(r.alert), u: 'grey', k: 9e6};
if (c === 'offer') return {t: 'Respond to the offer', s: st, u: 'gold', k: -1};
if (c === 'interview') {
const p = CO.ivParse(r.interview_datetime), where = (String(r.interview_datetime || '').split('—')[1] || '').trim();
if (/^interviewed/i.test(st)) return {t: 'Chase the outcome', s: p ? 'Interviewed ' + CO.fmtDay(p.ms) : st, u: 'blue', k: 20};
if (p) {
const n = Math.round((p.ms - CO.todayUtc()) / 864e5);
if (n >= 0) return {t: (n === 0 ? 'Interview today' : n === 1 ? 'Interview tomorrow' : 'Interview ' + CO.fmtDay(p.ms)) + (p.time ? ' · ' + p.time : ''), s: where || st, u: n <= 1 ? 'red' : n <= 7 ? 'amber' : 'green', k: n};
if (/^interview (booked|invited)/i.test(st)) return {t: 'Record the outcome', s: 'Interview was ' + CO.fmtDay(p.ms), u: 'amber', k: 2.6};
return {t: 'Chase the outcome', s: 'Interviewed ' + CO.fmtDay(p.ms), u: 'blue', k: 20};
}
if (/^interviewed/i.test(st)) return {t: 'Chase the outcome', s: st, u: 'blue', k: 20};
return {t: 'Get the interview date', s: st || 'Invited', u: 'amber', k: 2.5};
}
if (c === 'applied') {
const n = CO.daysTo(r.follow_up);
if (n != null && n <= 0) return {t: 'Follow up now', s: n === 0 ? 'Due today' : 'Was due ' + CO.fmtDay(r.follow_up), u: 'purple', k: 3 + n / 1000};
if (n != null) return {t: 'Follow up ' + CO.fmtDay(r.follow_up), s: r.applied_on ? 'Applied ' + CO.fmtDay(r.applied_on) : 'Awaiting response', u: 'blue', k: 10 + n};
return {t: 'Awaiting response', s: r.applied_on ? 'Applied ' + CO.fmtDay(r.applied_on) : 'Submitted', u: 'blue', k: 30};
}
if ((r.sponsorship || '').startsWith('❔')) return {t: 'Verify the sponsor licence', s: 'Watchlist', u: 'amber', k: 40};
const n = CO.daysTo(r.deadline);
if (n == null) return {t: 'Apply — no deadline', s: r.deadline_text && !/^(open|—|not advertised)$/i.test(r.deadline_text) ? r.deadline_text : 'Open until filled', u: 'green', k: 50};
if (n < 0) return {t: 'Deadline passed', s: CO.fmtDay(r.deadline), u: 'grey', k: 9e5};
return {t: n === 0 ? 'Apply today' : 'Apply by ' + CO.fmtDay(r.deadline), s: n === 0 ? 'Closes today' : n + (n === 1 ? ' day left' : ' days left'), u: n <= 2 ? 'red' : n <= 7 ? 'amber' : 'blue', k: n};
};

const SIG = [['Product management', /product (manag|owner|lead|strategy)|roadmap|discovery/i], ['Business analysis', /business analy|requirement|process|systems analy|user stor/i], ['Higher education & edtech', /universit|higher education|student|edtech|education|college|academic|school/i], ['CRM & integrations', /crm|salesforce|integration|[^a-z]api|sits|banner|dynamics|erp/i], ['Data & BI', /data|power bi|sql|analytics|insight|reporting|dashboard|[^a-z]bi[^a-z]/i], ['AI & automation', /[^a-z]ai[^a-z]|automation|machine learning|llm|genai/i], ['Delivery & change', /project|programme|delivery|change|transformation|agile|scrum/i], ['SaaS & implementation', /saas|implementation|onboarding|deployment|platform|solution/i], ['Payments & fintech', /payment|fintech|bank|finance|insurance|lending/i]];
CO.fitWhy = (r) => {
const txt = ' ' + [r.role, r.jd_focus, r.notes].join(' ') + ' ';
return {
hits: SIG.filter((s) => s[1].test(txt)).map((s) => s[0]),
gaps: String(r.notes || '').split(/[.;]/).map((s) => s.trim()).filter((s) => /gap|lack|no direct|not yet|missing|would need|stretch|less direct/i.test(s)).slice(0, 3),
reason: r.fit_reason || '',
};
};
CO.PREP = ['Research the organisation and team', 'Map the job description to your SAMS and Shikho evidence', 'Prepare the presentation or task', 'Rehearse five or six STAR examples', 'Prepare questions for the panel', 'Confirm time, place or link and travel', 'Send a thank-you note afterwards'];

CO.recompute = (r) => {
const st = r.interview_status || '', iv = r.interview_datetime || '';
const p = CO.ivParse(iv), dd = p ? Math.round((p.ms - CO.todayUtc()) / 864e5) : null;
const booked = /^interview (booked|invited)/i.test(st);
let a;
if (/^withdrawn/i.test(r.submission || '')) a = '⚫ Withdrawn';
else if (booked && dd != null && dd >= 0 && dd <= 1) a = dd === 0 ? '🔴 Interview today' : '🔴 Interview tomorrow';
else if (booked && dd != null && dd < 0) a = '🟠 Update interview outcome';
else if (/^rejected/i.test(st)) a = '⚫ Closed — rejected';
else if (/offer accepted/i.test(st)) a = '🟢 Offer accepted';
else if (/offer/i.test(st)) a = '🟢 Offer — respond';
else if (r.submission === 'Not started') {
if (!r.deadline) a = /^closed/i.test(r.deadline_text || '') ? '⚫ Deadline passed' : '🟢 Open — no deadline';
else { const n = CO.daysTo(r.deadline); a = n < 0 ? '⚫ Deadline passed' : n <= 2 ? '🔴 Closes in ' + n + (n === 1 ? ' day' : ' days') : n <= 7 ? '🟠 Closes in ' + n + ' days' : '🟡 Closes in ' + n + ' days'; }
} else if (/TBC/i.test(iv) || (booked && !iv)) a = '🟠 Get interview date';
else if (/^interviewed/i.test(st)) a = '🔵 Chase outcome';
else if (booked) a = '🔵 Interview booked';
else if (r.follow_up && CO.daysTo(r.follow_up) <= 0) a = '🟠 Follow up';
else a = '🔵 Awaiting response';
r.alert = a;
r.stage = /^rejected/i.test(st) || /^withdrawn/i.test(r.submission || '') ? 'Closed' : /interview|offer/i.test(st) || /^task/i.test(st) ? 'Interview stage' : r.submission === 'Submitted' ? 'Applied' : a.startsWith('⚫') ? 'Closed' : (r.sponsorship || '').startsWith('❔') ? 'Watchlist — verify licence' : 'To apply';
return r;
};
CO.moveTo = (r, col, how) => {
const st = r.interview_status || '—', today = CO.todayIso();
const applied = {submission: 'Submitted', applied_on: r.applied_on || today};
if (col === 'apply') return {submission: 'Not started', interview_status: '—'};
if (col === 'applied') return Object.assign(applied, {interview_status: 'Awaiting response', follow_up: r.follow_up || CO.addDays(today, 10)});
if (col === 'interview') return Object.assign(applied, {interview_status: /interview|task/i.test(st) && !/offer/i.test(st) ? st : 'Interview invited', interview_datetime: r.interview_datetime || 'TBC'});
if (col === 'offer') return Object.assign(applied, {interview_status: 'Offer received'});
if (col === 'closed') return how === 'withdrawn' || r.submission !== 'Submitted' ? {submission: 'Withdrawn'} : {interview_status: 'Rejected'};
return {};
};

const LOCAL = CO.LOCAL = {}, SAVING = CO.SAVING = {}, ERR = CO.ERR = {}, VER = {};
CO.status = {saving: false, error: '', at: ''};
CO.ov = (r) => (LOCAL[r.id] ? Object.assign({}, r, LOCAL[r.id]) : r);
CO.jobsNow = () => {
const src = dash.data('jobs');
if (src.status !== 'ok') return src;
const ids = new Set(src.data.map((x) => x.id));
for (const id of Object.keys(LOCAL)) {
const r = src.data.find((x) => x.id === id);
if (r && !SAVING[id] && Object.keys(LOCAL[id]).every((k) => k === '__new' || JSON.stringify(r[k]) === JSON.stringify(LOCAL[id][k]))) delete LOCAL[id];
}
const rows = src.data.map((r) => CO.ov(CO.norm(r)));
for (const id of Object.keys(LOCAL)) if (!ids.has(id) && LOCAL[id].__new) rows.push(LOCAL[id]);
return {status: 'ok', data: rows};
};
CO.find = (id) => { const d = CO.jobsNow(); return d.status === 'ok' ? d.data.find((r) => r.id === id) : null; };

let capsP = null;
CO.caps = () => {
if (capsP) return capsP;
const p = (async () => {
try {
if (!window.claude || typeof window.claude.use !== 'function') return null;
const [db, assets, user] = await Promise.all([window.claude.use('db'), window.claude.use('assets'), window.claude.use('user')]);
if (!db || !assets) return null;
try { if (user && typeof user.canEdit === 'function' && (await user.canEdit()) === false) return null; } catch (e) {}
return {db, assets};
} catch (e) { return null; }
})();
p.then((c) => { if (!c) capsP = null; });
capsP = p;
return p;
};
CO.meta = null;
CO.watchMeta = async () => {
try {
if (!window.claude || typeof window.claude.use !== 'function') return;
const db = await window.claude.use('db');
if (!db) return;
db.doc('datasets/jobs').onSnapshot((s) => {
const d = (s && s.exists && s.data()) || {};
CO.meta = {at: d.updated && d.updated.at, by: d.updated && d.updated.by, url: d.source && d.source.url};
CO.redrawAll();
}, () => {});
} catch (e) {}
};
const errText = (e) => (e && (e.message || e.code)) || String(e || 'unknown error');
CO.publish = async (rows, by) => {
const c = await CO.caps();
if (!c) throw new Error('saving needs edit access to this dashboard');
const blob = new Blob([JSON.stringify(rows, null, 1)], {type: 'application/json'});
let up;
try { up = await c.assets.upload(blob, {type: 'application/json'}); } catch (e) { if (e && e.code === 'store_unavailable') { await new Promise((r) => setTimeout(r, 800)); up = await c.assets.upload(blob, {type: 'application/json'}); } else throw e; }
if (!up || !up.id) throw new Error('the upload returned no file');
await c.db.doc('datasets/jobs').update({source: {kind: 'file', url: '/_blob/' + up.id, name: 'tracker.json'}, updated: {at: new Date().toISOString(), by: by}});
try { dash.refresh('jobs'); } catch (e) {}
return up.id;
};
const clean = (r) => { const o = Object.assign({}, r); delete o.__new; return o; };
let timer = null, busy = false;
const flush = async () => {
if (busy) { schedule(500); return; }
const ids = Object.keys(SAVING).filter((k) => SAVING[k] === 'saving');
if (!ids.length) return;
const vers = {}; ids.forEach((k) => { vers[k] = VER[k]; });
busy = true; CO.status.saving = true; CO.redrawAll();
try {
const src = dash.data('jobs');
if (src.status !== 'ok') throw new Error('the roles have not loaded yet');
const have = new Set(src.data.map((x) => x.id));
const rows = src.data.map((r) => clean(CO.ov(CO.norm(r))));
for (const id of Object.keys(LOCAL)) if (!have.has(id) && LOCAL[id].__new) rows.push(clean(LOCAL[id]));
await CO.publish(rows, 'Adnan (updated on the dashboard)');
ids.forEach((k) => { if (VER[k] === vers[k]) SAVING[k] = 'saved'; });
CO.status.error = ''; CO.status.at = new Date().toISOString();
setTimeout(() => { ids.forEach((k) => { if (SAVING[k] === 'saved') delete SAVING[k]; }); CO.redrawAll(); }, 2500);
} catch (e) {
ids.forEach((k) => { if (VER[k] === vers[k]) { SAVING[k] = 'error'; ERR[k] = errText(e); } });
CO.status.error = errText(e);
}
busy = false; CO.status.saving = false; CO.redrawAll();
if (Object.keys(SAVING).some((k) => SAVING[k] === 'saving')) schedule(300);
};
const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(flush, ms == null ? 700 : ms); };
CO.retry = () => { Object.keys(SAVING).forEach((k) => { if (SAVING[k] === 'error') SAVING[k] = 'saving'; }); CO.status.error = ''; schedule(0); CO.redrawAll(); };
CO.lastSave = null;
const LABEL = {round: 'Round', submission: 'Submission', interview_status: 'Interview status', interview_datetime: 'Interview date', deadline: 'Deadline', fit: 'Fit', notes: 'Notes', applied_on: 'Applied on', follow_up: 'Follow-up', prep: 'Preparation'};
CO.saveRow = (r, patch, what, wait) => {
const prev = LOCAL[r.id] || {};
const base = Object.assign({}, r, prev);
const changed = Object.keys(patch).filter((k) => JSON.stringify(base[k] ?? '') !== JSON.stringify(patch[k] ?? ''));
if (!changed.length) return;
const desc = what || changed.map((k) => k === 'notes' || k === 'prep' ? LABEL[k] + ' updated' : (LABEL[k] || k) + ': ' + (patch[k] || '—')).join(' · ');
const hist = (Array.isArray(base.history) ? base.history.slice(-19) : []).concat([{at: new Date().toISOString(), what: desc}]);
const merged = CO.recompute(Object.assign({}, base, patch));
const undo = {}; changed.forEach((k) => { undo[k] = base[k] == null ? '' : base[k]; });
const was = CO.label(base), now = CO.label(merged);
CO.lastSave = {id: r.id, org: r.organisation, what: desc, from: was, to: now, next: CO.next(merged).t, undo: what === 'Undo' ? null : undo, at: Date.now()};
LOCAL[r.id] = Object.assign({}, prev, patch, {alert: merged.alert, stage: merged.stage, history: hist});
VER[r.id] = (VER[r.id] || 0) + 1;
SAVING[r.id] = 'saving'; delete ERR[r.id];
CO.redrawAll();
schedule(wait);
};
CO.addRows = (rows) => {
for (const r of rows) { LOCAL[r.id] = Object.assign({}, CO.recompute(Object.assign({}, r)), {__new: true}); VER[r.id] = (VER[r.id] || 0) + 1; SAVING[r.id] = 'saving'; }
CO.redrawAll(); schedule(0);
};
CO.restore = async (assetId) => {
const c = await CO.caps();
if (!c) throw new Error('restoring needs edit access to this dashboard');
await c.db.doc('datasets/jobs').update({source: {kind: 'file', url: '/_blob/' + assetId, name: 'tracker.json'}, updated: {at: new Date().toISOString(), by: 'Adnan (restored a backup)'}});
try { dash.refresh('jobs'); } catch (e) {}
};
CO.listBackups = async () => {
const c = await CO.caps();
if (!c || typeof c.assets.list !== 'function') return null;
const res = await c.assets.list();
return (res && res.assets || []).filter((a) => a.contentType === 'application/json' && a.sizeBytes > 20000).reverse();
};
CO.toCSV = (rows) => {
const cols = ['id', 'organisation', 'role', 'stage', 'alert', 'sector', 'location', 'salary', 'deadline', 'deadline_text', 'sponsorship', 'fit', 'submission', 'applied_on', 'follow_up', 'interview_status', 'interview_datetime', 'jd_focus', 'notes', 'url', 'source', 'added', 'legal_entity', 'last_verified'];
const DQ = String.fromCharCode(34), NL = String.fromCharCode(13, 10);
const q = (v) => { const s = Array.isArray(v) ? v.join('; ') : String(v == null ? '' : v); return DQ + s.split(DQ).join(DQ + DQ) + DQ; };
return [cols.join(',')].concat(rows.map((r) => cols.map((c) => q(r[c])).join(','))).join(NL);
};
CO.download = async (filename, text, type) => {
try {
if (window.claude && typeof window.claude.use === 'function') {
const dl = await window.claude.use('downloads');
if (dl) { await dl.save({filename: filename, data: text}); return 'saved'; }
}
} catch (e) { if (e && e.code === 'declined') return 'declined'; }
const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type: type})); a.download = filename; document.body.append(a); a.click(); a.remove();
return 'saved';
};
CO.redrawAll = () => {};
})();
