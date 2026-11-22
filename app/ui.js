(() => {
const CO = window.CO, os = CO.os, el = CO.el, svgEl = CO.svgEl;
const pill = (text, tone) => el('span', 'pill ' + (tone || ''), text);
const tipOn = (host, target, text) => {
target.addEventListener('mouseenter', () => {
const card = host.closest('.card'); if (!card) return;
let t = card.querySelector('.tip'); if (!t) { t = el('div', 'tip'); card.append(t); }
t.textContent = text; t.hidden = false;
const cr = card.getBoundingClientRect(), r = target.getBoundingClientRect();
t.style.left = Math.max(4, Math.min(cr.width - t.offsetWidth - 4, r.left - cr.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
t.style.top = Math.max(4, r.top - cr.top - t.offsetHeight - 6) + 'px';
});
target.addEventListener('mouseleave', () => { const c = host.closest('.card'); const t = c && c.querySelector('.tip'); if (t) t.hidden = true; });
};
const fitCell = (fit) => { const f = CO.fitNum(fit); const w = el('div', 'fitc'); w.append(el('b', null, f == null ? '—' : String(f))); const tr = el('div', 'tr'); const i = el('i'); i.style.width = (f == null ? 0 : Math.min(f, 10) * 10) + '%'; i.style.background = CO.fitColor(f); tr.append(i); w.append(tr); return w; };
const spPill = (r) => { const k = CO.spKind(r.sponsorship); return pill(CO.SP[k][0], CO.SP[k][1]); };
const colPill = (r) => { const c = CO.colOf(r); return pill(CO.COLS[c][0], CO.COLS[c][1]); };
const savePill = (id) => { const s = CO.SAVING[id]; if (!s) return null; return pill(s === 'saved' ? 'Saved ✓' : s === 'error' ? 'Not saved' : 'Saving…', s === 'saved' ? 'green' : s === 'error' ? 'red' : 'amber'); };
const lowSal = (s) => { s = String(s || ''); if (/day|hour|hr/i.test(s)) return 1; const m = s.replace(/,/g, '').match(/£ ?([0-9]+(?:[.][0-9]+)?) ?(k)?/i); if (!m) return 0; let v = Number(m[1]); if (m[2] || v < 1000) v *= 1000; return v; };

const QUICK = {
urgent: (r) => ['red', 'amber', 'gold', 'purple'].includes(CO.next(r).u),
follow: (r) => CO.colOf(r) === 'applied' && r.follow_up && CO.daysTo(r.follow_up) <= 0,
sponsored: (r) => CO.spKind(r.sponsorship) === 'ok',
fit8: (r) => (CO.fitNum(r.fit) ?? 0) >= 8,
new: (r) => r.id.startsWith('N'),
};
const pass = (r, noStage) => {
if (os.ids && !os.ids.includes(r.id)) return false;
if (!noStage && os.stage && CO.colOf(r) !== os.stage) return false;
if (os.quick && QUICK[os.quick] && !QUICK[os.quick](r)) return false;
if (os.sector && r.sector !== os.sector) return false;
if (os.spons && CO.spKind(r.sponsorship) !== os.spons) return false;
if (os.fit) { const f = CO.fitNum(r.fit); if (f == null || f < Number(os.fit)) return false; }
if (os.region && !CO.REG[os.region].test(r.location || '')) return false;
if (os.family && !CO.FAM[os.family].test(' ' + r.role + ' ')) return false;
if (os.orgtype && CO.orgType(r) !== os.orgtype) return false;
if (os.q) { const n = os.q.trim().toLowerCase(); if (n && !Object.values(r).join(' ').toLowerCase().includes(n)) return false; }
return true;
};
const ORDER = {apply: 1, applied: 2, interview: 0, offer: -1, closed: 9};
const SORTS = {
next: (a, b) => CO.next(a).k - CO.next(b).k,
org: (a, b) => a.organisation.localeCompare(b.organisation),
stage: (a, b) => ORDER[CO.colOf(a)] - ORDER[CO.colOf(b)],
loc: (a, b) => (a.location || '').localeCompare(b.location || ''),
salary: (a, b) => lowSal(b.salary) - lowSal(a.salary),
spons: (a, b) => ['ok', 'warn', 'unk'].indexOf(CO.spKind(a.sponsorship)) - ['ok', 'warn', 'unk'].indexOf(CO.spKind(b.sponsorship)),
fit: (a, b) => (CO.fitNum(b.fit) ?? -1) - (CO.fitNum(a.fit) ?? -1),
deadline: (a, b) => { const k = (r) => { const n = CO.daysTo(r.deadline), open = r.submission === 'Not started' && CO.colOf(r) === 'apply'; if (!open) return 2e5 + Math.min(CO.next(r).k, 9e4); return n == null ? 1e5 : n < 0 ? 3e5 - n : n; }; return k(a) - k(b); },
added: (a, b) => (b.id.startsWith('N') - a.id.startsWith('N')) || Number(b.id.replace(/[^0-9]/g, '')) - Number(a.id.replace(/[^0-9]/g, '')),
applied: (a, b) => (b.applied_on || (b.submission === 'Submitted' ? '0001' : '')).localeCompare(a.applied_on || (a.submission === 'Submitted' ? '0001' : '')),
interview: (a, b) => { const x = CO.ivParse(a.interview_datetime), y = CO.ivParse(b.interview_datetime); return (x ? x.ms : 9e15) - (y ? y.ms : 9e15); },
};
const rowsFor = (view, data) => {
const s = SORTS[os.sort] || SORTS.deadline, srt = (a, b) => os.dir * s(a, b) || SORTS.next(a, b);
if (view === 'shortlist') return data.filter((r) => r.stage === 'To apply' && CO.spKind(r.sponsorship) !== 'unk').sort(srt);
if (view === 'new') return data.filter((r) => r.id.startsWith('N')).sort(srt);
if (view === 'today') return data.filter((r) => CO.addedIso(r) === CO.todayIso()).sort(srt);
return data.filter((r) => pass(r)).sort(srt);
};
const trow = (r) => {
const n = CO.next(r);
const tr = el('tr'); tr.dataset.key = r.id; tr.tabIndex = 0; if (os.sel === r.id) tr.className = 'sel';
const c1 = el('td', 'c-role'); const rc = el('div', 'rc'); rc.append(CO.av(r.organisation)); const t = el('div'); t.append(el('span', 'o', r.organisation), el('span', 'r', r.role), el('span', 'ot', CO.orgType(r) + (Array.isArray(r.notes_log) && r.notes_log.length ? ' · 📝 ' + r.notes_log.length : '')));
const sp = savePill(r.id); if (sp) t.append(sp);
rc.append(t); c1.append(rc);
const c2 = el('td', 'nw'); const sg = el('div', 'stg'); const sl = el('div'); sl.append(colPill(r)); if (r.id.startsWith('N')) { sl.append(' '); sl.append(pill(CO.addedIso(r) === CO.todayIso() ? 'New today' : 'New', 'gold')); } sg.append(sl, el('span', null, CO.sub(r))); c2.append(sg);
const c3 = el('td'); const na = el('div', 'na u-' + n.u); na.append(el('b', null, n.t), el('span', null, n.s)); c3.append(na);
const c4 = el('td'); c4.append(fitCell(r.fit));
const c5 = el('td', 'opt nw'); c5.append(spPill(r));
const c6 = el('td');
if (r.deadline) { const dl = CO.daysTo(r.deadline), open = r.submission === 'Not started'; const dd = el('div', 'dd' + (open && dl >= 0 && dl <= 2 ? ' red' : open && dl >= 0 && dl <= 7 ? ' amber' : '')); dd.append(el('b', open ? null : 'dim', CO.fmtDay(r.deadline))); if (open) dd.append(el('span', null, dl < 0 ? 'Passed' : dl === 0 ? 'Today' : dl + (dl === 1 ? ' day left' : ' days left'))); c6.append(dd); }
else c6.append(el('span', 'dim', r.deadline_text && r.deadline_text !== '—' ? r.deadline_text : 'Open'));
const c7 = el('td', 'nw');
if (r.applied_on) c7.append(CO.fmtDay(r.applied_on)); else c7.append(el('span', 'dim', /^withdrawn/i.test(r.submission || '') ? 'Withdrawn' : r.submission === 'Submitted' ? 'Submitted' : '—'));
const c8 = el('td'); const ip = CO.ivParse(r.interview_datetime), ist = r.interview_status && r.interview_status !== '—' ? r.interview_status : '';
if (ip) { const dd = el('div', 'dd'); dd.append(el('b', null, CO.fmtDay(ip.ms) + (ip.time ? ' · ' + ip.time : '')), el('span', null, ist)); c8.append(dd); }
else c8.append(el('span', 'dim small', ist || '—'));
const c9 = el('td', 'c-sal opt small', r.salary && !/not stated/i.test(r.salary) ? r.salary : '—');
const c10 = el('td', 'c-loc small', r.location || '—');
tr.append(c6, c1, c2, c3, c4, c5, c7, c8, c9, c10);
['deadline', 'org', 'stage', 'next', 'fit', 'spons', 'applied', 'interview', 'salary', 'loc'].forEach((k, i) => { if (k === os.sort) tr.children[i].classList.add('sc'); });
tr.onclick = () => CO.open(r.id);
tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); CO.open(r.id); } };
return tr;
};
dash.draw('jtable', (tb) => {
tb.replaceChildren();
const d = CO.jobsNow();
const emptyRow = (fill) => { const tr = el('tr'); const td = el('td', 'erow'); td.colSpan = 10; fill(td); tr.append(td); tb.append(tr); };
if (d.status === 'error') { emptyRow(CO.failBox); return; }
if (d.status !== 'ok') return;
let rows = rowsFor(tb.dataset.view, d.data);
if (tb.dataset.view === 'today' && !rows.length) rows = d.data.filter((r) => r.id.startsWith('N')).sort(SORTS.added).slice(0, 5);
if (!rows.length) { emptyRow((td) => td.append(el('div', 'empty', tb.dataset.view === 'all' ? 'No roles match these filters. Try Clear all.' : 'Nothing here yet.'))); return; }
const grouped = os.group === 'type' && ['all', 'new', 'shortlist'].includes(tb.dataset.view);
if (!grouped) { for (const r of rows) tb.append(trow(r)); return; }
CO.shut = CO.shut || {};
for (const g of CO.ORGS) {
const list = rows.filter((r) => CO.orgType(r) === g);
if (!list.length) continue;
const key = tb.dataset.view + ':' + g, shut = !!CO.shut[key];
const hr = el('tr', 'grp'); const td = el('td', 'erow'); td.colSpan = 10;
const lab = el('div', 'gl'); lab.append(el('span', 'gc', shut ? '▸' : '▾'), el('b', null, g), el('span', 'gn', String(list.length)));
const ap = list.filter((r) => CO.colOf(r) === 'apply').length, iv = list.filter((r) => ['interview', 'offer'].includes(CO.colOf(r))).length;
lab.append(el('span', 'gs', [ap ? ap + ' to apply' : '', iv ? iv + ' at interview' : ''].filter(Boolean).join(' · ')));
td.append(lab); hr.append(td); hr.tabIndex = 0;
hr.onclick = () => { CO.shut[key] = !shut; dash.draw('jtable'); };
hr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hr.onclick(); } };
tb.append(hr);
if (!shut) for (const r of list) tb.append(trow(r));
}
});
dash.draw('count', (s) => { const d = CO.jobsNow(); s.textContent = d.status === 'ok' ? rowsFor('all', d.data).length + ' of ' + d.data.length : '—'; });
dash.draw('tabcnt', (s) => { const d = CO.jobsNow(); if (d.status !== 'ok') { s.textContent = '—'; return; } const c = s.dataset.col || ''; s.textContent = String(d.data.filter((r) => pass(r, true) && (!c || CO.colOf(r) === c)).length); });

dash.draw('kpi', (b) => {
const d = dash.data('summary');
if (d.status !== 'ok') { b.textContent = '—'; return; }
const m = (b.dataset.where || '').split('=')[1];
const row = d.data.find((r) => r.metric === m);
b.textContent = !row ? '—' : (m === 'rate' || m === 'response') ? CO.pct(row.n) : d3.format(',')(row.n);
});
dash.draw('today', (s) => { s.textContent = d3.timeFormat('%A, %-d %B %Y')(new Date()).toUpperCase(); });
dash.draw('todayNote', (p) => {
const d = CO.jobsNow(); if (d.status !== 'ok') return;
const n = rowsFor('today', d.data).length;
p.textContent = n ? 'Roles Claude found and verified this morning. Click one to see why it fits and to apply.' : 'Nothing new from today' + String.fromCharCode(39) + 's 08:52 search yet, so these are the 5 most recently added roles. Click one to see why it fits and to apply.';
});
dash.draw('todayLong', (s) => { s.textContent = 'Your daily career briefing · ' + d3.timeFormat('%A %-d %B')(new Date()); });
dash.draw('greet', (s) => { const h = new Date().getHours(); s.textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', Adnan.'; });
const when = (iso) => iso ? d3.timeFormat('%-d %b, %H:%M')(new Date(iso)) : '';
dash.draw('fresh', (s) => {
s.replaceChildren();
const m = CO.meta;
const age = m && m.at ? (Date.now() - Date.parse(m.at)) / 36e5 : null;
s.classList.toggle('old', age != null && age > 30);
s.append(el('i'));
if (CO.status.saving) s.append('Saving your changes…');
else if (m && m.at) s.append('Updated ' + when(m.at) + ' · ' + (/claude/i.test(m.by || '') ? 'daily search' : 'by you'));
else s.append(dash.data('jobs').status === 'ok' ? 'Data loaded' : 'Loading…');
});
dash.draw('saveState', (s) => {
s.replaceChildren();
if (CO.status.saving) { s.append(pill('Saving…', 'amber')); return; }
if (CO.status.error) { s.append(pill('Not saved: ' + CO.status.error, 'red'), ' '); const b = el('button', 'btn sm', 'Retry'); b.type = 'button'; b.onclick = CO.retry; s.append(b); return; }
if (CO.status.at) s.append(pill('All changes saved', 'green'));
});
dash.draw('freshDetail', (h) => {
h.replaceChildren();
const d = CO.jobsNow(); const m = CO.meta || {};
const kv = (a, v) => { const c = el('div'); c.append(el('span', null, a), el('span', null, v || '—')); h.append(c); };
kv('Last update', m.at ? d3.timeFormat('%a %-d %b %Y, %H:%M')(new Date(m.at)) : 'Not known in this view');
kv('Updated by', m.by || '—');
kv('Roles tracked', d.status === 'ok' ? String(d.data.length) : '—');
kv('Daily search', 'Every day at 08:52 UK time');
kv('Your edits', CO.status.error ? 'Not saved: ' + CO.status.error : CO.status.saving ? 'Saving…' : CO.status.at ? 'Saved ' + when(CO.status.at) : 'No edits in this visit');
kv('Stored as', 'A new tracker version on every save');
});

dash.draw('conflicts', (h) => {
h.replaceChildren();
const d = dash.data('conflicts');
if (d.status !== 'ok') return;
for (const c of d.data) {
const a = el('div', 'alert');
a.append(el('div', 'ic', '!'));
const t = el('div', 'tx');
t.append(el('b', null, 'Interview clash · ' + CO.fmtDay(c.date) + (c.days === 1 ? ' (tomorrow)' : c.days === 0 ? ' (today)' : '')), el('span', null, c.a_org + ' at ' + c.a_time + (c.a_where ? ' (' + c.a_where + ')' : '') + ' and ' + c.b_org + ' at ' + c.b_time + (c.b_where ? ' (' + c.b_where + ')' : '') + ' are ' + c.gap + ' minutes apart. Ask one employer to move, or to switch to a video interview.'));
const short = (o) => o.replace(/^university of /i, '').replace(/ university$/i, '').split(' (')[0];
const b1 = el('button', 'btn sm', 'Open ' + short(c.a_org)); b1.type = 'button'; b1.onclick = () => CO.open(c.a_id);
const b2 = el('button', 'btn sm', 'Open ' + short(c.b_org)); b2.type = 'button'; b2.onclick = () => CO.open(c.b_id);
a.append(t, b1, b2); h.append(a);
}
});
dash.draw('priorities', (h) => {
h.replaceChildren();
const d = dash.data('priorities');
if (d.status === 'error') { CO.failBox(h); return; }
if (d.status !== 'ok') return;
if (!d.data.length) { h.append(el('div', 'empty', 'Nothing urgent. You are up to date.')); return; }
for (const p of d.data.slice(0, 8)) {
const b = el('button', 'act u-' + p.tone); b.type = 'button';
const t = el('span'); t.append(el('b', null, p.title), el('span', 's', p.sub));
b.append(el('span', 'bar'), t, el('span', 'w', p.when));
b.onclick = () => CO.open(p.id); h.append(b);
}
if (d.data.length > 8) { const m = el('button', 'linkbtn', '+ ' + (d.data.length - 8) + ' more in Interviews & deadlines'); m.type = 'button'; m.onclick = () => CO.go('interviews'); h.append(m); }
});
const TYPE = {interview: ['Interview', 'green'], deadline: ['Deadline', 'amber'], follow: ['Follow up', 'purple'], tbc: ['Date to confirm', 'amber']};
dash.draw('agenda', (h) => {
h.replaceChildren();
const d = dash.data('events');
if (d.status === 'error') { CO.failBox(h); return; }
if (d.status !== 'ok') return;
const range = Number(h.dataset.range || 7), cap = range <= 7 ? 10 : 400; let shown = 0, total = 0;
const groups = [['Overdue', (e) => e.type === 'follow' && e.days < 0], ['Today', (e) => e.days === 0], ['Tomorrow', (e) => e.days === 1], ['This week', (e) => e.days >= 2 && e.days <= 7], ['Next two weeks', (e) => e.days >= 8 && e.days <= 14 && range > 7], ['Later', (e) => e.days >= 15 && e.days <= range], ['Date to confirm', (e) => e.type === 'tbc' && range > 7]];
let any = false;
for (const [label, test] of groups) {
const list = d.data.filter((e) => e.days !== undefined && test(e) && (e.type !== 'interview' || e.days >= 0));
total += list.length;
if (!list.length || shown >= cap) continue;
any = true;
const g = el('div'); const gh = el('div', 'gh', label); gh.append(el('span', null, String(list.length))); g.append(gh);
for (const e of list.slice(0, cap - shown)) {
shown++;
const tone = e.type === 'interview' ? (e.days <= 1 ? 'red' : 'green') : e.type === 'deadline' ? (e.days <= 2 ? 'red' : 'amber') : TYPE[e.type][1];
const b = el('button', 'ev u-' + tone); b.type = 'button';
const dt = el('div', 'dt');
if (e.date) { const ms = Date.parse(e.date + 'T00:00:00Z'); dt.append(el('b', null, d3.utcFormat('%-d')(new Date(ms))), el('span', null, d3.utcFormat('%b')(new Date(ms)))); } else dt.append(el('b', null, '?'), el('span', null, 'TBC'));
const t = el('div'); t.append(el('span', 'o', TYPE[e.type][0] + ' · ' + e.org), el('span', 's', [e.role, e.time, e.where].filter(Boolean).join(' · ')));
b.append(dt, t, pill(e.type === 'interview' && e.time ? e.time : e.days === 0 ? 'Today' : e.days === 1 ? 'Tomorrow' : e.days > 1 ? 'In ' + e.days + ' days' : e.days < 0 ? 'Overdue' : 'TBC', tone));
b.onclick = () => CO.open(e.id); g.append(b);
}
h.append(g);
}
if (!any) h.append(el('div', 'empty', 'Nothing scheduled in this period.'));
if (total > shown) { const m = el('button', 'linkbtn', '+ ' + (total - shown) + ' more in the full schedule'); m.type = 'button'; m.onclick = () => CO.go('interviews'); h.append(m); }
});
dash.draw('pipe', (h) => {
h.replaceChildren();
const d = dash.data('pipeline');
if (d.status === 'error') { CO.failBox(h); return; }
if (d.status !== 'ok') return;
const total = d3.sum(d.data, (r) => r.n) || 1;
const C = {apply: 'var(--c1)', applied: 'var(--c2)', interview: 'var(--acc)', offer: 'var(--gold)', closed: 'color-mix(in srgb, var(--color-fg-muted) 55%, transparent)'};
const bar = el('div', 'pipe');
for (const r of d.data) { if (!r.n) continue; const i = el('i'); i.style.flex = String(r.n); i.style.background = C[r.col]; bar.append(i); tipOn(h, i, r.label + ': ' + r.n + ' (' + CO.pct(r.n / total) + ')'); }
const lg = el('div', 'plg');
for (const r of d.data) { const b = el('button'); b.type = 'button'; const s = el('span'); const dot = el('i', 'dot'); dot.style.color = C[r.col]; s.append(dot, r.label); b.append(el('b', null, String(r.n)), s); b.onclick = () => CO.go('apps', {stage: r.col}); lg.append(b); }
h.append(bar, lg);
});
dash.draw('latest', (h) => {
h.replaceChildren();
const d = CO.jobsNow();
if (d.status === 'error') { CO.failBox(h); return; }
if (d.status !== 'ok') return;
const rows = d.data.filter((r) => r.id.startsWith('N') && r.stage !== 'Closed').sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1))).slice(0, 5);
if (!rows.length) { h.append(el('div', 'empty', 'No new roles yet.')); return; }
for (const r of rows) {
const f = CO.fitNum(r.fit);
const b = el('button', 'act ' + (f != null && f >= 8.5 ? 'u-green' : 'u-blue')); b.type = 'button';
const t = el('span'); t.append(el('b', null, r.organisation), el('span', 's', r.role + ' · ' + CO.SP[CO.spKind(r.sponsorship)][0]));
b.append(el('span', 'bar'), t, el('span', 'w', 'Fit ' + (r.fit || '—')));
b.onclick = () => CO.open(r.id); h.append(b);
}
});

dash.draw('bcnt', (s) => { const d = CO.jobsNow(); s.textContent = d.status === 'ok' ? String(d.data.filter((r) => CO.colOf(r) === s.dataset.col).length) : '—'; });
const MOVES = [['apply', 'To apply'], ['applied', 'Applied'], ['screening', 'Screening (call, test or task)'], ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Rejected'], ['noreply', 'No reply'], ['withdrawn', 'Withdrawn / not applying']];
const moveSelect = (r, cls) => {
const s = el('select', cls); s.setAttribute('aria-label', 'Move ' + r.organisation + ' to another stage');
s.append(new Option('Change stage…', ''));
for (const [v, l] of MOVES) if (v !== CO.colOf(r)) s.append(new Option(l, v));
s.onclick = (e) => e.stopPropagation();
s.onchange = () => { const v = s.value; if (!v) return; CO.saveRow(r, v === 'rejected' ? CO.moveTo(r, 'closed', 'rejected') : v === 'withdrawn' ? CO.moveTo(r, 'closed', 'withdrawn') : CO.moveTo(r, v), 'Moved to ' + MOVES.find((m) => m[0] === v)[1]); };
return s;
};
dash.draw('bcol', (h) => {
h.replaceChildren();
const d = CO.jobsNow();
if (d.status === 'error') { CO.failBox(h); return; }
if (d.status !== 'ok') return;
const rows = d.data.filter((r) => CO.colOf(r) === h.dataset.col).sort(SORTS.next);
if (!rows.length) { h.append(el('div', 'empty', 'Drop a card here')); return; }
CO.allCols = CO.allCols || {};
const lim = CO.allCols[h.dataset.col] ? rows.length : 20;
for (const r of rows.slice(0, lim)) {
const n = CO.next(r);
const c = el('div', 'bc u-' + n.u + (os.sel === r.id ? ' sel' : '')); c.dataset.key = r.id; c.tabIndex = 0;
if (CO.canEdit) { c.draggable = true; c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'move'; }); }
const ft = el('div', 'ft'); ft.append(pill(n.t, n.u), fitCell(r.fit));
const sp = savePill(r.id);
c.append(el('div', 'o', r.organisation), el('div', 'r', r.role), el('div', 'bs', CO.sub(r)), ft); if (sp) c.append(sp);
if (CO.canEdit) c.append(moveSelect(r));
if ((r.sponsorship || '').startsWith('❔')) c.append(pill('Verify licence', 'amber'));
c.onclick = () => CO.open(r.id);
c.onkeydown = (e) => { if (e.key === 'Enter') CO.open(r.id); };
h.append(c);
}
if (rows.length > lim) { const m = el('button', 'more', 'Show all ' + rows.length); m.type = 'button'; m.onclick = () => { CO.allCols[h.dataset.col] = true; dash.draw('bcol'); }; h.append(m); }
});

const prepBox = (r) => {
const done = Array.isArray(r.prep) ? r.prep : [];
const w = el('div', 'sec');
const pr = el('div', 'prog'); const tr = el('div', 'tr'); const i = el('i'); i.style.width = Math.round(done.length / CO.PREP.length * 100) + '%'; tr.append(i); pr.append(el('span', null, 'Preparation ' + done.length + '/' + CO.PREP.length), tr);
const ck = el('div', 'ck');
CO.PREP.forEach((label, idx) => {
const l = el('label', done.includes(idx) ? 'done' : null); const cb = el('input'); cb.type = 'checkbox'; cb.checked = done.includes(idx); cb.disabled = !CO.canEdit;
cb.onclick = (e) => e.stopPropagation();
cb.onchange = () => { const cur = new Set(Array.isArray(CO.find(r.id).prep) ? CO.find(r.id).prep : []); if (cb.checked) cur.add(idx); else cur.delete(idx); CO.saveRow(CO.find(r.id), {prep: [...cur].sort((a, b) => a - b)}, 'Preparation: ' + label + (cb.checked ? ' done' : ' not done'), 1500); };
l.append(cb, el('span', null, label)); ck.append(l);
});
w.append(pr, ck);
return w;
};
dash.draw('ivcardsOld', (h) => {
h.replaceChildren();
const d = CO.jobsNow();
if (d.status === 'error') { CO.failBox(h); return; }
if (d.status !== 'ok') return;
const rows = d.data.filter((r) => ['interview', 'offer'].includes(CO.colOf(r))).sort(SORTS.next);
if (!rows.length) { h.append(el('div', 'card empty', 'No interviews yet. They appear here as soon as a role moves to Interview.')); return; }
for (const r of rows) {
const n = CO.next(r), p = CO.ivParse(r.interview_datetime);
const c = el('div', 'card ivc u-' + n.u);
const hd = el('div', 'rc'); const t = el('div'); t.append(el('span', 'o', r.organisation), el('span', 'r small', r.role)); hd.append(CO.av(r.organisation), t);
const wh = el('div'); wh.append(el('div', 'when', p ? d3.utcFormat('%a %-d %b')(new Date(p.ms)) + (p.time ? ' · ' + p.time : '') : 'Date to confirm'), el('div', 'small', [p ? (String(r.interview_datetime || '').split('—')[1] || '').trim() : '', r.interview_status].filter(Boolean).join(' · ')));
const tags = el('div', 'tags'); tags.append(pill(n.t, n.u)); const sp = savePill(r.id); if (sp) tags.append(sp);
const acts = el('div', 'pacts'); const b1 = el('button', 'btn sm', 'Details'); b1.type = 'button'; b1.onclick = () => CO.open(r.id); acts.append(b1);
if (CO.canEdit) { const a0 = CO.actions(r).find((a) => a.pri) || CO.actions(r)[0]; if (a0) { const b2 = el('button', 'btn sm blue', a0.l); b2.type = 'button'; b2.onclick = () => runAction(r, a0); acts.append(b2); } }
c.append(hd, wh, tags, prepBox(r), acts); h.append(c);
}
});

const runAction = (r, a) => {
if (a.form) { CO.open(r.id); os.ivForm = {id: r.id, base: a.base, w: a.w}; CO.redrawAll(); return; }
CO.saveRow(r, a.p, a.w);
};
const ivPatch = (r, base, date, time, where) => {
const pt = Object.assign({}, base);
where = (where || '').trim();
if (date) { pt.interview_datetime = d3.utcFormat('%a %-d %b %Y')(new Date(date + 'T00:00:00Z')) + (time ? ', ' + time : '') + (where ? ' — ' + where : ''); if (/invited/i.test(pt.interview_status || '')) pt.interview_status = 'Interview booked'; }
else pt.interview_datetime = 'TBC' + (where ? ' — ' + where : '');
return pt;
};
const noticeBox = (ls, compact) => {
const s = CO.SAVING[ls.id], tone = s === 'error' ? 'err' : s === 'saving' ? 'wait' : 'ok';
const box = el('div', 'notice ' + tone + (compact ? ' compact' : ''));
box.append(el('div', 'ni', tone === 'err' ? '!' : tone === 'wait' ? '…' : '✓'));
const t = el('div', 'nt');
t.append(el('b', null, (tone === 'err' ? 'Not saved: ' : tone === 'wait' ? 'Saving: ' : 'Saved: ') + ls.org + ' — ' + ls.what));
t.append(el('span', null, ls.from !== ls.to ? ls.from + '  →  ' + ls.to : 'Stage: ' + ls.to), el('span', null, 'Next: ' + ls.next));
if (tone === 'err') t.append(el('span', 'nerr', CO.ERR[ls.id] || ''));
box.append(t);
const acts = el('div', 'pacts');
if (tone === 'err') { const b = el('button', 'btn sm', 'Retry'); b.type = 'button'; b.onclick = CO.retry; acts.append(b); }
if (!compact) { const o = el('button', 'btn sm', 'Open role'); o.type = 'button'; o.onclick = () => CO.open(ls.id); acts.append(o); }
if (ls.undo && tone !== 'wait') { const u = el('button', 'btn sm', 'Undo'); u.type = 'button'; u.onclick = () => { const r = CO.find(ls.id); if (r) CO.saveRow(r, ls.undo, 'Undo'); }; acts.append(u); }
const x = el('button', 'xbtn sm', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Dismiss'); x.onclick = () => { CO.lastSave = null; CO.redrawAll(); }; acts.append(x);
box.append(acts);
return box;
};
let noticeTimer = null;
dash.draw('notice', (h) => {
h.replaceChildren();
const ls = CO.lastSave;
if (!ls) return;
if (Date.now() - ls.at > 25000 && !CO.SAVING[ls.id]) { CO.lastSave = null; return; }
clearTimeout(noticeTimer); noticeTimer = setTimeout(() => dash.draw('notice'), 26000);
if (os.sel === ls.id && !document.querySelector('.os .panel[hidden]') && document.querySelector('.os .ws.sel') && getComputedStyle(document.querySelector('.os .main')).display === 'none') return;
h.append(noticeBox(ls));
});
const progressBox = (r) => {
const box = el('div', 'prog2');
box.append(el('div', 't', 'Update progress'));
const f = os.ivForm && os.ivForm.id === r.id ? os.ivForm : null;
if (f) {
const p = CO.ivParse(r.interview_datetime), raw = String(r.interview_datetime || '');
const fm = el('div', 'ef');
const mk = (label, type, val, ph) => { const l = el('label'); const i = el('input'); i.type = type; i.value = val || ''; if (ph) i.placeholder = ph; l.append(label, i); fm.append(l); return i; };
const di = mk('Interview date', 'date', p ? new Date(p.ms).toISOString().slice(0, 10) : '');
const ti = mk('Time', 'time', p ? p.time : '');
const wi = mk('Where / how', 'text', (raw.split('—')[1] || '').trim(), 'Teams, or the building');
const hint = el('div', 'small span', '');
const upd = () => { const m = CO.recompute(Object.assign({}, r, ivPatch(r, f.base, di.value, ti.value, wi.value))); hint.textContent = 'After you save: ' + CO.label(m) + ' · Next: ' + CO.next(m).t; };
[di, ti, wi].forEach((i) => { i.oninput = upd; });
fm.append(hint); upd();
const bar = el('div', 'pacts');
const sv = el('button', 'btn pri', 'Save'); sv.type = 'button'; sv.onclick = () => { const pt = ivPatch(r, f.base, di.value, ti.value, wi.value); os.ivForm = null; CO.saveRow(r, pt, f.w + (di.value ? ' · ' + CO.fmtDay(di.value) + (ti.value ? ' ' + ti.value : '') : ' · date to confirm')); };
const cn = el('button', 'btn', 'Cancel'); cn.type = 'button'; cn.onclick = () => { os.ivForm = null; CO.redrawAll(); };
bar.append(sv, cn, el('span', 'small', 'Leave the date empty if it is not confirmed yet.'));
box.append(el('div', 'small', f.w + ': add the date if you have it.'), fm, bar);
return box;
}
const c = CO.colOf(r), st = r.interview_status || '';
const Q = {apply: 'Have you applied for this role?', applied: /^screening/i.test(st) ? 'How did the screening step go?' : 'Have you heard back from the employer?', offer: /accepted/i.test(st) ? 'Where are you with sponsorship and your start date?' : 'What is your decision on the offer?', closed: CO.expired(r) ? 'The closing date has passed. Did you apply before it closed?' : 'This role is closed. Reopen it only if that was a mistake.'};
box.append(el('div', 'q', c === 'interview' ? (/^interviewed/i.test(st) ? 'What was the outcome of the interview?' : CO.ivParse(r.interview_datetime) ? 'Has the interview happened?' : 'Do you have the interview date?') : Q[c]));
const acts = CO.actions(r), NEG = /rejected|withdraw|not applying|decline|no reply|undo/i;
const main = acts.filter((a) => a.pri || !NEG.test(a.l)), neg = acts.filter((a) => !main.includes(a));
const grid = el('div', 'agrid');
for (const a of main) {
const b = el('button', 'abtn' + (a.pri ? ' pri' : '')); b.type = 'button';
let hint = 'Opens a short form';
if (!a.form) { const m = CO.recompute(Object.assign({}, r, a.p)); hint = 'Moves to ' + CO.label(m); }
b.append(el('b', null, a.l), el('span', null, hint));
b.onclick = () => runAction(r, a); grid.append(b);
}
box.append(grid);
if (neg.length) { const nr = el('div', 'neg'); nr.append(el('span', null, 'Other outcome:')); for (const a of neg) { const b = el('button', 'linkbtn danger', a.l.replace(/^[^A-Za-z]+/, '')); b.type = 'button'; b.title = 'Saves straight away. You can undo it.'; b.onclick = () => runAction(r, a); nr.append(b); } box.append(nr); }
box.append(el('div', 'small', 'Each button saves straight away. A note at the top shows what changed, with Undo.'));
return box;
};
const LADDER = ['Shortlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Visa & start'];
const ladderAt = (r) => {
const c = CO.colOf(r), st = r.interview_status || '', s = r.steps || {};
if (c === 'apply') return {at: 0};
if (c === 'applied') return {at: /^screening/i.test(st) ? 2 : 1};
if (c === 'interview') return {at: 3};
if (c === 'offer') return /accepted/i.test(st) ? {at: 5, done: r.visa_step === 'Started'} : {at: 4};
const iv = CO.reachedIv(r), ap = CO.didApply(r);
const bad = CO.sub(r).replace(/ (at application|after interview)$/, '');
return {at: /declined/i.test(st) ? 4 : iv ? 3 : ap ? (s.screening ? 2 : 1) : 0, bad};
};
const steps = (r) => {
const L = ladderAt(r), s = r.steps || {}, scr = /^screening/i.test(r.interview_status || '') || !!s.screening;
const box = el('div', 'steps6'); box.setAttribute('aria-label', 'Stage: ' + CO.label(r));
LADDER.forEach((label, i) => {
const skip = i === 2 && !scr && L.at > 2, bad = !!L.bad && i === L.at;
const done = !bad && !skip && (i < L.at || (L.done && i === L.at));
const cls = bad ? ' bad' : skip ? ' skip' : done ? ' done' : i === L.at && !L.bad ? ' now' : '';
const st = el('div', 'st' + cls);
st.append(el('i', null, bad ? '×' : skip ? '–' : done ? '✓' : String(i + 1)), el('span', null, bad ? L.bad : label));
const dk = ['', 'applied', 'screening', 'interview', 'offer', 'accepted'][i], w = ['applied', 'interview', 'offer'].includes(dk) ? CO.when(r, dk) : {d: s[dk]}, dd = dk && !w.est && w.d;
if (dd && (done || i === L.at)) st.append(el('small', null, CO.fmtDay(dd)));
if (skip) st.title = 'No screening step was recorded for this role';
box.append(st);
});
return box;
};
const visaBox = (r) => {
const s = r.steps || {}, i = CO.VISA.indexOf(r.visa_step || ''), b = el('div', 'vlist');
CO.VISA.forEach((v, k) => { const row = el('div', 'vrow' + (k <= i ? ' done' : k === i + 1 ? ' now' : '')); row.append(el('i', null, k <= i ? '✓' : String(k + 1)), el('span', null, v), el('small', null, s[v] ? CO.fmtDay(s[v]) : '')); b.append(row); });
b.append(el('div', 'small', 'Your employer assigns the Certificate of Sponsorship (CoS). You can apply for the visa up to 3 months before the start date on the CoS. Keep the CoS number and HR contact in your notes below.'));
return b;
};
const notesBox = (r) => {
const b = el('div', 'notes2'), list = Array.isArray(r.notes_log) ? r.notes_log : [];
if (CO.canEdit) {
const ta = el('textarea'); ta.rows = 2; ta.placeholder = 'Add a note: who you spoke to, what they said, what to do next…'; ta.setAttribute('aria-label', 'New note');
ta.value = CO.noteDraft && CO.noteDraft.id === r.id ? CO.noteDraft.v : '';
ta.oninput = () => { CO.noteDraft = {id: r.id, v: ta.value}; };
const go = () => { if (!ta.value.trim()) { ta.focus(); return; } const v = ta.value; CO.noteDraft = null; CO.addNote(r, v); };
ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } };
const bar = el('div', 'pacts'); const sb = el('button', 'btn sm pri', 'Add note'); sb.type = 'button'; sb.onclick = go;
bar.append(sb, el('span', 'small', 'Saved with today\'s date. Ctrl + Enter also saves.'));
b.append(ta, bar);
}
if (!list.length) b.append(el('div', 'small', 'No notes yet.'));
list.map((n, i) => [n, i]).reverse().forEach(([n, i]) => {
const row = el('div', 'nrow'); row.append(el('span', 'nd', n.at ? d3.timeFormat('%-d %b %Y · %H:%M')(new Date(n.at)) : ''), el('div', 'ntx', n.text || ''));
if (CO.canEdit) { const x = el('button', 'xbtn sm', '×'); x.type = 'button'; x.title = 'Delete this note'; x.setAttribute('aria-label', 'Delete note'); x.onclick = () => CO.delNote(r, i); row.append(x); }
b.append(row);
});
return b;
};
const readViewOld = (r) => {
const w = el('div', 'pin');
const n = CO.next(r);
const id = el('div', 'pid'); const t = el('div'); t.append(el('h2', null, r.role), el('div', 'o', r.organisation), el('div', 'm', [r.location, r.salary && !/not stated/i.test(r.salary) ? r.salary : ''].filter(Boolean).join(' · ')));
id.append(CO.av(r.organisation), t);
const tags = el('div', 'tags'); tags.append(colPill(r), spPill(r)); if (r.id.startsWith('N')) tags.append(pill('New from Claude', 'gold')); const sp = savePill(r.id); if (sp) tags.append(sp);
const nb = el('div', 'nextbox u-' + n.u); nb.append(el('span', null, 'Next action'), el('b', null, n.t), el('div', 'small', n.s));
if (CO.isUrl(r.url)) { const a = el('a', 'btn sm adv', 'Open the advert ↗'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; t.append(a); }
const acts = el('details', 'more2');
if (CO.canEdit) {
acts.append(el('summary', null, 'More options: edit fields or fix the stage'));
acts.append(el('div', 'small', 'Use these to correct a mistake or add details. For normal progress, use the buttons above.'));
const row = el('div', 'pacts');
const e = el('button', 'btn', '✎ Edit all fields'); e.type = 'button'; e.onclick = () => CO.startEdit(r.id); row.append(e);
const ml = el('label', 'msel'); ml.append(el('span', null, 'Set the stage by hand'), moveSelect(r)); row.append(ml);
acts.append(row);
}
if (CO.lastSave && CO.lastSave.id === r.id && (Date.now() - CO.lastSave.at < 25000 || CO.SAVING[r.id])) w.append(noticeBox(CO.lastSave, true));
w.append(id, tags, steps(r), nb);
if (CO.canEdit) w.append(progressBox(r));
if (CO.canEdit) w.append(acts);
if (CO.SAVING[r.id] === 'error') { const m = el('div', 'msg err'); m.append('Not saved: ' + (CO.ERR[r.id] || '') + ' '); const b = el('button', 'btn sm', 'Retry'); b.type = 'button'; b.onclick = CO.retry; m.append(b); w.append(m); }
if (!CO.canEdit) w.append(el('div', 'msg', window.CAREER_OS_RO || ('View only here. To change this role, tell Claude in chat, for example: ' + r.organisation + ' — submitted.')));
const sec = (title, kids) => { const s = el('div', 'sec'); s.append(el('div', 't', title)); kids.forEach((k) => k && s.append(k)); w.append(s); return s; };
if (CO.colOf(r) === 'offer' && /accepted/i.test(r.interview_status || '')) sec('Sponsorship & start date', [visaBox(r)]);
const nl = Array.isArray(r.notes_log) ? r.notes_log.length : 0;
sec('Your notes' + (nl ? ' · ' + nl : ''), [notesBox(r)]);
const k = CO.spKind(r.sponsorship);
const sb = el('div', 'box'); const sh = el('div', 'tags'); sh.append(pill(CO.SP[k][0], CO.SP[k][1])); sb.append(sh, el('div', null, CO.plain(r.sponsorship) || 'No evidence recorded yet.'));
const meta = [r.legal_entity ? 'Legal entity: ' + r.legal_entity : '', r.last_verified ? 'Last verified ' + r.last_verified : ''].filter(Boolean).join(' · ');
if (meta) sb.append(el('div', 'small', meta));
sec('Sponsorship', [sb]);
const f = CO.fitNum(r.fit), why = CO.fitWhy(r);
const fb = el('div', 'box'); const big = el('div', 'fitbig'); const tr = el('div', 'tr'); const bi = el('i'); bi.style.width = (f == null ? 0 : f * 10) + '%'; bi.style.background = CO.fitColor(f); tr.append(bi); big.append(el('b', null, f == null ? '—' : f + '/10'), tr); fb.append(big);
if (why.reason) fb.append(el('div', null, why.reason));
if (why.hits.length) { fb.append(el('div', 'small', 'Why it fits: the advert matches your experience in')); const tg = el('div', 'tags'); why.hits.forEach((h) => tg.append(pill(h, 'green'))); fb.append(tg); }
why.gaps.forEach((g) => fb.append(el('div', 'gap', 'Gap to address: ' + g)));
if (!why.hits.length && !why.reason) fb.append(el('div', 'small', 'No reasons recorded for this score yet.'));
sec('Match score', [fb]);
const kv = el('div', 'kv');
const add = (a, v) => { if (!v || v === '—') return; const c = el('div'); c.append(el('span', null, a), el('span', null, v)); kv.append(c); };
add('Deadline', r.deadline ? CO.fmtDay(r.deadline) : r.deadline_text); add('Applied on', r.applied_on ? CO.fmtDay(r.applied_on) : ''); add('Follow up', r.follow_up ? CO.fmtDay(r.follow_up) : '');
add('Interview status', r.interview_status); add('Interview', r.interview_datetime); add('Sector', r.sector); add('Found via', r.source); add('Added', r.added);
sec('Key facts', [kv]);
if (r.jd_focus) sec('Job focus', [el('div', null, r.jd_focus)]);
if (r.notes) sec('Notes from the search', [el('div', 'small', r.notes)]);
if (['interview', 'offer'].includes(CO.colOf(r))) sec('Interview preparation', [prepBox(r)]);
if (Array.isArray(r.history) && r.history.length) { const hi = el('div', 'hist'); r.history.slice().reverse().slice(0, 8).forEach((x) => { const row = el('div'); row.append(el('span', null, x.at ? d3.timeFormat('%-d %b %H:%M')(new Date(x.at)) : ''), el('span', null, x.what || '')); hi.append(row); }); sec('Activity', [hi]); }
return w;
};
const SUB_OPTS = ['Not started', 'Submitted', 'Withdrawn'];
const IV_OPTS = ['—', 'Awaiting response', 'Interview invited', 'Interview booked', 'Interview booked (2nd stage)', 'Interview booked (final)', 'Task submitted, interview TBC', 'Interviewed — awaiting outcome', 'Screening', 'Offer received', 'Offer accepted', 'Offer declined', 'Rejected', 'Rejected after interview', 'No response'];
CO.startEdit = (id) => {
const r = CO.find(id); if (!r) return;
const p = CO.ivParse(r.interview_datetime), raw = r.interview_datetime || '';
os.edit = true;
os.draft = {id: r.id, submission: r.submission || 'Not started', interview_status: r.interview_status || '—', applied_on: r.applied_on || '', follow_up: r.follow_up || '', ivDate: p ? new Date(p.ms).toISOString().slice(0, 10) : '', ivTime: p ? p.time : '', ivWhere: p ? (raw.split('—')[1] || '').trim() : '', ivRaw: raw, ivDirty: false, deadline: r.deadline || '', fit: r.fit || '', notes: r.notes || ''};
CO.redrawAll();
};
const editView = (r) => {
const dr = os.draft, w = el('div', 'pin');
const id = el('div', 'pid'); const t = el('div'); t.append(el('h2', null, 'Update this role'), el('div', 'o', r.organisation + ' — ' + r.role)); id.append(CO.av(r.organisation), t); w.append(id);
const f = el('div', 'ef');
const field = (label, input, wide) => { const l = el('label', wide ? 'span' : null); l.append(label, input); f.append(l); };
const sel = (key, opts) => { const s = el('select'); const all = opts.includes(dr[key]) ? opts : [dr[key]].concat(opts); for (const o of all) s.append(new Option(o, o)); s.value = dr[key]; s.onchange = () => { dr[key] = s.value; if (key === 'submission' && s.value === 'Submitted' && !dr.applied_on) { dr.applied_on = CO.todayIso(); dr.follow_up = dr.follow_up || CO.addDays(dr.applied_on, 10); CO.redrawAll(); } }; return s; };
const inp = (key, type, ph, iv) => { const i = el('input'); i.type = type; i.value = dr[key] || ''; if (ph) i.placeholder = ph; i.oninput = () => { dr[key] = i.value; if (iv) dr.ivDirty = true; }; return i; };
field('Submission', sel('submission', SUB_OPTS));
field('Interview status', sel('interview_status', IV_OPTS));
field('Applied on', inp('applied_on', 'date'));
field('Follow up on', inp('follow_up', 'date'));
field('Interview date', inp('ivDate', 'date', '', true));
field('Interview time', inp('ivTime', 'time', '', true));
field('Where / how', inp('ivWhere', 'text', 'Teams, or the building', true));
field('Application deadline', inp('deadline', 'date'));
field('Fit (out of 10)', inp('fit', 'text', 'e.g. 8.5'));
const ta = el('textarea'); ta.value = dr.notes; ta.placeholder = 'Who you spoke to, next step, prep notes'; ta.oninput = () => { dr.notes = ta.value; };
field('Notes', ta, true);
if (dr.ivRaw && !dr.ivDirty) f.append(el('div', 'small span', 'Current interview entry: ' + dr.ivRaw + '. Change the date, time or place to replace it.'));
w.append(f);
const pv = el('div', 'msg');
const upd = () => { try { const m = CO.recompute(Object.assign({}, r, build())); pv.textContent = 'After you save: ' + CO.label(m) + ' · Next: ' + CO.next(m).t; } catch (e) {} };
f.addEventListener('input', upd); f.addEventListener('change', upd);
w.append(pv);
const bar = el('div', 'pacts');
const save = el('button', 'btn pri', 'Save changes'); save.type = 'button';
const build = () => {
const p = {submission: dr.submission, interview_status: dr.interview_status, applied_on: dr.applied_on, follow_up: dr.follow_up, notes: dr.notes.trim(), fit: dr.fit.trim()};
let iv = dr.ivRaw;
if (dr.ivDirty) iv = dr.ivDate ? d3.utcFormat('%a %-d %b %Y')(new Date(dr.ivDate + 'T00:00:00Z')) + (dr.ivTime ? ', ' + dr.ivTime : '') + (dr.ivWhere.trim() ? ' — ' + dr.ivWhere.trim() : '') : (dr.ivWhere.trim() ? 'TBC — ' + dr.ivWhere.trim() : '');
if (!iv && /invited|booked|task/i.test(dr.interview_status)) iv = 'TBC';
p.interview_datetime = iv;
if (dr.deadline !== (r.deadline || '')) { p.deadline = dr.deadline; p.deadline_text = dr.deadline ? d3.utcFormat('%d %b %Y')(new Date(dr.deadline + 'T00:00:00Z')) : 'Open'; }
return p;
};
setTimeout(upd, 0);
save.onclick = () => { const p = build(); os.edit = false; os.draft = null; CO.saveRow(r, p); };
const cancel = el('button', 'btn', 'Cancel'); cancel.type = 'button'; cancel.onclick = () => { os.edit = false; os.draft = null; CO.redrawAll(); };
bar.append(save, cancel, el('span', 'small', 'Alerts, stage and counts update as soon as you save.'));
w.append(bar);
return w;
};
const SPS = {ok: 'Confirmed in the advert', warn: 'Employer has a sponsor licence, advert silent', unk: 'Not checked yet'};
CO.startAdd = () => { os.add = {organisation: '', role: '', url: '', location: '', salary: '', deadline: '', sector: 'Non-university', spons: 'unk', evidence: '', fit: '', applied: 'no', applied_on: CO.todayIso(), focus: '', notes: ''}; CO.open('__new'); };
const addView = () => {
const a = os.add, w = el('div', 'pin');
const hd = el('div', 'pid'); const t = el('div'); t.append(el('h2', null, 'Add a role'), el('div', 'm', 'Saved to your tracker straight away. The daily search will check the sponsor licence if you choose Not checked yet.')); hd.append(t); w.append(hd);
const f = el('div', 'ef');
const field = (label, input, wide) => { const l = el('label', wide ? 'span' : null); l.append(label, input); f.append(l); return input; };
const inp = (key, type, ph) => { const i = el('input'); i.type = type; i.value = a[key] || ''; if (ph) i.placeholder = ph; i.oninput = () => { a[key] = i.value; }; return i; };
const sel = (key, opts) => { const s = el('select'); for (const [v, l] of opts) s.append(new Option(l, v)); s.value = a[key]; s.onchange = () => { a[key] = s.value; CO.redrawAll(); }; return s; };
field('Company *', inp('organisation', 'text', 'e.g. Ocado Group'));
field('Job title *', inp('role', 'text', 'e.g. Senior Product Manager'));
field('Advert link', inp('url', 'url', 'https://…'), true);
field('Location', inp('location', 'text', 'e.g. Leeds, hybrid'));
field('Salary', inp('salary', 'text', 'e.g. £55k–£65k'));
field('Closing date', inp('deadline', 'date'));
field('Sector', sel('sector', [['Non-university', 'Non-university'], ['University', 'University']]));
field('Sponsorship', sel('spons', [['ok', SPS.ok], ['warn', SPS.warn], ['unk', SPS.unk]]), true);
if (a.spons !== 'unk') field(a.spons === 'ok' ? 'What the advert says' : 'Licence holder (legal entity)', inp('evidence', 'text', a.spons === 'ok' ? 'e.g. We can offer Skilled Worker sponsorship' : 'e.g. Ocado Retail Ltd'), true);
field('Fit (out of 10)', inp('fit', 'text', 'e.g. 8.5'));
field('Have you applied?', sel('applied', [['no', 'Not yet'], ['yes', 'Yes, already applied']]));
if (a.applied === 'yes') field('Applied on', inp('applied_on', 'date'));
const fo = el('input'); fo.type = 'text'; fo.value = a.focus; fo.placeholder = 'One line on what the job is about'; fo.oninput = () => { a.focus = fo.value; }; field('Job focus', fo, true);
const ta = el('textarea'); ta.value = a.notes; ta.placeholder = 'Anything to remember: contact, SOC code, why it fits'; ta.oninput = () => { a.notes = ta.value; }; field('Notes', ta, true);
w.append(f);
const err = el('div', 'msg err'); w.append(err);
const bar = el('div', 'pacts');
const sv = el('button', 'btn pri', 'Add to tracker'); sv.type = 'button';
sv.onclick = () => {
const org = a.organisation.trim(), role = a.role.trim();
if (!org || !role) { err.textContent = 'Add the company and the job title first.'; return; }
const all = CO.jobsNow().data || [];
if (all.some((r) => r.organisation.trim().toLowerCase() === org.toLowerCase() && r.role.trim().toLowerCase() === role.toLowerCase())) { err.textContent = 'This company and job title are already in your tracker.'; return; }
const n = all.filter((r) => /^M[0-9]+$/.test(r.id)).map((r) => Number(r.id.slice(1))).reduce((m, x) => Math.max(m, x), 0) + 1;
const ev = a.evidence.trim(), today = CO.todayIso(), applied = a.applied === 'yes';
const row = {id: 'M' + String(n).padStart(3, '0'), stage: '', alert: '', organisation: org, role: role, sector: a.sector, location: a.location.trim(), salary: a.salary.trim() || 'Not stated', deadline: a.deadline, deadline_text: a.deadline ? d3.utcFormat('%d %b %Y')(new Date(a.deadline + 'T00:00:00Z')) : 'Open',
sponsorship: a.spons === 'ok' ? '✅ Confirmed — ' + (ev || 'stated in the advert') : a.spons === 'warn' ? '⚠️ Licensed — Unconfirmed' : '❔ Licence not verified', fit: a.fit.trim(), submission: applied ? 'Submitted' : 'Not started', interview_status: applied ? 'Awaiting response' : '—', interview_datetime: '',
jd_focus: a.focus.trim(), notes: a.notes.trim(), url: a.url.trim(), source: 'Added by Adnan', added: today, legal_entity: a.spons === 'warn' ? ev : '', last_verified: '', history: [{at: new Date().toISOString(), what: 'Added by hand'}]};
if (applied) { row.applied_on = a.applied_on || today; row.follow_up = CO.addDays(row.applied_on, 10); }
CO.recompute(row);
os.add = null; os.sel = row.id;
CO.addRows([row]);
CO.lastSave = {id: row.id, org: org, what: 'Added to your tracker', from: 'New role', to: CO.label(row), next: CO.next(row).t, undo: null, at: Date.now()};
CO.redrawAll();
};
const cn = el('button', 'btn', 'Cancel'); cn.type = 'button'; cn.onclick = () => CO.close();
bar.append(sv, cn); w.append(bar);
return w;
};
dash.draw('addBtn', (h) => { h.replaceChildren(); if (!CO.canEdit) return; const b = el('button', 'btn ' + (h.dataset.tone || 'pri'), '＋ Add a role'); b.type = 'button'; b.onclick = CO.startAdd; h.append(b); });
dash.draw('panel', (h) => {
h.replaceChildren();
if (os.sel === '__new' && os.add) { h.append(addView()); return; }
const d = CO.jobsNow();
if (d.status !== 'ok') return;
const r = d.data.find((x) => x.id === os.sel);
if (!r) { h.append(el('div', 'empty', 'Choose a role to see its details.')); return; }
h.append(os.edit && os.draft && os.draft.id === r.id ? editView(r) : readView(r));
});

const chartFail = (h, d) => { if (d.status === 'error') CO.failBox(h); return d.status !== 'ok'; };
const palette = () => ['var(--acc)', 'var(--c1)', 'var(--c2)', 'var(--gold)', 'color-mix(in srgb, var(--color-fg-muted) 60%, transparent)', 'var(--color-bad)'];

const ym = (iso) => (iso ? String(iso).slice(0, 7) : '');
const ymAdd = (k, n) => { const [y, m] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
const ymLab = (k, f) => d3.utcFormat(f || '%B %Y')(new Date(k + '-01T00:00:00Z'));
CO.facts = (rows) => rows.filter(CO.didApply).map((r) => {
const a = CO.when(r, 'applied'), iv = CO.reachedIv(r), st = r.interview_status || '', off = /offer/i.test(st), rej = /^rejected/i.test(st);
return {r, ap: a.d, est: !!a.est, iv, ivd: iv ? CO.when(r, 'interview').d : '', off, offd: off ? CO.when(r, 'offer').d : '', rej, rejd: rej ? CO.when(r, 'rejected').d : '', noreply: /^no response/i.test(st), wd: /^withdrawn/i.test(r.submission || '')};
});
os.aper = os.aper || 'month';
const pctTxt = (a, b) => (b ? Math.round(a / b * 100) + '%' : '—');
dash.draw('convo', (h) => {
h.replaceChildren();
const d = CO.jobsNow(); if (d.status === 'error') { CO.failBox(h); return; } if (d.status !== 'ok') return;
const F = CO.facts(d.data), cur = CO.todayIso().slice(0, 7);
const P = {month: [[cur], [ymAdd(cur, -1)], 'This month', ymLab(cur, '%B')], last: [[ymAdd(cur, -1)], [ymAdd(cur, -2)], 'Last month', ymLab(ymAdd(cur, -1), '%B')], q: [[ymAdd(cur, -2), ymAdd(cur, -1), cur], [ymAdd(cur, -5), ymAdd(cur, -4), ymAdd(cur, -3)], 'Last 3 months', 'the last 3 months'], all: [null, null, 'All time', 'all time']};
const [ks, pks, , plabel] = P[os.aper] || P.month;
const inP = (x, k) => !k || (!!x && k.includes(ym(x)));
const cnt = (k) => ({apps: F.filter((f) => inP(f.ap, k)).length, ivs: F.filter((f) => f.iv && inP(f.ivd, k)).length, offers: F.filter((f) => f.off && inP(f.offd, k)).length, rejs: F.filter((f) => f.rej && inP(f.rejd, k)).length});
const now = cnt(ks), prev = pks ? cnt(pks) : null, prevLab = os.aper === 'month' ? ymLab(ymAdd(cur, -1), '%B') : os.aper === 'last' ? ymLab(ymAdd(cur, -2), '%B') : 'the 3 months before';
const bar = el('div', 'aper'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Time period');
for (const k of ['month', 'last', 'q', 'all']) { const b = el('button', 'achip' + (os.aper === k ? ' on' : ''), P[k][2]); b.type = 'button'; b.setAttribute('aria-pressed', String(os.aper === k)); b.onclick = () => { os.aper = k; dash.draw('convo'); }; bar.append(b); }
h.append(bar);
const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
let sum = (os.aper === 'all' ? 'So far' : 'In ' + plabel) + ' you sent ' + pl(now.apps, 'application') + ', had ' + pl(now.ivs, 'interview') + ', received ' + pl(now.offers, 'offer') + ' and ' + pl(now.rejs, 'rejection') + '.';
if (prev) { const dlt = now.apps - prev.apps; sum += dlt === 0 ? ' The same number of applications as ' + prevLab + '.' : ' That is ' + Math.abs(dlt) + (dlt > 0 ? ' more' : ' fewer') + ' application' + (Math.abs(dlt) === 1 ? '' : 's') + ' than ' + prevLab + '.'; }
h.append(el('p', 'asum', sum));
const kp = el('div', 'kpis');
[['Applications sent', 'apps', 't-purple'], ['Interviews', 'ivs', 't-green'], ['Offers', 'offers', 't-gold'], ['Rejections', 'rejs', 't-red']].forEach(([lab, k, tone]) => {
const c = el('div', 'kpi ' + tone); c.append(el('span', 'k', lab), el('b', null, String(now[k])));
if (prev) { const x = now[k] - prev[k]; c.append(el('span', 'dl' + (x > 0 ? ' up' : x < 0 ? ' down' : ''), (x > 0 ? '▲ ' + x : x < 0 ? '▼ ' + -x : 'Same') + ' vs ' + prevLab)); }
kp.append(c);
});
h.append(kp);
const coh = F.filter((f) => inP(f.ap, ks)), ci = coh.filter((f) => f.iv), co = coh.filter((f) => f.off), wait = coh.filter((f) => !f.iv && !f.rej && !f.off && !f.noreply && !f.wd);
const cc = el('div', 'card'); cc.append(el('h2', null, 'Conversion'), el('p', 'note', coh.length ? 'What happened to the ' + pl(coh.length, 'application') + ' you sent ' + (os.aper === 'all' ? 'so far' : 'in ' + plabel) + '.' : 'No applications in this period yet.'));
const cg = el('div', 'cgrid');
const tile = (lab, a, b, line, tone) => { const t = el('div', 'ctile ' + tone); t.append(el('span', 'k', lab), el('b', null, pctTxt(a, b)), el('span', 'm', line)); const tr = el('div', 'btrack'); const f = el('div', 'bfill'); f.style.width = (b ? Math.max(2, a / b * 100) : 0) + '%'; tr.append(f); t.append(tr); cg.append(t); };
tile('Application → interview', ci.length, coh.length, ci.length + ' of ' + coh.length + ' got an interview' + (ci.length ? ' · about 1 in ' + Math.round(coh.length / ci.length) : ''), 't-green');
tile('Interview → offer', co.length, ci.length, co.length + ' of ' + ci.length + ' interviews led to an offer', 't-gold');
tile('Application → offer', co.length, coh.length, co.length + ' of ' + coh.length + ' applications became an offer', 't-purple');
tile('Heard back', coh.length - wait.length, coh.length, wait.length + ' still waiting for a reply', '');
cc.append(cg); h.append(cc);
const dated = F.flatMap((f) => [f.ap, f.ivd, f.offd, f.rejd]).filter(Boolean).map(ym).filter((k) => k <= cur).sort();
const months = []; if (dated.length) { let k = dated[0]; while (k <= cur) { months.push(k); k = ymAdd(k, 1); } }
const show = months.slice(-6).reverse();
const tc = el('div', 'card flush'); const hd = el('div', 'ch pad'); const hx = el('div'); hx.append(el('h2', null, 'Month by month'), el('p', 'note', 'Each event counts in the month it happened. Interview rate is the share of that month\'s applications that have reached interview so far.')); hd.append(hx); tc.append(hd);
const tw = el('div', 'tw'); const tb = el('table', 'mt'); const th = el('tr'); ['Month', 'Applications', 'Interviews', 'Offers', 'Rejections', 'Interview rate', 'Still waiting'].forEach((x) => th.append(el('th', null, x))); const thead = el('thead'); thead.append(th); tb.append(thead);
const body = el('tbody'); const maxA = Math.max(1, ...show.map((k) => cnt([k]).apps));
const rowFor = (label, c, cohort, cls) => {
const tr = el('tr', cls || ''); tr.append(el('td', null, label));
const ta = el('td', 'num'); const bw = el('span', 'mbar'); const bi = el('i'); bi.style.width = (cls ? 0 : c.apps / maxA * 100) + '%'; bw.append(bi); ta.append(el('b', null, String(c.apps)), bw); tr.append(ta);
[c.ivs, c.offers, c.rejs].forEach((v) => tr.append(el('td', 'num', String(v))));
const ri = cohort.filter((f) => f.iv).length; tr.append(el('td', 'num', pctTxt(ri, cohort.length)));
tr.append(el('td', 'num', String(cohort.filter((f) => !f.iv && !f.rej && !f.off && !f.noreply && !f.wd).length)));
body.append(tr);
};
for (const k of show) rowFor(ymLab(k) + (k === cur ? ' (so far)' : ''), cnt([k]), F.filter((f) => ym(f.ap) === k), k === cur ? '' : '');
const und = {apps: F.filter((f) => !f.ap).length, ivs: F.filter((f) => f.iv && !f.ivd).length, offers: F.filter((f) => f.off && !f.offd).length, rejs: F.filter((f) => f.rej && !f.rejd).length};
if (und.apps + und.ivs + und.offers + und.rejs) rowFor('Date not recorded', und, F.filter((f) => !f.ap), 'und');
rowFor('All time', cnt(null), F, 'tot');
tb.append(body); tw.append(tb); tc.append(tw);
const nEst = F.filter((f) => f.est).length;
tc.append(el('div', 'tnote', nEst ? nEst + ' applications have no exact applied date, so the closing date is used as an estimate. Add the real dates below to make these numbers exact.' : 'All applied dates are exact.'));
h.append(tc);
const fix = F.filter((f) => f.est || !f.ap).sort((a, b) => String(b.ap).localeCompare(String(a.ap)));
if (fix.length && CO.canEdit) {
const det = el('details', 'card fixd'); if (CO.fixOpen) det.open = true; det.ontoggle = () => { CO.fixOpen = det.open; };
det.append(el('summary', null, 'Add missing applied dates · ' + fix.length));
det.append(el('p', 'note', 'Pick the day you sent each application. Each one saves as soon as you choose a date.'));
const lst = el('div', 'fixl');
for (const f of fix) {
const row = el('div', 'fixr'); const t = el('div'); t.append(el('b', null, f.r.organisation), el('span', null, f.r.role + (f.ap ? ' · estimated ' + CO.fmtDay(f.ap) : '')));
const i = el('input'); i.type = 'date'; i.max = CO.todayIso(); i.setAttribute('aria-label', 'Applied date for ' + f.r.organisation);
i.onchange = () => { if (i.value) CO.saveRow(f.r, {applied_on: i.value}, 'Applied on: ' + CO.fmtDay(i.value)); };
row.append(t, i); lst.append(row);
}
det.append(lst); h.append(det);
}
});

/* ---------- drill-down: any number opens the roles behind it ---------- */
CO.drill = (label, ids, back) => { os.ids = Array.from(new Set(ids)); os.idsLabel = label; os.idsBack = back || os.page; Object.assign(os, {stage: '', quick: '', q: ''}); os.sel = ''; syncFilters(); CO.go('apps'); CO.redrawAll(); window.scrollTo(0, 0); };
CO.clk = (node, label, ids, back) => {
if (!ids || !ids.length) return node;
node.classList.add('clk'); node.tabIndex = 0; node.setAttribute('role', 'button'); node.title = 'Show these ' + ids.length + ' roles';
const go = () => CO.drill(label, ids, back || 'analytics');
node.onclick = (e) => { e.stopPropagation(); go(); };
node.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
return node;
};
const lowPay = (s) => { s = String(s || ''); if (/day|hour|hr/i.test(s)) return null; const m = s.replace(/,/g, '').match(/£ ?([0-9]+(?:[.][0-9]+)?) ?(k)?/i); if (!m) return null; let v = Number(m[1]); if (m[2] || v < 1000) v *= 1000; return v; };
const DRILL = {
byFamily: [['Business / Systems Analyst', /analyst|business architect/i], ['Product Manager', /product manager|head of product|product lead|product and service owner/i], ['Product Owner', /product owner/i], ['Project / Delivery / Change', /project|programme|delivery|change|transformation|scrum/i], ['Data / BI / AI', /data|insight|intelligence|[^a-z]bi[^a-z]|[^a-z]ai[^a-z]|automation|analytics/i], ['Implementation / CRM', /implementation|deployment|crm|salesforce|consultant|systems specialist/i]],
byRegion: [['London', /london|farringdon|waterloo|docklands|canary wharf/i], ['North & Yorkshire', /sheffield|leeds|manchester|york|bradford|hull|durham|lancaster|preston|chester|newcastle|liverpool|northallerton|knutsford|blackpool|barnsley|rotherham|salford|horsforth/i], ['Midlands', /birmingham|nottingham|leicester|lutterworth|northampton|milton keynes|coventry|derby/i], ['South & East', /oxford|bath|bristol|reading|bognor|swindon|gloucester|watford|cambridge|hove|woking|norwich|egham|uxbridge/i], ['Scotland', /glasgow|edinburgh|st andrews|scotland|dundee|aberdeen/i], ['Wales', /cardiff|swansea|wales|llandaff/i], ['Remote / multi-site', /remote|multi-location|united kingdom|^uk( |$)|uk [/]/i]],
rejBy: [['Business / Systems Analyst', /analyst/i], ['Product Manager / Owner', /product/i], ['Project / Delivery / Change', /project|programme|delivery|change|transformation/i], ['Data / BI / AI', /data|insight|intelligence|automation|analytics/i], ['Implementation / CRM', /implementation|crm|salesforce|consultant/i]],
};
CO.drillRow = (node, src, label) => {
const d = CO.jobsNow(); if (d.status !== 'ok') return;
let f = null;
const hit = (k) => (DRILL[k].find((x) => x[0] === label) || [])[1];
if (src === 'byFamily') { const re = hit(src); if (re) f = (r) => re.test(' ' + r.role + ' '); }
else if (src === 'byRegion') { const re = hit(src); if (re) f = (r) => re.test(r.location || ''); }
else if (src === 'rejBy') { const re = hit(src); if (re) f = (r) => /^rejected/i.test(r.interview_status || '') && re.test(r.role); }
else if (src === 'bySector') f = (r) => r.sector === label && CO.didApply(r);
else if (src === 'fitDist') { const B = {'Under 7': [0, 7], '7–7.9': [7, 8], '8–8.4': [8, 8.5], '8.5–8.9': [8.5, 9], '9+': [9, 11]}[label]; if (B) f = (r) => { const v = CO.fitNum(r.fit); return v != null && v >= B[0] && v < B[1]; }; }
else if (src === 'salaryDist') { const B = {'<£45k': [0, 45000], '£45–55k': [45000, 55000], '£55–65k': [55000, 65000], '£65k+': [65000, 1e9]}[label]; f = B ? (r) => { const v = lowPay(r.salary); return v != null && v >= B[0] && v < B[1]; } : (r) => lowPay(r.salary) == null; }
if (!f) return;
const names = {byFamily: 'Role type', byRegion: 'Region', rejBy: 'Rejected · role type', bySector: 'Applied · sector', fitDist: 'Fit', salaryDist: 'Salary'};
CO.clk(node, names[src] + ': ' + label, d.data.filter(f).map((r) => r.id));
};
dash.draw('idsBar', (h) => {
h.replaceChildren();
if (!os.ids) return;
const b = el('div', 'idsbar'); b.append(el('span', 'ic', '🔎'));
const t = el('div'); t.append(el('b', null, os.idsLabel || 'Selected roles'), el('span', null, os.ids.length + ' role' + (os.ids.length === 1 ? '' : 's') + ' · other filters still apply'));
b.append(t);
const acts = el('div', 'pacts');
if (os.idsBack && os.idsBack !== 'apps') { const bk = el('button', 'btn sm', '← Back to ' + ({analytics: 'Analytics', today: 'Today', interviews: 'Interviews'}[os.idsBack] || 'previous page')); bk.type = 'button'; bk.onclick = () => { const p = os.idsBack; os.ids = null; os.idsLabel = ''; CO.go(p); CO.redrawAll(); }; acts.append(bk); }
const x = el('button', 'btn sm', 'Show all roles'); x.type = 'button'; x.onclick = () => { os.ids = null; os.idsLabel = ''; CO.redrawAll(); }; acts.append(x);
b.append(acts); h.append(b);
});

/* ---------- Reports ---------- */
const STATUS = [['Awaiting reply', 'var(--c2)'], ['Screening', 'var(--c1)'], ['Interview', 'var(--acc)'], ['Offer', 'var(--gold)'], ['Rejected', 'var(--color-bad)'], ['No reply', 'color-mix(in srgb, var(--color-warn) 75%, transparent)'], ['Withdrawn', 'color-mix(in srgb, var(--color-fg-muted) 55%, transparent)']];
const statusOf = (f) => { const st = f.r.interview_status || ''; return f.wd ? 'Withdrawn' : f.off ? 'Offer' : f.rej ? 'Rejected' : f.noreply ? 'No reply' : CO.colOf(f.r) === 'interview' ? 'Interview' : /^screening/i.test(st) ? 'Screening' : 'Awaiting reply'; };
dash.draw('reports', (h) => {
h.replaceChildren();
const d = CO.jobsNow(); if (d.status === 'error') { CO.failBox(h); return; } if (d.status !== 'ok') return;
const F = CO.facts(d.data), cur = CO.todayIso().slice(0, 7), ids = (l) => l.map((f) => f.r.id);
const P = {month: [[cur], [ymAdd(cur, -1)], 'This month', ymLab(cur, '%B'), ymLab(ymAdd(cur, -1), '%B')], last: [[ymAdd(cur, -1)], [ymAdd(cur, -2)], 'Last month', ymLab(ymAdd(cur, -1), '%B'), ymLab(ymAdd(cur, -2), '%B')], q: [[ymAdd(cur, -2), ymAdd(cur, -1), cur], [ymAdd(cur, -5), ymAdd(cur, -4), ymAdd(cur, -3)], 'Last 3 months', 'the last 3 months', 'the 3 months before'], all: [null, null, 'All time', 'all time', '']};
const [ks, pks, , plabel, prevLab] = P[os.aper] || P.month;
const inP = (x, k) => !k || (!!x && k.includes(ym(x)));
const lists = (k) => ({apps: F.filter((f) => inP(f.ap, k)), ivs: F.filter((f) => f.iv && inP(f.ivd, k)), offers: F.filter((f) => f.off && inP(f.offd, k)), rejs: F.filter((f) => f.rej && inP(f.rejd, k))});
const now = lists(ks), prev = pks ? lists(pks) : null, per = os.aper === 'all' ? 'so far' : 'in ' + plabel;
const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
// header
const hd = el('div', 'rhead'); const ht = el('div'); ht.append(el('h2', null, os.aper === 'all' ? 'Your job search so far' : 'Your job search ' + (os.aper === 'q' ? 'over the last 3 months' : 'in ' + plabel)), el('p', 'note', 'Click any number to see the roles behind it.'));
const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Time period');
for (const k of ['month', 'last', 'q', 'all']) { const b = el('button', os.aper === k ? 'on' : '', P[k][2]); b.type = 'button'; b.setAttribute('aria-pressed', String(os.aper === k)); b.onclick = () => { os.aper = k; dash.draw('reports'); }; seg.append(b); }
hd.append(ht, seg); h.append(hd);
// story
const story = el('div', 'card rhero');
const s = el('p', 'story');
const num = (n, w, l, lab) => CO.clk(el('span', 'num', pl(n, w)), lab, ids(l));
s.append((os.aper === 'all' ? 'So far you have sent ' : (os.aper === 'q' ? 'Over the last 3 months' : 'In ' + plabel) + ' you sent '), num(now.apps.length, 'application', now.apps, 'Applications sent ' + per), ', got ', num(now.ivs.length, 'interview', now.ivs, 'Interviews ' + per), ', ', num(now.offers.length, 'offer', now.offers, 'Offers ' + per), ' and ', num(now.rejs.length, 'rejection', now.rejs, 'Rejections ' + per), '.');
if (prev) { const dl = now.apps.length - prev.apps.length; s.append(' ' + (dl === 0 ? 'The same number of applications as ' + prevLab + '.' : 'That is ' + Math.abs(dl) + (dl > 0 ? ' more' : ' fewer') + ' application' + (Math.abs(dl) === 1 ? '' : 's') + ' than ' + prevLab + '.')); }
story.append(s); h.append(story);
// kpis
const kp = el('div', 'kpis rk');
[['Applications sent', 'apps', 't-purple'], ['Interviews', 'ivs', 't-green'], ['Offers', 'offers', 't-gold'], ['Rejections', 'rejs', 't-red']].forEach(([lab, k, tone]) => {
const c = el('div', 'kpi ' + tone); c.append(el('span', 'k', lab), el('b', null, String(now[k].length)));
if (prev) { const x = now[k].length - prev[k].length; c.append(el('span', 'dl' + (x > 0 ? ' up' : x < 0 ? ' down' : ''), (x > 0 ? '▲ ' + x : x < 0 ? '▼ ' + -x : 'Same') + ' vs ' + prevLab)); } else c.append(el('span', 'dl', 'All time'));
c.append(el('span', 'go', now[k].length ? 'View roles →' : 'Nothing yet'));
CO.clk(c, lab + ' ' + per, ids(now[k])); kp.append(c);
});
h.append(kp);
// flow
const coh = now.apps, ci = coh.filter((f) => f.iv), co = coh.filter((f) => f.off), cr = coh.filter((f) => f.rej), cn = coh.filter((f) => f.noreply), wait = coh.filter((f) => !f.iv && !f.rej && !f.off && !f.noreply && !f.wd);
const fc = el('div', 'card'); const fh = el('div', 'ch'); const fx = el('div'); fx.append(el('h2', null, 'From application to offer'), el('p', 'note', coh.length ? 'What happened to the ' + pl(coh.length, 'application') + ' you sent ' + per + '.' : 'No applications ' + per + ' yet.')); fh.append(fx); fc.append(fh);
const flow = el('div', 'flow');
const node = (lab, l, tone, lbl) => { const n = el('div', 'fnode ' + tone); n.append(el('b', null, String(l.length)), el('span', null, lab)); return CO.clk(n, lbl, ids(l)); };
const arrow = (a, b, txt) => { const x = el('div', 'farrow'); x.append(el('b', null, pctTxt(a, b)), el('i'), el('span', null, txt)); return x; };
flow.append(node('Applied', coh, 't-purple', 'Applications sent ' + per), arrow(ci.length, coh.length, ci.length ? 'about 1 in ' + Math.round(coh.length / ci.length) + ' got an interview' : 'got an interview'), node('Interview', ci, 't-green', 'Reached interview · applied ' + per), arrow(co.length, ci.length, 'of interviews became offers'), node('Offer', co, 't-gold', 'Offers · applied ' + per));
fc.append(flow);
const chips = el('div', 'fchips');
const chip = (lab, val, l, tone, lbl) => { const c = el('div', 'fchip ' + tone); c.append(el('b', null, val), el('span', null, lab)); chips.append(CO.clk(c, lbl, ids(l))); };
chip('heard back', pctTxt(coh.length - wait.length, coh.length), coh.filter((f) => !wait.includes(f)), '', 'Heard back · applied ' + per);
chip('still waiting', String(wait.length), wait, 't-purple', 'Still waiting · applied ' + per);
chip('rejected', String(cr.length), cr, 't-red', 'Rejected · applied ' + per);
chip('no reply', String(cn.length), cn, 't-amber', 'No reply · applied ' + per);
chip('application → offer', pctTxt(co.length, coh.length), co, 't-gold', 'Offers · applied ' + per);
fc.append(chips); h.append(fc);
// trend
const dated = F.flatMap((f) => [f.ap, f.ivd, f.offd, f.rejd]).filter(Boolean).map(ym).filter((k) => k <= cur).sort();
const months = []; if (dated.length) { let k = dated[0]; while (k <= cur) { months.push(k); k = ymAdd(k, 1); } }
const show = months.slice(-6);
const tc = el('div', 'card'); const th0 = el('div', 'ch'); const tx = el('div'); tx.append(el('h2', null, 'Month by month'), el('p', 'note', 'Each event counts in the month it happened. Click a bar or a number to see those roles.')); th0.append(tx); tc.append(th0);
const SER = [['apps', 'Applications', 'var(--c2)'], ['ivs', 'Interviews', 'var(--acc)'], ['offers', 'Offers', 'var(--gold)'], ['rejs', 'Rejections', 'var(--color-bad)']];
const lg = el('div', 'lg2'); SER.forEach(([, lab, col]) => { const x = el('span'); const sw = el('i'); sw.style.background = col; x.append(sw, lab); lg.append(x); }); tc.append(lg);
if (show.length) {
const M = show.map((k) => lists([k])), max = Math.max(1, ...M.flatMap((m) => SER.map(([k]) => m[k].length)));
const W = 640, H = 210, padL = 8, padB = 28, gw = (W - padL) / show.length, bw = Math.min(22, (gw - 18) / 4);
const svg = svgEl('svg', {viewBox: '0 0 ' + W + ' ' + H, class: 'gbars', role: 'img', 'aria-label': 'Applications, interviews, offers and rejections by month'});
for (let i = 0; i <= 4; i++) { const y = 10 + (H - padB - 10) * i / 4; svg.append(svgEl('line', {x1: 0, x2: W, y1: y, y2: y, class: 'grid'})); }
show.forEach((k, i) => {
const x0 = padL + i * gw + (gw - bw * 4 - 6) / 2;
SER.forEach(([key, lab, col], j) => {
const v = M[i][key].length, bh = v / max * (H - padB - 14), x = x0 + j * (bw + 2), y = H - padB - bh;
const r = svgEl('rect', {x, y: v ? y : H - padB - 1, width: bw, height: v ? bh : 1, rx: 3}); r.style.fill = col;
const g = svgEl('g', {}); g.append(r);
if (v) { const t = svgEl('text', {x: x + bw / 2, y: y - 4, 'text-anchor': 'middle', class: 'v'}); t.textContent = v; g.append(t); }
if (v) { g.classList.add('clk'); g.onclick = () => CO.drill(lab + ' · ' + ymLab(k), ids(M[i][key]), 'analytics'); const tt = svgEl('title', {}); tt.textContent = lab + ' in ' + ymLab(k) + ': ' + v + ' — click to see them'; g.append(tt); }
svg.append(g);
});
const t = svgEl('text', {x: padL + i * gw + gw / 2, y: H - 8, 'text-anchor': 'middle', class: 'm'}); t.textContent = ymLab(k, '%b %Y') + (k === cur ? ' *' : ''); svg.append(t);
});
tc.append(svg);
}
const tw = el('div', 'tw'); const tb = el('table', 'mt'); const trh = el('tr'); ['Month', 'Applications', 'Interviews', 'Offers', 'Rejections', 'Interview rate', 'Still waiting'].forEach((x) => trh.append(el('th', null, x))); const thead = el('thead'); thead.append(trh); tb.append(thead);
const body = el('tbody');
const rowFor = (label, L, cohort, cls) => {
const tr = el('tr', cls || ''); tr.append(el('td', null, label));
[['apps', 'Applications'], ['ivs', 'Interviews'], ['offers', 'Offers'], ['rejs', 'Rejections']].forEach(([k, lab]) => { const td = el('td', 'num'); const sp = el('span', null, String(L[k].length)); td.append(CO.clk(sp, lab + ' · ' + label, ids(L[k]))); tr.append(td); });
const ri = cohort.filter((f) => f.iv); const tdr = el('td', 'num'); tdr.append(CO.clk(el('span', null, pctTxt(ri.length, cohort.length)), 'Reached interview · applied ' + label, ids(ri))); tr.append(tdr);
const w = cohort.filter((f) => !f.iv && !f.rej && !f.off && !f.noreply && !f.wd); const tdw = el('td', 'num'); tdw.append(CO.clk(el('span', null, String(w.length)), 'Still waiting · applied ' + label, ids(w))); tr.append(tdw);
body.append(tr);
};
for (const k of show.slice().reverse()) rowFor(ymLab(k) + (k === cur ? ' (so far)' : ''), lists([k]), F.filter((f) => ym(f.ap) === k));
const und = {apps: F.filter((f) => !f.ap), ivs: F.filter((f) => f.iv && !f.ivd), offers: F.filter((f) => f.off && !f.offd), rejs: F.filter((f) => f.rej && !f.rejd)};
if (und.apps.length + und.ivs.length + und.offers.length + und.rejs.length) rowFor('Date not recorded', und, und.apps, 'und');
rowFor('All time', lists(null), F, 'tot');
tb.append(body); tw.append(tb); tc.append(tw);
const nEst = F.filter((f) => f.est).length;
if (nEst) tc.append(el('div', 'small', '* ' + nEst + ' applications have no exact applied date, so their closing date is used as an estimate. Add the real dates below to make the monthly numbers exact.'));
h.append(tc);
// missing dates
const fix = F.filter((f) => f.est || !f.ap).sort((a, b) => String(b.ap).localeCompare(String(a.ap)));
if (fix.length && CO.canEdit) {
const det = el('details', 'card fixd'); if (CO.fixOpen) det.open = true; det.ontoggle = () => { CO.fixOpen = det.open; };
const sm = el('summary'); sm.append(el('b', null, 'Add missing applied dates'), el('span', 'pill amber', String(fix.length))); det.append(sm);
det.append(el('p', 'note', 'Pick the day you sent each application. It saves as soon as you choose a date.'));
const lst = el('div', 'fixl');
for (const f of fix) {
const row = el('div', 'fixr'); const t = el('div'); t.append(el('b', null, f.r.organisation), el('span', null, f.r.role + (f.ap ? ' · estimated ' + CO.fmtDay(f.ap) : '')));
const i = el('input'); i.type = 'date'; i.max = CO.todayIso(); i.setAttribute('aria-label', 'Applied date for ' + f.r.organisation);
i.onchange = () => { if (i.value) CO.saveRow(f.r, {applied_on: i.value}, 'Applied on: ' + CO.fmtDay(i.value)); };
row.append(t, i); lst.append(row);
}
det.append(lst); h.append(det);
}
// where things stand
h.append(el('h2', 'sech', 'Where your applications stand now'));
const g = el('div', 'grid g2r');
const sc = el('div', 'card'); sc.append(el('h2', null, 'Status of all ' + pl(F.length, 'application')), el('p', 'note', 'Every application you sent, by its latest outcome.'));
const groups = STATUS.map(([lab, col]) => [lab, col, F.filter((f) => statusOf(f) === lab)]).filter((x) => x[2].length);
const sb = el('div', 'stbar'); groups.forEach(([lab, col, l]) => { const seg2 = el('i'); seg2.style.background = col; seg2.style.flex = String(l.length); seg2.title = lab + ': ' + l.length; sb.append(CO.clk(seg2, 'Status: ' + lab, ids(l))); }); sc.append(sb);
const lg3 = el('div', 'lg3'); groups.forEach(([lab, col, l]) => { const row = el('div'); const sw = el('i'); sw.style.background = col; row.append(sw, el('span', null, lab), el('b', null, String(l.length)), el('span', 'p', pctTxt(l.length, F.length))); lg3.append(CO.clk(row, 'Status: ' + lab, ids(l))); }); sc.append(lg3);
g.append(sc);
const rc = el('div', 'card'); rc.append(el('h2', null, 'Where rejections happen'), el('p', 'note', 'At the application stage or after an interview.'));
const rA = F.filter((f) => f.rej && !f.iv), rI = F.filter((f) => f.rej && f.iv), mx = Math.max(1, rA.length, rI.length);
[['At application', rA, 'var(--color-warn)'], ['After interview', rI, 'var(--color-bad)']].forEach(([lab, l, col]) => { const row = el('div', 'brow'); const tr = el('div', 'btrack'); const fl = el('div', 'bfill'); fl.style.width = Math.max(2, l.length / mx * 100) + '%'; fl.style.background = col; tr.append(fl); row.append(el('span', null, lab), tr, el('span', 'bval', String(l.length))); rc.append(CO.clk(row, 'Rejected ' + lab.toLowerCase(), ids(l))); });
const sec2 = ['Non-university', 'University'].map((s2) => { const a = F.filter((f) => f.r.sector === s2), i = a.filter((f) => f.iv); return [s2, a, i]; });
rc.append(el('h2', 'h2b', 'Interview rate by sector'));
sec2.forEach(([lab, a, i]) => { const row = el('div', 'brow'); const tr = el('div', 'btrack'); const fl = el('div', 'bfill'); fl.style.width = (a.length ? Math.max(2, i.length / a.length * 100) : 0) + '%'; fl.style.background = 'var(--acc)'; tr.append(fl); row.append(el('span', null, lab + ' · ' + i.length + ' of ' + a.length), tr, el('span', 'bval', pctTxt(i.length, a.length))); rc.append(CO.clk(row, 'Reached interview · ' + lab, ids(i))); });
g.append(rc);
h.append(g);
});

/* ---------- Next-action card ---------- */
const next0 = CO.next;
CO.next = (r) => {
const n = next0(r);
if (CO.colOf(r) === 'apply' && r.plan_on) { const p = CO.daysTo(r.plan_on), dl = CO.daysTo(r.deadline); if (p != null && (dl == null || dl >= 0)) return {t: p < 0 ? 'You planned to apply ' + CO.fmtDay(r.plan_on) : p === 0 ? 'Apply today — as planned' : 'Planned: apply ' + CO.fmtDay(r.plan_on), s: dl == null ? 'No closing date' : dl === 0 ? 'Closes today' : 'Closes ' + CO.fmtDay(r.deadline), u: p <= 0 || (dl != null && dl <= 2) ? 'red' : 'blue', k: Math.min(p, dl == null ? 99 : dl)}; }
return n;
};
const when0 = CO.when;
CO.when = (r, k) => (k === 'applied' && r.applied_on ? {d: r.applied_on} : when0(r, k));
CO.APREP = ['Read the advert and person specification', 'Tailor your CV to this job', 'Write the cover letter or supporting statement', 'Check sponsorship with HR if it is unclear', 'Submit and save a copy of what you sent'];
const aprepBox = (r) => {
const done = Array.isArray(r.aprep) ? r.aprep : [];
const w = el('div', 'apck');
const pr = el('div', 'prog'); const tr = el('div', 'tr'); const i = el('i'); i.style.width = Math.round(done.length / CO.APREP.length * 100) + '%'; tr.append(i); pr.append(el('span', null, 'Application checklist ' + done.length + '/' + CO.APREP.length), tr);
const ck = el('div', 'ck');
CO.APREP.forEach((label, idx) => {
const l = el('label', done.includes(idx) ? 'done' : null); const cb = el('input'); cb.type = 'checkbox'; cb.checked = done.includes(idx); cb.disabled = !CO.canEdit;
cb.onchange = () => { const cur = new Set(Array.isArray(CO.find(r.id).aprep) ? CO.find(r.id).aprep : []); if (cb.checked) cur.add(idx); else cur.delete(idx); CO.saveRow(CO.find(r.id), {aprep: [...cur].sort((a, b) => a - b)}, 'Checklist: ' + label + (cb.checked ? ' done' : ' not done'), 1500); };
l.append(cb, el('span', null, label)); ck.append(l);
});
w.append(pr, ck);
return w;
};
const askText = (r, kind) => {
const L = [kind === 'cv' ? 'Tailor my CV and write a short cover letter for this role, using my standard CV rules.' : 'Help me prepare for this interview: likely questions, my best SAMS and Shikho examples, and questions to ask the panel.', '', 'Role: ' + r.role, 'Employer: ' + r.organisation];
if (r.location) L.push('Location: ' + r.location); if (r.salary) L.push('Salary: ' + r.salary);
if (kind === 'cv' && r.deadline) L.push('Closing date: ' + CO.fmtDay(r.deadline));
if (kind === 'iv' && r.interview_datetime) L.push('Interview: ' + r.interview_datetime);
if (CO.isUrl(r.url)) L.push('Advert: ' + r.url);
if (r.jd_focus) L.push('', 'What the job involves: ' + r.jd_focus);
if (r.fit_reason) L.push('Why it fits: ' + r.fit_reason);
if (r.notes) L.push('Notes: ' + r.notes);
return L.join('\n');
};
const copyAsk = async (r, kind) => {
const txt = askText(r, kind);
try { await navigator.clipboard.writeText(txt); CO.copied = r.id + kind; os.miniForm = null; setTimeout(() => { CO.copied = ''; dash.draw('panel'); }, 4000); }
catch (e) { os.miniForm = {id: r.id, kind: 'copy', text: txt}; }
dash.draw('panel');
};
const REASONS = ['Not a good fit', 'No sponsorship', 'Salary too low', 'Location or travel', 'Not enough time before the deadline', 'Other'];
const miniForm = (r, mf) => {
const w = el('div', 'mform');
const bar = el('div', 'pacts');
const cancel = el('button', 'btn sm', 'Cancel'); cancel.type = 'button'; cancel.onclick = () => { os.miniForm = null; dash.draw('panel'); };
const date = (label, val, min, max) => { const l = el('label'); const i = el('input'); i.type = 'date'; i.value = val || ''; if (min) i.min = min; if (max) i.max = max; l.append(el('span', null, label), i); w.append(l); return i; };
if (mf.kind === 'appliedOn') {
w.append(el('b', null, 'When did you apply?'));
const i = date('Applied on', CO.addDays(CO.todayIso(), -1), '', CO.todayIso());
const sv = el('button', 'btn sm pri', 'Save'); sv.type = 'button'; sv.onclick = () => { if (!i.value) return; os.miniForm = null; CO.saveRow(r, Object.assign(CO.moveTo(r, 'applied'), {applied_on: i.value, follow_up: CO.addDays(i.value, 10)}), 'Applied on ' + CO.fmtDay(i.value)); };
bar.append(sv, cancel);
} else if (mf.kind === 'plan') {
w.append(el('b', null, 'When will you apply?'), el('span', 'small', 'It becomes the next action for this role, so you can see it in the list.'));
const i = date('Apply on', r.plan_on || CO.todayIso(), CO.todayIso(), r.deadline || '');
const sv = el('button', 'btn sm pri', 'Save plan'); sv.type = 'button'; sv.onclick = () => { if (!i.value) return; os.miniForm = null; CO.saveRow(r, {plan_on: i.value}, 'Planned to apply ' + CO.fmtDay(i.value)); };
bar.append(sv);
if (r.plan_on) { const cl = el('button', 'btn sm', 'Remove plan'); cl.type = 'button'; cl.onclick = () => { os.miniForm = null; CO.saveRow(r, {plan_on: ''}, 'Plan removed'); }; bar.append(cl); }
bar.append(cancel);
} else if (mf.kind === 'notApplying') {
w.append(el('b', null, 'Why are you not applying?'), el('span', 'small', 'Saved with the role, so you can see later why you skipped it.'));
const rs = el('div', 'rsn'); let pick = '';
REASONS.forEach((x) => { const b = el('button', 'rchip', x); b.type = 'button'; b.onclick = () => { pick = x; rs.querySelectorAll('.rchip').forEach((y) => y.classList.toggle('on', y === b)); sv.disabled = false; }; rs.append(b); });
w.append(rs);
const sv = el('button', 'btn sm danger', 'Not applying'); sv.type = 'button'; sv.disabled = true; sv.onclick = () => { os.miniForm = null; CO.saveRow(r, {submission: 'Withdrawn', not_reason: pick}, 'Not applying · ' + pick); };
bar.append(sv, cancel);
} else if (mf.kind === 'copy') {
w.append(el('b', null, 'Copy this and paste it into a chat with Claude'));
const ta = el('textarea'); ta.readOnly = true; ta.rows = 8; ta.value = mf.text; w.append(ta); setTimeout(() => { ta.focus(); ta.select(); }, 0);
bar.append(cancel);
}
w.append(bar);
return w;
};
const actionCard = (r) => {
const n = CO.next(r), c = CO.colOf(r), st = r.interview_status || '';
const box = el('div', 'actc u-' + n.u);
const hd = el('div', 'ah'); const ht = el('div', 'aht'); ht.append(el('span', 'lab', 'Next action'), el('b', null, n.t), el('span', 'sub', n.s)); hd.append(ht);
let days = null, unit = '';
if (c === 'apply' && r.deadline) { days = CO.daysTo(r.deadline); unit = 'left to apply'; }
else if (c === 'interview') { const p = CO.ivParse(r.interview_datetime); if (p) { days = Math.round((p.ms - CO.todayUtc()) / 864e5); unit = 'to the interview'; } }
else if (c === 'applied' && r.follow_up) { days = CO.daysTo(r.follow_up); unit = 'to follow up'; }
if (days != null && days >= 0) { const bd = el('div', 'cd'); bd.append(el('b', null, days === 0 ? 'Today' : String(days)), el('span', null, days === 0 ? (c === 'apply' ? 'last day' : c === 'interview' ? 'interview day' : 'follow up') : (days === 1 ? 'day ' : 'days ') + unit)); hd.append(bd); }
box.append(hd);
if (!CO.canEdit) return box;
const body = el('div', 'ab'); box.append(body);
if (os.ivForm && os.ivForm.id === r.id) { const pb = progressBox(r); pb.classList.add('bare'); body.append(pb); return box; }
if (os.miniForm && os.miniForm.id === r.id) { body.append(miniForm(r, os.miniForm)); return box; }
const Q = {apply: 'Have you applied for this role?', applied: /^screening/i.test(st) ? 'How did the screening step go?' : 'Have you heard back from the employer?', offer: /accepted/i.test(st) ? 'Where are you with sponsorship and your start date?' : 'What is your decision on the offer?', closed: CO.expired(r) ? 'The closing date has passed. Did you apply before it closed?' : 'This role is closed. Reopen it only if that was a mistake.'};
body.append(el('div', 'q', c === 'interview' ? (/^interviewed/i.test(st) ? 'What was the outcome of the interview?' : CO.ivParse(r.interview_datetime) ? 'Has the interview happened?' : 'Do you have the interview date?') : Q[c]));
const acts = CO.actions(r), NEG = /rejected|withdraw|not applying|decline|no reply|undo/i;
const pri = acts.filter((a) => a.pri), sec = acts.filter((a) => !a.pri && !NEG.test(a.l)), neg = acts.filter((a) => !a.pri && NEG.test(a.l));
for (const a of pri) { const b = el('button', 'abig'); b.type = 'button'; let hint = 'Opens a short form'; if (!a.form) { const m = CO.recompute(Object.assign({}, r, a.p)); hint = 'Moves to ' + CO.label(m); } b.append(el('b', null, a.l), el('span', null, hint)); b.onclick = () => runAction(r, a); body.append(b); }
const row = el('div', 'arow');
const chipBtn = (label, fn, cls) => { const b = el('button', 'achip2' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.onclick = fn; row.append(b); };
for (const a of sec) chipBtn(a.l, () => runAction(r, a));
if (c === 'apply') { chipBtn('📅 Applied on another day', () => { os.miniForm = {id: r.id, kind: 'appliedOn'}; dash.draw('panel'); }); chipBtn(r.plan_on ? '🗓 Planned ' + CO.fmtDay(r.plan_on) : '🗓 Plan when to apply', () => { os.miniForm = {id: r.id, kind: 'plan'}; dash.draw('panel'); }); }
if (['apply', 'applied'].includes(c)) chipBtn(CO.copied === r.id + 'cv' ? '✓ Copied — paste it into Claude' : '📋 Ask Claude for a tailored CV', () => copyAsk(r, 'cv'), CO.copied === r.id + 'cv' ? 'ok' : 'ai');
if (c === 'interview') chipBtn(CO.copied === r.id + 'iv' ? '✓ Copied — paste it into Claude' : '📋 Ask Claude to prep me', () => copyAsk(r, 'iv'), CO.copied === r.id + 'iv' ? 'ok' : 'ai');
if (row.childNodes.length) body.append(row);
if (c === 'apply') body.append(aprepBox(r));
if (neg.length) { const nr = el('div', 'neg'); nr.append(el('span', null, 'Other outcome:')); for (const a of neg) { const b = el('button', 'linkbtn danger', a.l.replace(/^[^A-Za-z]+/, '')); b.type = 'button'; b.onclick = () => { if (c === 'apply' && /not applying/i.test(a.l)) { os.miniForm = {id: r.id, kind: 'notApplying'}; dash.draw('panel'); } else runAction(r, a); }; nr.append(b); } body.append(nr); }
if (r.not_reason && c === 'closed') body.append(el('div', 'small', 'Reason: ' + r.not_reason));
return box;
};

const ICONS = {pin: ['M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z', 'M12 10m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0'], pound: ['M16 7.5a3.5 3.5 0 0 0-6.5 1.8V18', 'M7 12.5h6', 'M7 18h10'], cal: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'], ext: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'], edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4']};
CO.icon = (k) => { const s = svgEl('svg', {viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'ico'}); (ICONS[k] || []).forEach((d) => s.append(svgEl('path', {d}))); return s; };
/* ---------- Role details panel ---------- */
os.ptab = os.ptab || 'overview';
const readView2 = (r) => {
const w = el('div', 'pin pin2');
const n = CO.next(r), c = CO.colOf(r);
if (CO.lastSave && CO.lastSave.id === r.id && (Date.now() - CO.lastSave.at < 25000 || CO.SAVING[r.id])) w.append(noticeBox(CO.lastSave, true));
const hero = el('div', 'ph2'); hero.style.setProperty('--h', CO.hue(r.organisation));
const top = el('div', 'ph2t'); const av = CO.av(r.organisation, 'av2'); const t = el('div', 'pt');
const ot = CO.orgType(r), og = el('div', 'po2'); og.append(el('span', null, r.organisation)); if (!r.organisation.toLowerCase().includes(ot.split(' ')[0].toLowerCase())) og.append(el('span', 'otag', ot));
t.append(og, el('h2', null, r.role)); top.append(av, t); hero.append(top);
const tags = el('div', 'tags htags'); tags.append(colPill(r), spPill(r)); if (r.id.startsWith('N')) tags.append(pill('Found by Claude', 'gold')); if (r.id.startsWith('M')) tags.append(pill('Added by you', 'blue')); const sp = savePill(r.id); if (sp) tags.append(sp);
const links = el('div', 'plinks');
if (CO.isUrl(r.url)) { const a = el('a', 'hbtn pri'); a.append(CO.icon('ext'), 'Open the advert'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.append(a); }
if (CO.canEdit) { const e2 = el('button', 'hbtn'); e2.type = 'button'; e2.append(CO.icon('edit'), 'Edit details'); e2.onclick = () => CO.startEdit(r.id); links.append(e2); }
hero.append(tags, links);
const facts = el('div', 'facts');
const fact = (ic, label, val, sub, cls) => { const f = el('div', 'fact' + (cls ? ' ' + cls : '')); const ii = el('span', 'fi'); ii.append(CO.icon(ic)); const tx = el('div'); tx.append(el('span', 'fl', label), el('b', null, val)); if (sub) tx.append(el('span', 'fs', sub)); f.append(ii, tx); f.title = label + ': ' + val; facts.append(f); };
const loc = String(r.location || '').trim();
const loc1 = loc.split(/[;—]/)[0].trim().replace(/\s*\/\s*/g, ' / '), more = loc.length > loc1.length + 2, open = CO.locOpen === r.id;
fact('pin', 'Location', loc ? (open ? loc.replace(/\s*\/\s*/g, ' / ') : loc1) : 'Not stated', more ? (open ? 'Show less' : 'Show all details') : '', open ? 'open' : '');
if (more) { const lf = facts.lastChild; lf.classList.add('clk'); lf.tabIndex = 0; lf.title = 'Location: ' + loc; lf.onclick = () => { CO.locOpen = open ? '' : r.id; dash.draw('panel'); }; }
fact('pound', 'Salary', r.salary && !/not stated/i.test(r.salary) ? r.salary : 'Not stated', '');
const dl = CO.daysTo(r.deadline);
fact('cal', 'Closing date', r.deadline ? CO.fmtDay(r.deadline) : (r.deadline_text || 'Not stated'), r.deadline && dl != null ? (dl < 0 ? 'Closed' : dl === 0 ? 'Closes today' : dl + (dl === 1 ? ' day left' : ' days left')) : '', dl != null && dl >= 0 && dl <= 3 && c === 'apply' ? 'hot' : '');
const stc = el('div', 'stcard'); stc.append(el('div', 'stt', 'Progress'), steps(r));
w.append(hero, facts, stc);
w.append(actionCard(r));
if (CO.SAVING[r.id] === 'error') { const m = el('div', 'msg err'); m.append('Not saved: ' + (CO.ERR[r.id] || '') + ' '); const b = el('button', 'btn sm', 'Retry'); b.type = 'button'; b.onclick = CO.retry; m.append(b); w.append(m); }
if (!CO.canEdit) w.append(el('div', 'msg', window.CAREER_OS_RO || ('View only here. To change this role, tell Claude in chat, for example: ' + r.organisation + ' — submitted.')));
const nl = Array.isArray(r.notes_log) ? r.notes_log.length : 0, hl = Array.isArray(r.history) ? r.history.length : 0, hasPrep = ['interview', 'offer'].includes(c);
const TABS = [['overview', 'Overview'], ['notes', 'Notes' + (nl ? ' · ' + nl : '')]].concat(hasPrep ? [['prep', 'Interview prep']] : []).concat([['activity', 'Activity' + (hl ? ' · ' + hl : '')]]);
let tab = os.ptab; if (!TABS.some((x) => x[0] === tab)) tab = 'overview';
const tb = el('div', 'ptabs'); tb.setAttribute('role', 'tablist');
for (const [k, lab] of TABS) { const b = el('button', tab === k ? 'on' : '', lab); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(tab === k)); b.onclick = () => { os.ptab = k; dash.draw('panel'); }; tb.append(b); }
w.append(tb);
const body = el('div', 'tabbody');
const card = (title, kids, cls) => { const s = el('div', 'pcard' + (cls ? ' ' + cls : '')); if (title) s.append(el('div', 't', title)); kids.forEach((k) => k && s.append(k)); body.append(s); return s; };
if (tab === 'overview') {
if (c === 'offer' && /accepted/i.test(r.interview_status || '')) card('Sponsorship & start date', [visaBox(r)]);
const f = CO.fitNum(r.fit), why = CO.fitWhy(r);
const fb = el('div', 'fitrow'); const ring = el('div', 'fitring'); ring.style.setProperty('--p', String(f == null ? 0 : f * 10)); ring.style.setProperty('--fc', CO.fitColor(f)); ring.append(el('b', null, f == null ? '—' : String(f)), el('span', null, '/10'));
const fw = el('div'); if (why.reason) fw.append(el('div', null, why.reason)); if (why.hits.length) { const tg = el('div', 'tags'); why.hits.forEach((x) => tg.append(pill(x, 'green'))); fw.append(tg); } why.gaps.forEach((g2) => fw.append(el('div', 'gap', 'Gap: ' + g2))); if (!why.hits.length && !why.reason) fw.append(el('div', 'small', 'No reasons recorded for this score yet.'));
fb.append(ring, fw); card('Why it fits', [fb]);
const k = CO.spKind(r.sponsorship); const sb = el('div', 'spbox ' + k); sb.append(el('b', null, CO.SP[k][0]), el('div', null, CO.plain(r.sponsorship) || 'No evidence recorded yet.'));
const meta2 = [r.legal_entity ? 'Legal entity: ' + r.legal_entity : '', r.last_verified ? 'Last verified ' + r.last_verified : ''].filter(Boolean).join(' · '); if (meta2) sb.append(el('div', 'small', meta2));
card('Sponsorship', [sb]);
const kv = el('div', 'kv2'); const add = (a, v) => { if (!v || v === '—') return; const x = el('div'); x.append(el('span', null, a), el('b', null, v)); kv.append(x); };
add('Applied on', r.applied_on ? CO.fmtDay(r.applied_on) : ''); add('Follow up', r.follow_up ? CO.fmtDay(r.follow_up) : ''); add('Interview', r.interview_datetime); add('Interview status', r.interview_status); add('Sector', r.sector); add('Found via', r.source); add('Added', r.added);
if (kv.childNodes.length) card('Key facts', [kv]);
if (r.jd_focus) card('What the job involves', [el('div', 'prose', r.jd_focus)]);
if (r.notes) card('Notes from the search', [el('div', 'prose small', r.notes)]);
if (CO.canEdit) { const det = el('details', 'more2'); det.append(el('summary', null, 'Fix the stage by hand')); det.append(el('div', 'small', 'Only to correct a mistake. For normal progress use the buttons above.')); const ml = el('label', 'msel'); ml.append(el('span', null, 'Set the stage'), moveSelect(r)); det.append(ml); body.append(det); }
} else if (tab === 'notes') card('', [notesBox(r)]);
else if (tab === 'prep') card('', [prepBox(r)]);
else { const hi = el('div', 'tl'); (r.history || []).slice().reverse().forEach((x) => { const row = el('div'); row.append(el('i'), el('span', 'tt', x.at ? d3.timeFormat('%-d %b %Y · %H:%M')(new Date(x.at)) : ''), el('span', null, x.what || '')); hi.append(row); }); if (!hl) hi.append(el('div', 'small', 'No activity yet.')); card('', [hi]); }
w.append(body);
return w;
};

/* ---------- careerOS brand: shell, command centre, calendar, sponsorship, discovery, job page ---------- */
ICONS.brief = ['M4 8h16v12H4z', 'M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2', 'M4 13h16'];
const CRUMB = {today: ['My day', 'Command centre'], apps: ['Workspace', 'Job explorer'], board: ['Workspace', 'Application pipeline'], interviews: ['Workspace', 'Interviews & calendar'], sponsor: ['Intelligence', 'Sponsorship centre'], discover: ['Intelligence', 'Discovery inbox'], analytics: ['Intelligence', 'Career intelligence'], criteria: ['Preferences', 'Search strategy'], data: ['Preferences', 'Data & settings'], shortlist: ['Intelligence', 'Sponsored shortlist'], new: ['Intelligence', 'New roles']};
dash.draw('crumb', (h) => {
h.replaceChildren();
const c = CRUMB[os.page] || ['Workspace', ''], r = os.sel && os.sel !== '__new' ? CO.find(os.sel) : null;
h.append(el('span', 'cg', 'Career workspace / ' + (r ? 'Job explorer' : c[0])), el('b', null, r ? r.organisation : os.sel === '__new' ? 'Add a role' : c[1]));
});
const sqav = (org) => el('div', 'sqav', CO.initials(org));
dash.draw('nextMove', (h) => {
h.replaceChildren();
const d = dash.data('priorities'); if (d.status !== 'ok') return;
const p = d.data[0], box = el('div', 'nmove');
box.append(el('div', 'eyebrow', 'Suggested next move'));
if (!p) { box.append(el('h2', null, 'You are all caught up'), el('p', null, 'No deadlines, interviews or follow-ups need you right now. A good moment to review new roles in the Discovery inbox.')); const a = el('div', 'acts'); const b = el('button', 'btn', 'Open Discovery inbox'); b.type = 'button'; b.onclick = () => CO.go('discover'); a.append(b); box.append(a); h.append(box); return; }
const t = p.title.split(': ');
box.append(el('h2', null, t[0]), el('p', null, (t[1] ? t[1] + ' · ' : '') + p.sub), el('span', 'when', p.when));
const a = el('div', 'acts'); const b1 = el('button', 'btn', 'Open this role'); b1.type = 'button'; b1.onclick = () => CO.open(p.id);
const b2 = el('button', 'btn ghost2', 'See all ' + d.data.length + ' actions'); b2.type = 'button'; b2.onclick = () => { CO.go('today'); setTimeout(() => { const x = document.querySelector('.os [data-draw=priorities]'); if (x && x.scrollIntoView) x.scrollIntoView({block: 'start', behavior: 'smooth'}); }, 60); };
a.append(b1, b2); box.append(a); h.append(box);
});
dash.draw('highfit', (h) => {
h.replaceChildren();
const d = CO.jobsNow(); if (d.status !== 'ok') return;
const rows = d.data.filter((r) => CO.colOf(r) === 'apply' && CO.fitNum(r.fit) != null).sort((a, b) => CO.fitNum(b.fit) - CO.fitNum(a.fit) || String(a.deadline || '9').localeCompare(String(b.deadline || '9'))).slice(0, 5);
const hd = el('div', 'chh'); const hx = el('div'); hx.append(el('h2', null, 'High-fit opportunities'), el('p', 'note', 'Ready-to-apply roles worth reviewing'));
const lk = el('button', 'lk', 'All roles →'); lk.type = 'button'; lk.onclick = () => { os.sort = 'fit'; os.dir = 1; os.stage = 'apply'; syncFilters(); CO.go('apps'); };
hd.append(hx, lk); h.append(hd);
const l = el('div', 'hfl');
for (const r of rows) { const row = el('div', 'hfr'); const t = el('div'); t.append(el('b', 't', r.role), el('span', null, r.organisation + (r.location ? ' · ' + r.location : ''))); const sc = el('div', 'sc'); sc.append(el('b', null, String(CO.fitNum(r.fit))), el('small', null, 'match')); row.append(sqav(r.organisation), t, sc); row.onclick = () => CO.open(r.id); row.tabIndex = 0; row.onkeydown = (e) => { if (e.key === 'Enter') CO.open(r.id); }; l.append(row); }
if (!rows.length) l.append(el('div', 'empty', 'No open roles with a fit score yet.'));
h.append(l);
});
os.wk = os.wk || 0;
dash.draw('weekcal', (h) => {
h.replaceChildren();
const d = dash.data('events'), jd = CO.jobsNow(); if (d.status !== 'ok' || jd.status !== 'ok') return;
const t0 = CO.todayUtc(), dow = (new Date(t0).getUTCDay() + 6) % 7, mon = t0 - dow * 864e5 + os.wk * 7 * 864e5;
const days = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(mon + i * 864e5).toISOString().slice(0, 10));
const ev = d.data.filter((e) => e.date && days.includes(e.date)).map((e) => ({date: e.date, id: e.id, k: e.type === 'interview' ? 'interview' : e.type === 'deadline' ? 'deadline' : 'follow', lab: e.type === 'interview' ? 'Interview' + (e.time ? ' · ' + e.time : '') : e.type === 'deadline' ? 'Deadline' : 'Follow up', who: e.org}));
jd.data.forEach((r) => { if (r.plan_on && days.includes(r.plan_on) && CO.colOf(r) === 'apply') ev.push({date: r.plan_on, id: r.id, k: 'plan', lab: 'Planned apply', who: r.organisation}); });
const hd = el('div', 'wkh'); const hx = el('div'); const f = d3.utcFormat('%-d %b %Y');
hx.append(el('h2', null, f(new Date(mon)) + ' – ' + f(new Date(mon + 6 * 864e5))), el('p', 'note', ev.length + ' event' + (ev.length === 1 ? '' : 's') + ' this week · click one to open the role'));
const nav = el('div', 'pacts'); const mk = (t, fn) => { const b = el('button', 'btn sm', t); b.type = 'button'; b.onclick = fn; nav.append(b); };
mk('←', () => { os.wk--; dash.draw('weekcal'); }); if (os.wk) mk('This week', () => { os.wk = 0; dash.draw('weekcal'); }); mk('→', () => { os.wk++; dash.draw('weekcal'); });
hd.append(hx, nav); h.append(hd);
const g = el('div', 'wk'), today = CO.todayIso();
days.forEach((iso) => {
const col = el('div', 'wkd' + (iso === today ? ' today' : '')); const dh = el('div', 'dh'); const dt = new Date(iso + 'T00:00:00Z');
dh.append(el('span', null, d3.utcFormat('%a')(dt).toUpperCase()), el('b', null, d3.utcFormat('%-d')(dt))); col.append(dh);
ev.filter((e) => e.date === iso).forEach((e) => { const b = el('button', 'ev ' + e.k); b.type = 'button'; b.append(el('b', null, e.lab), el('span', null, e.who)); b.onclick = () => CO.open(e.id); col.append(b); });
g.append(col);
});
h.append(g);
const lg = el('div', 'lg2'); [['Interview', 'var(--brand)'], ['Deadline', '#d9842e'], ['Follow-up', '#7c5cd6'], ['Planned apply', '#13876f']].forEach(([t, c]) => { const x = el('span'); const i = el('i'); i.style.background = c; x.append(i, t); lg.append(x); }); h.append(lg);
});
os.spt = os.spt || 'warn';
dash.draw('sponsor', (h) => {
h.replaceChildren();
const d = CO.jobsNow(); if (d.status !== 'ok') return;
const act = d.data.filter((r) => !['closed'].includes(CO.colOf(r)));
const ban = el('div', 'card spban'); const bx = el('div'); const h2 = el('h2'); h2.append(CO.icon('shield'), 'Sponsorship needs two checks'); bx.append(h2, el('p', null, '1. The employing legal entity must be on the Home Office register of licensed sponsors. 2. The vacancy itself must be one they will sponsor. A licence alone does not guarantee sponsorship for a particular job.'));
const reg = el('a', 'btn'); reg.append('Official UK register ', CO.icon('ext')); reg.href = 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers'; reg.target = '_blank'; reg.rel = 'noopener noreferrer';
ban.append(bx, reg); h.append(ban);
const T = [['ok', 'Vacancy-level evidence', 'The advert says sponsorship is available'], ['warn', 'Licensed / unconfirmed', 'Employer holds a licence; the advert is silent'], ['unk', 'Unknown / verify', 'Licence or vacancy status still to check']];
const tg = el('div', 'tiers');
for (const [k, lab, desc] of T) { const l = act.filter((r) => CO.spKind(r.sponsorship) === k); const c = el('button', 'card tier ' + k + (os.spt === k ? ' on' : '')); c.type = 'button'; c.append(el('b', null, String(l.length)), el('h2', null, lab), el('p', null, desc), el('span', 'badge ' + (k === 'ok' ? 'green' : k === 'warn' ? 'amber' : ''), os.spt === k ? 'Showing below' : 'View roles →')); c.onclick = () => { os.spt = k; dash.draw('sponsor'); }; tg.append(c); }
h.append(tg);
const sel = act.filter((r) => CO.spKind(r.sponsorship) === os.spt).sort((a, b) => (CO.fitNum(b.fit) || 0) - (CO.fitNum(a.fit) || 0));
const lc = el('div', 'card'); const hd = el('div', 'chh'); const hx = el('div'); const TT = {ok: 'Sponsorship stated in the advert', warn: 'Needs vacancy-level confirmation', unk: 'Still to verify'};
hx.append(el('h2', null, TT[os.spt]), el('p', 'note', sel.length + ' active roles, highest fit first. For licensed roles, ask HR or check the advert before applying.'));
const lk = el('button', 'lk', 'Open in Job explorer →'); lk.type = 'button'; lk.onclick = () => CO.drill(T.find((x) => x[0] === os.spt)[1], sel.map((r) => r.id), 'sponsor'); hd.append(hx, lk); lc.append(hd);
const g = el('div', 'sgrid');
sel.slice(0, 30).forEach((r) => { const row = el('div', 'srow'); const t = el('div'); t.append(el('b', null, r.role), el('span', null, r.organisation), el('small', null, CO.plain(r.sponsorship))); row.append(sqav(r.organisation), t, el('span', 'fs2', CO.fitNum(r.fit) == null ? '—' : String(CO.fitNum(r.fit)))); row.onclick = () => CO.open(r.id); g.append(row); });
if (!sel.length) g.append(el('div', 'empty', 'Nothing in this group.'));
lc.append(g); h.append(lc);
});
os.dsf = os.dsf || 'recent'; os.dmax = os.dmax || 24;
dash.draw('discover', (h) => {
h.replaceChildren();
const d = CO.jobsNow(); if (d.status !== 'ok') return;
const today = CO.todayIso(), since = CO.addDays(today, -14);
const dated = d.data.filter((r) => CO.addedIso(r)), recent = dated.filter((r) => CO.addedIso(r) >= since);
const hi = recent.filter((r) => (CO.fitNum(r.fit) || 0) >= 8), toRev = d.data.filter((r) => CO.colOf(r) === 'apply' && !(r.notes_log || []).length && !(r.aprep || []).length);
const kp = el('div', 'kpis k4');
[['Added in last 14 days', recent, 'i-brief', 'From the daily search and you'], ['Fit 8 or above', hi, 't-green i-send', 'Strong matches added recently'], ['To review', toRev, 't-amber i-clock', 'Open roles with no notes or checklist yet'], ['Closing in 7 days', d.data.filter((r) => CO.colOf(r) === 'apply' && r.deadline && CO.daysTo(r.deadline) <= 7 && CO.daysTo(r.deadline) >= 0), 't-red i-check', 'Apply first']].forEach(([lab, l, cls, desc]) => { const c = el('div', 'kpi ' + cls); c.append(el('span', 'k', lab), el('b', null, String(l.length)), el('span', 'm', desc)); CO.clk(c, lab, l.map((r) => r.id), 'discover'); kp.append(c); });
h.append(kp);
const card = el('div', 'card'); const hd = el('div', 'dhead'); const hx = el('div');
const last = dated.map(CO.addedIso).sort().pop();
hx.append(el('h2', null, 'Opportunity feed'), el('p', 'note', 'Latest addition: ' + (last ? CO.fmtDay(last) : '—') + ' · newest first'));
const seg = el('div', 'seg2'); [['recent', 'Last 14 days'], ['high', 'High fit'], ['review', 'To review'], ['all', 'All dated']].forEach(([k, t]) => { const b = el('button', os.dsf === k ? 'on' : '', t); b.type = 'button'; b.onclick = () => { os.dsf = k; os.dmax = 24; dash.draw('discover'); }; seg.append(b); });
hd.append(hx, seg); card.append(hd);
let list = os.dsf === 'recent' ? recent : os.dsf === 'high' ? d.data.filter((r) => (CO.fitNum(r.fit) || 0) >= 8 && CO.colOf(r) === 'apply') : os.dsf === 'review' ? toRev : dated;
list = list.slice().sort((a, b) => String(CO.addedIso(b)).localeCompare(String(CO.addedIso(a))) || (CO.fitNum(b.fit) || 0) - (CO.fitNum(a.fit) || 0));
const g = el('div', 'dgrid');
list.slice(0, os.dmax).forEach((r) => {
const c = el('div', 'dcard'); const tp = el('div', 'top2'); const tx = el('div'); tx.append(el('b', null, r.organisation), el('span', null, CO.addedIso(r) ? 'Added ' + CO.fmtDay(CO.addedIso(r)) : 'Date not recorded')); tp.append(sqav(r.organisation), tx);
const f = CO.fitNum(r.fit); const fit = el('span', 'fitn'); fit.append(f == null ? '—' : String(f), el('small', null, ' /10 fit'));
const k = CO.spKind(r.sponsorship); const r1 = el('div', 'row'); r1.append(fit, el('span', 'badge ' + (k === 'ok' ? 'green' : k === 'warn' ? 'amber' : ''), CO.SP[k][0]));
const r2 = el('div', 'row'); const rv = el('button', 'btn sm', 'Review →'); rv.type = 'button'; rv.onclick = (e) => { e.stopPropagation(); CO.open(r.id); }; r2.append(colPill(r), rv);
c.append(tp, el('h3', null, r.role), el('div', 'loc', [r.location, CO.orgType(r)].filter(Boolean).join(' · ')), r1, r2);
c.onclick = () => CO.open(r.id); g.append(c);
});
if (!list.length) g.append(el('div', 'empty', 'Nothing here yet.'));
card.append(g);
if (list.length > os.dmax) { const more = el('div', 'pacts'); more.style.marginTop = '16px'; const b = el('button', 'btn', 'Show more (' + (list.length - os.dmax) + ' left)'); b.type = 'button'; b.onclick = () => { os.dmax += 24; dash.draw('discover'); }; more.append(b); card.append(more); }
h.append(card);
});
ICONS.shield = ['M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z', 'M9 12l2 2 4-4'];
const JDESC = ['Role tracked', 'Submission recorded', 'Call, test or task', 'Interview process', 'Offer outcome', 'CoS, visa and start'];
const journey = (r) => {
const L = ladderAt(r), s = r.steps || {}, scr = /^screening/i.test(r.interview_status || '') || !!s.screening;
const box = el('div', 'jny');
LADDER.forEach((label, i) => {
const skip = i === 2 && !scr && L.at > 2, bad = !!L.bad && i === L.at;
const done = !bad && !skip && (i < L.at || (L.done && i === L.at));
const cls = bad ? ' bad' : skip ? ' skip' : done ? ' done' : i === L.at && !L.bad ? ' now' : '';
const dk = ['', 'applied', 'screening', 'interview', 'offer', 'accepted'][i], w2 = ['applied', 'interview', 'offer'].includes(dk) ? CO.when(r, dk) : {d: s[dk]}, dd = dk && !w2.est && w2.d;
const st = el('div', 'js' + cls); st.append(el('b', null, (done ? '✓ ' : i === L.at && !bad ? '● ' : bad ? '✕ ' : '') + (bad ? L.bad : label)), el('span', null, dd && (done || i === L.at) ? CO.fmtDay(dd) : skip ? 'Skipped' : JDESC[i]));
box.append(st);
});
return box;
};
const readView = (r) => {
const c = CO.colOf(r), f = CO.fitNum(r.fit), st = r.interview_status || '';
const w = el('div', 'jd');
if (CO.lastSave && CO.lastSave.id === r.id && (Date.now() - CO.lastSave.at < 25000 || CO.SAVING[r.id])) w.append(noticeBox(CO.lastSave, true));
const cr = el('div', 'jcrumb'); const bk = el('button', 'lk', '← All jobs'); bk.type = 'button'; bk.onclick = () => CO.close(); cr.append(bk, el('span', null, '/'), el('span', null, r.organisation), el('span', null, '/'), el('b', null, r.id)); w.append(cr);
const hc = el('div', 'jhead'); const L0 = el('div', 'jh-l'); const tx = el('div');
tx.append(el('div', 'jorg', r.organisation), el('h1', null, r.role));
const chips = el('div', 'jchips'); const chip = (ic, t, cls) => { if (!t) return; const x = el('span', 'jchip' + (cls ? ' ' + cls : '')); x.append(CO.icon(ic), t); chips.append(x); };
const loc = String(r.location || '').trim(), dl = CO.daysTo(r.deadline);
chip('brief', CO.orgType(r)); chip('pin', loc ? loc.split(/[;—]/)[0].trim().replace(/\s*\/\s*/g, ', ') : ''); chip('cal', r.deadline ? CO.fmtDay(r.deadline) + (dl != null && dl >= 0 && c === 'apply' ? ' · ' + (dl === 0 ? 'closes today' : dl + (dl === 1 ? ' day left' : ' days left')) : '') : r.deadline_text, dl != null && dl >= 0 && dl <= 3 && c === 'apply' ? 'hot' : ''); chip('pound', r.salary && !/not stated/i.test(r.salary) ? r.salary : '');
tx.append(chips); L0.append(el('div', 'jav', CO.initials(r.organisation)), tx);
const R0 = el('div', 'jh-r'); const sc = el('div', 'jscore'); sc.append(el('b', null, f == null ? '—' : String(f)), el('span', null, '/ 10 match'));
const bt = el('div', 'jbtns'); if (CO.canEdit) { const e2 = el('button', 'btn'); e2.type = 'button'; e2.append(CO.icon('edit'), 'Edit'); e2.onclick = () => CO.startEdit(r.id); bt.append(e2); }
if (CO.isUrl(r.url)) { const a = el('a', 'btn pri'); a.append('Job advert ', CO.icon('ext')); a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; bt.append(a); }
R0.append(sc, bt); hc.append(L0, R0); w.append(hc);
const jc = el('div', 'card'); const jh = el('div', 'chh'); const jx = el('div'); jx.append(el('h2', null, 'Application journey'), el('p', 'note', 'Each step records the day it happened. Sponsorship is checked separately.')); const tg = el('div', 'tags'); tg.append(colPill(r)); const sp = savePill(r.id); if (sp) tg.append(sp); jh.append(jx, tg); jc.append(jh, journey(r)); w.append(jc);
const cols = el('div', 'jcols'), L = el('div', 'jl'), R = el('div', 'jr');
const nl = Array.isArray(r.notes_log) ? r.notes_log.length : 0, hl = Array.isArray(r.history) ? r.history.length : 0, hasPrep = ['interview', 'offer'].includes(c);
const TABS = [['overview', 'Overview'], ['notes', 'Notes' + (nl ? ' · ' + nl : '')]].concat(hasPrep ? [['prep', 'Interview prep']] : []).concat([['activity', 'Activity' + (hl ? ' · ' + hl : '')]]);
let tab = os.ptab; if (!TABS.some((x) => x[0] === tab)) tab = 'overview';
const tb = el('div', 'jtabs'); tb.setAttribute('role', 'tablist');
for (const [k, lab] of TABS) { const b = el('button', tab === k ? 'on' : '', lab); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(tab === k)); b.onclick = () => { os.ptab = k; dash.draw('panel'); }; tb.append(b); }
L.append(tb);
const card = (title, kids, badge) => { const s = el('div', 'card'); if (title) { const hh = el('div', 'chh'); hh.append(el('h2', null, title)); if (badge) hh.append(badge); s.append(hh); } kids.forEach((k) => k && s.append(k)); L.append(s); return s; };
const tiles = (pairs) => { const g = el('div', 'tiles'); pairs.forEach(([a, b]) => { if (!b || b === '—') return; const t = el('div', 'tile'); t.append(el('span', null, a), el('b', null, b)); g.append(t); }); return g; };
if (tab === 'overview') {
if (c === 'offer' && /accepted/i.test(st)) card('Sponsorship & start date', [visaBox(r)]);
const why = CO.fitWhy(r), kids = [];
if (why.reason || r.jd_focus) kids.push(el('div', 'prose', why.reason || r.jd_focus));
if (why.reason && r.jd_focus) kids.push(el('div', 'callout', r.jd_focus));
if (why.hits.length) { const tg2 = el('div', 'tags'); tg2.style.marginTop = '10px'; why.hits.forEach((x) => tg2.append(pill(x, 'green'))); kids.push(tg2); }
why.gaps.forEach((g2) => kids.push(el('div', 'callout warn', 'Gap to address: ' + g2)));
kids.push(tiles([['Organisation', r.organisation], ['Employer type', CO.orgType(r)], ['Location', loc], ['Salary', r.salary], ['Closing date', r.deadline ? CO.fmtDay(r.deadline) : r.deadline_text], ['Application status', CO.sub(r)]]));
card('Opportunity summary', kids, el('span', 'badge blue', (f == null ? '—' : f) + ' / 10 fit'));
const k = CO.spKind(r.sponsorship);
const sk = [el('div', 'callout' + (k === 'ok' ? ' ok' : ''), CO.plain(r.sponsorship) || 'No evidence recorded yet.')];
if (k === 'warn') sk.push(el('div', 'callout warn', 'A sponsor licence does not guarantee sponsorship for this vacancy. Confirm with the employer before you invest time in the application.'));
if (r.legal_entity) sk.push(tiles([['Legal entity', r.legal_entity], ['Last verified', r.last_verified]]));
card('Sponsorship & right-to-work evidence', sk, el('span', 'badge ' + (k === 'ok' ? 'green' : k === 'warn' ? 'amber' : ''), CO.SP[k][0]));
const src = [tiles([['Source', r.source], ['Added', r.added], ['Last verified', r.last_verified], ['Reference', r.id]])];
if (r.notes) src.push(el('div', 'callout', r.notes));
card('Source & traceability', src);
if (CO.canEdit) { const det = el('details', 'more2'); det.append(el('summary', null, 'Fix the stage by hand')); det.append(el('div', 'small', 'Only to correct a mistake. For normal progress use Next best action.')); const ml = el('label', 'msel'); ml.append(el('span', null, 'Set the stage'), moveSelect(r)); det.append(ml); L.append(det); }
} else if (tab === 'notes') card('Your notes', [notesBox(r)]);
else if (tab === 'prep') card('Interview preparation', [prepBox(r)]);
else { const hi = el('div', 'tl'); (r.history || []).slice().reverse().forEach((x) => { const row = el('div'); row.append(el('i'), el('span', 'tt', x.at ? d3.timeFormat('%-d %b %Y · %H:%M')(new Date(x.at)) : ''), el('span', null, x.what || '')); hi.append(row); }); if (!hl) hi.append(el('div', 'small', 'No activity yet.')); card('Activity', [hi]); }
if (CO.SAVING[r.id] === 'error') { const m = el('div', 'msg err'); m.append('Not saved: ' + (CO.ERR[r.id] || '') + ' '); const b = el('button', 'btn sm', 'Retry'); b.type = 'button'; b.onclick = CO.retry; m.append(b); R.append(m); }
const ac = actionCard(r); R.append(ac);
if (!CO.canEdit) R.append(el('div', 'msg', window.CAREER_OS_RO || 'View only here.'));
const kf = el('div', 'card'); kf.append(el('h2', null, 'Key facts'));
kf.append(tiles([['Match', f == null ? '—' : f + '/10'], ['Deadline', r.deadline ? CO.fmtDay(r.deadline) : (r.deadline_text || '—')], ['Stage', CO.COLS[c][0]], ['Interview', CO.ivParse(r.interview_datetime) ? CO.fmtDay(CO.ivParse(r.interview_datetime).ms) : 'Not set'], ['Applied', r.applied_on ? CO.fmtDay(r.applied_on) : ''], ['Follow up', r.follow_up ? CO.fmtDay(r.follow_up) : '']]));
const fb = el('div', 'fitbar'); const fi = el('i'); fi.style.width = (f == null ? 0 : f * 10) + '%'; fb.append(fi); kf.append(fb); R.append(kf);
cols.append(L, R); w.append(cols);
return w;
};
/* ---------- Career intelligence: insights, segments, waiting time, pace, benchmarks ---------- */
os.seg = os.seg || 'type';
const daysSince = (iso) => (iso ? Math.round((CO.todayUtc() - Date.parse(iso + 'T00:00:00Z')) / 864e5) : null);
const pctN = (a, b) => (b ? Math.round(a / b * 100) : 0);
dash.draw('intel', (h) => {
h.replaceChildren();
const d = CO.jobsNow(); if (d.status !== 'ok') return;
const F = CO.facts(d.data), ids = (l) => l.map((f) => f.r.id);
const waitL = F.filter((f) => !f.iv && !f.rej && !f.off && !f.noreply && !f.wd);
const ivR = pctN(F.filter((f) => f.iv).length, F.length), ivs = F.filter((f) => f.iv), offR = pctN(F.filter((f) => f.off).length, ivs.length);
const old = waitL.filter((f) => !f.est && daysSince(f.ap) > 14);
const wk = (n) => F.filter((f) => !f.est && f.ap && daysSince(f.ap) >= n * 7 && daysSince(f.ap) < (n + 1) * 7);
const segBy = (key) => { const m = {}; F.forEach((f) => { const k = key(f); (m[k] = m[k] || []).push(f); }); return Object.entries(m).map(([k, l]) => ({k, l, iv: l.filter((f) => f.iv), rej: l.filter((f) => f.rej), wait: l.filter((f) => waitL.includes(f))})).sort((a, b) => b.l.length - a.l.length); };
const FAMS = [['Business / Systems Analyst', /analyst|business architect/i], ['Product Manager', /product manager|head of product|product lead/i], ['Product Owner', /product owner/i], ['Project / Delivery / Change', /project|programme|delivery|change|transformation|scrum/i], ['Data / BI / AI', /data|insight|intelligence|analytics/i], ['Implementation / CRM', /implementation|crm|salesforce|consultant|specialist/i]];
const SEG = {type: ['Employer type', (f) => CO.orgType(f.r)], role: ['Role type', (f) => (FAMS.find((x) => x[1].test(f.r.role)) || ['Other'])[0]], spons: ['Sponsorship', (f) => CO.SP[CO.spKind(f.r.sponsorship)][0]], fit: ['Fit score', (f) => { const v = CO.fitNum(f.r.fit); return v == null ? 'No score' : v >= 9 ? '9 and above' : v >= 8 ? '8 to 8.9' : v >= 7 ? '7 to 7.9' : 'Below 7'; }]};
// insights
const ins = [];
const best = segBy(SEG.type[1]).filter((s) => s.l.length >= 3).sort((a, b) => b.iv.length / b.l.length - a.iv.length / a.l.length)[0];
ins.push(['📈', 'Your interview rate is ' + ivR + '%', ivR >= 10 ? 'That is above the 2–10% most job seekers see, so your targeting is working. Keep the same focus.' : ivR >= 4 ? 'That is within the typical 2–10% range. Tailoring each application more closely to the advert is the usual way to lift it.' : 'That is below the typical 2–10% range. Apply to fewer, closer-fit roles and tailor each CV.', null]);
if (best) ins.push(['🏆', 'Strongest segment: ' + best.k, pctN(best.iv.length, best.l.length) + '% of your ' + best.l.length + ' applications here reached interview. Lean into roles like these.', best.iv]);
if (old.length) ins.push(['⏳', old.length + ' application' + (old.length === 1 ? ' has' : 's have') + ' waited over 14 days', 'Most employers reply within one to two weeks. Send a short follow-up, or mark them as No reply to keep your pipeline honest.', old]);
const hi = F.filter((f) => (CO.fitNum(f.r.fit) || 0) >= 8.5), lo = F.filter((f) => { const v = CO.fitNum(f.r.fit); return v != null && v < 8.5; });
if (hi.length >= 3 && lo.length >= 3) { const a = pctN(hi.filter((f) => f.iv).length, hi.length), b = pctN(lo.filter((f) => f.iv).length, lo.length); ins.push(['🎯', a >= b ? 'Higher fit scores do pay off' : 'Fit score is not predicting interviews yet', 'Fit 8.5+ roles reached interview ' + a + '% of the time, against ' + b + '% for lower scores.' + (a >= b ? ' Prioritise 8.5+ roles when time is short.' : ' Check whether the scoring reflects what employers value.'), hi.filter((f) => f.iv)]); }
const active = waitL.length + F.filter((f) => f.iv && !f.rej && !f.off).length;
ins.push(['🧭', active + ' live applications in play', active < 6 ? 'Research on 260,000 job seekers found 6–15 live applications converts best. Add a few strong-fit roles this week.' : active <= 15 ? 'You are in the 6–15 range that converts best in large studies. Good balance.' : 'More than 15 live at once can thin out tailoring. Focus on the strongest fits.', waitL]);
const card1 = el('div', 'card'); card1.append(el('h2', null, 'Key insights'), el('p', 'note', 'Worked out from your own tracker, compared with published job-search research.'));
const il = el('div', 'ins'); ins.forEach(([ic, t, s, l]) => { const row = el('div', 'insr'); row.append(el('span', 'ii', ic)); const tx = el('div'); tx.append(el('b', null, t), el('span', null, s)); row.append(tx); if (l && l.length) { const b = el('button', 'lk', 'See ' + l.length + ' →'); b.type = 'button'; b.onclick = () => CO.drill(t, ids(l), 'analytics'); row.append(b); } il.append(row); });
card1.append(il); h.append(card1);
// segments
const card2 = el('div', 'card'); const hd = el('div', 'dhead'); const hx = el('div'); hx.append(el('h2', null, 'Where you win'), el('p', 'note', 'Interview rate for each group of applications you sent. Click a row to see those roles.'));
const sg = el('div', 'seg2'); Object.entries(SEG).forEach(([k, [lab]]) => { const b = el('button', os.seg === k ? 'on' : '', lab); b.type = 'button'; b.onclick = () => { os.seg = k; dash.draw('intel'); }; sg.append(b); });
hd.append(hx, sg); card2.append(hd);
const tb = el('div', 'segt'); const th = el('div', 'sgr sgh'); ['Group', 'Applied', 'Interview rate', 'Interviews', 'Rejected', 'Waiting'].forEach((x) => th.append(el('span', null, x))); tb.append(th);
const rows = segBy(SEG[os.seg][1]); const maxR = Math.max(1, ...rows.map((s) => pctN(s.iv.length, s.l.length)));
rows.forEach((s) => { const r = el('div', 'sgr'); const rate = pctN(s.iv.length, s.l.length); const bar = el('span', 'sgb'); const tr = el('i'); const fl = el('b'); fl.style.width = (rate / maxR * 100) + '%'; tr.append(fl); bar.append(tr, el('em', null, rate + '%')); r.append(el('span', 'sgk', s.k), el('span', null, String(s.l.length)), bar, el('span', null, String(s.iv.length)), el('span', null, String(s.rej.length)), el('span', null, String(s.wait.length))); CO.clk(r, SEG[os.seg][0] + ': ' + s.k, ids(s.l)); tb.append(r); });
card2.append(tb); h.append(card2);
// waiting + pace
const g = el('div', 'grid g2r');
const c3 = el('div', 'card'); c3.append(el('h2', null, 'How long you have been waiting'), el('p', 'note', 'Applications with no reply yet, by days since you applied. Most replies arrive within about a week.'));
const B = [['0–7 days', 0, 7, 'var(--acc)'], ['8–14 days', 8, 14, 'var(--brand)'], ['15–30 days', 15, 30, '#d9842e'], ['Over 30 days', 31, 1e4, '#d25358']];
const dated = waitL.filter((f) => !f.est && f.ap), mx = Math.max(1, ...B.map(([, a, b]) => dated.filter((f) => daysSince(f.ap) >= a && daysSince(f.ap) <= b).length));
B.forEach(([lab, a, b, col]) => { const l = dated.filter((f) => daysSince(f.ap) >= a && daysSince(f.ap) <= b); const row = el('div', 'brow'); const tr = el('div', 'btrack'); const fl = el('div', 'bfill'); fl.style.width = Math.max(2, l.length / mx * 100) + '%'; fl.style.background = col; tr.append(fl); row.append(el('span', null, lab), tr, el('span', 'bval', String(l.length))); c3.append(CO.clk(row, 'Waiting ' + lab, ids(l))); });
const und = waitL.length - dated.length; if (und) c3.append(el('p', 'small', und + ' waiting applications have no exact applied date, so they are left out. Add dates in the card above.'));
g.append(c3);
let tgt = 10; try { tgt = Number(localStorage.getItem('careeros-target')) || 10; } catch (e) {}
const c4 = el('div', 'card'); const h4 = el('div', 'chh'); const x4 = el('div'); x4.append(el('h2', null, 'Weekly pace'), el('p', 'note', 'Applications sent in each of the last 8 weeks, against your weekly target.'));
const sel = el('select', 'tgt'); [5, 10, 15, 20].forEach((n) => { const o = new Option('Target ' + n + ' / week', String(n)); if (n === tgt) o.selected = true; sel.append(o); }); sel.onchange = () => { try { localStorage.setItem('careeros-target', sel.value); } catch (e) {} dash.draw('intel'); };
h4.append(x4, sel); c4.append(h4);
const W = [7, 6, 5, 4, 3, 2, 1, 0].map((n) => ({n, l: wk(n)})), wm = Math.max(tgt, ...W.map((x) => x.l.length));
const cols = el('div', 'pace'); const line = el('i', 'tline'); line.style.bottom = 'calc(20px + ' + (tgt / wm).toFixed(3) + ' * (100% - 44px))'; cols.append(line);
W.forEach(({n, l}) => { const c = el('div', 'pc'); const bar = el('i'); bar.style.height = 'calc(' + Math.max(0.02, l.length / wm).toFixed(3) + ' * (170px - 44px))'; bar.style.background = l.length >= tgt ? 'var(--acc)' : 'var(--brand)'; c.append(el('b', null, String(l.length)), bar, el('span', null, n === 0 ? 'This wk' : n + 'w ago')); CO.clk(c, 'Applied ' + (n === 0 ? 'in the last 7 days' : n + ' weeks ago'), ids(l)); cols.append(c); });
c4.append(cols);
const thisWk = W[7].l.length; c4.append(el('p', 'small', thisWk >= tgt ? 'Target met for the last 7 days. Quality now matters more than more volume.' : (tgt - thisWk) + ' more to reach this week\'s target. Research suggests around 10–15 well-tailored applications a week works better than mass applying.'));
g.append(c4); h.append(g);
// benchmarks
const c5 = el('div', 'card'); c5.append(el('h2', null, 'How you compare'), el('p', 'note', 'Your numbers next to published job-search benchmarks. Benchmarks vary a lot by field and seniority, so treat them as a rough guide.'));
const bm = el('div', 'bmg');
const bmk = (lab, you, lo, hiV, unit, src) => { const t = el('div', 'bm'); const pos = Math.min(100, you / (hiV * 1.6) * 100); const bar = el('div', 'bmb'); const band = el('i', 'band'); band.style.left = (lo / (hiV * 1.6) * 100) + '%'; band.style.width = ((hiV - lo) / (hiV * 1.6) * 100) + '%'; const dot = el('i', 'dot'); dot.style.left = pos + '%'; bar.append(band, dot); t.append(el('span', 'k', lab), el('b', null, you + unit), bar, el('span', 'small', 'Typical ' + lo + '–' + hiV + unit + ' · ' + src)); bm.append(t); };
bmk('Application → interview', ivR, 2, 10, '%', '30–50 applications per interview is common');
bmk('Interview → offer', offR, 20, 33, '%', 'about 3–5 interviews per offer');
bmk('Heard back at all', pctN(F.length - waitL.length, F.length), 45, 55, '%', 'about half of applicants were ignored in 2025');
c5.append(bm); h.append(c5);
});
/* ---------- Interviews page ---------- */
dash.draw('ivcards', (h) => {
h.replaceChildren();
const d = CO.jobsNow();
if (d.status === 'error') { CO.failBox(h); return; }
if (d.status !== 'ok') return;
const rows = d.data.filter((r) => ['interview', 'offer'].includes(CO.colOf(r))).sort(SORTS.next);
if (!rows.length) { h.append(el('div', 'card empty', 'No interviews yet. They appear here as soon as a role moves to Interview.')); return; }
const up = [], wait = [], off = [];
for (const r of rows) { if (CO.colOf(r) === 'offer') { off.push(r); continue; } const p = CO.ivParse(r.interview_datetime), st = r.interview_status || ''; if (/^interviewed/i.test(st) || (p && Math.round((p.ms - CO.todayUtc()) / 864e5) < 0)) wait.push(r); else up.push(r); }
const head = (t2, sub, n2) => { const x = el('div', 'ivh'); x.append(el('h2', null, t2), el('span', 'pill', String(n2)), el('span', 'small', sub)); h.append(x); };
const big = (r) => {
const n = CO.next(r), p = CO.ivParse(r.interview_datetime);
const c = el('div', 'card ivc u-' + n.u);
const hd = el('div', 'rc'); const t = el('div'); t.append(el('span', 'o', r.organisation), el('span', 'r small', r.role)); hd.append(CO.av(r.organisation), t);
const dd = p ? Math.round((p.ms - CO.todayUtc()) / 864e5) : null;
const wh = el('div', 'ivwhen'); const cal = el('div', 'cal'); cal.append(el('b', null, p ? d3.utcFormat('%-d')(new Date(p.ms)) : '?'), el('span', null, p ? d3.utcFormat('%b')(new Date(p.ms)) : 'TBC'));
const wt = el('div'); wt.append(el('b', null, p ? d3.utcFormat('%A')(new Date(p.ms)) + (p.time ? ' · ' + p.time : '') : 'Date to confirm'), el('span', 'small', [p ? (String(r.interview_datetime || '').split('—')[1] || '').trim() : '', dd != null ? (dd === 0 ? 'today' : dd === 1 ? 'tomorrow' : 'in ' + dd + ' days') : ''].filter(Boolean).join(' · ')));
wh.append(cal, wt);
const acts = el('div', 'pacts'); const b1 = el('button', 'btn sm', 'Details'); b1.type = 'button'; b1.onclick = () => CO.open(r.id); acts.append(b1);
if (CO.canEdit) { const a0 = CO.actions(r).find((a) => a.pri) || CO.actions(r)[0]; if (a0) { const b2 = el('button', 'btn sm blue', a0.l); b2.type = 'button'; b2.onclick = () => runAction(r, a0); acts.append(b2); } }
c.append(hd, wh, prepBox(r), acts); return c;
};
const small = (r) => {
const n = CO.next(r);
const c = el('div', 'ivrow u-' + n.u); const t = el('div'); t.append(el('b', null, r.organisation), el('span', 'small', r.role));
const st = el('div', 'ivst'); st.append(el('b', null, n.t), el('span', 'small', n.s));
const acts = el('div', 'pacts');
if (CO.canEdit) { const a0 = CO.actions(r).find((a) => a.pri) || CO.actions(r)[0]; if (a0) { const b2 = el('button', 'btn sm blue', a0.l); b2.type = 'button'; b2.onclick = (e) => { e.stopPropagation(); runAction(r, a0); }; acts.append(b2); } }
c.append(CO.av(r.organisation), t, st, acts); c.onclick = () => CO.open(r.id); c.tabIndex = 0; c.onkeydown = (e) => { if (e.key === 'Enter') CO.open(r.id); }; return c;
};
if (up.length) { head('Coming up', 'Prepare with the checklist; ticks save to the role.', up.length); const g = el('div', 'ivg2'); up.forEach((r) => g.append(big(r))); h.append(g); }
if (wait.length) { head('Waiting for the outcome', 'Interviews that have happened. Record the result when you hear back.', wait.length); const l = el('div', 'card flush ivlist'); wait.forEach((r) => l.append(small(r))); h.append(l); }
if (off.length) { head('Offers', 'Respond, then track sponsorship and your start date.', off.length); const l = el('div', 'card flush ivlist'); off.forEach((r) => l.append(small(r))); h.append(l); }
});
dash.draw('funnel', (h) => {
h.replaceChildren();
const d = dash.data('funnel'); if (chartFail(h, d)) return;
const max = d.data[0].n || 1, col = ['var(--c1)', 'var(--c2)', 'var(--acc)', 'var(--gold)'];
d.data.forEach((r, i) => {
const row = el('div', 'fs'); const tr = el('div', 'btrack'); const f = el('div', 'bfill'); f.style.width = Math.max(2, r.n / max * 100) + '%'; f.style.background = col[i]; tr.append(f);
const prev = i ? d.data[i - 1].n : 0;
row.append(el('span', null, r.step), tr, el('span', 'bval', r.n + (i ? ' · ' + (prev ? CO.pct(r.n / prev) : '—') + ' kept' : '')));
tipOn(h, row, r.step + ': ' + r.n + (i ? ' (' + CO.pct(r.n / max) + ' of tracked)' : '')); h.append(row);
});
});
dash.draw('donut', (h) => {
h.replaceChildren();
const d = dash.data(h.dataset.source); if (chartFail(h, d)) return;
const colors = ['var(--c2)', 'var(--acc)', 'var(--gold)', 'var(--color-bad)', 'color-mix(in srgb, var(--color-warn) 70%, transparent)', 'color-mix(in srgb, var(--color-fg-muted) 60%, transparent)'];
const total = d3.sum(d.data, (r) => r.n);
const size = 140, svg = svgEl('svg', {viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-label': 'Outcomes of ' + total + ' applications'});
const g = svgEl('g', {transform: 'translate(' + size / 2 + ',' + size / 2 + ')'}); svg.append(g);
const arcs = d3.pie().value((r) => r.n).sort(null)(d.data), arc = d3.arc().innerRadius(44).outerRadius(66).padAngle(0.02).cornerRadius(3);
arcs.forEach((a, i) => { if (!a.data.n) return; const p = svgEl('path', {d: arc(a)}); p.style.fill = colors[i]; g.append(p); tipOn(h, p, a.data.label + ': ' + a.data.n + ' of ' + total); });
const t1 = svgEl('text', {'text-anchor': 'middle', dy: '0.1em', 'font-size': 24, 'font-weight': 650, fill: 'currentColor'}); t1.textContent = total; g.append(t1);
const t2 = svgEl('text', {'text-anchor': 'middle', dy: '1.6em', 'font-size': 10.5, fill: 'currentColor', opacity: '.6'}); t2.textContent = 'applications'; g.append(t2);
const lg = el('div', 'legend');
d.data.forEach((r, i) => { const line = el('div'); const sw = el('i'); sw.style.background = colors[i]; line.append(sw, r.label + ' — ' + r.n + ' (' + CO.pct(total ? r.n / total : 0) + ')'); lg.append(line); });
h.append(svg, lg);
});
dash.draw('bars', (h) => {
h.replaceChildren();
const d = dash.data(h.dataset.source); if (chartFail(h, d)) return;
const key = h.dataset.key, val = h.dataset.val, isPct = h.dataset.fmt === 'pct';
const max = isPct ? 1 : (d3.max(d.data, (r) => r[val]) || 1), col = palette();
if (!d.data.some((r) => r[val])) { h.append(el('div', 'empty', 'Nothing to show yet.')); return; }
d.data.forEach((r, i) => {
const row = el('div', 'brow'); const tr = el('div', 'btrack'); const f = el('div', 'bfill');
f.style.width = Math.max(2, r[val] / max * 100) + '%'; f.style.background = col[i % 4];
tr.append(f); row.append(el('span', null, r[key]), tr, el('span', 'bval', isPct ? CO.pct(r[val]) : String(r[val])));
tipOn(h, row, r[key] + ': ' + (isPct ? CO.pct(r[val]) + (r.applied != null ? ' (' + r.interviews + ' of ' + r.applied + ')' : '') : r[val] + ' roles'));
CO.drillRow(row, h.dataset.source, r[key]);
h.append(row);
});
});
dash.draw('colsgen', (h) => {
h.replaceChildren();
const d = dash.data(h.dataset.source); if (chartFail(h, d)) return;
const max = d3.max(d.data, (r) => r.n) || 1;
d.data.forEach((r, i) => {
const c = el('div', 'cbar'); const bar = el('i');
bar.style.height = Math.max(4, r.n / max * 120) + 'px'; bar.style.background = r.label === 'Not stated' ? 'color-mix(in srgb, var(--color-fg-muted) 45%, transparent)' : 'var(--acc)';
if (r.label !== 'Not stated') bar.style.opacity = String(0.5 + 0.5 * (i + 1) / d.data.length);
c.append(el('b', null, String(r.n)), bar, el('span', null, r.label));
tipOn(h, c, r.label + ': ' + r.n + ' roles'); CO.drillRow(c, h.dataset.source, r.label); h.append(c);
});
});
const critRows = (h) => { const d = dash.data('criteria'); if (d.status !== 'ok') return null; const groups = (h.dataset.group || '').split('|'); return d.data.filter((r) => groups.includes(r.group)); };
dash.draw('critkpis', (h) => {
h.replaceChildren();
const d = dash.data('criteria'); if (chartFail(h, d)) return;
const tones = ['t-green', '', 't-purple', 't-amber'];
d.data.filter((r) => r.group === 'Headline').forEach((r, i) => { const c = el('div', 'kpi ' + tones[i % 4]); c.append(el('span', 'k', r.label), el('b', 'big2', r.value)); h.append(c); });
});
dash.draw('critlist', (h) => { h.replaceChildren(); const rows = critRows(h); if (!rows) { if (dash.data('criteria').status === 'error') CO.failBox(h); return; } for (const r of rows) h.append(el('div', null, r.label ? r.label + ': ' + r.value : r.value)); });
dash.draw('critrows', (h) => { h.replaceChildren(); const rows = critRows(h); if (!rows) { if (dash.data('criteria').status === 'error') CO.failBox(h); return; } for (const r of rows) { const c = el('div', 'crow'); c.append(el('b', null, r.label || r.group), el('span', null, /daily search time/i.test(r.label || '') ? '08:52 Europe/London' : r.value)); h.append(c); } });

CO.dataMsg = ''; CO.dataErr = false; CO.importPlan = null; CO.backups = null; CO.confirmId = '';
dash.draw('dataMsg', (h) => { h.className = 'msg' + (CO.dataErr ? ' err' : ''); h.textContent = CO.dataMsg; });
dash.draw('importPrev', (h) => {
h.replaceChildren();
const p = CO.importPlan; if (!p) return;
if (p.error) { h.append(el('div', 'msg err', p.error)); return; }
const box = el('div', 'box'); box.append(el('b', null, p.name), el('div', 'small', p.updated.length + ' roles will be updated, ' + p.added.length + ' added, ' + p.same + ' unchanged' + (p.bad ? ', ' + p.bad + ' rows skipped (missing id, organisation or role)' : '') + '. Nothing is deleted.'));
const acts = el('div', 'pacts');
const go = el('button', 'btn pri', 'Import ' + (p.updated.length + p.added.length) + ' changes'); go.type = 'button'; go.disabled = !CO.canEdit || !(p.updated.length + p.added.length);
go.onclick = () => { for (const [r, patch] of p.updated) CO.saveRow(r, patch, 'Imported from ' + p.name, 0); if (p.added.length) CO.addRows(p.added); CO.importPlan = null; CO.dataMsg = 'Import started. Watch the status at the top right.'; CO.dataErr = false; CO.redrawAll(); };
const no = el('button', 'btn', 'Cancel'); no.type = 'button'; no.onclick = () => { CO.importPlan = null; CO.redrawAll(); };
acts.append(go, no); box.append(acts);
if (!CO.canEdit) box.append(el('div', 'small', 'Importing needs edit access.'));
h.append(box);
});
dash.draw('backups', (h) => {
h.replaceChildren();
if (!CO.canEdit) { h.append(el('div', 'empty', 'Backups are available to editors of this dashboard.')); return; }
if (CO.backups == null) { h.append(el('div', 'empty', 'Loading versions…')); CO.backups = []; CO.listBackups().then((list) => { CO.backups = list || []; CO.redrawAll(); }).catch(() => { CO.backups = []; CO.redrawAll(); }); return; }
if (!CO.backups.length) { h.append(el('div', 'empty', 'No earlier versions found yet.')); return; }
const cur = CO.meta && CO.meta.url ? CO.meta.url.split('/').pop() : '';
for (const a of CO.backups.slice(0, 20)) {
const row = el('div', 'bk'); const t = el('div'); t.append(el('b', null, a.createdAt ? d3.timeFormat('%a %-d %b %Y, %H:%M')(new Date(a.createdAt)) : a.id), el('span', null, Math.round(a.sizeBytes / 1024) + ' KB'));
row.append(t);
if (a.id === cur) row.append(pill('Current', 'green'));
else { const b = el('button', 'btn sm', CO.confirmId === a.id ? 'Click again to restore' : 'Restore'); b.type = 'button'; b.onclick = () => { if (CO.confirmId !== a.id) { CO.confirmId = a.id; CO.redrawAll(); return; } CO.confirmId = ''; CO.restore(a.id).then(() => { CO.dataMsg = 'Restored the version from ' + (a.createdAt ? d3.timeFormat('%-d %b %H:%M')(new Date(a.createdAt)) : a.id) + '.'; CO.dataErr = false; CO.redrawAll(); }).catch((e) => { CO.dataMsg = 'Restore failed: ' + ((e && e.message) || e); CO.dataErr = true; CO.redrawAll(); }); }; row.append(b); }
h.append(row);
}
});

const ALL = ['notice', 'addBtn', 'kpi', 'today', 'todayNote', 'todayLong', 'greet', 'fresh', 'saveState', 'freshDetail', 'conflicts', 'priorities', 'agenda', 'pipe', 'latest', 'jtable', 'convo', 'reports', 'idsBar', 'intel', 'crumb', 'nextMove', 'highfit', 'weekcal', 'sponsor', 'discover', 'count', 'tabcnt', 'bcnt', 'bcol', 'ivcards', 'panel', 'funnel', 'donut', 'bars', 'colsgen', 'critkpis', 'critlist', 'critrows', 'dataMsg', 'importPrev', 'backups'];
CO.redrawAll = () => ALL.forEach((n) => dash.draw(n));
const syncPanel = () => {
document.querySelectorAll('.os .ws').forEach((w) => w.classList.toggle('sel', !!os.sel));
document.querySelectorAll('.os .panel').forEach((p) => { p.hidden = !os.sel; });
};
const narrow = () => true;
CO.open = (id) => {
const was = os.sel; os.sel = id; if (was !== id) { os.edit = false; os.draft = null; os.ivForm = null; }
syncPanel(); CO.redrawAll();
setTimeout(() => { const p = document.querySelector('.os .panel'); if (p && narrow() && p.scrollIntoView) p.scrollIntoView({block: 'start'}); else if (p && p.getBoundingClientRect().top < 0 && p.scrollIntoView) p.scrollIntoView({block: 'start'}); }, 30);
};
CO.close = () => {
const id = os.sel; os.sel = ''; os.edit = false; os.draft = null; os.ivForm = null; os.add = null; syncPanel(); CO.redrawAll();
setTimeout(() => { const tr = document.querySelector('.os .page:not([hidden]) [data-key=' + JSON.stringify(id) + ']'); if (tr && tr.scrollIntoView) { tr.scrollIntoView({block: 'nearest'}); if (tr.focus) tr.focus({preventScroll: true}); } }, 40);
};
const PAGES = {sponsorship: 'sponsor', discovery: 'discover', today: 'today', applications: 'apps', pipeline: 'board', interviews: 'interviews', shortlist: 'shortlist', 'new-roles': 'new', analytics: 'analytics', criteria: 'criteria', data: 'data'};
const showPage = () => {
document.querySelectorAll('.os .page').forEach((p) => { p.hidden = p.dataset.name !== os.page; });
document.querySelectorAll('.os .nav button').forEach((b) => { if (b.dataset.page === os.page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
if (os.sel && narrow()) { os.sel = ''; syncPanel(); }
CO.redrawAll();
const sec = document.querySelector('.os .page:not([hidden])');
try { if (sec && sec.id) dash.setLink(sec.id); } catch (e) {}
const top = document.querySelector('.os .wrap'); if (top && top.getBoundingClientRect().top < 0 && top.scrollIntoView) top.scrollIntoView({block: 'start'});
};
const syncFilters = () => {
document.querySelectorAll('.os .tabs button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.stage || '') === os.stage)));
document.querySelectorAll('.os-f').forEach((x) => { x.value = os[x.dataset.key] || ''; x.classList.toggle('on', !!os[x.dataset.key]); });
document.querySelectorAll('.os-quick').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.quick === os.quick)));
document.querySelectorAll('.os .jt th[data-sort]').forEach((th) => { if (th.dataset.sort === os.sort) th.setAttribute('aria-sort', os.dir > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort'); });
document.querySelectorAll('.os-q').forEach((i) => { if (i !== document.activeElement) i.value = os.q; });
document.querySelectorAll('.os-sort').forEach((x) => { x.value = SORTS[os.sort] ? os.sort : 'deadline'; });
document.querySelectorAll('.os-group').forEach((x) => { x.value = os.group; });
};
CO.go = (page, opts) => {
os.page = page;
if (page === 'apps' && opts) { Object.assign(os, {stage: opts.stage || '', quick: opts.quick || ''}); syncFilters(); }
showPage();
const nv = document.querySelector('.os .nav'), cur = nv && nv.querySelector('[aria-current=page]');
if (cur && nv.scrollWidth > nv.clientWidth + 4) nv.scrollTo({left: Math.max(0, cur.offsetLeft - 70), behavior: 'smooth'});
};
document.querySelectorAll('.os .nav button').forEach((b) => b.addEventListener('click', () => CO.go(b.dataset.page)));
document.querySelectorAll('.os-go').forEach((b) => b.addEventListener('click', () => CO.go(b.dataset.go, b.dataset.go === 'apps' ? {stage: b.dataset.stage || '', quick: b.dataset.quick || ''} : null)));
document.querySelectorAll('.os .tabs button').forEach((b) => b.addEventListener('click', () => { os.stage = b.dataset.stage || ''; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-quick').forEach((b) => b.addEventListener('click', () => { os.quick = os.quick === b.dataset.quick ? '' : b.dataset.quick; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-f').forEach((x) => x.addEventListener('change', () => { os[x.dataset.key] = x.value; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-q').forEach((i) => i.addEventListener('input', () => { os.q = i.value; CO.redrawAll(); }));
document.querySelectorAll('.os-gq').forEach((i) => { i.addEventListener('input', () => { os.q = i.value; document.querySelectorAll('.os-q').forEach((x) => { x.value = i.value; }); if (os.sel) CO.close(); if (os.page !== 'apps') CO.go('apps'); else CO.redrawAll(); }); i.addEventListener('keydown', (e) => { if (e.key === 'Escape') { i.value = ''; os.q = ''; document.querySelectorAll('.os-q').forEach((x) => { x.value = ''; }); CO.redrawAll(); } }); });
document.querySelectorAll('.os-clear').forEach((b) => b.addEventListener('click', () => { Object.assign(os, {stage: '', q: '', sector: '', spons: '', fit: '', region: '', family: '', orgtype: '', quick: '', ids: null, idsLabel: '', sort: 'deadline', dir: 1}); syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os .jt th[data-sort]').forEach((th) => th.addEventListener('click', () => { const k = th.dataset.sort; if (os.sort === k) os.dir = -os.dir; else { os.sort = k; os.dir = 1; } syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-sort').forEach((x) => x.addEventListener('change', () => { os.sort = x.value; os.dir = 1; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-group').forEach((x) => x.addEventListener('change', () => { os.group = x.value; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-close').forEach((b) => b.addEventListener('click', () => CO.close()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && os.sel) { if (os.edit) { os.edit = false; os.draft = null; CO.redrawAll(); } else CO.close(); } });
document.querySelectorAll('.os-drop').forEach((col) => {
col.addEventListener('dragover', (e) => { if (!CO.canEdit) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('over'); });
col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
col.addEventListener('drop', (e) => {
e.preventDefault(); col.classList.remove('over');
const id = e.dataTransfer.getData('text/plain'); const r = id && CO.find(id);
if (!r || !CO.canEdit || CO.colOf(r) === col.dataset.col) return;
CO.saveRow(r, CO.moveTo(r, col.dataset.col), 'Moved to ' + CO.COLS[col.dataset.col][0]);
});
});
document.querySelectorAll('.os-export').forEach((b) => b.addEventListener('click', async () => {
const d = CO.jobsNow(); if (d.status !== 'ok') return;
const stamp = new Date().toISOString().slice(0, 10);
const json = b.dataset.fmt === 'json';
const res = await CO.download('career-os-' + stamp + (json ? '.json' : '.csv'), json ? JSON.stringify(d.data, null, 1) : CO.toCSV(d.data), json ? 'application/json' : 'text/csv');
CO.dataMsg = res === 'declined' ? 'Download cancelled.' : 'Downloaded ' + d.data.length + ' roles as ' + (json ? 'JSON' : 'CSV') + '.'; CO.dataErr = false; dash.draw('dataMsg');
}));
document.querySelectorAll('.os-file').forEach((inp) => inp.addEventListener('change', async () => {
const file = inp.files && inp.files[0]; if (!file) return;
try {
const text = await file.text(); let data = JSON.parse(text);
if (!Array.isArray(data)) data = data && (data.rows || data.data || data.results);
if (!Array.isArray(data)) throw new Error('the file does not hold a list of roles');
const cur = CO.jobsNow(); if (cur.status !== 'ok') throw new Error('the current roles have not loaded yet');
const byId = new Map(cur.data.map((r) => [r.id, r]));
const plan = {name: file.name, updated: [], added: [], same: 0, bad: 0};
for (const x of data) {
if (!x || typeof x !== 'object' || !x.id || !x.organisation || !x.role) { plan.bad++; continue; }
const r = byId.get(String(x.id));
if (!r) { plan.added.push(Object.assign({}, x, {id: String(x.id)})); continue; }
const patch = {}; for (const k of Object.keys(x)) if (k !== 'id' && JSON.stringify(x[k]) !== JSON.stringify(r[k])) patch[k] = x[k];
if (Object.keys(patch).length) plan.updated.push([r, patch]); else plan.same++;
}
CO.importPlan = plan;
} catch (e) { CO.importPlan = {error: 'Could not read that file: ' + ((e && e.message) || e)}; }
inp.value = ''; dash.draw('importPrev');
}));

const hash = (location.hash || '').replace('#', '');
if (PAGES[hash]) { os.page = PAGES[hash]; showPage(); }
if (hash === 'add') { os.page = 'apps'; showPage(); const tryAdd = (n) => { CO.caps().then((c) => { if (c) CO.startAdd(); else if (n > 0) setTimeout(() => tryAdd(n - 1), 2500); }); }; setTimeout(() => tryAdd(4), 0); }
syncFilters();
document.querySelectorAll('.os').forEach((root) => { root.style.setProperty('--c1', dash.colors[0]); });
CO.watchMeta();
const lightUp = (tries) => { CO.caps().then((c) => { if (c) { CO.canEdit = true; CO.redrawAll(); } else if (tries > 0) setTimeout(() => lightUp(tries - 1), 2500); }); };
setTimeout(() => lightUp(4), 0);
})();
