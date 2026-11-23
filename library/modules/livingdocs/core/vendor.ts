/**
 * Vendored-core drift check. A product keeps a copy of livingcore in core/
 * (so it stays a single repo with zero dependencies) plus CORE-MANIFEST.json
 * listing each file's hash. Products run this in their test suite: an edit to
 * the copy instead of to livingcore fails the build.
 */
import { sha256 } from "./oracle.ts";

export type CoreManifest = { name: "livingcore"; version: string; files: Record<string, string> };

export async function checkVendoredCore(files: Record<string, string>, manifest: CoreManifest): Promise<string[]> {
  const problems: string[] = [];
  for (const [name, hash] of Object.entries(manifest.files)) {
    const text = files[name];
    if (text === undefined) problems.push(`core/${name} is missing`);
    else if ((await sha256(text)) !== hash) problems.push(`core/${name} was edited in place; change livingcore and run its sync script instead`);
  }
  for (const name of Object.keys(files)) if (!(name in manifest.files)) problems.push(`core/${name} is not part of livingcore ${manifest.version}`);
  return problems;
}
