declare module "node:fs/promises" {
  export function readFile(path: string, encoding?: string): Promise<any>;
  export function writeFile(path: string, data: string | Uint8Array, encoding?: string): Promise<void>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function mkdir(path: string, opts?: any): Promise<void>;
  export function readdir(path: string, opts?: any): Promise<any[]>;
  export function stat(path: string): Promise<any>;
  export function access(path: string): Promise<void>;
  export function copyFile(src: string, dst: string): Promise<void>;
  export function rm(path: string, opts?: any): Promise<void>;
}
declare module "node:path" {
  export function resolve(...parts: string[]): string;
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
  export function extname(path: string): string;
  export function basename(path: string): string;
  export function dirname(path: string): string;
  export const sep: string;
}
