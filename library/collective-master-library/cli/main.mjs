#!/usr/bin/env node
process.stdout.on('error', (e) => { if (e?.code === 'EPIPE') process.exit(0); throw e; });
import { resolve } from 'node:path';
import { buildCollective, discoverGuides, verifyCollective, checkConsistency, VERSION } from '../lib/collective.mjs';

const HELP=`Collective Master Library ${VERSION}\n\nThe ecosystem remembers itself.\n\nUsage\n  coml build [--source-root .] [--out .collective]\n  coml status [--source-root .] [--out .collective] [--json]\n  coml verify [--source-root .] [--out .collective] [--json]\n  coml sources [--source-root .] [--json]\n  coml check [--source-root .] [--json]\n`;
function parse(argv){const p=[],a={};for(let i=0;i<argv.length;i++){const x=argv[i];if(x==='-h')a.help=true;else if(x==='-v')a.version=true;else if(x.startsWith('--')){const [k,v]=x.slice(2).split('=',2);if(v!==undefined)a[k]=v;else if(argv[i+1]&&!argv[i+1].startsWith('-'))a[k]=argv[++i];else a[k]=true;}else p.push(x)}return{p,a}}
function line(s=''){process.stdout.write(`${s}\n`)};function json(v){line(JSON.stringify(v,null,2))}
export async function main(argv=process.argv.slice(2)){
 const {p,a}=parse(argv); if(a.version)return line(VERSION); if(a.help||!p.length)return line(HELP.trimEnd());
 const sourceRoot=resolve(typeof a['source-root']==='string'?a['source-root']:process.cwd());
 const out=resolve(typeof a.out==='string'?a.out:resolve(process.cwd(),'.collective'));
 if(p[0]==='build'){const r=await buildCollective({sourceRoot,outDir:out});const result={ok:true,out:r.outDir,sources:r.manifest.guides.length,files:r.files};return a.json?json(result):(line(`Collective Master Library built from ${result.sources} Founder’s Guides.`),line(`Output: ${r.outDir}`));}
 if(p[0]==='verify'||p[0]==='status'){const r=await verifyCollective({sourceRoot,outDir:out});if(a.json)return json(r);line(`Collective Master Library: ${r.built?r.state:'NOT BUILT'}`);if(r.built){line(`Sources: ${r.source_count}`);if(r.changed.length)line(`Changed: ${r.changed.join(', ')}`);if(r.added.length)line(`Added: ${r.added.join(', ')}`);if(r.removed.length)line(`Removed: ${r.removed.join(', ')}`);if(r.version_changed.length)line(`Version changed: ${r.version_changed.join(', ')}`);if(r.missing.length)line(`Missing archive files: ${r.missing.join(', ')}`);if(r.tampered.length)line(`Modified archive files: ${r.tampered.join(', ')}`);if(!r.ok)line(r.state==='DAMAGED'?'Run build to regenerate the archive from the current guides.':'Run build to refresh the archive.');}if(p[0]==='verify'&&!r.ok)process.exitCode=1;return;}
 if(p[0]==='check'){const d=await discoverGuides(sourceRoot);const r=checkConsistency(d,{rootPackageName:d.rootPackageName});if(a.json)json(r);else{line(`Consistency: ${r.ok?'OK':`${r.findings.length} disagreement(s)`} (${r.claims_checked} claims checked across ${d.guides.length} guides)`);for(const f of r.findings){line(`  ${f.kind}: ${f.message}`);for(const c of f.claims)line(`    ${c.source_path}:${c.line}`);}}if(!r.ok)process.exitCode=1;return;}
 if(p[0]==='sources'){const d=await discoverGuides(sourceRoot);const outv=d.guides.map(({text,...g})=>g);return a.json?json(outv):outv.forEach(g=>line(`${g.kind.padEnd(7)} ${g.name}${g.version?` v${g.version}`:''} — ${g.source_path} — ${g.words} words — ${g.sha256.slice(0,12)}…`));}
 throw new Error(`Unknown command: ${p[0]}\n\n${HELP}`);
}
main().catch(e=>{process.stderr.write(`coml: ${e instanceof Error?e.message:String(e)}\n`);process.exitCode=1});
