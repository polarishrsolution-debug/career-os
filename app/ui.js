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
const c1 = el('td', 'c-role'); const rc = el('div', 'rc'); rc.append(CO.av(r.organisation)); const t = el('div'); t.append(el('span', 'o', r.organisation), el('span', 'r', r.role), el('span', 'ot', CO.orgType(r)));
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
if (tb.dataset.view === 'today' && !rows.length) { emptyRow((td) => td.append(el('div', 'empty', 'No new roles from today' + String.fromCharCode(39) + 's search yet (it runs at 08:52). Newest roles below.'))); rows = d.data.filter((r) => r.id.startsWith('N')).sort(SORTS.added).slice(0, 5); }
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
const MOVES = [['apply', 'To apply'], ['applied', 'Applied'], ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Rejected'], ['withdrawn', 'Withdrawn / not applying']];
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
dash.draw('ivcards', (h) => {
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
const Q = {apply: 'Have you applied for this role?', applied: 'Have you heard back from the employer?', offer: 'What is your decision on the offer?', closed: 'This role is closed. Reopen it only if that was a mistake.'};
box.append(el('div', 'q', c === 'interview' ? (/^interviewed/i.test(st) ? 'What was the outcome of the interview?' : CO.ivParse(r.interview_datetime) ? 'Has the interview happened?' : 'Do you have the interview date?') : Q[c]));
const acts = CO.actions(r), NEG = /rejected|withdraw|not applying|decline/i;
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
const steps = (r) => {
const c = CO.colOf(r), st = r.interview_status || '';
const rej = /^rejected/i.test(st), wd = /^withdrawn/i.test(r.submission || '');
const at = c === 'offer' ? 3 : rej ? 3 : c === 'interview' ? 2 : c === 'applied' ? 1 : wd ? 1 : 0;
const box = el('div', 'steps');
['Found', 'Applied', 'Interview', rej ? 'Rejected' : wd ? 'Withdrawn' : 'Offer'].forEach((label, i) => {
const bad = (rej || wd) && i === 3;
const cls = bad ? ' bad' : i < at ? ' done' : i === at ? ' now' : '';
const s = el('div', 'st' + cls); s.append(el('i', null, bad ? '×' : i < at ? '✓' : String(i + 1)), el('span', null, label)); box.append(s);
});
return box;
};
const readView = (r) => {
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
if (r.notes) sec('Notes', [el('div', 'small', r.notes)]);
if (['interview', 'offer'].includes(CO.colOf(r))) sec('Interview preparation', [prepBox(r)]);
if (Array.isArray(r.history) && r.history.length) { const hi = el('div', 'hist'); r.history.slice().reverse().slice(0, 8).forEach((x) => { const row = el('div'); row.append(el('span', null, x.at ? d3.timeFormat('%-d %b %H:%M')(new Date(x.at)) : ''), el('span', null, x.what || '')); hi.append(row); }); sec('Activity', [hi]); }
return w;
};
const SUB_OPTS = ['Not started', 'Submitted', 'Withdrawn'];
const IV_OPTS = ['—', 'Awaiting response', 'Interview invited', 'Interview booked', 'Interview booked (2nd stage)', 'Interview booked (final)', 'Task submitted, interview TBC', 'Interviewed — awaiting outcome', 'Offer received', 'Rejected'];
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
const colors = ['var(--c2)', 'var(--acc)', 'var(--gold)', 'var(--color-bad)', 'color-mix(in srgb, var(--color-fg-muted) 60%, transparent)'];
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
tipOn(h, c, r.label + ': ' + r.n + ' roles'); h.append(c);
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
dash.draw('critrows', (h) => { h.replaceChildren(); const rows = critRows(h); if (!rows) { if (dash.data('criteria').status === 'error') CO.failBox(h); return; } for (const r of rows) { const c = el('div', 'crow'); c.append(el('b', null, r.label || r.group), el('span', null, r.value)); h.append(c); } });

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

const ALL = ['notice', 'addBtn', 'kpi', 'today', 'todayLong', 'greet', 'fresh', 'saveState', 'freshDetail', 'conflicts', 'priorities', 'agenda', 'pipe', 'latest', 'jtable', 'count', 'tabcnt', 'bcnt', 'bcol', 'ivcards', 'panel', 'funnel', 'donut', 'bars', 'colsgen', 'critkpis', 'critlist', 'critrows', 'dataMsg', 'importPrev', 'backups'];
CO.redrawAll = () => ALL.forEach((n) => dash.draw(n));
const syncPanel = () => {
document.querySelectorAll('.os .ws').forEach((w) => w.classList.toggle('sel', !!os.sel));
document.querySelectorAll('.os .panel').forEach((p) => { p.hidden = !os.sel; });
};
const narrow = () => { const m = document.querySelector('.os .main'); return !!m && getComputedStyle(m).display === 'none'; };
CO.open = (id) => {
const was = os.sel; os.sel = id; if (was !== id) { os.edit = false; os.draft = null; os.ivForm = null; }
syncPanel(); CO.redrawAll();
setTimeout(() => { const p = document.querySelector('.os .panel'); if (p && narrow() && p.scrollIntoView) p.scrollIntoView({block: 'start'}); else if (p && p.getBoundingClientRect().top < 0 && p.scrollIntoView) p.scrollIntoView({block: 'start'}); }, 30);
};
CO.close = () => {
const id = os.sel; os.sel = ''; os.edit = false; os.draft = null; os.ivForm = null; os.add = null; syncPanel(); CO.redrawAll();
setTimeout(() => { const tr = document.querySelector('.os .page:not([hidden]) [data-key=' + JSON.stringify(id) + ']'); if (tr && tr.scrollIntoView) { tr.scrollIntoView({block: 'nearest'}); if (tr.focus) tr.focus({preventScroll: true}); } }, 40);
};
const PAGES = {today: 'today', applications: 'apps', pipeline: 'board', interviews: 'interviews', shortlist: 'shortlist', 'new-roles': 'new', analytics: 'analytics', criteria: 'criteria', data: 'data'};
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
};
document.querySelectorAll('.os .nav button').forEach((b) => b.addEventListener('click', () => CO.go(b.dataset.page)));
document.querySelectorAll('.os-go').forEach((b) => b.addEventListener('click', () => CO.go(b.dataset.go, b.dataset.go === 'apps' ? {stage: b.dataset.stage || '', quick: b.dataset.quick || ''} : null)));
document.querySelectorAll('.os .tabs button').forEach((b) => b.addEventListener('click', () => { os.stage = b.dataset.stage || ''; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-quick').forEach((b) => b.addEventListener('click', () => { os.quick = os.quick === b.dataset.quick ? '' : b.dataset.quick; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-f').forEach((x) => x.addEventListener('change', () => { os[x.dataset.key] = x.value; syncFilters(); CO.redrawAll(); }));
document.querySelectorAll('.os-q').forEach((i) => i.addEventListener('input', () => { os.q = i.value; CO.redrawAll(); }));
document.querySelectorAll('.os-clear').forEach((b) => b.addEventListener('click', () => { Object.assign(os, {stage: '', q: '', sector: '', spons: '', fit: '', region: '', family: '', orgtype: '', quick: '', sort: 'deadline', dir: 1}); syncFilters(); CO.redrawAll(); }));
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
