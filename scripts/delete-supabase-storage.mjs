#!/usr/bin/env node
/**
 * Delete all Supabase Storage objects and buckets via the Storage API.
 *
 * Pre-conditions:
 *   - All objects were previously backed up to R2 via migrate-supabase-storage.mjs
 *   - migration-manifest.json contains the full backup record
 *   - RLS policies on storage.objects have been dropped (migration 002)
 *
 * Steps per bucket:
 *   1. list all object paths recursively
 *   2. remove([...paths]) in one call
 *   3. deleteBucket(bucket)
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, "..", ".env");
const MANIFEST_PATH = join(__dirname, "migration-manifest.json");

function loadEnv() {
  const raw = readFileSync(ENV_PATH, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv();

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function listAllPaths(bucket, prefix = "", acc = []) {
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        await listAllPaths(bucket, full, acc);
      } else {
        acc.push(full);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return acc;
}

async function safetyCheckBackup() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      "migration-manifest.json missing. Run migrate-supabase-storage.mjs first.",
    );
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (!manifest.entries || manifest.entries.length === 0) {
    console.warn(
      "WARN: manifest has zero entries. If buckets really are empty, that's fine.",
    );
  }
  return manifest;
}

async function main() {
  await safetyCheckBackup();

  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  console.log(`Found ${buckets.length} bucket(s).`);

  for (const b of buckets) {
    console.log(`\nBucket: ${b.name}`);
    const paths = await listAllPaths(b.name);
    console.log(`  ${paths.length} object(s) inside`);

    if (paths.length > 0) {
      const CHUNK = 100;
      for (let i = 0; i < paths.length; i += CHUNK) {
        const slice = paths.slice(i, i + CHUNK);
        const { error: removeError } = await supabase.storage
          .from(b.name)
          .remove(slice);
        if (removeError) {
          throw new Error(`remove ${b.name}: ${removeError.message}`);
        }
        console.log(`  removed ${slice.length} object(s)`);
      }
    }

    const { error: deleteError } = await supabase.storage.deleteBucket(b.name);
    if (deleteError) {
      throw new Error(`deleteBucket ${b.name}: ${deleteError.message}`);
    }
    console.log(`  bucket deleted`);
  }

  const { data: remaining } = await supabase.storage.listBuckets();
  console.log(
    `\nDone. Remaining buckets: ${remaining ? remaining.length : "?"}`,
  );
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
