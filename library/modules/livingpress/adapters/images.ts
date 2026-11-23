/**
 * Image providers. "Always use an image" is enforced by the engine; these
 * decide WHERE images come from.
 */
import type { ImageProvider } from "../engine/ports.ts";
import { sha256, stream } from "../engine/oracle.ts";

type LibraryImage = { url: string; alt: string; terms: string[] };

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);

/**
 * The site's own curated image library (the simplest, most reliable option):
 * a list of images tagged with terms; the best match not used recently wins.
 * Multi-word terms ("sourdough starter") match when every word is present.
 */
export function curatedLibrary(library: LibraryImage[], seed = "livingpress"): ImageProvider {
  // Placeholder entries would publish broken image links. Refuse them, but lazily, so /health still answers.
  const usable = library.filter((img) => img?.url && !/\[ENTER/i.test(img.url));
  const prepared = usable.map((img) => ({ img, terms: (img.terms ?? []).map((t) => words(t)).filter((t) => t.length) }));
  return {
    async imageFor({ title, keywords, recentlyUsed }) {
      if (!prepared.length) throw new Error("curatedLibrary has no real images (images.json still has placeholders?)");
      const have = new Set([...keywords.flatMap(words), ...words(title)]);
      const recent = new Set(recentlyUsed);
      const scored = prepared
        .map(({ img, terms }) => ({ img, score: terms.filter((t) => t.every((w) => have.has(w))).length - (recent.has(img.url) ? 10 : 0) }))
        .sort((a, b) => b.score - a.score);
      const top = scored.filter((s) => s.score === scored[0]!.score);
      const r = stream(seed, title)();
      const chosen = top[Math.floor(r * top.length)]!.img;
      return { url: chosen.url, alt: chosen.alt || title };
    },
  };
}

/**
 * Generated images via an OpenAI-compatible images endpoint, uploaded to
 * storage by the caller-supplied `upload` (returns a public URL).
 * Hosted result URLs from image APIs usually expire within hours, so they
 * are downloaded and re-uploaded too — a post must never hotlink a temp URL.
 */
export function generatedImages(opts: {
  baseUrl: string; apiKey: string; model: string; style: string;
  upload: (bytes: Uint8Array, filename: string) => Promise<string>;
  size?: string; timeoutMs?: number;
}): ImageProvider {
  return {
    async imageFor({ title }) {
      const res = await fetch(`${opts.baseUrl.replace(/\/+$/, "")}/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({ model: opts.model, prompt: `${opts.style}. Editorial header image for an article titled "${title}". No text, no logos.`, size: opts.size ?? "1536x1024", n: 1 }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
      });
      if (!res.ok) throw new Error(`image ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
      const d = data.data?.[0];
      let bytes: Uint8Array;
      if (d?.b64_json) {
        const bin = atob(d.b64_json);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      } else if (d?.url) {
        const img = await fetch(d.url, { signal: AbortSignal.timeout(60_000) });
        if (!img.ok) throw new Error(`image download ${img.status}`);
        bytes = new Uint8Array(await img.arrayBuffer());
      } else {
        throw new Error("image: empty response");
      }
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "post";
      const tag = (await sha256(`${title}|${bytes.length}|${bytes.subarray(0, 64).join(",")}`)).slice(0, 8);
      return { url: await opts.upload(bytes, `${slug}-${tag}.png`), alt: title };
    },
  };
}

/** Try providers in order — e.g. generate, fall back to the curated library. */
export function fallbackImages(...providers: ImageProvider[]): ImageProvider {
  return {
    async imageFor(input) {
      const errors: string[] = [];
      for (const p of providers) {
        try { const r = await p.imageFor(input); if (r?.url) return r; errors.push("no url"); }
        catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
      }
      throw new Error(`no image provider succeeded: ${errors.join(" | ")}`);
    },
  };
}
