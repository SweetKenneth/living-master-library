import { sha256 } from "../core/oracle.ts";
export const nowIso = (ms = Date.now()) => new Date(ms).toISOString();
export const clamp = (n: unknown, lo=0, hi=10) => Math.max(lo, Math.min(hi, Number.isFinite(Number(n)) ? Number(n) : lo));
export const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
const STOP = new Set("a an and are as at be by for from has have in into is it its of on or that the this to with will add build create update support implement feature system project roadmap living".split(" "));
export function tokens(s: string): string[] { return [...new Set(normalize(s).split(" ").filter(x=>x.length>2 && !STOP.has(x)))]; }
export function overlap(a: string,b: string): number { const A=new Set(tokens(a)), B=new Set(tokens(b)); if(!A.size||!B.size) return 0; let hit=0; for(const x of A) if(B.has(x)) hit++; return hit / Math.max(1, Math.min(A.size,B.size)); }
export async function stableId(prefix: string, value: string): Promise<string> { return `${prefix}_${(await sha256(value)).slice(0,16)}`; }
export function escapeHtml(s:string):string { return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!)); }
export function quoteFor(text:string, terms:string[], max=220):string { const norm=text.replace(/\s+/g," ").trim(); const lower=norm.toLowerCase(); let at=-1; for(const t of terms){ const i=lower.indexOf(t.toLowerCase()); if(i>=0){at=i;break;} } if(at<0) return norm.slice(0,max); const start=Math.max(0,at-Math.floor(max/3)); return norm.slice(start,start+max).trim(); }
