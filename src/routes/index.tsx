import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const REPO = "https://github.com/SweetKenneth/living";
const VERSION = "1.3.2";
const ZIP = `/downloads/living-master-library-${VERSION}.zip`;
const TGZ = `/downloads/living-master-library-${VERSION}.tgz`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Living Master Library — systems that keep things true" },
      {
        name: "description",
        content:
          "One open-source install for LivingPress, LivingChangelog, LivingGuide, LivingDocs and LivingRoadmap. MIT licensed, zero runtime dependencies.",
      },
      { property: "og:title", content: "Living Master Library" },
      {
        property: "og:description",
        content: "A free, MIT-licensed library of systems that keep docs, roadmaps and release notes true over time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const modules = [
  { cmd: "press", name: "LivingPress", v: "1.2.0", line: "Published thought that stays alive.", body: "Autonomous editorial publishing that corrects itself when the facts move." },
  { cmd: "changelog", name: "LivingChangelog", v: "1.2.0", line: "Only claims what actually shipped.", body: "Release history published only when evidence proves a change reached production." },
  { cmd: "guide", name: "LivingGuide", v: "1.0.2", line: "Your project remembers itself.", body: "A provenance-backed truth model of your project, rendered as an Owner's Manual." },
  { cmd: "docs", name: "LivingDocs", v: "1.0.2", line: "Documentation that stays true.", body: "Technical docs checked against implementation evidence, with drift detection." },
  { cmd: "roadmap", name: "LivingRoadmap", v: "1.0.0", line: "Plans that know when reality changed.", body: "Reconciles declared plans against what was built and shipped, keeping decision history." },
  { cmd: "collective", name: "Collective Master Library", v: "1.1.1", line: "The ecosystem remembers itself.", body: "Merges every Founder's Guide into one lossless, SHA-256 fingerprinted archive." },
];

const loop = ["observe reality", "establish evidence", "make a bounded claim", "challenge the claim", "publish or preserve", "detect drift", "repair without erasing history"];

const tests: [string, number][] = [
  ["Living Master Library", 37], ["livingcore", 28], ["Collective Master Library", 37], ["LivingPress", 60],
  ["LivingChangelog", 106], ["LivingGuide", 104], ["LivingDocs", 108], ["LivingRoadmap", 68],
];

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400); }}
      className="font-mono text-xs uppercase tracking-widest text-primary-foreground/60 hover:text-ember"
    >
      {done ? "copied" : "copy"}
    </button>
  );
}

function Terminal({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-sm border border-primary-foreground/15 bg-moss text-primary-foreground shadow-2xl">
      <div className="flex items-center justify-between border-b border-primary-foreground/10 px-4 py-2">
        <span className="font-mono text-xs text-primary-foreground/50">~/your-project</span>
        <Copy text={lines.join("\n")} />
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-sm leading-7">
        {lines.map((l) => (
          <div key={l}><span className="text-ember">$ </span>{l}</div>
        ))}
      </pre>
    </div>
  );
}

function Index() {
  const total = tests.reduce((a, [, n]) => a + n, 0);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-accent" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Living Master Library</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#modules" className="hover:text-foreground">Modules</a>
            <a href="#install" className="hover:text-foreground">Install</a>
            <a href="#proof" className="hover:text-foreground">Proof</a>
            <a href={REPO} className="hover:text-foreground">GitHub</a>
          </nav>
          <a href={ZIP} download className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Download
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            v{VERSION} · MIT licensed · zero runtime dependencies
          </p>
          <h1 className="mt-6 max-w-5xl font-display text-6xl font-normal leading-[0.95] tracking-tight md:text-8xl">
            Software that keeps <em className="font-medium text-primary">important things</em> true over time.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            One install, one <code className="font-mono text-foreground">living</code> command, and a family of engines that watch your docs, roadmap, release notes and publishing — and repair them when reality drifts.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={ZIP} download className="rounded-sm bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90">
              Download source (.zip)
            </a>
            <a href={TGZ} download className="rounded-sm border border-foreground/20 px-6 py-3 font-medium hover:bg-secondary">
              npm package (.tgz)
            </a>
            <a href={REPO} className="rounded-sm px-6 py-3 font-medium underline decoration-accent decoration-2 underline-offset-4 hover:text-primary">
              View on GitHub →
            </a>
          </div>
        </section>

        <section id="modules" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="font-display text-4xl font-light md:text-5xl">Six systems. One library.</h2>
              <p className="max-w-sm text-muted-foreground">Each one answers a single question: <em>what important thing goes stale?</em></p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <article key={m.name} className="group bg-card p-8 transition-colors hover:bg-background">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-xs text-muted-foreground">living {m.cmd}</span>
                    <span className="font-mono text-xs text-accent">v{m.v}</span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-medium">{m.name}</h3>
                  <p className="mt-2 font-display italic text-primary">{m.line}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              All built on <span className="text-foreground">livingcore 1.0.0</span> — receipts · model failover · circuit breaker · leases · rate defense · safe Markdown
            </p>
          </div>
        </section>

        <section className="bg-moss text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-16 px-6 py-24 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-ember">The design rule</p>
              <h2 className="mt-4 font-display text-4xl font-light leading-tight md:text-5xl">Not an AI launcher. A truth loop.</h2>
              <p className="mt-6 leading-relaxed text-primary-foreground/70">
                Every module runs the same loop against a different surface. Fuzzy evidence can propose; only proof can publish. Nothing is silently rewritten.
              </p>
            </div>
            <ol className="space-y-0">
              {loop.map((step, i) => (
                <li key={step} className="flex items-baseline gap-6 border-b border-primary-foreground/10 py-4">
                  <span className="font-mono text-sm text-ember">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-display text-xl">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="install" className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-display text-4xl font-light md:text-5xl">Install in a minute.</h2>
          <p className="mt-4 text-muted-foreground">Requires Node 22.6 or newer.</p>
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">From the download</h3>
              <Terminal lines={[`npm install -g ./living-master-library-${VERSION}.tgz`, "living init", "living doctor"]} />
            </div>
            <div>
              <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">From the repo</h3>
              <Terminal lines={[`git clone ${REPO}.git`, "cd living/library", "npm install -g .", "living audit"]} />
            </div>
          </div>
        </section>

        <section id="proof" className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-16 px-6 py-24 md:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="font-display text-8xl font-light text-primary">{total}</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">passing self-tests shipped</p>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Run <code className="font-mono text-foreground">living audit</code> and check them yourself. These describe the test suites in the package — not adoption or scale.
              </p>
            </div>
            <dl className="font-mono text-sm">
              {tests.map(([n, c]) => (
                <div key={n} className="flex justify-between border-b border-border py-3">
                  <dt className="text-muted-foreground">{n}</dt>
                  <dd>{c} passed</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground">
          <p>© 2026 SweetKenneth · Released under the MIT License.</p>
          <div className="flex gap-6">
            <a href={REPO} className="hover:text-foreground">GitHub</a>
            <a href={ZIP} download className="hover:text-foreground">Download</a>
            <a href="https://kesjr.com" className="hover:text-foreground">kesjr.com</a>
          </div>
          <p className="w-full border-t border-border pt-6 text-center">
            Made by humans who care <span className="heart-pulse inline-block" aria-label="love">❤️</span>
            {" "}| Another KESJr Collective Project
          </p>
        </div>
      </footer>
    </div>
  );
}
