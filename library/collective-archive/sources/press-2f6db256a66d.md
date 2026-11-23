# LivingPress — Founder's Guide

*LivingPress: Autonomous Editorial Engine.* This guide is only about LivingPress: what it does, what you control, and how to read what it tells you.

## What it is
A writer that lives on your site. A few times a day it wakes up, looks at what it has already published, and asks one question: **do I have something worth saying?** Most of the time the honest answer is no, and it goes back to sleep — and writes down why. When the answer is yes, it writes, argues with itself, fixes what it got wrong, adds an image, and publishes.

It also goes back and **re-reads its old posts**. If something it said is no longer true — a price changed, a page moved, a word you've retired — it corrects the post and adds a visible "Updated" note so readers can see what changed.

## The rules it lives by
1. **It only states your facts.** It may only rely on the house facts you gave it. Anything else is treated as a claim it cannot support.
2. **Every post must be worth reading even if your business didn't exist.** Only every third post (you choose) may recommend you directly. The rest just help.
3. **Silence beats filler.** A missed day is fine. A bad post isn't.
4. **No image, no post.**
5. **Corrections are public.** It never quietly rewrites history.

## How one post gets made
1. **Health check.** If it has been failing repeatedly, its safety switch is off and it stays quiet.
2. **Self-repair.** Fixes small breakages (missing images, stuck topics).
3. **Maybe re-read an old post** instead of writing a new one.
4. **Look at the gaps** — topics with no main article, main articles without follow-ups, topics gone stale.
5. **Pick a topic** using its strategy: stick with what's working, try something less covered, or retry a failed idea from a new angle.
6. **Write the draft.**
7. **Safety check (no AI involved):** made-up numbers, fake testimonials, risky advice, broken links, robot phrasing.
8. **Two critics.** A *Reader* asks "was this worth my time?" A *Skeptic* asks "can we prove this?" Both must pass. One rewrite allowed.
9. **Seven gates** — reader, skeptic, safety, length, links, not-an-ad, clean. All must pass.
10. **Image, then publish.** Every outcome — published, silent, blocked, corrected — gets a sealed receipt.

## What you control (`livingpress.config.json`)
| Setting | What it means |
|---|---|
| Site, blog name, tagline | Names and where the blog lives |
| Audience | Who it writes for — the more specific, the better the posts |
| Voice | How it sounds |
| **House facts** | The only truth it may tell. Update this whenever something changes — old posts will be corrected to match |
| Never claim | Things it must never say |
| Retired words | Words it must stop using; old posts get cleaned too |
| Content topics | 3–6 subjects, each with its argument and search terms |
| Reader problems | What your readers are struggling with |
| Site links | Pages it may link to — it will link nowhere else |
| Advocacy every | Every Nth post may recommend you |
| Word targets | Length of main articles and follow-ups |
| Quality floor | How strict the critics are. Higher = fewer, better posts |
| Cadence | Minimum hours between posts; how often it re-reads old ones |
| Safety switch | How many failures before it stops, how long it rests |

## Seeing a post before it goes live
Ask whoever installed it to run a **dry run**. It does everything a real run does (picks a topic, writes, argues with itself, runs the safety check) and then stops and shows you the post instead of publishing it. Nothing changes on your site. It's the best way to judge the voice before you let it loose.

It also refuses to run at all while any setup question is still unanswered, so it can never write from half a brief.

## Reading its pulse
Ask whoever installed it to show you the **health** report:
- **Healthy** — heartbeat recent, safety switch closed, receipts valid.
- **Safety switch open** — it hit repeated problems (often an AI account out of credit). It's resting on purpose. Fix the cause, then reset it.
- **Many silent days** — normal for a while. If it lasts, your topics may be used up or the quality floor too high.
- **Receipts invalid** — someone edited its history. That should never happen.
- **Config or secret findings** — a setup answer is missing, or a password is too short. The report says which.

## Improvement suggestions (DREAM)
LivingPress studies its own history and suggests changes, for example: "readers spend far more time on Topic B — favor it", "you keep opening posts the same way", "the critics reject almost everything — add a topic or lower the bar". **It never changes itself.** You accept a suggestion, or you don't.

## Backup AI (NEXUS)
Give it two AI accounts if you can. When the first one runs out of quota, it switches to the next automatically and comes back to the first later.

## Who sees what
- Readers see published posts, images, caveats and correction notes.
- Topics, receipts, health and suggestions are visible only to you (owner key) and the server.
- Bot traffic is filtered out, so crawlers never shape what it writes.

## What it is not
It is not a content calendar, and it won't post daily just because a day passed. It cannot know facts you didn't give it. It needs a database, an AI account and a scheduler to run — those are the only outside things it depends on.
