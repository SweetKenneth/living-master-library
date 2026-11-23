/**
 * MECHANIC — self-repair. Runs cheaply at the start of a tick, no model.
 * Fixes the boring breakages that make an autonomous blog rot:
 *  - topics stuck after repeated failures -> rejected so they stop blocking
 *  - posts missing an image -> re-imaged
 *  - posts with an H1 in the body or a dangling pillar link -> normalized
 *  - duplicate queued titles -> collapsed
 * Every repair is listed in the tick receipt.
 */

import { demoteH1 } from "./markdown.ts";
import type { ImageProvider, Post, Storage } from "./ports.ts";

export async function repair(storage: Storage, images: ImageProvider): Promise<string[]> {
  const done: string[] = [];
  const topics = await storage.listTopics("queued", 200);
  const seen = new Set<string>();
  for (const t of topics) {
    const key = t.title.toLowerCase().trim();
    if (t.attempts >= 3) {
      await storage.updateTopic(t.id, { status: "rejected" });
      done.push(`retired stuck topic "${t.title}" after ${t.attempts} attempts`);
    } else if (seen.has(key)) {
      await storage.updateTopic(t.id, { status: "rejected" });
      done.push(`collapsed duplicate topic "${t.title}"`);
    }
    seen.add(key);
  }

  const posts = await storage.listPosts(200);
  const slugs = new Set(posts.map((p) => p.slug));
  for (const p of posts) {
    const patch: Partial<Post> = {};
    if (!p.image_url) {
      try {
        const img = await images.imageFor({ title: p.title, keywords: p.keywords ?? [], recentlyUsed: posts.slice(0, 8).map((x) => x.image_url).filter(Boolean) });
        if (img?.url) {
          patch.image_url = img.url;
          patch.image_alt = img.alt || p.title;
          done.push(`re-imaged "${p.slug}"`);
        }
      } catch {
        /* leave for next tick */
      }
    }
    const demoted = demoteH1(p.body);
    if (demoted !== p.body) {
      patch.body = demoted;
      done.push(`demoted stray H1 in "${p.slug}"`);
    }
    if (p.pillar_slug && !slugs.has(p.pillar_slug)) {
      patch.pillar_slug = null;
      done.push(`cleared dangling pillar link on "${p.slug}"`);
    }
    if (Object.keys(patch).length) await storage.updatePost(p.id, patch);
  }
  return done;
}
