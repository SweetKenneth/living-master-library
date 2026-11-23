/**
 * Tiny, safe Markdown → HTML for post and entry bodies. No dependencies.
 * All raw HTML is escaped. Links are limited to https?:// and site-relative
 * paths (protocol-relative `//host` is refused). Line-based, so fenced code
 * may contain blank lines and a heading may sit directly above its paragraph.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const SAFE_URL = /^(?:https?:\/\/[^\s"'<>]+|\/(?!\/)[^\s"'<>]*)$/i;

function emphasis(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>");
}

function inline(raw: string): string {
  // Finished HTML fragments are parked behind placeholders so later passes
  // (emphasis) can never reach inside code, URLs or attributes.
  const parked: string[] = [];
  const park = (html: string) => `\u0000${parked.push(html) - 1}\u0000`;
  let s = raw.replace(/\u0000/g, "").replace(/`([^`]+)`/g, (_m, c: string) => park(`<code>${esc(c)}</code>`));
  s = esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt: string, src: string) =>
      SAFE_URL.test(src) ? park(`<img src="${src}" alt="${alt}" loading="lazy" decoding="async"/>`) : m)
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_m, text: string, href: string) => {
      if (!SAFE_URL.test(href)) return text;
      const external = !href.startsWith("/");
      return park(`<a href="${href}"${external ? ' rel="noopener noreferrer" target="_blank"' : ""}>${emphasis(text)}</a>`);
    });
  s = emphasis(s);
  // Restore repeatedly: a parked link may itself contain parked code.
  for (let n = 0; n < 3 && s.includes("\u0000"); n += 1) s = s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => parked[Number(i)] ?? "");
  return s;
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const UL = /^\s*[-*+]\s+/;
const OL = /^\s*\d+[.)]\s+/;
const HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE = /^\s*(```|~~~)/;

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  const isBlockStart = (l: string) => HEADING.test(l) || UL.test(l) || OL.test(l) || HR.test(l) || FENCE.test(l) || /^\s*>/.test(l);

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) { i += 1; continue; }

    const fence = line.match(FENCE);
    if (fence) {
      const lang = line.trim().slice(3).trim().replace(/[^\w-]/g, "");
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith(fence[1]!)) body.push(lines[i++]!);
      i += 1; // closing fence (or end of input)
      out.push(`<pre><code${lang ? ` class="language-${lang}"` : ""}>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }

    const h = line.match(HEADING);
    if (h) {
      // Post bodies never carry an H1 (the page renders the title); demote it.
      const level = Math.max(2, h[1]!.length);
      out.push(`<h${level}>${inline(h[2]!)}</h${level}>`);
      i += 1;
      continue;
    }

    if (HR.test(line)) { out.push("<hr/>"); i += 1; continue; }

    if (UL.test(line) || OL.test(line)) {
      const ordered = OL.test(line);
      const marker = ordered ? OL : UL;
      const items: string[] = [];
      while (i < lines.length && lines[i]!.trim()) {
        const l = lines[i]!;
        if (marker.test(l)) items.push(l.replace(marker, ""));
        else if (isBlockStart(l)) break;
        else if (items.length) items[items.length - 1] += ` ${l.trim()}`; // lazy continuation
        i += 1;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) quote.push(lines[i++]!.replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && (para.length === 0 || !isBlockStart(lines[i]!))) para.push(lines[i++]!.trim());
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

/** Demote level-1 headings to level-2 outside fenced code. Returns the same string when there is nothing to change. */
export function demoteH1(md: string): string {
  let inFence = false;
  let changed = false;
  const out = md.split("\n").map((l) => {
    if (/^\s*(```|~~~)/.test(l)) inFence = !inFence;
    if (!inFence && /^#\s+\S/.test(l)) { changed = true; return l.replace(/^#\s+/, "## "); }
    return l;
  });
  return changed ? out.join("\n") : md;
}
