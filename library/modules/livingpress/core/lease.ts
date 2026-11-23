/**
 * Tick lease: one tick at a time, so overlapping scheduler calls never draft
 * or publish twice. Atomic when the store provides tryLease (each product's
 * schema.sql ships a Postgres function); best effort through state otherwise.
 */
import type { AtomicStore } from "./types.ts";

type Lease = { until: number; owner: string };
export const LEASE_MS = 10 * 60_000;

export async function acquireLease(store: AtomicStore, name: string, owner: string, now: number, ttlMs = LEASE_MS): Promise<boolean> {
  if (store.tryLease) return store.tryLease(name, owner, now + ttlMs, now);
  const key = `engine.lease.${name}`;
  const lease = await store.getState<Lease>(key);
  if (lease && lease.until > now && lease.owner !== owner) return false;
  await store.setState(key, { until: now + ttlMs, owner });
  return (await store.getState<Lease>(key))?.owner === owner;
}

export async function releaseLease(store: AtomicStore, name: string, owner: string): Promise<void> {
  if (store.releaseLease) return store.releaseLease(name, owner);
  const key = `engine.lease.${name}`;
  const held = await store.getState<Lease>(key);
  if (held?.owner === owner) await store.setState(key, { until: 0, owner: "" });
}
