import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, cp, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { checkConsistency, consistencyMarkdown } from './consistency.mjs';
export { checkConsistency } from './consistency.mjs';

export const VERSION = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')).version;

const GUIDE = 'FOUNDERS-GUIDE.md';
const MANIFEST = 'COLLECTIVE-MANIFEST.json';
const MD = 'COLLECTIVE-MASTER-LIBRARY.md';
const HTML = 'COLLECTIVE-MASTER-LIBRARY.html';

function sha256(text) { return createHash('sha256').update(text).digest('hex'); }
function words(text) { return (text.match(/\S+/g) ?? []).length; }
function esc(s) { return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

async function json(path) { try { return JSON.parse(await readFile(path,'utf8')); } catch { return null; } }
async function exists(path) { try { await stat(path); return true; } catch { return false; } }

async function guideRecord(sourceRoot, path, kind, fallbackName) {
  const text = await readFile(path,'utf8');
  const pkg = await json(join(dirname(path),'package.json'));
  const title = (text.match(/^#\s+(.+)$/m)?.[1] ?? fallbackName ?? basename(dirname(path))).trim();
  return {
    id: kind === 'library' ? 'living-master-library' : (pkg?.name ?? slug(fallbackName ?? title)),
    kind,
    name: fallbackName ?? pkg?.name ?? title,
    version: pkg?.version ?? null,
    source_path: relative(sourceRoot,path).replaceAll('\\','/'),
    sha256: sha256(text),
    bytes: Buffer.byteLength(text),
    words: words(text),
    title,
    text
  };
}

export async function discoverGuides(sourceRoot) {
  sourceRoot = resolve(sourceRoot);
  const records = [];
  const rootGuide = join(sourceRoot, GUIDE);
  const rootPkg = await json(join(sourceRoot,'package.json'));
  const catalog = await json(join(sourceRoot,'library.catalog.json'));
  if (await exists(rootGuide)) records.push(await guideRecord(sourceRoot, rootGuide, 'library', catalog?.library ?? rootPkg?.name ?? 'Living Master Library'));
  for (const m of catalog?.modules ?? []) {
    const p = join(sourceRoot,'modules',m.package,GUIDE);
    if (await exists(p)) {
      const r = await guideRecord(sourceRoot,p,'module',m.name);
      r.id = m.id; r.name = m.name; r.version = m.version ?? r.version; r.tagline = m.tagline ?? null;
      records.push(r);
    }
  }
  // The archive layer documents itself too: its own Founder's Guide is a registered source.
  const coll = catalog?.collective;
  if (coll?.package) {
    const p = join(sourceRoot, coll.package, GUIDE);
    if (await exists(p)) {
      const r = await guideRecord(sourceRoot, p, 'archive', coll.name);
      r.id = coll.id ?? 'collective'; r.name = coll.name ?? r.name; r.version = coll.version ?? r.version; r.tagline = coll.tagline ?? null;
      records.push(r);
    }
  }
  return { sourceRoot, catalog, rootPackageName: rootPkg?.name ?? null, guides: records };
}

function overview(discovery) {
  const { catalog, guides } = discovery;
  const moduleRows = guides.map(g=>`| ${g.name} | ${g.kind} | ${g.version ?? 'Unknown'} | ${g.tagline ?? '—'} | \`${g.sha256.slice(0,12)}…\` |`).join('\n');
  return `# Collective Master Library\n\n> **The ecosystem remembers itself.**\n\nThe Collective Master Library (CoML) is a lossless, provenance-preserving roll-up of canonical Founder’s Guides. It does not replace local guides and it does not silently summarize them away. Each source remains intact, hashed, versioned, and attributable inside the collective archive.\n\n## Collective identity\n\n- **Source library:** ${catalog?.library ?? 'Unknown'}\n- **Source library version:** ${catalog?.version ?? 'Unknown'}\n- **Founder’s Guides incorporated:** ${guides.length}\n- **Aggregation policy:** lossless source preservation + deterministic index\n- **Truth rule:** local guide claims retain their original epistemic status; aggregation does not upgrade certainty\n\n## Ecosystem map\n\n\`\`\`text\nStrategic intent / creator context\n              │\n              ▼\n      Living Master Library\n              │\n   ┌──────────┼───────────┬───────────┬────────────┐\n   ▼          ▼           ▼           ▼            ▼\nLivingPress  Changelog   LivingGuide LivingDocs   LivingRoadmap\n published   shipped     institutional technical  future intent\n truth       truth       memory        truth      vs reality\n   └──────────┴───────────┴───────────┴────────────┘\n              │\n              ▼\n   Collective Master Library\n      ecosystem archive\n\`\`\`\n\n## Source register\n\n| Guide | Kind | Version | Role | SHA-256 |\n|---|---|---:|---|---|\n${moduleRows || '| — | — | — | — | — |'}\n\nThe Living Master Library’s own Founder’s Guide is the ecosystem-level source, and the Collective Master Library’s own guide is included so the archive layer is documented by the same rules. Exact source metadata appears in \`${MANIFEST}\`.\n`;
}

function combinedMarkdown(discovery, generatedAt, consistency) {
  const sections = discovery.guides.map((g,i)=>`\n---\n\n# Source ${i+1}: ${g.name}${g.version ? ` v${g.version}` : ''}\n\n**Provenance:** \`${g.source_path}\`  \n**SHA-256:** \`${g.sha256}\`  \n**Words:** ${g.words.toLocaleString('en-US')}  \n**Source kind:** ${g.kind}\n\n<!-- BEGIN LOSSLESS SOURCE: ${g.source_path} -->\n${g.text}\n<!-- END LOSSLESS SOURCE: ${g.source_path} -->\n`).join('\n');
  return `${overview(discovery)}\n## Archive build\n\n- **Generated:** ${generatedAt}\n- **Policy:** Each Founder’s Guide below is preserved losslessly. Repeated concepts are intentionally retained because the local guides are canonical in their own scope.\n- **Verification:** Run \`coml verify\` or \`living collective verify\` to compare current guides against the manifest hashes.\n\n# Canonical Founder’s Guide Archive\n${sections}\n${consistencyMarkdown(consistency)}\n# Collective provenance appendix\n\nThis archive is a container of canonical sources, not a replacement for them. A future synthesis layer may derive cross-project intelligence, but it must cite these source boundaries and may not silently alter local truth.\n`;
}

// ---------------------------------------------------------------------------
// Safe Markdown -> HTML for the readable archive view. No dependencies.
// Every character of source text is escaped before any markup is added, links
// are limited to http(s), site-relative and in-page anchors, and the verbatim
// source stays untouched in the .md archive and the sources/ snapshots.
// ---------------------------------------------------------------------------
const SAFE_URL = /^(?:https?:\/\/[^\s"'<>]+|\/(?!\/)[^\s"'<>]*|#[\w-]*)$/i;
function emphasis(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
}
function inline(raw) {
  const parked = [];
  const park = (html) => `\u0000${parked.push(html) - 1}\u0000`;
  let s = String(raw).replace(/\u0000/g, '').replace(/`([^`]+)`/g, (_m, c) => park(`<code>${esc(c)}</code>`));
  s = esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, href) => {
    const h = href.replaceAll('&amp;', '&');
    if (!SAFE_URL.test(h)) return text;
    const ext = /^https?:/i.test(h);
    return park(`<a href="${esc(h)}"${ext ? ' rel="noopener noreferrer"' : ''}>${emphasis(text)}</a>`);
  });
  s = emphasis(s);
  for (let n = 0; n < 3 && s.includes('\u0000'); n++) s = s.replace(/\u0000(\d+)\u0000/g, (_m, i) => parked[Number(i)] ?? '');
  return s;
}
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const UL = /^(\s*)[-*+]\s+(.*)$/;
const OL = /^(\s*)\d+[.)]\s+(.*)$/;
const HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE = /^\s*(```|~~~)/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const COMMENT = /^\s*<!--.*-->\s*$/;
function cells(line) { return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()); }

export function renderMarkdown(md, { headingOffset = 0 } = {}) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isTable = (k) => lines[k]?.includes('|') && TABLE_SEP.test(lines[k + 1] ?? '');
  const isBlock = (k) => { const l = lines[k]; return HEADING.test(l) || UL.test(l) || OL.test(l) || HR.test(l) || FENCE.test(l) || /^\s*>/.test(l) || isTable(k); };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || COMMENT.test(line)) { i++; continue; }
    const fence = line.match(FENCE);
    if (fence) {
      const body = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(HEADING);
    if (h) { const lv = Math.min(6, h[1].length + headingOffset); out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); i++; continue; }
    if (HR.test(line)) { out.push('<hr>'); i++; continue; }
    if (isTable(i)) {
      const head = cells(line); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(`<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(body.join('\n'), { headingOffset })}</blockquote>`);
      continue;
    }
    if (UL.test(line) || OL.test(line)) {
      // Nested lists by indentation; continuation lines join the current item.
      const stack = [];
      let html = '';
      while (i < lines.length) {
        const l = lines[i];
        const m = l.match(UL) || l.match(OL);
        if (!m) {
          if (l.trim() && /^\s{2,}\S/.test(l) && stack.length) { html += ' ' + inline(l.trim()); i++; continue; }
          break;
        }
        const indent = m[1].replace(/\t/g, '  ').length;
        const tag = UL.test(l) ? 'ul' : 'ol';
        while (stack.length && indent < stack[stack.length - 1].indent) html += `</li></${stack.pop().tag}>`;
        const top = stack[stack.length - 1];
        if (!top || indent > top.indent) { html += `<${tag}><li>`; stack.push({ indent, tag }); }
        else { html += '</li><li>'; }
        html += inline(m[2]);
        i++;
        if (lines[i] !== undefined && !lines[i].trim() && (UL.test(lines[i + 1] ?? '') || OL.test(lines[i + 1] ?? ''))) i++;
      }
      while (stack.length) html += `</li></${stack.pop().tag}>`;
      out.push(html);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !COMMENT.test(lines[i]) && !(para.length && isBlock(i))) para.push(lines[i++]);
    out.push(`<p>${para.map((l) => inline(l.replace(/\s{2,}$/, ''))).join(/\s{2,}$/.test(para[0]) ? '<br>' : ' ')}</p>`);
  }
  return out.join('\n');
}

const CSS = `:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#141414;background:#f5f5f2;line-height:1.6}*{box-sizing:border-box}body{margin:0}.wrap{max-width:1180px;margin:auto;padding:28px}.hero{background:#fff;border:1px solid #ddd;border-radius:22px;padding:38px;margin:18px 0 26px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.72rem;font-weight:800;color:#666}h1{font-size:clamp(2.2rem,7vw,5rem);line-height:.95;margin:.2em 0}.lede{font-size:1.18rem;max-width:720px;color:#444}.grid{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px}.toc{position:sticky;top:16px;align-self:start;background:#fff;border:1px solid #ddd;border-radius:18px;padding:20px}.toc ol{padding-left:1.3rem}.toc a{color:#222;text-decoration:none}.source,.register{background:#fff;border:1px solid #ddd;border-radius:18px;padding:26px;margin-bottom:24px}.source{break-before:page}.source-head{display:flex;justify-content:space-between;gap:20px;align-items:start}.source-head h2{font-size:2rem;margin:.2rem 0;overflow-wrap:anywhere}.source-head small{font-size:.55em;color:#666}.meta{text-align:right;color:#555}.provenance{font-size:.85rem;color:#666;border-top:1px solid #eee;border-bottom:1px solid #eee;padding:10px 0;margin:12px 0 18px;overflow-wrap:anywhere}.body h2{font-size:1.7rem;margin:1.6em 0 .4em}.body h3{font-size:1.35rem;margin:1.4em 0 .4em}.body h4,.body h5,.body h6{font-size:1.08rem;margin:1.2em 0 .3em}.body p,.body li{max-width:78ch}pre{background:#f3f3ef;border:1px solid #e6e6e0;border-radius:10px;padding:12px 14px;overflow-x:auto;line-height:1.35}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em}pre code{font-size:.8rem}p code,li code,td code{background:#f0f0ec;padding:.08em .3em;border-radius:4px;overflow-wrap:anywhere}blockquote{margin:1em 0;padding:.2em 1em;border-left:4px solid #ccc;color:#444}.table{overflow-x:auto;margin:1em 0}table{border-collapse:collapse;font-size:.92rem}th,td{border:1px solid #e3e3de;padding:6px 10px;text-align:left;vertical-align:top}th{background:#f6f6f2}hr{border:0;border-top:1px solid #e5e5e5;margin:1.8em 0}.hash{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.78rem;overflow-wrap:anywhere}td.hash{min-width:24ch}@media(max-width:780px){.wrap{padding:14px}.hero{padding:24px}.grid{grid-template-columns:minmax(0,1fr)}.source-head h2{font-size:1.6rem}.toc{position:static}.source,.register{padding:18px}.source-head{display:block}.meta{text-align:left;margin-top:8px}}@media print{:root{background:#fff}.wrap{max-width:none;padding:0}.hero,.toc,.source,.register{border:0;border-radius:0}.toc{page-break-after:always}.source,.register{padding:0}.grid{display:block}.body{font-size:10pt}pre{white-space:pre-wrap;font-size:8.5pt}.hero{padding:0 0 24px}h2,h3,h4{break-after:avoid}tr,pre,blockquote{break-inside:avoid}}`;

function htmlFrom(discovery, generatedAt, consistency) {
  const { catalog, guides } = discovery;
  const nav = guides.map((g,i)=>`<li><a href="#source-${i+1}">${esc(g.name)}${g.version?` v${esc(g.version)}`:''}</a></li>`).join('');
  const register = `<section class="register" id="register"><span class="eyebrow">SOURCE REGISTER</span><div class="table"><table><thead><tr><th>#</th><th>Guide</th><th>Version</th><th>Kind</th><th>Words</th><th>SHA-256</th></tr></thead><tbody>${guides.map((g,i)=>`<tr><td>${i+1}</td><td><a href="#source-${i+1}">${esc(g.name)}</a>${g.tagline?`<br><small>${esc(g.tagline)}</small>`:''}</td><td>${esc(g.version ?? 'Unknown')}</td><td>${esc(g.kind)}</td><td>${g.words.toLocaleString('en-US')}</td><td class="hash">${esc(g.sha256)}</td></tr>`).join('')}</tbody></table></div><p><small>This page is a rendered reading view. The verbatim text of every guide is preserved byte-for-byte in <code>${MD}</code> and in <code>sources/</code>, and each file is fingerprinted in <code>${MANIFEST}</code>. Aggregation does not upgrade the certainty of any local claim.</small></p></section>`;
  const sections = guides.map((g,i)=>`<section id="source-${i+1}" class="source"><div class="source-head"><div><span class="eyebrow">SOURCE ${i+1}</span><h2>${esc(g.name)}${g.version?` <small>v${esc(g.version)}</small>`:''}</h2></div><div class="meta">${g.words.toLocaleString('en-US')} words<br>${esc(g.kind)}</div></div><div class="provenance">${esc(g.source_path)}<br><span class="hash">sha256 ${esc(g.sha256)}</span></div><div class="body">${renderMarkdown(g.text, { headingOffset: 1 })}</div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collective Master Library</title><style>\n${CSS}\n</style></head><body><main class="wrap"><header class="hero"><span class="eyebrow">CANONICAL ECOSYSTEM ARCHIVE</span><h1>Collective<br>Master Library</h1><p class="lede">The ecosystem remembers itself. A lossless roll-up of ${guides.length} canonical Founder’s Guides from ${esc(catalog?.library ?? 'the source library')}${catalog?.version?` ${esc(catalog.version)}`:''}.</p><p><strong>Generated:</strong> ${esc(generatedAt)} · <strong>Builder:</strong> Collective Master Library ${esc(VERSION)}</p></header><div class="grid"><nav class="toc"><span class="eyebrow">CONTENTS</span><p><a href="#register">Source register</a></p><ol>${nav}</ol><p><a href="#consistency">Consistency report</a>${consistency.ok?'':` <strong>(${consistency.findings.length})</strong>`}</p></nav><article>${register}${sections}${consistencyHtml(consistency)}</article></div></main></body></html>`;
}

function consistencyHtml(c) {
  const items = c.findings.map((f)=>`<li><strong>${esc(f.kind)}:</strong> ${esc(f.message)}<ul>${f.claims.map((x)=>`<li><code>${esc(x.source_path)}:${x.line}</code> ${esc(x.text)}</li>`).join('')}</ul></li>`).join('');
  return `<section class="register" id="consistency"><span class="eyebrow">CONSISTENCY REPORT</span><p>Deterministic cross-check of versions and test counts stated across these guides, against each other and the catalog. History sections are excluded. ${c.claims_checked} claims checked.</p>${c.ok?'<p><strong>No disagreements found.</strong></p>':`<p><strong>${c.findings.length} disagreement${c.findings.length===1?'':'s'}.</strong> Local guides stay canonical; the archive does not pick a winner.</p><ul>${items}</ul>`}</section>`;
}

function snapshotName(g) { return `${g.id}-${g.sha256.slice(0,12)}.md`; }

export async function buildCollective({ sourceRoot, outDir, now = new Date().toISOString() }) {
  const discovery = await discoverGuides(sourceRoot);
  if (!discovery.guides.length) throw new Error(`No ${GUIDE} sources found under ${resolve(sourceRoot)}`);
  outDir = resolve(outDir);
  const sourceDir = join(outDir,'sources');
  await mkdir(sourceDir,{recursive:true});
  const consistency = checkConsistency(discovery, { rootPackageName: discovery.rootPackageName });
  const md = combinedMarkdown(discovery, now, consistency);
  const html = htmlFrom(discovery, now, consistency);
  const manifest = {
    format: 'collective-master-library/v1',
    name: 'Collective Master Library',
    version: VERSION,
    generated_at: now,
    source_library: { name: discovery.catalog?.library ?? null, version: discovery.catalog?.version ?? null },
    policy: { lossless_sources: true, aggregation_upgrades_certainty: false },
    guides: discovery.guides.map(({text,...g})=>({ ...g, snapshot: `sources/${snapshotName(g)}` })),
    consistency: { ok: consistency.ok, claims_checked: consistency.claims_checked, findings: consistency.findings },
    archive: { markdown: { path: MD, sha256: sha256(md) }, html: { path: HTML, sha256: sha256(html) } }
  };
  await writeFile(join(outDir,MD),md);
  await writeFile(join(outDir,HTML),html);
  await writeFile(join(outDir,MANIFEST),JSON.stringify(manifest,null,2)+'\n');
  for (const g of discovery.guides) await writeFile(join(sourceDir,snapshotName(g)),g.text);
  return { outDir, manifest, files: { markdown:join(outDir,MD), html:join(outDir,HTML), manifest:join(outDir,MANIFEST), sources:sourceDir } };
}

async function hashOf(path) { try { return sha256(await readFile(path,'utf8')); } catch { return null; } }

export async function verifyCollective({ sourceRoot, outDir }) {
  outDir = resolve(outDir);
  const prior = await json(join(outDir,MANIFEST));
  if (!prior) return { ok:false, built:false, errors:[`Missing or invalid ${MANIFEST}`], added:[], removed:[], changed:[], version_changed:[], missing:[], tampered:[], unchanged:[] };
  const current = await discoverGuides(sourceRoot);
  const before = new Map((prior.guides ?? []).map(g=>[g.source_path,g]));
  const after = new Map(current.guides.map(g=>[g.source_path,g]));
  const added=[], removed=[], changed=[], version_changed=[], unchanged=[];
  for (const [p,g] of after) {
    if (!before.has(p)) added.push(p);
    else if (before.get(p).sha256!==g.sha256) changed.push(p);
    else { unchanged.push(p); if ((before.get(p).version ?? null)!==(g.version ?? null)) version_changed.push(p); }
  }
  for (const p of before.keys()) if (!after.has(p)) removed.push(p);
  // Archive integrity: the build's own outputs must still be what it wrote.
  // Snapshots are checked for every manifest (their names are content-addressed);
  // the combined Markdown and HTML are checked when the manifest recorded them.
  const missing=[], tampered=[];
  for (const g of prior.guides ?? []) {
    const rel = g.snapshot ?? `sources/${snapshotName(g)}`;
    const h = await hashOf(join(outDir,rel));
    if (h===null) missing.push(rel); else if (h!==g.sha256) tampered.push(rel);
  }
  for (const f of Object.values(prior.archive ?? {})) {
    const h = await hashOf(join(outDir,f.path));
    if (h===null) missing.push(f.path); else if (h!==f.sha256) tampered.push(f.path);
  }
  const drift = added.length+removed.length+changed.length+version_changed.length;
  const damage = missing.length+tampered.length;
  return { ok: drift+damage===0, built:true, state: damage ? 'DAMAGED' : (drift ? 'STALE' : 'CURRENT'), added, removed, changed, version_changed, missing, tampered, unchanged, source_count:after.size, generated_at:prior.generated_at };
}

export const filenames = { GUIDE, MANIFEST, MD, HTML };
