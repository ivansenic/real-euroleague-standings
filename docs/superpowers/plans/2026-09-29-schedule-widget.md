# Schedule Widget with Polymarket Odds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a per-date schedule widget above the EuroLeague standings, with Polymarket win percentages linking to Polymarket with a referral code.

**Architecture:** The server component `app/page.tsx` fetches the EL schedule, EL results and Polymarket open events (all cached 5 min), and pure functions in `lib/` merge them into a plain `days` array. A small client component renders one date at a time with prev/next navigation. Competition-specific data (Polymarket series id, slug prefix, team-token map) lives in one config object so EuroCup can be added later.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind 3, xmldom, `@heroicons/react`, Node 22 built-in test runner (`node --test`).

**Spec:** `docs/superpowers/specs/2026-09-29-schedule-widget-design.md`

## Global Constraints

- No new dependencies. Tests use `node --test` (Node 22).
- Referral code comes from `process.env.NEXT_PUBLIC_POLYMARKET_REF`; empty/unset → URL without `?r=`.
- Polymarket fetch: `https://gamma-api.polymarket.com/events?series_id=<id>&closed=false&limit=100`, `next: { revalidate: 300 }`.
- EuroLeague config: `seriesId: 10371`, `slugPrefix: "euroleague"`, slug = `{prefix}-{homeToken}-{awayToken}-{YYYY-MM-DD}`.
- Odds only for unplayed games; played games show score.
- Times displayed as given by EL feed with suffix ` CET`.
- "Today" is computed in `Europe/Berlin`.
- No disclosure line in the widget; disclosure goes in `app/privacy-policy/page.tsx`.
- Odds links: `target="_blank"`, `rel="sponsored noopener"`.
- Widget is EL-only for now but takes all competition-specific values via props/config.

## Review Focus

1. Polymarket API down, non-200, or non-JSON → standings page still renders, widget shows schedule without odds. (Task 2 test: `fetchPolymarketOdds` with failing fetch.)
2. Polymarket event with missing/malformed `outcomePrices` or no moneyline market → that event skipped, others still used. (Task 2 tests.)
3. Played game whose Polymarket market is still open → score shown, no odds. (Task 3 test.)
4. Season not started / season over / empty schedule → default index picks first date, last date, or `-1`; widget renders nothing for empty. (Task 3 tests.)
5. Referral code with characters needing escaping → URL-encoded. (Task 2 test.)

---

## File Structure

- Modify `standings.js` — add `time` to `parseScheduleGames`; add `parseResultScores`.
- Create `lib/polymarket.js` — config, slug/URL builders, odds parsing, fetch.
- Create `lib/schedule.js` — EL date parsing, today, label formatting, `buildScheduleDays`, `pickDefaultDateIndex`.
- Create `lib/standings.test.js`, `lib/polymarket.test.js`, `lib/schedule.test.js`.
- Create `components/ScheduleWidget.jsx` — client UI.
- Modify `app/page.tsx` — fetch odds, build days, render widget.
- Modify `app/privacy-policy/page.tsx` — odds/referral section.
- Modify `package.json` — `test` script.

---

### Task 1: Schedule time + result scores parsing

**Files:**
- Modify: `standings.js` (`parseScheduleGames` at ~line 410; new export after it)
- Modify: `package.json` (scripts)
- Test: `lib/standings.test.js`

**Interfaces:**
- Produces: `parseScheduleGames(xml)` → `Array<{ homeCode, awayCode, gameNumber, gameday, played, date, time }>` (`time` e.g. `"20:15"`, `""` if missing).
- Produces: `parseResultScores(xml)` → `Map<number, { homeScore: number, awayScore: number }>` keyed by game number, played games only.

- [ ] **Step 1: Add test script**

In `package.json` `scripts`, add:

```json
"test": "node --test \"lib/**/*.test.js\""
```

- [ ] **Step 2: Write failing tests**

Create `lib/standings.test.js`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResultScores, parseScheduleGames } from "../standings.js";

const scheduleXml = `<schedule>
<item><gameday>1</gameday><date>Sep 24, 2026</date><startime>20:15</startime><game>7</game><homecode>PAN</homecode><awaycode>PRS</awaycode><played>true</played></item>
<item><gameday>2</gameday><date>Sep 29, 2026</date><game>12</game><homecode>ZAL</homecode><awaycode>OLY</awaycode><played>false</played></item>
</schedule>`;

test("parseScheduleGames includes start time", () => {
  const games = parseScheduleGames(scheduleXml);
  assert.equal(games[0].time, "20:15");
  assert.equal(games[1].time, "");
});

const resultsXml = `<results>
<game><gamenumber>7</gamenumber><homecode>PAN</homecode><awaycode>PRS</awaycode><homescore>91</homescore><awayscore>72</awayscore><played>true</played></game>
<game><gamenumber>12</gamenumber><homecode>ZAL</homecode><awaycode>OLY</awaycode><homescore>0</homescore><awayscore>0</awayscore><played>false</played></game>
<game><gamenumber>13</gamenumber><homecode>RED</homecode><awaycode>IST</awaycode><homescore></homescore><awayscore>80</awayscore><played>true</played></game>
</results>`;

test("parseResultScores returns scores of played games only", () => {
  const scores = parseResultScores(resultsXml);
  assert.deepEqual(scores.get(7), { homeScore: 91, awayScore: 72 });
  assert.equal(scores.has(12), false);
});

test("parseResultScores skips games with unparsable scores", () => {
  const scores = parseResultScores(resultsXml);
  assert.equal(scores.has(13), false);
});
```

- [ ] **Step 3: Run tests, verify fail**

Run: `npm test`
Expected: FAIL — `parseResultScores` is not exported / `time` undefined.

- [ ] **Step 4: Implement**

In `standings.js` `parseScheduleGames`, after the `date` const add:

```js
    const time =
      item.getElementsByTagName("startime")[0]?.textContent || "";
```

and change the push to:

```js
    games.push({ homeCode, awayCode, gameNumber, gameday, played, date, time });
```

After `parseScheduleGames`, add:

```js
export function parseResultScores(xmlData) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlData, "application/xml");
  const gameNodes = xmlDoc.getElementsByTagName("game");

  const scores = new Map();

  for (let i = 0; i < gameNodes.length; i++) {
    const game = gameNodes[i];
    const text = (tag) => game.getElementsByTagName(tag)[0]?.textContent;

    if (text("played") !== "true") {
      continue;
    }

    const gameNumber = parseInt(text("gamenumber"), 10);
    const homeScore = parseInt(text("homescore"), 10);
    const awayScore = parseInt(text("awayscore"), 10);
    if ([gameNumber, homeScore, awayScore].some(Number.isNaN)) {
      continue;
    }

    scores.set(gameNumber, { homeScore, awayScore });
  }

  return scores;
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json standings.js lib/standings.test.js
git commit -m "add schedule start time and result scores parsing"
```

---

### Task 2: Polymarket odds module

**Files:**
- Create: `lib/polymarket.js`
- Test: `lib/polymarket.test.js`

**Interfaces:**
- Produces: `POLYMARKET_CONFIG.euroleague` → `{ seriesId: number, slugPrefix: string, tokens: Record<string, string> }`.
- Produces: `buildSlug(config, homeCode, awayCode, isoDate)` → `string | null`.
- Produces: `polymarketUrl(slug, ref)` → `string`.
- Produces: `parseOddsFromEvents(events)` → `Map<string, { home: number, away: number }>` (integer percentages, `home + away === 100`).
- Produces: `fetchPolymarketOdds(config, fetchImpl = fetch)` → `Promise<Map<string, { home, away }>>`, never rejects.

- [ ] **Step 1: Write failing tests**

Create `lib/polymarket.test.js`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  POLYMARKET_CONFIG,
  buildSlug,
  fetchPolymarketOdds,
  parseOddsFromEvents,
  polymarketUrl,
} from "./polymarket.js";

const el = POLYMARKET_CONFIG.euroleague;

test("euroleague config maps all 20 teams", () => {
  assert.equal(el.seriesId, 10371);
  assert.equal(el.slugPrefix, "euroleague");
  assert.equal(Object.keys(el.tokens).length, 20);
});

test("buildSlug builds home-away-date slug", () => {
  assert.equal(
    buildSlug(el, "IST", "MAD", "2026-09-29"),
    "euroleague-efes-madrid-2026-09-29"
  );
  assert.equal(
    buildSlug(el, "TEL", "BES", "2026-09-30"),
    "euroleague-aviv1-besiktas-2026-09-30"
  );
});

test("buildSlug returns null for unknown team", () => {
  assert.equal(buildSlug(el, "XXX", "MAD", "2026-09-29"), null);
});

test("polymarketUrl adds encoded ref only when set", () => {
  assert.equal(
    polymarketUrl("euroleague-efes-madrid-2026-09-29", ""),
    "https://polymarket.com/event/euroleague-efes-madrid-2026-09-29"
  );
  assert.equal(
    polymarketUrl("s", "abc"),
    "https://polymarket.com/event/s?r=abc"
  );
  assert.equal(
    polymarketUrl("s", "a b&c"),
    "https://polymarket.com/event/s?r=a%20b%26c"
  );
});

const moneyline = (prices) => ({
  sportsMarketType: "moneyline",
  outcomePrices: prices,
});

test("parseOddsFromEvents converts moneyline prices to percentages", () => {
  const odds = parseOddsFromEvents([
    { slug: "a", markets: [moneyline('["0.585", "0.415"]')] },
  ]);
  assert.deepEqual(odds.get("a"), { home: 59, away: 41 });
});

test("parseOddsFromEvents skips malformed events", () => {
  const odds = parseOddsFromEvents([
    { slug: "no-markets" },
    { slug: "no-moneyline", markets: [{ sportsMarketType: "spread", outcomePrices: '["0.5","0.5"]' }] },
    { slug: "bad-json", markets: [moneyline("not json")] },
    { slug: "one-price", markets: [moneyline('["0.5"]')] },
    { slug: "nan", markets: [moneyline('["abc", "0.5"]')] },
    { markets: [moneyline('["0.5", "0.5"]')] },
    { slug: "ok", markets: [moneyline('["0.2", "0.8"]')] },
  ]);
  assert.deepEqual([...odds.keys()], ["ok"]);
  assert.deepEqual(odds.get("ok"), { home: 20, away: 80 });
});

test("parseOddsFromEvents handles non-array input", () => {
  assert.equal(parseOddsFromEvents(null).size, 0);
  assert.equal(parseOddsFromEvents({ error: "x" }).size, 0);
});

test("fetchPolymarketOdds requests open events of the series", async () => {
  let calledUrl;
  const fetchImpl = async (url) => {
    calledUrl = url;
    return {
      ok: true,
      json: async () => [{ slug: "a", markets: [moneyline('["0.7","0.3"]')] }],
    };
  };
  const odds = await fetchPolymarketOdds(el, fetchImpl);
  assert.equal(
    calledUrl,
    "https://gamma-api.polymarket.com/events?series_id=10371&closed=false&limit=100"
  );
  assert.deepEqual(odds.get("a"), { home: 70, away: 30 });
});

test("fetchPolymarketOdds returns empty map on failure", async (t) => {
  t.mock.method(console, "error", () => {});
  const rejecting = async () => {
    throw new Error("network");
  };
  const notOk = async () => ({ ok: false, status: 500, json: async () => [] });
  const badJson = async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError("bad");
    },
  });
  for (const fetchImpl of [rejecting, notOk, badJson]) {
    const odds = await fetchPolymarketOdds(el, fetchImpl);
    assert.equal(odds.size, 0);
  }
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test`
Expected: FAIL — cannot find module `./polymarket.js`.

- [ ] **Step 3: Implement**

Create `lib/polymarket.js`:

```js
// Polymarket per-game markets. Event slugs follow
// `{slugPrefix}-{homeToken}-{awayToken}-{YYYY-MM-DD}`, where tokens are
// Polymarket's own short team names.
export const POLYMARKET_CONFIG = {
  euroleague: {
    seriesId: 10371,
    slugPrefix: "euroleague",
    tokens: {
      ASV: "lyonvill",
      BAR: "barcelon",
      BAS: "baskonia",
      BES: "besiktas",
      DUB: "dubai",
      HTA: "aviv",
      IST: "efes",
      MAD: "madrid",
      MIL: "milano",
      MUN: "munchen",
      OLY: "olympiac",
      PAM: "valencia",
      PAN: "panathin",
      PAR: "partizan",
      PRS: "paris",
      RED: "zvezda",
      TEL: "aviv1",
      ULK: "fenerbah",
      VIR: "bologna",
      ZAL: "kaunas",
    },
  },
};

export function buildSlug(config, homeCode, awayCode, isoDate) {
  const home = config.tokens[homeCode];
  const away = config.tokens[awayCode];
  if (!home || !away) {
    return null;
  }
  return `${config.slugPrefix}-${home}-${away}-${isoDate}`;
}

export function polymarketUrl(slug, ref) {
  const url = `https://polymarket.com/event/${slug}`;
  return ref ? `${url}?r=${encodeURIComponent(ref)}` : url;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseOddsFromEvents(events) {
  const odds = new Map();
  if (!Array.isArray(events)) {
    return odds;
  }

  for (const event of events) {
    const market = event?.markets?.find(
      (m) => m.sportsMarketType === "moneyline"
    );
    if (!event?.slug || !market) {
      continue;
    }

    const prices = parseJsonArray(market.outcomePrices);
    if (!prices || prices.length !== 2) {
      continue;
    }

    // outcome 0 is the home team, same order as in the slug
    const homePrice = Number(prices[0]);
    if (!Number.isFinite(homePrice) || homePrice < 0 || homePrice > 1) {
      continue;
    }

    const home = Math.round(homePrice * 100);
    odds.set(event.slug, { home, away: 100 - home });
  }

  return odds;
}

export async function fetchPolymarketOdds(config, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(
      `https://gamma-api.polymarket.com/events?series_id=${config.seriesId}&closed=false&limit=100`,
      { next: { revalidate: 5 * 60 } }
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return parseOddsFromEvents(await response.json());
  } catch (error) {
    console.error("Failed to fetch Polymarket odds", error);
    return new Map();
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test`
Expected: PASS (all tests in both files).

- [ ] **Step 5: Commit**

```bash
git add lib/polymarket.js lib/polymarket.test.js
git commit -m "add polymarket odds module"
```

---

### Task 3: Schedule days builder

**Files:**
- Create: `lib/schedule.js`
- Test: `lib/schedule.test.js`

**Interfaces:**
- Consumes: `buildSlug`, `polymarketUrl`, `POLYMARKET_CONFIG` from `lib/polymarket.js`; game shape from Task 1 `parseScheduleGames`; `Map` from Task 1 `parseResultScores`; `Map` from Task 2 `parseOddsFromEvents`.
- Produces: `elDateToIso(elDate)` → `"YYYY-MM-DD" | null`.
- Produces: `todayIso(timeZone = "Europe/Berlin", now = new Date())` → `"YYYY-MM-DD"`.
- Produces: `formatDayLabel(isoDate)` → e.g. `"Thu, Oct 1"`.
- Produces: `buildScheduleDays({ scheduleGames, scores, odds, config, ref })` →
  `Array<{ date: string, games: Array<{ gameNumber, homeCode, awayCode, time, played, homeScore?, awayScore?, odds?: { home, away, url } }> }>`.
- Produces: `pickDefaultDateIndex(days, today)` → `number` (`-1` if empty).

- [ ] **Step 1: Write failing tests**

Create `lib/schedule.test.js`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { POLYMARKET_CONFIG } from "./polymarket.js";
import {
  buildScheduleDays,
  elDateToIso,
  formatDayLabel,
  pickDefaultDateIndex,
  todayIso,
} from "./schedule.js";

test("elDateToIso parses EL feed dates", () => {
  assert.equal(elDateToIso("Sep 24, 2026"), "2026-09-24");
  assert.equal(elDateToIso("Oct 01, 2026"), "2026-10-01");
  assert.equal(elDateToIso("Jan 5, 2027"), "2027-01-05");
  assert.equal(elDateToIso(""), null);
  assert.equal(elDateToIso("Foo 1, 2026"), null);
});

test("todayIso uses the given time zone", () => {
  // 23:30 UTC on Sep 29 is already Sep 30 in Berlin (CEST, UTC+2)
  const now = new Date("2026-09-29T23:30:00Z");
  assert.equal(todayIso("Europe/Berlin", now), "2026-09-30");
  assert.equal(todayIso("UTC", now), "2026-09-29");
});

test("formatDayLabel formats short weekday, month and day", () => {
  assert.equal(formatDayLabel("2026-10-01"), "Thu, Oct 1");
});

const game = (overrides) => ({
  homeCode: "IST",
  awayCode: "MAD",
  gameNumber: 1,
  gameday: 2,
  played: false,
  date: "Sep 29, 2026",
  time: "19:00",
  ...overrides,
});

const config = POLYMARKET_CONFIG.euroleague;

test("buildScheduleDays groups by date and sorts dates and games", () => {
  const days = buildScheduleDays({
    scheduleGames: [
      game({ gameNumber: 3, date: "Oct 01, 2026", time: "20:00" }),
      game({ gameNumber: 2, time: "20:30" }),
      game({ gameNumber: 1, time: "18:00" }),
      game({ gameNumber: 4, time: "18:00" }),
    ],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.deepEqual(
    days.map((d) => d.date),
    ["2026-09-29", "2026-10-01"]
  );
  assert.deepEqual(
    days[0].games.map((g) => g.gameNumber),
    [1, 4, 2]
  );
});

test("buildScheduleDays attaches odds with referral url to unplayed games", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({})],
    scores: new Map(),
    odds: new Map([["euroleague-efes-madrid-2026-09-29", { home: 51, away: 49 }]]),
    config,
    ref: "abc",
  });
  assert.deepEqual(days[0].games[0].odds, {
    home: 51,
    away: 49,
    url: "https://polymarket.com/event/euroleague-efes-madrid-2026-09-29?r=abc",
  });
});

test("buildScheduleDays shows score and no odds for played games", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({ played: true })],
    scores: new Map([[1, { homeScore: 80, awayScore: 75 }]]),
    odds: new Map([["euroleague-efes-madrid-2026-09-29", { home: 51, away: 49 }]]),
    config,
    ref: "abc",
  });
  const g = days[0].games[0];
  assert.equal(g.homeScore, 80);
  assert.equal(g.awayScore, 75);
  assert.equal(g.odds, undefined);
});

test("buildScheduleDays keeps games without odds or with unknown teams", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({ homeCode: "XXX" }), game({ gameNumber: 2 })],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.equal(days[0].games.length, 2);
  assert.ok(days[0].games.every((g) => g.odds === undefined));
});

test("buildScheduleDays skips games with unparsable dates", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({ date: "" })],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.deepEqual(days, []);
});

test("pickDefaultDateIndex picks today, next date, or last date", () => {
  const days = [{ date: "2026-09-24" }, { date: "2026-09-29" }, { date: "2026-10-01" }];
  assert.equal(pickDefaultDateIndex(days, "2026-09-29"), 1);
  assert.equal(pickDefaultDateIndex(days, "2026-09-30"), 2);
  assert.equal(pickDefaultDateIndex(days, "2026-09-01"), 0);
  assert.equal(pickDefaultDateIndex(days, "2027-06-01"), 2);
  assert.equal(pickDefaultDateIndex([], "2026-09-29"), -1);
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test`
Expected: FAIL — cannot find module `./schedule.js`.

- [ ] **Step 3: Implement**

Create `lib/schedule.js`:

```js
import { buildSlug, polymarketUrl } from "./polymarket.js";

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// EL feed dates look like "Sep 24, 2026"
export function elDateToIso(elDate) {
  const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(elDate.trim());
  if (!match || !MONTHS[match[1]]) {
    return null;
  }
  return `${match[3]}-${MONTHS[match[1]]}-${match[2].padStart(2, "0")}`;
}

export function todayIso(timeZone = "Europe/Berlin", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatDayLabel(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildScheduleDays({ scheduleGames, scores, odds, config, ref }) {
  const byDate = new Map();

  for (const scheduleGame of scheduleGames) {
    const date = elDateToIso(scheduleGame.date);
    if (!date) {
      continue;
    }

    const { gameNumber, homeCode, awayCode, time, played } = scheduleGame;
    const game = { gameNumber, homeCode, awayCode, time, played };

    if (played) {
      const score = scores.get(gameNumber);
      if (score) {
        game.homeScore = score.homeScore;
        game.awayScore = score.awayScore;
      }
    } else {
      const slug = buildSlug(config, homeCode, awayCode, date);
      const gameOdds = slug && odds.get(slug);
      if (gameOdds) {
        game.odds = { ...gameOdds, url: polymarketUrl(slug, ref) };
      }
    }

    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date).push(game);
  }

  return [...byDate.keys()].sort().map((date) => ({
    date,
    games: byDate
      .get(date)
      .sort((a, b) => a.time.localeCompare(b.time) || a.gameNumber - b.gameNumber),
  }));
}

export function pickDefaultDateIndex(days, today) {
  if (days.length === 0) {
    return -1;
  }
  const index = days.findIndex((day) => day.date >= today);
  return index === -1 ? days.length - 1 : index;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test`
Expected: PASS (all tests in three files).

- [ ] **Step 5: Commit**

```bash
git add lib/schedule.js lib/schedule.test.js
git commit -m "add schedule days builder"
```

---

### Task 4: Schedule widget on EuroLeague page

**Files:**
- Create: `components/ScheduleWidget.jsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `buildScheduleDays`, `pickDefaultDateIndex`, `todayIso`, `formatDayLabel` (Task 3); `POLYMARKET_CONFIG`, `fetchPolymarketOdds` (Task 2); `parseScheduleGames`, `parseResultScores` (Task 1); `TeamLogo` (`components/TeamLogo.jsx`, props `code`, `size`, `className`); `teamCodeToAbbreviation` (`utils/utils.ts`).
- Produces: default export `ScheduleWidget({ days, defaultIndex, accentClass = "text-orange-400" })`.

- [ ] **Step 1: Create widget**

Create `components/ScheduleWidget.jsx`:

```jsx
"use client";

import { TeamLogo } from "@/components/TeamLogo.jsx";
import { formatDayLabel } from "@/lib/schedule.js";
import { teamCodeToAbbreviation } from "@/utils/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { useState } from "react";

const Middle = ({ game }) => {
  if (game.played && game.homeScore !== undefined) {
    return (
      <span className="font-semibold text-white tabular-nums">
        {game.homeScore} - {game.awayScore}
      </span>
    );
  }
  return <span className="text-gray-400 tabular-nums">{game.time} CET</span>;
};

const Odds = ({ odds, accentClass }) => {
  if (!odds) {
    return null;
  }
  return (
    <a
      href={odds.url}
      target="_blank"
      rel="sponsored noopener"
      title="Win probability on Polymarket"
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

const ScheduleWidget = ({ days, defaultIndex, accentClass = "text-orange-400" }) => {
  const [index, setIndex] = useState(Math.max(defaultIndex, 0));

  if (days.length === 0) {
    return null;
  }

  const day = days[index];
  const hasPrev = index > 0;
  const hasNext = index < days.length - 1;

  return (
    <div className="mb-6 max-w-xl rounded-lg border border-white/10 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous game day"
          disabled={!hasPrev}
          onClick={() => setIndex(index - 1)}
          className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="font-semibold text-white">
          {formatDayLabel(day.date)}
        </span>
        <button
          type="button"
          aria-label="Next game day"
          disabled={!hasNext}
          onClick={() => setIndex(index + 1)}
          className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <ul className="divide-y divide-white/5">
        {day.games.map((game) => (
          <li
            key={game.gameNumber}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5"
          >
            <span className="flex items-center justify-end gap-2 text-gray-200">
              {teamCodeToAbbreviation(game.homeCode)}
              <TeamLogo code={game.homeCode} size={20} />
            </span>
            <span className="flex flex-col items-center gap-0.5">
              <Middle game={game} />
              <Odds odds={game.odds} accentClass={accentClass} />
            </span>
            <span className="flex items-center gap-2 text-gray-200">
              <TeamLogo code={game.awayCode} size={20} />
              {teamCodeToAbbreviation(game.awayCode)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScheduleWidget;
```

- [ ] **Step 2: Wire into page**

In `app/page.tsx`:

Add imports:

```tsx
import ScheduleWidget from "@/components/ScheduleWidget.jsx";
import { fetchPolymarketOdds, POLYMARKET_CONFIG } from "@/lib/polymarket.js";
import {
  buildScheduleDays,
  pickDefaultDateIndex,
  todayIso,
} from "@/lib/schedule.js";
```

and extend the `standings.js` import:

```tsx
import {
  generateEuroleagueStandingsFormXml,
  parseResultScores,
  parseScheduleGames,
} from "../standings.js";
```

Replace the `Promise.all` block with:

```tsx
  const polymarketConfig = POLYMARKET_CONFIG.euroleague;
  const [resultsResponse, scheduleResponse, odds] = await Promise.all([
    fetch("https://api-live.euroleague.net/v1/results?seasoncode=E2026", {
      next: { revalidate: 5 * 60 },
    }),
    fetch("https://api-live.euroleague.net/v1/schedules?seasonCode=E2026", {
      next: { revalidate: 5 * 60 },
    }),
    fetchPolymarketOdds(polymarketConfig),
  ]);
```

Replace the schedule block (`const scheduleXml = ...` through `remainingGames` sort) with:

```tsx
  const scheduleXml = await scheduleResponse.text();
  const scheduleGames = parseScheduleGames(scheduleXml);
  const remainingGames = scheduleGames
    .filter((g) => !g.played)
    .sort((a, b) => a.gameday - b.gameday || a.gameNumber - b.gameNumber);

  const scheduleDays = buildScheduleDays({
    scheduleGames,
    scores: parseResultScores(xml),
    odds,
    config: polymarketConfig,
    ref: process.env.NEXT_PUBLIC_POLYMARKET_REF ?? "",
  });
  const defaultDayIndex = pickDefaultDateIndex(scheduleDays, todayIso());
```

In JSX, directly before `{games === 0 && (`, add:

```tsx
        <ScheduleWidget days={scheduleDays} defaultIndex={defaultDayIndex} />
```

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: no lint errors, build succeeds.

- [ ] **Step 4: Manual check**

Run: `NEXT_PUBLIC_POLYMARKET_REF=test npm run dev`, open `http://localhost:3000`.
Expected:
- Widget above the standings shows today's date (Sep 29 on 2026-09-29) with its games.
- Unplayed games show `HH:MM CET` and a `NN% · NN%` pill; pill links to `https://polymarket.com/event/euroleague-...?r=test` in a new tab.
- ◀ goes to Sep 25 / Sep 24 with final scores, no pills; ◀ disabled on first date.
- ▶ reaches Oct 1, Oct 2, …; ▶ disabled on last date.
- Layout fine at 375px width.

- [ ] **Step 5: Commit**

```bash
git add components/ScheduleWidget.jsx app/page.tsx
git commit -m "add schedule widget with polymarket odds to euroleague page"
```

---

### Task 5: Privacy policy disclosure

**Files:**
- Modify: `app/privacy-policy/page.tsx` (new section before "Changes")

- [ ] **Step 1: Add section**

Before `<h2 className="font-semibold">Changes</h2>` insert:

```tsx
          <h2 className="font-semibold">Betting Odds and Referral Links</h2>
          <p>
            Game win probabilities shown in the schedule are provided by
            <a
              href="https://polymarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              Polymarket
            </a>{" "}
            and are for information only. Links to Polymarket contain our
            referral code, and we may earn a commission if you sign up or trade
            after following them. We do not share any of your data with
            Polymarket; any data you provide there is governed by Polymarket’s
            own terms and privacy policy.
          </p>
          <p>
            Polymarket is not available in all countries. It is your
            responsibility to check whether using it is legal where you live.
            Only for users aged 18 or older. Please gamble responsibly.
          </p>
```

- [ ] **Step 2: Lint and verify**

Run: `npm run lint`
Expected: no errors. Open `http://localhost:3000/privacy-policy`, section renders before "Changes".

- [ ] **Step 3: Commit**

```bash
git add app/privacy-policy/page.tsx
git commit -m "add polymarket odds and referral disclosure to privacy policy"
```

---

## Deployment note

Set `NEXT_PUBLIC_POLYMARKET_REF` in the Vercel project env (Production + Preview) before deploying.
