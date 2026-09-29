import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TEAMS,
  codeToSlug,
  slugToCode,
  teamDisplayName,
  teamPath,
} from "./teams.js";

// team codes of E2026 and U2026 schedules, verified 2026-09-29
const CURRENT_CODES = [
  "ARI", "ASV", "BAH", "BAR", "BAS", "BCR", "BES", "BGS", "BLK", "BOS",
  "BOU", "BUD", "BUR", "CLU", "DUB", "FRA", "HTA", "IST", "JER", "KLA",
  "LEM", "LJU", "LKB", "LLI", "MAD", "MAN", "MIL", "MRO", "MUN", "NAP",
  "NIN", "OLY", "PAM", "PAN", "PAO", "PAR", "PRS", "RED", "RIG", "RTK",
  "SIA", "TEL", "TNF", "TRN", "TRT", "TTK", "ULK", "ULM", "VIR", "VNC",
  "WRO", "ZAL",
];

test("registry holds exactly the current season's teams", () => {
  assert.deepEqual(Object.keys(TEAMS).sort(), CURRENT_CODES);
});

test("slugs are unique and URL friendly", () => {
  const slugs = Object.values(TEAMS).map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  }
});

test("every team has a name", () => {
  for (const { name } of Object.values(TEAMS)) {
    assert.ok(name && name.trim().length > 0);
  }
});

test("slug lookups round-trip", () => {
  for (const code of Object.keys(TEAMS)) {
    assert.equal(slugToCode(codeToSlug(code)), code);
  }
  assert.equal(codeToSlug("MAD"), "real-madrid");
  assert.equal(teamDisplayName("MAD"), "Real Madrid");
  assert.equal(teamPath("MAD"), "/teams/real-madrid");
});

test("unknown codes and slugs return undefined", () => {
  assert.equal(codeToSlug("XXX"), undefined);
  assert.equal(slugToCode("nope"), undefined);
  assert.equal(teamDisplayName("XXX"), undefined);
  assert.equal(teamPath("XXX"), undefined);
});
