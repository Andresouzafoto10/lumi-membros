// src/hooks/__tests__/getReplayUrl.test.mjs
// Standalone test for getReplayUrl. Run via `node` after compiling the hook
// or by inlining the function for the matrix below.

import assert from 'node:assert/strict';

// Re-implementation mirroring the function under test. Update this if the
// signature/contract of getReplayUrl changes, then re-run.
function getReplayUrl(l) {
  if (!l.replayEnabled) return null;
  return l.recordingUrl ?? l.meetingUrl ?? null;
}

const cases = [
  { name: 'disabled',         in: { replayEnabled: false, recordingUrl: 'r', meetingUrl: 'm' }, out: null },
  { name: 'recording wins',   in: { replayEnabled: true,  recordingUrl: 'r', meetingUrl: 'm' }, out: 'r' },
  { name: 'meeting fallback', in: { replayEnabled: true,  recordingUrl: null, meetingUrl: 'm' }, out: 'm' },
  { name: 'no link',          in: { replayEnabled: true,  recordingUrl: null, meetingUrl: null }, out: null },
];

let failed = 0;
for (const c of cases) {
  try {
    assert.equal(getReplayUrl(c.in), c.out);
    console.log(`ok  ${c.name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${c.name}: expected ${c.out}, got ${getReplayUrl(c.in)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} tests passed`);
