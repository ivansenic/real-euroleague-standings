/**
 * Generates a team logo sprite sheet from individual logo files.
 *
 * Source logos: assets/team-logos/NN-CODE.webp (e.g. 01-ARI.webp)
 * Output:
 *   - public/images/team-logos-sprite.webp (sprite sheet)
 *   - lib/sprite-map.json (position map for each team code)
 *
 * To add a new logo:
 *   1. Add the file to assets/team-logos/ with the next number (e.g. 46-NEW.webp)
 *   2. Run: node scripts/generate-sprite.mjs
 *
 * Requires Python 3 with Pillow (used via child_process to avoid Node native deps).
 */

import { execSync } from "node:child_process";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGO_DIR = join(ROOT, "assets", "team-logos");
const SPRITE_OUT = join(ROOT, "public", "images", "team-logos-sprite.webp");
const MAP_OUT = join(ROOT, "lib", "sprite-map.json");

// Read and sort source logos by their numeric prefix
const files = readdirSync(LOGO_DIR)
  .filter((f) => /^\d+-[A-Z]+\.webp$/.test(f))
  .sort((a, b) => {
    const numA = parseInt(a.split("-")[0], 10);
    const numB = parseInt(b.split("-")[0], 10);
    return numA - numB;
  });

if (files.length === 0) {
  console.error("No logo files found in assets/team-logos/");
  process.exit(1);
}

const codes = files.map((f) => f.replace(/^\d+-/, "").replace(".webp", ""));
const CELL_SIZE = 90;
const COLS = 9;
const ROWS = Math.ceil(files.length / COLS);

console.log(`Found ${files.length} logos, generating ${COLS}x${ROWS} sprite...`);

// Build sprite map
const spriteMap = { cellSize: CELL_SIZE, cols: COLS, codes };

// Ensure output dirs exist
mkdirSync(dirname(SPRITE_OUT), { recursive: true });
mkdirSync(dirname(MAP_OUT), { recursive: true });

// Write sprite map
writeFileSync(MAP_OUT, JSON.stringify(spriteMap, null, 2) + "\n");
console.log(`Wrote ${MAP_OUT}`);

// Generate sprite image using Python/Pillow via temp script file
import { tmpdir } from "node:os";
import { unlinkSync } from "node:fs";

const pyScriptPath = join(tmpdir(), "generate_sprite.py");
writeFileSync(
  pyScriptPath,
  `import sys, os
from PIL import Image

logo_dir = sys.argv[1]
out_path = sys.argv[2]
files = sys.argv[3:]
cell = ${CELL_SIZE}
cols = ${COLS}
rows = ${ROWS}

sprite = Image.new('RGBA', (cols * cell, rows * cell), (0, 0, 0, 0))
for i, fname in enumerate(files):
    img = Image.open(os.path.join(logo_dir, fname)).convert('RGBA')
    col = i % cols
    row = i // cols
    sprite.paste(img, (col * cell, row * cell))

sprite.save(out_path, 'WEBP', quality=90)
print(f'Wrote {out_path} ({cols * cell}x{rows * cell}px, {os.path.getsize(out_path)} bytes)')
`
);

try {
  const args = [pyScriptPath, LOGO_DIR, SPRITE_OUT, ...files].map((a) => JSON.stringify(a)).join(" ");
  execSync(`python3 ${args}`, { stdio: "inherit" });
} finally {
  unlinkSync(pyScriptPath);
}

console.log("Done!");
