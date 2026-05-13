#!/usr/bin/env node
/**
 * Backup orphan Supabase Storage files to R2 under legacy/<bucket>/<path>.
 *
 * Reads creds from ../.env. Verifies HEAD on R2 after upload. Writes manifest
 * to migration-manifest.json. Idempotent: re-running skips files already
 * present at the same key with matching size.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

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

const required = [
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_R2_ENDPOINT",
  "VITE_R2_BUCKET_NAME",
  "VITE_R2_PUBLIC_URL",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];
for (const key of required) {
  if (!env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const r2 = new S3Client({
  region: "auto",
  endpoint: env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = env.VITE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = env.VITE_R2_PUBLIC_URL.replace(/\/$/, "");

async function listAllInBucket(bucket, prefix = "", acc = []) {
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
        // sub-folder placeholder; recurse
        await listAllInBucket(bucket, full, acc);
      } else {
        acc.push({
          bucket,
          path: full,
          size: Number(entry.metadata?.size ?? 0),
          mimetype: entry.metadata?.mimetype ?? "application/octet-stream",
        });
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return acc;
}

async function listOrphans() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const all = [];
  for (const b of buckets) {
    await listAllInBucket(b.name, "", all);
  }
  return all.sort((a, b) =>
    `${a.bucket}/${a.path}`.localeCompare(`${b.bucket}/${b.path}`),
  );
}

async function downloadFromSupabase(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`download failed ${bucket}/${path}: ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  return buf;
}

async function r2HeadOrNull(key) {
  try {
    const res = await r2.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );
    return { contentLength: Number(res.ContentLength ?? 0) };
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") {
      return null;
    }
    throw err;
  }
}

async function uploadToR2(key, buffer, mimetype) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ContentLength: buffer.length,
    }),
  );
}

async function main() {
  console.log("Loading existing manifest…");
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
    : { migrated_at: null, entries: [] };
  const existing = new Set(
    manifest.entries.map((e) => `${e.source.bucket}/${e.source.path}`),
  );

  console.log("Listing orphans in storage.objects…");
  const orphans = await listOrphans();
  console.log(`Found ${orphans.length} object(s) in Supabase Storage.`);

  for (const o of orphans) {
    const id = `${o.bucket}/${o.path}`;
    const key = `legacy/${o.bucket}/${o.path}`;
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    if (existing.has(id)) {
      console.log(`  skip (manifest): ${id}`);
      continue;
    }

    console.log(`  downloading: ${id} (${o.size} bytes)`);
    const buf = await downloadFromSupabase(o.bucket, o.path);
    if (buf.length !== o.size) {
      throw new Error(
        `Size mismatch ${id}: storage says ${o.size}, downloaded ${buf.length}`,
      );
    }
    const sha256 = createHash("sha256").update(buf).digest("hex");

    const head = await r2HeadOrNull(key);
    if (head && head.contentLength === buf.length) {
      console.log(`    already present in R2 (size match): ${key}`);
    } else {
      console.log(`    uploading → R2 ${key}`);
      await uploadToR2(key, buf, o.mimetype);
      const confirm = await r2HeadOrNull(key);
      if (!confirm) {
        throw new Error(`Upload not visible via HEAD: ${key}`);
      }
      if (confirm.contentLength !== buf.length) {
        throw new Error(
          `Post-upload size mismatch ${key}: expected ${buf.length}, got ${confirm.contentLength}`,
        );
      }
    }

    manifest.entries.push({
      source: { bucket: o.bucket, path: o.path, size: buf.length, sha256, mimetype: o.mimetype },
      destination: { bucket: R2_BUCKET, key, publicUrl },
      migrated_at: new Date().toISOString(),
    });
  }

  manifest.migrated_at = new Date().toISOString();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nDone. Manifest: ${MANIFEST_PATH}`);
  console.log(`Total entries: ${manifest.entries.length}`);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
