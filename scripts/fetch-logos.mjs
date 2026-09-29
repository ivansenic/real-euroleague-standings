/**
 * Fetches current team logos (crests) from the EuroLeague API and updates
 * assets/team-logos/NN-CODE.webp, then regenerates the sprite sheet.
 *
 * Existing files keep their numeric prefix so the sprite order stays stable.
 * New team codes get the next free number.
 *
 * Usage: node scripts/fetch-logos.mjs
 *
 * Requires Python 3 with Pillow (used via child_process to avoid Node native deps).
 */

import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGO_DIR = join(ROOT, "assets", "team-logos");
const CELL_SIZE = 90;

// competition code -> season code
const SEASONS = { E: "E2026", U: "U2026" };

const existing = Object.fromEntries(
  readdirSync(LOGO_DIR)
    .filter((f) => /^\d+-[A-Z]+\.webp$/.test(f))
    .map((f) => [f.replace(/^\d+-/, "").replace(".webp", ""), f])
);
let nextNumber =
  Math.max(0, ...Object.values(existing).map((f) => parseInt(f, 10))) + 1;

const clubs = [];
for (const [competition, season] of Object.entries(SEASONS)) {
  const response = await fetch(
    `https://api-live.euroleague.net/v2/competitions/${competition}/seasons/${season}/clubs`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch clubs for ${season}: HTTP ${response.status}`);
  }
  const body = await response.json();
  for (const club of body.data ?? body) {
    const crest = club.images?.crest;
    if (!crest) {
      console.warn(`No crest for ${club.code} (${club.name}), skipping`);
      continue;
    }
    clubs.push({ code: club.code, name: club.name, crest });
  }
}

const tmp = mkdtempSync(join(tmpdir(), "logos-"));
try {
  const jobs = [];
  for (const { code, name, crest } of clubs) {
    const file =
      existing[code] ?? `${String(nextNumber++).padStart(2, "0")}-${code}.webp`;
    existing[code] = file;

    const response = await fetch(`${crest}?width=${CELL_SIZE * 2}&format=webp`);
    if (!response.ok) {
      throw new Error(`Failed to download crest for ${code}: HTTP ${response.status}`);
    }
    const src = join(tmp, `${code}.webp`);
    writeFileSync(src, Buffer.from(await response.arrayBuffer()));
    jobs.push([src, join(LOGO_DIR, file)]);
    console.log(`${code.padEnd(4)} ${file.padEnd(12)} ${name}`);
  }

  // Fit each logo into a transparent square cell, centered on its visible content
  const pyScriptPath = join(tmp, "fit_logos.py");
  writeFileSync(
    pyScriptPath,
    `import sys
from PIL import Image

cell = ${CELL_SIZE}
args = sys.argv[1:]
for src, dst in zip(args[0::2], args[1::2]):
    img = Image.open(src).convert('RGBA')
    bbox = img.getchannel('A').getbbox()
    if bbox:
        img = img.crop(bbox)
    img.thumbnail((cell, cell), Image.LANCZOS)
    out = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
    out.paste(img, ((cell - img.width) // 2, (cell - img.height) // 2), img)
    out.save(dst, 'WEBP', quality=90)
`
  );
  const args = [pyScriptPath, ...jobs.flat()].map((a) => JSON.stringify(a)).join(" ");
  execSync(`python3 ${args}`, { stdio: "inherit" });
  console.log(`Updated ${jobs.length} logos`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

execSync(`node ${JSON.stringify(join(ROOT, "scripts", "generate-sprite.mjs"))}`, {
  stdio: "inherit",
});
