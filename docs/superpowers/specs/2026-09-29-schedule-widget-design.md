# Schedule Widget with Polymarket Odds — Design

Date: 2026-09-29

## Goal

Add a compact schedule widget above the standings table showing the games of
one date at a time, with prev/next navigation between dates that have games.
Unplayed games show Polymarket win probabilities linking to the Polymarket
event with the site's referral code. Played games show the final score.

Ships on the EuroLeague page first. Built generic so EuroCup can be enabled
later by adding config only.

## Non-goals

- EuroCup rollout (only the config shape must support it).
- Team pages.
- Odds for played games / historical odds.
- Converting times to the viewer's timezone (times shown as CET).
- Visible disclosure line in the widget (disclosure lives in the privacy policy).

## Findings (verified 2026-09-29)

- Polymarket Gamma API is public, no auth:
  `https://gamma-api.polymarket.com/events?series_id=<id>&closed=false&limit=100`
- EuroLeague per-game markets: series id `10371` (slug `euroleague-basketball`).
  Event slug format: `euroleague-{homeToken}-{awayToken}-{YYYY-MM-DD}`,
  e.g. `euroleague-efes-madrid-2026-09-29`.
- EuroCup per-game markets: series slug `bkeurocup-games`, slug prefix
  `bkeurocup`, e.g. `bkeurocup-hap-ros-2026-09-29`. (Series id to be looked up
  when EuroCup is enabled.)
- Each event has a market with `sportsMarketType === "moneyline"`;
  `outcomes` / `outcomePrices` are JSON-encoded string arrays, index 0 = home,
  index 1 = away (matches slug and title order).
- Slug date equals the EL schedule `<date>` for checked rounds 2 and 3.
- EL schedule `<startime>` is CET/CEST (e.g. Dubai 18:00 = 20:00 local).
- Markets exist roughly one week ahead; volume is often low ($0–1k).
- Events are `restricted: true` (geo-restricted on Polymarket's side).

EuroLeague 2026/27 token map (from open markets):

| EL code | token      | EL code | token      |
|---------|------------|---------|------------|
| PAN     | panathin   | ASV     | lyonvill   |
| TEL     | aviv1      | HTA     | aviv       |
| ULK     | fenerbah   | MUN     | munchen    |
| ZAL     | kaunas     | OLY     | olympiac   |
| IST     | efes       | MAD     | madrid     |
| DUB     | dubai      | BAR     | barcelon   |
| MIL     | milano     | VIR     | bologna    |
| PRS     | paris      | PAR     | partizan   |
| RED     | zvezda     | PAM     | valencia   |
| BAS     | baskonia   | BES     | besiktas   |

## Architecture

Server-side fetch in the page (same pattern as existing results/schedule
fetches), pure matching functions, and a presentational client widget.

### `lib/polymarket.js` (new, pure + fetch)

- `POLYMARKET_CONFIG` keyed by competition:
  ```js
  {
    euroleague: { seriesId: 10371, slugPrefix: "euroleague", tokens: { PAN: "panathin", ... } },
    // eurocup: { seriesId: ..., slugPrefix: "bkeurocup", tokens: { ... } } — later
  }
  ```
- `fetchPolymarketOdds(config)` → `Map<slug, { home: number, away: number }>`.
  Fetches open events for `config.seriesId` with `next: { revalidate: 300 }`,
  picks the moneyline market, parses `outcomePrices`. Any fetch/parse error →
  logs and returns an empty map (widget renders without odds).
- `buildSlug(config, homeCode, awayCode, isoDate)` → slug string, or `null`
  if either code is missing from `config.tokens`.
- `polymarketUrl(slug, ref)` → `https://polymarket.com/event/{slug}` plus
  `?r={ref}` only when `ref` is non-empty.

### `lib/schedule.js` (new, pure)

- `buildScheduleDays({ scheduleGames, scores, odds, config, ref })` →
  `[{ date: "YYYY-MM-DD", games: [...] }]` sorted by date, games sorted by
  time then game number. Each game:
  ```js
  { homeCode, awayCode, time, played, homeScore?, awayScore?,
    odds?: { home, away, url } }
  ```
  `odds` only for unplayed games with a matching slug in the odds map.
- `pickDefaultDateIndex(days, todayIso)` → index of today if present,
  else first date after today, else last index (season over), `-1` if empty.
- Date helper: EL `"Sep 24, 2026"` → `"2026-09-24"`.

### `standings.js` (modified)

- `parseScheduleGames` also returns `time` (`<startime>`).
- Expose played-game scores keyed by game number from the results XML
  (reuse existing parsing; no change to standings logic).

### `components/ScheduleWidget.jsx` (new, client)

- Props: `days`, `defaultIndex`, `accentClass` (so EuroCup can use indigo).
- State: current index. Header `◀  Thu, Oct 1  ▶`; arrows disabled at ends.
- Row: home `TeamLogo` + code · time (`20:30 CET`) or score · away code + logo.
  If `odds`: small pill `62% · 38%` as link, `target="_blank"`,
  `rel="sponsored noopener"`.
- Renders nothing when `days` is empty.
- Styling matches existing dark theme.

### `app/page.tsx` (modified)

- Fetch Polymarket odds in parallel with existing fetches.
- Build days with `ref = process.env.NEXT_PUBLIC_POLYMARKET_REF ?? ""`.
- Today = current date in `Europe/Berlin` (via `Intl.DateTimeFormat`).
- Render `<ScheduleWidget>` above `<Standings>` (also shown when 0 games played).

### `app/privacy-policy/page.tsx` (modified)

New section "Betting Odds and Referral Links": odds are provided by
Polymarket, links contain a referral code and the site may earn a commission,
availability of Polymarket depends on the user's jurisdiction, 18+ /
gamble responsibly, and no data is shared with Polymarket by the site beyond
the user following the link.

## Configuration

- `NEXT_PUBLIC_POLYMARKET_REF` — referral code. Empty/unset → links without
  `?r=`. Must be set in Vercel project env.

## Error handling

- Polymarket down / bad JSON → no odds, widget still shows schedule.
- Unknown team code (not in token map) → game shown without odds.
- Schedule empty → widget not rendered.

## Testing

- `node --test` (built-in, no new deps) for `buildSlug`, `polymarketUrl`,
  outcome price parsing, `buildScheduleDays`, `pickDefaultDateIndex`,
  EL date parsing. Add `"test": "node --test"` script.
- Manual: `npm run dev`, verify widget against live data (open markets exist
  for rounds 2–3), navigation, links include `?r=`.
