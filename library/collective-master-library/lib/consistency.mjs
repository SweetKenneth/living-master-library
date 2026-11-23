// Deterministic cross-guide consistency check. No model, no network.
//
// Founder's Guides restate facts about each other: versions, test counts,
// totals. Each guide is canonical in its own scope, so CoML never edits them.
// It only reports where two sources (or a source and the catalog) disagree,
// with file and line for every claim involved.
//
// Sections whose heading reads as history (history, lineage, timeline,
// changelog, release notes) are skipped: an old version number there is a
// record, not a claim about the present. Inline history cues ("since v1.1.0",
// "v1.2.0 added X") are skipped the same way.

const HISTORY = /histor|lineage|timeline|changelog|release notes/i;
const SEMVER = String.raw`v?(\d+\.\d+\.\d+)\b`;
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (line) => line.replace(/\*\*|__|`/g, '');

/** Every registered thing a guide can talk about, with the names it goes by. */
export function entitiesFrom(catalog, rootPackageName) {
  const out = [];
  if (!catalog) return out;
  out.push({ id: 'library', kind: 'library', version: catalog.version ?? null, names: [catalog.library, rootPackageName, 'LML'].filter(Boolean) });
  if (catalog.core) out.push({ id: catalog.core.id ?? 'core', kind: 'core', version: catalog.core.version ?? null, names: [catalog.core.name].filter(Boolean) });
  for (const m of catalog.modules ?? []) out.push({ id: m.id, kind: 'module', version: m.version ?? null, names: [m.name, m.package].filter(Boolean) });
  if (catalog.collective) out.push({ id: catalog.collective.id ?? 'collective', kind: 'archive', version: catalog.collective.version ?? null, names: [catalog.collective.name, catalog.collective.package, 'CoML'].filter(Boolean) });
  for (const e of out) {
    e.names = [...new Set(e.names)].sort((a, b) => b.length - a.length);
    e.mention = new RegExp(String.raw`(?<![\w-])(${e.names.map(reEsc).join('|')})(?:\s*\([^)]{1,24}\))?\s+${SEMVER}`, 'g');
    e.exact = new Set(e.names.map((n) => n.toLowerCase()));
  }
  return out;
}

function guideEntity(guide, entities) {
  if (guide.kind === 'library') return entities.find((e) => e.kind === 'library');
  if (guide.kind === 'archive') return entities.find((e) => e.kind === 'archive');
  return entities.find((e) => e.id === guide.id);
}

/** Walk a guide line by line, tracking the heading path so history can be skipped. */
function* liveLines(text) {
  const stack = [];
  let fence = null;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const f = raw.match(/^\s*(```|~~~)/);
    if (f) { fence = fence === f[1] ? null : (fence ?? f[1]); continue; }
    const h = !fence && raw.match(/^(#{1,6})\s+(.*)$/);
    if (h) { stack.length = h[1].length - 1; stack[h[1].length - 1] = h[2]; continue; }
    if (stack.some((x) => x && HISTORY.test(x))) continue;
    yield { n: i + 1, raw, text: clean(raw), inFence: Boolean(fence) };
  }
}

const COUNT = /(\d{1,5})\s+(?:passed\b|passing\b(?:\s+local)?\s+checks|(?:local\s+)?self-tests\b)/gi;
const TOTALISH = /\b(total|full|baseline|all suites|whole suite)\b/i;

export function checkConsistency(discovery, { rootPackageName } = {}) {
  const entities = entitiesFrom(discovery.catalog, rootPackageName);
  const findings = [];
  const counts = new Map(); // subject id -> [{value, source_path, line, text}]
  let claims = 0;
  const addCount = (subject, value, g, l) => {
    claims++;
    if (!counts.has(subject)) counts.set(subject, []);
    counts.get(subject).push({ value, source_path: g.source_path, line: l.n, text: l.raw.trim().slice(0, 200) });
  };
  const nameOf = (id) => id === 'total' ? 'Total' : (entities.find((e) => e.id === id)?.names[0] ?? id);

  for (const g of discovery.guides) {
    const own = guideEntity(g, entities);
    let table = null; // { countable, rows: [{subject, value, l}] }
    const flushTable = () => {
      if (!table?.countable) { table = null; return; }
      const total = table.rows.find((r) => r.subject === 'total');
      const parts = table.rows.filter((r) => r.subject !== 'total');
      if (total && parts.length >= 2) {
        const sum = parts.reduce((a, r) => a + r.value, 0);
        if (sum !== total.value) findings.push({ kind: 'arithmetic', subject: 'total', message: `${g.name}: table rows add up to ${sum}, but its Total row says ${total.value}.`, claims: [{ value: total.value, source_path: g.source_path, line: total.l.n, text: total.l.raw.trim() }] });
      }
      table = null;
    };

    for (const l of liveLines(g.text)) {
      // Tables: a header mentioning tests/checks makes rows countable.
      if (!l.inFence && /^\s*\|/.test(l.text)) {
        const cells = l.text.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!table) { table = { countable: /pass|check|test/i.test(l.text), rows: [] }; continue; }
        if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
        if (table.countable) {
          const first = cells[0].toLowerCase();
          const num = [...cells].reverse().find((c) => /^\d{1,5}$/.test(c));
          const subject = first === 'total' ? 'total' : entities.find((e) => e.exact.has(first))?.id;
          if (subject && num) { const value = Number(num); table.rows.push({ subject, value, l }); addCount(subject, value, g, l); }
        }
        continue;
      }
      if (table) flushTable();

      // Own declared version: "Version: 1.2.3", "Edition: 1.2.3", "Canonical status: v1.2.3 ..."
      const sv = l.text.match(/^\s*(?:[-*]\s*)?(?:version|edition|canonical status):\s*v?(\d+\.\d+\.\d+)\b/i);
      if (sv && own?.version) {
        claims++;
        if (sv[1] !== own.version) findings.push({ kind: 'version', subject: own.id, message: `${g.name} declares version ${sv[1]}, but the catalog registers ${own.version}.`, claims: [{ value: sv[1], source_path: g.source_path, line: l.n, text: l.raw.trim() }] });
      }

      // Versions stated for any registered name: "LivingPress 1.2.0", "CoML (archive) v1.0.1"
      for (const e of entities) {
        if (!e.version) continue;
        for (const m of l.text.matchAll(e.mention)) {
          // "since v1.2.0", "LML v1.2.0 added ..." describe the past, not the present.
          const pre = l.text.slice(0, m.index), post = l.text.slice(m.index + m[0].length);
          if (/\b(since|from|in|before|after|until|prior to)\s+$/i.test(pre) || /^\s+(added|introduced|was|were|first|originally|landed|shipped|replaced)\b/i.test(post)) continue;
          claims++;
          if (m[2] !== e.version) findings.push({ kind: 'version', subject: e.id, message: `${g.name} says ${m[1]} ${m[2]}, but the catalog registers ${e.version}.`, claims: [{ value: m[2], source_path: g.source_path, line: l.n, text: l.raw.trim().slice(0, 200) }] });
        }
      }

      // Prose test counts: subject is a name on the line, else "total" wording, else the guide itself.
      for (const m of l.text.matchAll(COUNT)) {
        const before = l.text.slice(0, m.index);
        const named = entities
          .map((e) => ({ e, at: Math.max(...e.names.map((n) => before.lastIndexOf(n))) }))
          .filter((x) => x.at >= 0).sort((a, b) => b.at - a.at)[0]?.e;
        const subject = named?.id ?? (TOTALISH.test(l.text) ? 'total' : own?.id);
        if (subject) addCount(subject, Number(m[1]), g, l);
      }
    }
    flushTable();
  }

  for (const [subject, list] of counts) {
    const values = [...new Set(list.map((c) => c.value))];
    if (values.length > 1) findings.push({ kind: 'count', subject, message: `Guides disagree on the ${nameOf(subject)} test count: ${values.join(' vs ')}.`, claims: list });
  }
  findings.sort((a, b) => a.kind.localeCompare(b.kind) || a.subject.localeCompare(b.subject) || a.message.localeCompare(b.message));
  return { ok: findings.length === 0, claims_checked: claims, findings };
}

export function consistencyMarkdown(report) {
  const head = `# Consistency report\n\nDeterministic cross-check of versions and test counts stated across the guides above, compared with each other and with the catalog. History sections are excluded. ${report.claims_checked} claims checked.\n`;
  if (report.ok) return `${head}\n**Result:** no disagreements found.\n`;
  const items = report.findings.map((f) => `- **${f.kind}:** ${f.message}\n${f.claims.map((c) => `  - \`${c.source_path}:${c.line}\` ${c.text.replace(/\n/g, ' ')}`).join('\n')}`).join('\n');
  return `${head}\n**Result:** ${report.findings.length} disagreement${report.findings.length === 1 ? '' : 's'}. The local guides stay canonical; the archive does not pick a winner.\n\n${items}\n`;
}
