# Team Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One page per team at `/teams/<slug>` with last 3 results, next 3 fixtures and known h2h tiebreakers, linked from the standings table and schedule widget.

**Architecture:** A hand-written registry (`lib/teams.js`) maps feed team codes to stable slugs and names. A pure lib (`lib/team-page.js`) turns the existing EL feeds into team page data, reusing `buildScheduleDays` and the standings generators. A thin server page renders it with shared game row pieces extracted from the schedule widget.

**Tech Stack:** Next.js 15 App Router (params are a Promise), React 19, Tailwind 3, `node --test` for unit tests, `xmldom` for XML.

**Spec:** `docs/superpowers/specs/2026-09-29-team-pages-design.md`

## Global Constraints

- Route: `/teams/<slug>`, season- and competition-agnostic, unknown slug → 404 (`dynamicParams = false`), no redirects.
- Current season: EuroLeague `E2026`, EuroCup `U2026`, label `2026/27`, EuroCup groups `A`–`D`.
- Feed URLs must stay byte-identical to today's (`https://api-live.euroleague.net/v1/results?seasoncode=<code>`, `https://api-live.euroleague.net/v1/schedules?seasonCode=<code>`) with `revalidate: 300` so the fetch cache is shared with league pages.
- Page `revalidate = 300`.
- Accent: EuroLeague `text-orange-400` / `bg-orange-400/15 text-orange-400`; EuroCup `text-indigo-400` / `bg-indigo-400/15 text-indigo-400`.
- Title format: `Real Madrid – EuroLeague 2026/27 Results, Schedule & Tiebreakers`.
- Canonical and sitemap base: `https://euroleague-standings.com`.
- Known tiebreaker = both regular-season h2h games played. Positive = 2-0 or 1-1 with diff > 0; negative = 0-2 or 1-1 with diff < 0; 1-1 with diff 0 excluded.
- Link a team only when it is in the registry; otherwise plain text.
- Tests: `yarn test` runs `node --test "lib/**/*.test.js"` — tests live in `lib/`, plain JS, `node:assert/strict`.
- Match the surrounding code style: JS components (`.jsx`), `classnames`, 2-space indent, sparse comments.

## Review Focus

1. EuroCup team before the season (results feed empty) — page must render with no record, "No games played yet" and empty tiebreakers, not crash. Pinned in Task 3 (`getTeamPageData` with empty results).
2. Feed request fails or returns an empty body — `xmldom` throws on `""`; must be treated as an empty feed. Pinned in Task 3 (`orEmptyXml`) and used in Task 5.
3. Game today for a viewer in another time zone around midnight — "today" must be judged in the viewer's zone, not Berlin. Pinned in Task 3 (`isSameDay` tests).
4. Registry team whose code is in neither schedule feed (left both competitions) — must 404, not render an empty page. Pinned in Task 3 (`findCompetition` returns `null`) and used in Task 5.
5. h2h split 1-1 with equal points — must appear in neither list. Pinned in Task 3 (`getKnownTiebreakers`).

---

## File Map

- Create `lib/season.js` — current season codes, label, competitions config, feed URLs, site URL.
- Create `lib/season.test.js`
- Create `lib/teams.js` — code → `{ slug, name }` registry and lookups.
- Create `lib/teams.test.js`
- Create `lib/team-page.js` — pure team page logic.
- Create `lib/team-page.test.js`
- Create `components/GameParts.jsx` — shared client pieces: `useNow`, `BERLIN`, `Score`, `Odds`, `TeamName`, `TeamLink`, `MatchupRow`.
- Modify `components/ScheduleWidget.jsx` — use `GameParts`, team sides become links.
- Modify `components/Standings.jsx:393-405` — team cell becomes link.
- Create `components/TeamGames.jsx` — client, last/next games columns.
- Create `components/KnownTiebreakers.jsx` — won/lost tiebreaker columns.
- Create `app/teams/[slug]/page.tsx` — route, metadata, static params.
- Create `app/sitemap.ts`
- Modify `app/page.tsx`, `app/eurocup/page.tsx` — read feed URLs/groups from `lib/season.js`.

---

### Task 1: Season config

**Files:**
- Create: `lib/season.js`
- Create: `lib/season.test.js`
- Modify: `app/page.tsx:23-30`
- Modify: `app/eurocup/page.tsx:35-48`

**Interfaces:**
- Produces: `SEASON_LABEL: string`, `SITE_URL: string`, `EUROCUP_GROUPS: string[]`, `FEED_REVALIDATE: number`, `COMPETITIONS: { euroleague, eurocup }` each `{ key, name, seasonCode, standingsPath, accentClass, accentBadgeClass }`, `resultsUrl(seasonCode): string`, `scheduleUrl(seasonCode): string`.

- [ ] **Step 1: Write the failing test** — `lib/season.test.js`

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPETITIONS, resultsUrl, scheduleUrl } from "./season.js";

// league and team pages share the fetch cache only if URLs match exactly
test("feed URLs match the ones the league pages always used", () => {
  assert.equal(
    resultsUrl(COMPETITIONS.euroleague.seasonCode),
    "https://api-live.euroleague.net/v1/results?seasoncode=E2026"
  );
  assert.equal(
    scheduleUrl(COMPETITIONS.eurocup.seasonCode),
    "https://api-live.euroleague.net/v1/schedules?seasonCode=U2026"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL, `Cannot find module '.../lib/season.js'`

- [ ] **Step 3: Write `lib/season.js`**

```js
// Current season. Next season: bump the codes and the label here.
export const SEASON_LABEL = "2026/27";

export const SITE_URL = "https://euroleague-standings.com";

// 2026/27: four groups of eight, top four of each group advance to playoffs
export const EUROCUP_GROUPS = ["A", "B", "C", "D"];

export const FEED_REVALIDATE = 5 * 60;

export const COMPETITIONS = {
  euroleague: {
    key: "euroleague",
    name: "EuroLeague",
    seasonCode: "E2026",
    standingsPath: "/",
    accentClass: "text-orange-400",
    accentBadgeClass: "bg-orange-400/15 text-orange-400",
  },
  eurocup: {
    key: "eurocup",
    name: "EuroCup",
    seasonCode: "U2026",
    standingsPath: "/eurocup",
    accentClass: "text-indigo-400",
    accentBadgeClass: "bg-indigo-400/15 text-indigo-400",
  },
};

const FEED = "https://api-live.euroleague.net/v1";

export const resultsUrl = (seasonCode) =>
  `${FEED}/results?seasoncode=${seasonCode}`;

export const scheduleUrl = (seasonCode) =>
  `${FEED}/schedules?seasonCode=${seasonCode}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS (all suites)

- [ ] **Step 5: Use it in `app/page.tsx`**

Add import:

```tsx
import {
  COMPETITIONS,
  FEED_REVALIDATE,
  resultsUrl,
  scheduleUrl,
} from "@/lib/season.js";
```

Replace the two fetches inside `Promise.all`:

```tsx
    fetch(resultsUrl(COMPETITIONS.euroleague.seasonCode), {
      next: { revalidate: FEED_REVALIDATE },
    }),
    fetch(scheduleUrl(COMPETITIONS.euroleague.seasonCode), {
      next: { revalidate: FEED_REVALIDATE },
    }),
```

- [ ] **Step 6: Use it in `app/eurocup/page.tsx`**

Add import:

```tsx
import {
  COMPETITIONS,
  EUROCUP_GROUPS,
  FEED_REVALIDATE,
  resultsUrl,
  scheduleUrl,
} from "@/lib/season.js";
```

Delete the local `// 2026/27: four groups…` comment and `const GROUPS = [...]`. Replace `GROUPS.map(` with `EUROCUP_GROUPS.map(`. Replace the two fetches:

```tsx
    fetch(resultsUrl(COMPETITIONS.eurocup.seasonCode), {
      next: { revalidate: FEED_REVALIDATE },
    }),
    fetch(scheduleUrl(COMPETITIONS.eurocup.seasonCode), {
      next: { revalidate: FEED_REVALIDATE },
    }),
```

- [ ] **Step 7: Verify types and lint**

Run: `yarn tsc --noEmit && yarn lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/season.js lib/season.test.js app/page.tsx app/eurocup/page.tsx
git commit -m "move season codes and feed URLs into lib/season.js"
```

---

### Task 2: Team registry

**Files:**
- Create: `lib/teams.js`
- Create: `lib/teams.test.js`

**Interfaces:**
- Produces: `TEAMS: Record<code, { slug, name }>`, `codeToSlug(code): string | undefined`, `slugToCode(slug): string | undefined`, `teamDisplayName(code): string | undefined`, `teamPath(code): string | undefined` (`"/teams/<slug>"`).

- [ ] **Step 1: Write the failing test** — `lib/teams.test.js`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL, `Cannot find module '.../lib/teams.js'`

- [ ] **Step 3: Write `lib/teams.js`**

```js
// Teams of the current season, keyed by feed team code. Slugs and names are
// sponsor-free so team page URLs survive sponsor changes. Next season: add
// new codes, remove teams that left both competitions.
export const TEAMS = {
  // EuroLeague
  ASV: { slug: "asvel", name: "ASVEL" },
  BAR: { slug: "barcelona", name: "Barcelona" },
  BAS: { slug: "baskonia", name: "Baskonia" },
  BES: { slug: "besiktas", name: "Besiktas" },
  DUB: { slug: "dubai-basketball", name: "Dubai Basketball" },
  HTA: { slug: "hapoel-tel-aviv", name: "Hapoel Tel Aviv" },
  IST: { slug: "anadolu-efes", name: "Anadolu Efes" },
  MAD: { slug: "real-madrid", name: "Real Madrid" },
  MIL: { slug: "olimpia-milano", name: "Olimpia Milano" },
  MUN: { slug: "bayern-munich", name: "Bayern Munich" },
  OLY: { slug: "olympiacos", name: "Olympiacos" },
  PAM: { slug: "valencia-basket", name: "Valencia Basket" },
  PAN: { slug: "panathinaikos", name: "Panathinaikos" },
  PAR: { slug: "partizan", name: "Partizan" },
  PRS: { slug: "paris-basketball", name: "Paris Basketball" },
  RED: { slug: "crvena-zvezda", name: "Crvena Zvezda" },
  TEL: { slug: "maccabi-tel-aviv", name: "Maccabi Tel Aviv" },
  ULK: { slug: "fenerbahce", name: "Fenerbahce" },
  VIR: { slug: "virtus-bologna", name: "Virtus Bologna" },
  ZAL: { slug: "zalgiris", name: "Zalgiris" },
  // EuroCup
  ARI: { slug: "aris", name: "Aris" },
  BAH: { slug: "bahcesehir-college", name: "Bahcesehir College" },
  BCR: { slug: "roma-basketball", name: "Roma Basketball" },
  BGS: { slug: "san-pablo-burgos", name: "San Pablo Burgos" },
  BLK: { slug: "balkan-botevgrad", name: "Balkan Botevgrad" },
  BOS: { slug: "bosna-sarajevo", name: "Bosna Sarajevo" },
  BOU: { slug: "bourg-en-bresse", name: "Bourg-en-Bresse" },
  BUD: { slug: "buducnost", name: "Buducnost" },
  BUR: { slug: "tofas-bursa", name: "Tofas Bursa" },
  CLU: { slug: "u-bt-cluj-napoca", name: "U-BT Cluj-Napoca" },
  FRA: { slug: "skyliners-frankfurt", name: "Skyliners Frankfurt" },
  JER: { slug: "hapoel-jerusalem", name: "Hapoel Jerusalem" },
  KLA: { slug: "neptunas-klaipeda", name: "Neptunas Klaipeda" },
  LEM: { slug: "le-mans", name: "Le Mans" },
  LJU: { slug: "cedevita-olimpija", name: "Cedevita Olimpija" },
  LKB: { slug: "lietkabelis", name: "Lietkabelis" },
  LLI: { slug: "london-lions", name: "London Lions" },
  MAN: { slug: "manresa", name: "Manresa" },
  MRO: { slug: "maxima-roma", name: "Maxima Roma" },
  NAP: { slug: "napoli-basketball", name: "Napoli Basketball" },
  NIN: { slug: "niners-chemnitz", name: "Niners Chemnitz" },
  PAO: { slug: "paok", name: "PAOK" },
  RIG: { slug: "riga-zelli", name: "Riga Zelli" },
  RTK: { slug: "rostock-seawolves", name: "Rostock Seawolves" },
  SIA: { slug: "siauliai", name: "Siauliai" },
  TNF: { slug: "la-laguna-tenerife", name: "La Laguna Tenerife" },
  TRN: { slug: "trento", name: "Trento" },
  TRT: { slug: "derthona-tortona", name: "Derthona Tortona" },
  TTK: { slug: "turk-telekom", name: "Turk Telekom" },
  ULM: { slug: "ratiopharm-ulm", name: "ratiopharm Ulm" },
  VNC: { slug: "reyer-venezia", name: "Reyer Venezia" },
  WRO: { slug: "slask-wroclaw", name: "Slask Wroclaw" },
};

const SLUG_TO_CODE = new Map(
  Object.entries(TEAMS).map(([code, { slug }]) => [slug, code])
);

export const codeToSlug = (code) => TEAMS[code]?.slug;

export const slugToCode = (slug) => SLUG_TO_CODE.get(slug);

export const teamDisplayName = (code) => TEAMS[code]?.name;

export const teamPath = (code) => {
  const slug = codeToSlug(code);
  return slug ? `/teams/${slug}` : undefined;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/teams.js lib/teams.test.js
git commit -m "add team registry with slugs and display names"
```

---

### Task 3: Team page logic

**Files:**
- Create: `lib/team-page.js`
- Create: `lib/team-page.test.js`

**Interfaces:**
- Consumes: `EUROCUP_GROUPS` (Task 1); `buildScheduleDays({ scheduleGames, scores, odds, config, ref })` from `lib/schedule.js` → `[{ date: "YYYY-MM-DD", games: [{ gameNumber, homeCode, awayCode, homeName, awayName, time, startsAt, played, homeScore?, awayScore?, odds? }] }]` sorted by date then time; `generateEuroleagueStandingsFormXml(xml)` / `generateEurocupStandingsFormXml(xml, group)` → `{ standings: [{ code, name, wins, losses, h2h: { [opp]: { wins, losses, ptsFor, ptsAgainst } } }] }` ordered by position; `parseResultScores(xml)`.
- Produces:
  - `orEmptyXml(text): string` — `"<empty/>"` for empty/blank/nullish input, else `text`.
  - `findCompetition(code, gamesByCompetition): string | null` — `gamesByCompetition` is `{ [key]: scheduleGame[] }`.
  - `getTeamGames(days, code, count = 3): { last, next }` — games get an extra `date` field.
  - `getKnownTiebreakers(team, standings): { positive, negative }` — entries `{ code, wins, losses, diff }`.
  - `isSameDay(startsAt, now, timeZone?): boolean` — `timeZone` undefined = viewer's zone.
  - `ordinal(n): string`.
  - `getTeamPageData({ code, competition, scheduleGames, resultsXml, odds, config, ref }): { last, next, standing: { group, position, wins, losses } | null, tiebreakers: { positive, negative } }`.

- [ ] **Step 1: Write the failing tests** — `lib/team-page.test.js`

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScheduleGames } from "../standings.js";
import { POLYMARKET_CONFIG } from "./polymarket.js";
import {
  findCompetition,
  getKnownTiebreakers,
  getTeamGames,
  getTeamPageData,
  isSameDay,
  ordinal,
  orEmptyXml,
} from "./team-page.js";

const game = (gameNumber, homeCode, awayCode, played) => ({
  gameNumber,
  homeCode,
  awayCode,
  played,
});

test("orEmptyXml replaces empty feeds, keeps real ones", () => {
  assert.equal(orEmptyXml(""), "<empty/>");
  assert.equal(orEmptyXml("  \n"), "<empty/>");
  assert.equal(orEmptyXml(undefined), "<empty/>");
  assert.equal(orEmptyXml("<results/>"), "<results/>");
});

test("findCompetition returns the competition whose schedule has the team", () => {
  const games = {
    euroleague: [game(1, "MAD", "IST", false)],
    eurocup: [game(1, "TNF", "LLI", false)],
  };
  assert.equal(findCompetition("IST", games), "euroleague");
  assert.equal(findCompetition("TNF", games), "eurocup");
  assert.equal(findCompetition("XXX", games), null);
});

test("getTeamGames returns last played newest first and next unplayed soonest first", () => {
  const days = [
    { date: "2026-09-24", games: [game(1, "MAD", "IST", true), game(2, "BAR", "OLY", true)] },
    { date: "2026-10-01", games: [game(3, "BAR", "MAD", true)] },
    { date: "2026-10-08", games: [game(4, "MAD", "OLY", true)] },
    { date: "2026-10-09", games: [game(5, "PAN", "MAD", true)] },
    { date: "2026-10-15", games: [game(6, "MAD", "ZAL", false)] },
    { date: "2026-10-22", games: [game(7, "ULK", "MAD", false)] },
    { date: "2026-10-29", games: [game(8, "MAD", "PAR", false)] },
    { date: "2026-11-05", games: [game(9, "RED", "MAD", false)] },
  ];
  const { last, next } = getTeamGames(days, "MAD");
  assert.deepEqual(last.map((g) => g.gameNumber), [5, 4, 3]);
  assert.deepEqual(next.map((g) => g.gameNumber), [6, 7, 8]);
  assert.equal(last[0].date, "2026-10-09");
  assert.equal(next[0].date, "2026-10-15");
});

test("getTeamGames handles fewer than three games", () => {
  const days = [{ date: "2026-09-24", games: [game(1, "MAD", "IST", false)] }];
  const { last, next } = getTeamGames(days, "MAD");
  assert.deepEqual(last, []);
  assert.deepEqual(next.map((g) => g.gameNumber), [1]);
});

test("getKnownTiebreakers classifies decided head-to-heads only", () => {
  const h2h = (wins, losses, ptsFor, ptsAgainst) => ({ wins, losses, ptsFor, ptsAgainst });
  const team = {
    code: "MAD",
    h2h: {
      IST: h2h(2, 0, 170, 150), // 2-0
      BAR: h2h(1, 1, 160, 156), // 1-1, +4
      OLY: h2h(0, 2, 150, 170), // 0-2
      PAN: h2h(1, 1, 150, 153), // 1-1, -3
      ZAL: h2h(1, 1, 160, 160), // 1-1, even: next tiebreaker decides
      ULK: h2h(1, 0, 90, 80), // one game only: not decided
    },
  };
  const standings = ["OLY", "BAR", "MAD", "PAN", "IST", "ZAL", "ULK"].map(
    (code) => ({ code })
  );
  const { positive, negative } = getKnownTiebreakers(team, standings);
  assert.deepEqual(positive, [
    { code: "BAR", wins: 1, losses: 1, diff: 4 },
    { code: "IST", wins: 2, losses: 0, diff: 20 },
  ]);
  assert.deepEqual(negative, [
    { code: "OLY", wins: 0, losses: 2, diff: -20 },
    { code: "PAN", wins: 1, losses: 1, diff: -3 },
  ]);
});

test("isSameDay compares calendar days in the given zone", () => {
  // 23:30 UTC on Oct 1 is 01:30 Oct 2 in Berlin
  const startsAt = "2026-10-01T23:30:00.000Z";
  const now = Date.parse("2026-10-01T10:00:00.000Z");
  assert.equal(isSameDay(startsAt, now, "UTC"), true);
  assert.equal(isSameDay(startsAt, now, "Europe/Berlin"), false);
  assert.equal(isSameDay(startsAt, Date.parse("2026-10-02T08:00:00.000Z"), "Europe/Berlin"), true);
});

test("ordinal adds English suffixes", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal),
    ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd"]
  );
});

const elSchedule = `<schedule>
<item><gameday>1</gameday><date>Sep 24, 2026</date><startime>20:00</startime><game>1</game><homecode>MAD</homecode><hometeam>REAL MADRID</hometeam><awaycode>IST</awaycode><awayteam>ANADOLU EFES ISTANBUL</awayteam><played>true</played></item>
<item><gameday>2</gameday><date>Oct 1, 2026</date><startime>20:00</startime><game>2</game><homecode>IST</homecode><hometeam>ANADOLU EFES ISTANBUL</hometeam><awaycode>MAD</awaycode><awayteam>REAL MADRID</awayteam><played>true</played></item>
<item><gameday>3</gameday><date>Oct 8, 2026</date><startime>20:00</startime><game>3</game><homecode>BAR</homecode><hometeam>FC BARCELONA</hometeam><awaycode>MAD</awaycode><awayteam>REAL MADRID</awayteam><played>true</played></item>
<item><gameday>4</gameday><date>Oct 15, 2026</date><startime>20:30</startime><game>4</game><homecode>MAD</homecode><hometeam>REAL MADRID</hometeam><awaycode>BAR</awaycode><awayteam>FC BARCELONA</awayteam><played>false</played></item>
</schedule>`;

const elResults = `<results>
<game><gamenumber>1</gamenumber><group>Regular Season</group><hometeam>REAL MADRID</hometeam><homecode>MAD</homecode><homescore>80</homescore><awayteam>ANADOLU EFES ISTANBUL</awayteam><awaycode>IST</awaycode><awayscore>70</awayscore><played>true</played></game>
<game><gamenumber>2</gamenumber><group>Regular Season</group><hometeam>ANADOLU EFES ISTANBUL</hometeam><homecode>IST</homecode><homescore>85</homescore><awayteam>REAL MADRID</awayteam><awaycode>MAD</awaycode><awayscore>80</awayscore><played>true</played></game>
<game><gamenumber>3</gamenumber><group>Regular Season</group><hometeam>FC BARCELONA</hometeam><homecode>BAR</homecode><homescore>90</homescore><awayteam>REAL MADRID</awayteam><awaycode>MAD</awaycode><awayscore>70</awayscore><played>true</played></game>
<game><gamenumber>4</gamenumber><group>Regular Season</group><hometeam>REAL MADRID</hometeam><homecode>MAD</homecode><homescore>0</homescore><awayteam>FC BARCELONA</awayteam><awaycode>BAR</awaycode><awayscore>0</awayscore><played>false</played></game>
</results>`;

test("getTeamPageData combines games, standing and tiebreakers", () => {
  const data = getTeamPageData({
    code: "MAD",
    competition: "euroleague",
    scheduleGames: parseScheduleGames(elSchedule),
    resultsXml: elResults,
    odds: new Map(),
    config: POLYMARKET_CONFIG.euroleague,
    ref: "",
  });
  assert.deepEqual(data.last.map((g) => g.gameNumber), [3, 2, 1]);
  assert.equal(data.last[0].homeScore, 90);
  assert.deepEqual(data.next.map((g) => g.gameNumber), [4]);
  // BAR 1-0, IST 1-1, MAD 1-2
  assert.deepEqual(data.standing, { group: null, position: 3, wins: 1, losses: 2 });
  assert.deepEqual(data.tiebreakers, {
    positive: [{ code: "IST", wins: 1, losses: 1, diff: 5 }],
    negative: [],
  });
});

const ecSchedule = `<schedule>
<item><gameday>1</gameday><date>Oct 1, 2026</date><startime>19:00</startime><game>1</game><homecode>TNF</homecode><hometeam>LA LAGUNA TENERIFE</hometeam><awaycode>LLI</awaycode><awayteam>LONDON LIONS</awayteam><played>false</played></item>
</schedule>`;

test("getTeamPageData finds the EuroCup group of the team", () => {
  const results = `<results>
<game><gamenumber>1</gamenumber><group>B</group><hometeam>LA LAGUNA TENERIFE</hometeam><homecode>TNF</homecode><homescore>88</homescore><awayteam>LONDON LIONS</awayteam><awaycode>LLI</awaycode><awayscore>77</awayscore><played>true</played></game>
</results>`;
  const data = getTeamPageData({
    code: "LLI",
    competition: "eurocup",
    scheduleGames: parseScheduleGames(ecSchedule),
    resultsXml: results,
    odds: new Map(),
    config: POLYMARKET_CONFIG.eurocup,
    ref: "",
  });
  assert.deepEqual(data.standing, { group: "B", position: 2, wins: 0, losses: 1 });
});

test("getTeamPageData works before the season starts", () => {
  const data = getTeamPageData({
    code: "TNF",
    competition: "eurocup",
    scheduleGames: parseScheduleGames(ecSchedule),
    resultsXml: orEmptyXml(""),
    odds: new Map(),
    config: POLYMARKET_CONFIG.eurocup,
    ref: "",
  });
  assert.equal(data.standing, null);
  assert.deepEqual(data.last, []);
  assert.deepEqual(data.next.map((g) => g.gameNumber), [1]);
  assert.deepEqual(data.tiebreakers, { positive: [], negative: [] });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test`
Expected: FAIL, `Cannot find module '.../lib/team-page.js'`

- [ ] **Step 3: Write `lib/team-page.js`**

```js
import {
  generateEurocupStandingsFormXml,
  generateEuroleagueStandingsFormXml,
  parseResultScores,
} from "../standings.js";
import { buildScheduleDays } from "./schedule.js";
import { EUROCUP_GROUPS } from "./season.js";

// the XML parser throws on an empty string, failed feeds become empty ones
export const orEmptyXml = (text) => (text?.trim() ? text : "<empty/>");

const playsIn = (code) => (game) =>
  game.homeCode === code || game.awayCode === code;

export function findCompetition(code, gamesByCompetition) {
  for (const [key, games] of Object.entries(gamesByCompetition)) {
    if (games.some(playsIn(code))) {
      return key;
    }
  }
  return null;
}

// days and their games come sorted by date and start time
export function getTeamGames(days, code, count = 3) {
  const games = days.flatMap((day) =>
    day.games.filter(playsIn(code)).map((game) => ({ ...game, date: day.date }))
  );
  return {
    last: games.filter((g) => g.played).slice(-count).reverse(),
    next: games.filter((g) => !g.played).slice(0, count),
  };
}

// known = both games against the opponent played
export function getKnownTiebreakers(team, standings) {
  const positive = [];
  const negative = [];
  for (const [code, { wins, losses, ptsFor, ptsAgainst }] of Object.entries(
    team.h2h
  )) {
    if (wins + losses !== 2) {
      continue;
    }
    const diff = ptsFor - ptsAgainst;
    const entry = { code, wins, losses, diff };
    if (wins > losses || (wins === losses && diff > 0)) {
      positive.push(entry);
    } else if (wins < losses || diff < 0) {
      negative.push(entry);
    }
  }
  const position = (code) => standings.findIndex((t) => t.code === code);
  const byPosition = (a, b) => position(a.code) - position(b.code);
  return { positive: positive.sort(byPosition), negative: negative.sort(byPosition) };
}

// timeZone undefined = the viewer's own
export function isSameDay(startsAt, now, timeZone) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return day.format(new Date(startsAt)) === day.format(new Date(now));
}

export function ordinal(n) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function findStanding(competition, code, resultsXml) {
  const tables =
    competition === "eurocup"
      ? EUROCUP_GROUPS.map((group) => ({
          group,
          ...generateEurocupStandingsFormXml(resultsXml, group),
        }))
      : [{ group: null, ...generateEuroleagueStandingsFormXml(resultsXml) }];
  for (const { group, standings } of tables) {
    const index = standings.findIndex((t) => t.code === code);
    if (index !== -1) {
      return { group, position: index + 1, team: standings[index], standings };
    }
  }
  return null;
}

export function getTeamPageData({
  code,
  competition,
  scheduleGames,
  resultsXml,
  odds,
  config,
  ref,
}) {
  const days = buildScheduleDays({
    scheduleGames,
    scores: parseResultScores(resultsXml),
    odds,
    config,
    ref,
  });
  const games = getTeamGames(days, code);
  const found = findStanding(competition, code, resultsXml);
  if (!found) {
    return { ...games, standing: null, tiebreakers: { positive: [], negative: [] } };
  }
  const { group, position, team, standings } = found;
  return {
    ...games,
    standing: { group, position, wins: team.wins, losses: team.losses },
    tiebreakers: getKnownTiebreakers(team, standings),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test`
Expected: PASS. If the EuroCup group test fails, print `generateEurocupStandingsFormXml(results, "B")` to check how `parseData` matches the `<group>` value and fix the fixture, not the parser.

- [ ] **Step 5: Commit**

```bash
git add lib/team-page.js lib/team-page.test.js
git commit -m "add team page data logic: games, standing, known tiebreakers"
```

---

### Task 4: Shared game parts and team links

**Files:**
- Create: `components/GameParts.jsx`
- Modify: `components/ScheduleWidget.jsx`
- Modify: `components/Standings.jsx:393-405`

**Interfaces:**
- Consumes: `teamPath(code)` (Task 2).
- Produces (all from `components/GameParts.jsx`, client module): `useNow(): number | null`, `BERLIN: { locale, timeZone }`, `Score({ score, won, accentBadgeClass })`, `Odds({ odds, live, accentClass })`, `TeamName({ code, name })`, `TeamLink({ code, className, children })`, `MatchupRow({ game, children })` — renders an `<li>` grid with linked home/away sides and `children` in the middle column.

- [ ] **Step 1: Create `components/GameParts.jsx`**

Move `useNow`, `BERLIN`, `Score`, `Odds`, `TeamName` from `components/ScheduleWidget.jsx` unchanged (cut, don't copy), export them, and add `TeamLink` and `MatchupRow`:

```jsx
"use client";

import { TeamLogo } from "@/components/TeamLogo.jsx";
import { teamPath } from "@/lib/teams.js";
import { teamCodeToAbbreviation } from "@/utils/utils";
import classNames from "classnames";
import Link from "next/link";
import { useEffect, useState } from "react";

// null during server render and hydration, then the current time,
// refreshed every minute so cached pages switch games to live on time
export const useNow = () => {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

// fixed locale and zone so server render and hydration match
export const BERLIN = { locale: "en-GB", timeZone: "Europe/Berlin" };

export const Score = ({ score, won, accentBadgeClass }) => (
  <span
    className={classNames(
      "min-w-[2.25rem] rounded px-1 text-center font-semibold tabular-nums",
      won ? accentBadgeClass : "text-gray-400"
    )}
  >
    {score}
  </span>
);

export const Odds = ({ odds, live, accentClass }) => {
  if (!odds) {
    return null;
  }
  return (
    <a
      href={odds.url}
      target="_blank"
      rel="sponsored noopener"
      title={live ? "Live win probability" : "Win probability"}
      className="rounded-full bg-white/5 px-2 py-0.5 text-xs tabular-nums text-gray-300 hover:bg-white/10"
    >
      <span className={odds.home >= odds.away ? accentClass : ""}>
        {odds.home}%
      </span>
      {" · "}
      <span className={odds.away > odds.home ? accentClass : ""}>
        {odds.away}%
      </span>
    </a>
  );
};

export const TeamName = ({ code, name }) => (
  <span className="min-w-0 truncate" title={name || code}>
    <span className="sm:hidden">{teamCodeToAbbreviation(code)}</span>
    <span className="hidden sm:inline">
      {name || teamCodeToAbbreviation(code)}
    </span>
  </span>
);

// team page link when the team is in the registry, plain text otherwise
export const TeamLink = ({ code, className, children }) => {
  const href = teamPath(code);
  if (!href) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

export const MatchupRow = ({ game, children }) => (
  <li className="grid grid-cols-[1fr_7rem_1fr] items-center gap-2 border-t border-white/5 py-1.5">
    <TeamLink
      code={game.homeCode}
      className="flex min-w-0 items-center justify-end gap-2 text-right text-gray-200 hover:text-white"
    >
      <TeamName code={game.homeCode} name={game.homeName} />
      <TeamLogo code={game.homeCode} size={20} className="shrink-0" />
    </TeamLink>
    <span className="flex flex-col items-center gap-0.5">{children}</span>
    <TeamLink
      code={game.awayCode}
      className="flex min-w-0 items-center gap-2 text-gray-200 hover:text-white"
    >
      <TeamLogo code={game.awayCode} size={20} className="shrink-0" />
      <TeamName code={game.awayCode} name={game.awayName} />
    </TeamLink>
  </li>
);
```

- [ ] **Step 2: Slim down `components/ScheduleWidget.jsx`**

Imports become:

```jsx
"use client";

import {
  BERLIN,
  MatchupRow,
  Odds,
  Score,
  useNow,
} from "@/components/GameParts.jsx";
import {
  formatDayLabel,
  formatStartTime,
  getGameStatus,
  swipeDirection,
} from "@/lib/schedule.js";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { useRef, useState } from "react";
```

Delete the moved `useNow`, `BERLIN`, `Score`, `Odds`, `TeamName` definitions. Keep `Middle` as is. Replace `GameRow` with:

```jsx
const GameRow = ({ game, now, accentClass, accentBadgeClass }) => {
  const status = getGameStatus(game, now);
  return (
    <MatchupRow game={game}>
      <Middle
        game={game}
        status={status}
        now={now}
        accentBadgeClass={accentBadgeClass}
      />
      <Odds odds={game.odds} live={status === "live"} accentClass={accentClass} />
    </MatchupRow>
  );
};
```

- [ ] **Step 3: Link the team cell in `components/Standings.jsx`**

Add import next to the other component imports:

```jsx
import { TeamLink } from "@/components/GameParts.jsx";
```

Replace the `<div className="flex gap-2 items-center align-middle">` … `</div>` inside the team `<td>` (around line 397-405) with:

```jsx
                    <TeamLink
                      code={team.code}
                      className="flex gap-2 items-center align-middle hover:underline"
                    >
                      <span className="inline-flex items-center justify-center size-8 border-2 border-white rounded-full bg-white overflow-hidden">
                        <TeamLogo code={team.code} size={28} className="shrink-0" />
                      </span>
                      <span className="block sm:hidden">
                        {teamCodeToAbbreviation(team.code)}
                      </span>
                      <span className="hidden sm:block">{team.name}</span>
                    </TeamLink>
```

- [ ] **Step 4: Verify tests, types, lint**

Run: `yarn test && yarn tsc --noEmit && yarn lint`
Expected: all pass, no errors.

- [ ] **Step 5: Verify links render**

Run: `yarn dev` in background, then
`curl -s localhost:3000/ | grep -o 'href="/teams/[a-z0-9-]*"' | sort -u | head`
Expected: team hrefs such as `href="/teams/real-madrid"` (from table and widget). They 404 until Task 5 — that's expected here. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add components/GameParts.jsx components/ScheduleWidget.jsx components/Standings.jsx
git commit -m "extract shared game parts, link teams from table and schedule widget"
```

---

### Task 5: Team page route

**Files:**
- Create: `components/TeamGames.jsx`
- Create: `components/KnownTiebreakers.jsx`
- Create: `app/teams/[slug]/page.tsx`

**Interfaces:**
- Consumes: `COMPETITIONS`, `FEED_REVALIDATE`, `SEASON_LABEL`, `SITE_URL`, `resultsUrl`, `scheduleUrl` (Task 1); `TEAMS`, `slugToCode`, `teamDisplayName` (Task 2); `findCompetition`, `getTeamPageData`, `isSameDay`, `ordinal`, `orEmptyXml` (Task 3); `useNow`, `Score`, `Odds`, `MatchupRow`, `TeamLink` (Task 4); existing `fetchPolymarketOdds(config)`, `POLYMARKET_CONFIG`, `parseScheduleGames`, `formatDayLabel`, `formatStartTime`, `getGameStatus`, `TeamLogo`.
- Produces: `TeamGames({ last, next, accentClass, accentBadgeClass })`, `KnownTiebreakers({ positive, negative })`, route `/teams/[slug]`.

- [ ] **Step 1: Create `components/TeamGames.jsx`**

```jsx
"use client";

import { MatchupRow, Odds, Score, useNow } from "@/components/GameParts.jsx";
import {
  formatDayLabel,
  formatStartTime,
  getGameStatus,
} from "@/lib/schedule.js";
import { isSameDay } from "@/lib/team-page.js";

const ResultMiddle = ({ game, accentBadgeClass }) => (
  <>
    <span className="flex items-center gap-1">
      <Score
        score={game.homeScore}
        won={game.homeScore > game.awayScore}
        accentBadgeClass={accentBadgeClass}
      />
      <span className="text-gray-500">-</span>
      <Score
        score={game.awayScore}
        won={game.awayScore > game.homeScore}
        accentBadgeClass={accentBadgeClass}
      />
    </span>
    <span className="text-xs text-gray-500">{formatDayLabel(game.date)}</span>
  </>
);

// date, or start time when the game is today in the viewer's zone;
// server render and hydration always show the date
const FixtureMiddle = ({ game, now, accentClass }) => {
  const status = getGameStatus(game, now);
  let label = formatDayLabel(game.date);
  if (status === "live") {
    label = (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
        <span className="h-2 w-2 motion-safe:animate-pulse rounded-full bg-red-500" />
        LIVE
      </span>
    );
  } else if (now !== null && game.startsAt && isSameDay(game.startsAt, now)) {
    label = formatStartTime(game.startsAt);
  }
  return (
    <>
      <span className="text-gray-400 tabular-nums">{label}</span>
      <Odds odds={game.odds} live={status === "live"} accentClass={accentClass} />
    </>
  );
};

const Column = ({ title, empty, children }) => (
  <section className="rounded-lg border border-white/10 p-3">
    <h2 className="mb-2 font-semibold text-white">{title}</h2>
    {children.length === 0 ? (
      <p className="py-4 text-center text-gray-400">{empty}</p>
    ) : (
      <ul>{children}</ul>
    )}
  </section>
);

const TeamGames = ({ last, next, accentClass, accentBadgeClass }) => {
  const now = useNow();
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <Column title="Last games" empty="No games played yet">
        {last.map((game) => (
          <MatchupRow key={game.gameNumber} game={game}>
            <ResultMiddle game={game} accentBadgeClass={accentBadgeClass} />
          </MatchupRow>
        ))}
      </Column>
      <Column title="Next games" empty="No upcoming games">
        {next.map((game) => (
          <MatchupRow key={game.gameNumber} game={game}>
            <FixtureMiddle game={game} now={now} accentClass={accentClass} />
          </MatchupRow>
        ))}
      </Column>
    </div>
  );
};

export default TeamGames;
```

Note: `formatStartTime(game.startsAt)` with no options = viewer's locale and zone, only runs after mount.

- [ ] **Step 2: Create `components/KnownTiebreakers.jsx`**

```jsx
import { TeamLink } from "@/components/GameParts.jsx";
import { TeamLogo } from "@/components/TeamLogo.jsx";
import { teamDisplayName } from "@/lib/teams.js";

const formatDiff = (n) => (n > 0 ? `+${n}` : `${n}`);

const List = ({ title, entries }) => (
  <section className="rounded-lg border border-white/10 p-3">
    <h3 className="mb-2 font-semibold text-white">{title}</h3>
    {entries.length === 0 ? (
      <p className="py-2 text-center text-gray-400">None yet</p>
    ) : (
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.code}
            className="flex items-center justify-between gap-2 border-t border-white/5 py-1.5"
          >
            <TeamLink
              code={entry.code}
              className="flex min-w-0 items-center gap-2 text-gray-200 hover:underline"
            >
              <TeamLogo code={entry.code} size={20} className="shrink-0" />
              <span className="truncate">
                {teamDisplayName(entry.code) ?? entry.code}
              </span>
            </TeamLink>
            <span className="shrink-0 tabular-nums text-gray-300">
              {entry.wins}-{entry.losses} · {formatDiff(entry.diff)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const KnownTiebreakers = ({ positive, negative }) => (
  <div className="mb-6 text-sm">
    <h2 className="mb-2 font-semibold text-white">Known tiebreakers</h2>
    {positive.length === 0 && negative.length === 0 ? (
      <p className="rounded-lg border border-white/10 p-4 text-center text-gray-400">
        No decided head-to-heads yet
      </p>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <List title="Won" entries={positive} />
        <List title="Lost" entries={negative} />
      </div>
    )}
  </div>
);

export default KnownTiebreakers;
```

- [ ] **Step 3: Create `app/teams/[slug]/page.tsx`**

```tsx
import Footer from "@/components/Footer.jsx";
import KnownTiebreakers from "@/components/KnownTiebreakers.jsx";
import Navigation from "@/components/Navigation.jsx";
import TeamGames from "@/components/TeamGames.jsx";
import { TeamLogo } from "@/components/TeamLogo.jsx";
import { fetchPolymarketOdds, POLYMARKET_CONFIG } from "@/lib/polymarket.js";
import {
  COMPETITIONS,
  FEED_REVALIDATE,
  resultsUrl,
  scheduleUrl,
  SEASON_LABEL,
  SITE_URL,
} from "@/lib/season.js";
import {
  findCompetition,
  getTeamPageData,
  ordinal,
  orEmptyXml,
} from "@/lib/team-page.js";
import { slugToCode, TEAMS, teamDisplayName } from "@/lib/teams.js";
import { parseScheduleGames } from "@/standings.js";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

export const revalidate = 300;
export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.values(TEAMS).map(({ slug }) => ({ slug }));
}

const fetchFeed = async (url: string) => {
  try {
    const response = await fetch(url, {
      next: { revalidate: FEED_REVALIDATE },
    });
    return orEmptyXml(response.ok ? await response.text() : "");
  } catch {
    return orEmptyXml("");
  }
};

// cached per request, shared by generateMetadata and the page
const loadTeam = cache(async (slug: string) => {
  const code = slugToCode(slug);
  if (!code) {
    return null;
  }
  const [euroleagueXml, eurocupXml] = await Promise.all([
    fetchFeed(scheduleUrl(COMPETITIONS.euroleague.seasonCode)),
    fetchFeed(scheduleUrl(COMPETITIONS.eurocup.seasonCode)),
  ]);
  const scheduleByCompetition = {
    euroleague: parseScheduleGames(euroleagueXml),
    eurocup: parseScheduleGames(eurocupXml),
  };
  const key = findCompetition(code, scheduleByCompetition) as
    | keyof typeof COMPETITIONS
    | null;
  if (!key) {
    return null;
  }
  const competition = COMPETITIONS[key];
  const config = POLYMARKET_CONFIG[key];
  const [resultsXml, odds] = await Promise.all([
    fetchFeed(resultsUrl(competition.seasonCode)),
    fetchPolymarketOdds(config),
  ]);
  const data = getTeamPageData({
    code,
    competition: key,
    scheduleGames: scheduleByCompetition[key],
    resultsXml,
    odds,
    config,
    ref: process.env.NEXT_PUBLIC_POLYMARKET_REF ?? "",
  });
  return { code, slug, name: teamDisplayName(code), competition, ...data };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const team = await loadTeam(slug);
  if (!team) {
    return {};
  }
  const { name, competition, standing } = team;
  const title = `${name} – ${competition.name} ${SEASON_LABEL} Results, Schedule & Tiebreakers`;
  const record = standing
    ? ` ${standing.wins}-${standing.losses}, ${ordinal(standing.position)} in ${
        standing.group ? `group ${standing.group}` : "the standings"
      }.`
    : "";
  const description = `${name} in the ${competition.name} ${SEASON_LABEL}.${record} Latest results, upcoming games and known head-to-head tiebreakers.`;
  const url = `${SITE_URL}/teams/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: `${SITE_URL}/images/open-graph.png` }],
    },
  };
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const team = await loadTeam(slug);
  if (!team) {
    notFound();
  }
  const { competition, standing } = team;

  return (
    <div className="overflow-auto min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="min-h-screen">
        <Navigation />
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
            <TeamLogo code={team.code} size={56} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-white">{team.name}</h1>
            <p className="text-sm text-gray-300">
              <Link
                href={competition.standingsPath}
                className={`hover:underline ${competition.accentClass}`}
              >
                {competition.name} {SEASON_LABEL}
              </Link>
              {standing?.group && ` · Group ${standing.group}`}
              {standing &&
                ` · ${ordinal(standing.position)} · ${standing.wins}-${standing.losses}`}
            </p>
          </div>
        </div>
        <TeamGames
          last={team.last}
          next={team.next}
          accentClass={competition.accentClass}
          accentBadgeClass={competition.accentBadgeClass}
        />
        <KnownTiebreakers
          positive={team.tiebreakers.positive}
          negative={team.tiebreakers.negative}
        />
        <Link
          href={competition.standingsPath}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← {competition.name} standings
        </Link>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Verify tests, types, lint**

Run: `yarn test && yarn tsc --noEmit && yarn lint`
Expected: all pass. If `tsc` complains about JS module types (implicit `any` from `.js` imports), follow how `app/page.tsx` already imports `@/lib/*.js` — do not add `@ts-ignore`; narrow with a local cast only if needed.

- [ ] **Step 5: Verify pages in dev**

Run `yarn dev` in background, then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/teams/real-madrid        # 200
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/teams/la-laguna-tenerife # 200
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/teams/nope              # 404
curl -s localhost:3000/teams/real-madrid | grep -o '<title>[^<]*</title>'
curl -s localhost:3000/teams/real-madrid | grep -o '<link rel="canonical"[^>]*>'
```

Expected: codes as commented; title `Real Madrid – EuroLeague 2026/27 Results, Schedule &amp; Tiebreakers`; canonical `https://euroleague-standings.com/teams/real-madrid`. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add components/TeamGames.jsx components/KnownTiebreakers.jsx "app/teams/[slug]/page.tsx"
git commit -m "add team pages with last/next games and known tiebreakers"
```

---

### Task 6: Sitemap

**Files:**
- Create: `app/sitemap.ts`

**Interfaces:**
- Consumes: `SITE_URL` (Task 1), `TEAMS` (Task 2).

- [ ] **Step 1: Create `app/sitemap.ts`**

```ts
import { SITE_URL } from "@/lib/season.js";
import { TEAMS } from "@/lib/teams.js";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/eurocup",
    "/euroleague/2025-26-final-rounds-calculator",
    "/euroleague/2024-25-last-round-calculator",
    ...Object.values(TEAMS).map(({ slug }) => `/teams/${slug}`),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
```

- [ ] **Step 2: Verify**

Run `yarn dev` in background, then:
`curl -s localhost:3000/sitemap.xml | grep -c "<loc>"`
Expected: `56` (4 pages + 52 teams). Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "add sitemap with team pages"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full checks**

Run: `yarn test && yarn lint && yarn build`
Expected: tests pass, no lint errors, build lists `/teams/[slug]` with 52 prerendered paths and `/sitemap.xml`.

- [ ] **Step 2: Production smoke test**

Run `yarn start` in background, then repeat Task 5 Step 5 curls against `localhost:3000` plus:
`curl -s localhost:3000/eurocup | grep -o 'href="/teams/[a-z0-9-]*"' | sort -u | wc -l`
Expected: 200/200/404 as before; EuroCup page shows team links once games or standings exist (widget always lists games, so > 0). Stop the server.

- [ ] **Step 3: Report**

Summarize for the user: pages to eyeball in the browser (an EL team mid-season, a EuroCup team pre-season, mobile width), and the registry names in `lib/teams.js` they should sanity-check (`Maxima Roma`, `Riga Zelli`, `Roma Basketball` are taken from feed names and may still carry sponsors).
